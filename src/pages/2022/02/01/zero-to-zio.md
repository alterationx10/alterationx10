---
title: Zero-to-ZIO 
author: Mark Rudolph 
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, ZIO]
---

# Zero-to-ZIO

I've been using ZIO at work for about a year now, and thought I would share some of my learnings. On a couple of
occasions, I've helped bring people up to speed on using ZIO in our code bases, so this could be thought of as a
getting-started highlight for Scala developers who are familiar with the language, but not necessarily functional
effect-based system - in this case, ZIO.

## Anatomy of a ZIO Application

The main components to start discussing are `ZIO[R, E, A]` (the computational effects you want to run)
, `ZLayer[R, E, A]` (the dependencies you need to run your effects), and the `Runtime[R]` (ZIO - the platform / effect
system).

## ZIO[R, E, A]

If I were to try to explain what a ZIO/effect is, in as few words as possible, I would say

> A `ZIO[R, E, A]` will compute a result of type `A`, and will need resources of type `R` to do it. 
> If it _recoverably_ fails, it will fail with an exception of type `E`.

Let's dig into that.

### ZWhatNow?

There type aliases and companion objects that simplify common cases:

* `Task[A]    == ZIO[Any, Throwable, A]` - Doesn't need any dependencies to compute `A`, and can recover from a a
  failure that is `Throwable`.
* `UIO[A]     == ZIO[Any, Nothing, A` - Doesn't need any dependencies to compute `A`, and won't fail with something you
  could recover from.
* `IO[E, A]   == ZIO[Any, E, A]` - Doesn't need any dependencies to compute `A`, and can recover from a failure that
  is `E`.
* `RIO[R,A]   == ZIO[R, Throwble, A]` - Requires `R` to compute `A`, and can recover from a a failure that
  is `Throwable`.
* `URIO[R, A] == ZIO[R, Nothing, A]`- Requires `R` to compute `A`, and won't fail with something you could recover from.

The abbreviations may seem daunting at first, but if you feel like they're too much at start - just don't use them!
They're just aliases, and `ZIO[Any, Throwable, A]`
is just as valid as `Task[A]`. You'll get used them pretty quick though, and if you use IntelliJ Idea + the ZIO Plugin,
it'll likely even suggest the shorter version for you to help out.

## The `E` is Not Silent

The `U` in `UIO`, or `URIO` above is sometimes said to be for "Un-failing" (i.e. it can't fail), but it's important to
state right off that your FP/Effect system application can still absolutely crash! Errors are not magically handled.
This is more of a conceptual thing, and realizing that the `E` error channel is about exceptions you _can_ and _
want to_ recover from. If, for example, you were reading numbers from a database to perform math on and your error
channel was an `ArithmeticException` (e.g. `ZIO[Any, ArithmeticException, Int]`), you could still crash from an
un-checked `SQLException` - because you said "I'm only concerned with recovering from `ArithmeticException`s". This also
isn't Akka, so don't "let it crash" - you still need to catch your exceptions!

For example: This is still going to crash your application if you pass it zero:

```scala
def danger(denom: Int): ZIO[Console, Throwable, Int] = for {
  result <- ZIO.attempt(42 / denom)
  _      <- printLine(s"Computed $result")
} yield result
```

so, you should be sure to handle the exceptions you want to recover from, e.g.:

```scala
def lessDanger(denom: Int) = danger(denom).catchSome {
  case _: ArithmeticException => ZIO.succeed(0)
}
```

## The `R`: ZLayer[R, E, A]

A lot of people seem to struggle up with ZLayers at first, but I think they aren't that complicated once you get used to
them. A ZLayer provides the
`R` resources for a ZIO. Sometimes those resources need dependencies themselves, so just like with a ZIO,
a `ZLayer[R, E, A]` will give you a dependency resource `A` you can inject into your application, and will need
dependencies of type `R` to do it. If it _recoverably_ fails, it will fail with an exception of type `E`. Also, like
with the ZIO, there are corresponding type aliases which match above.

The tricky part is combining all the layers for you application. For example, if you have a `ZLayer[A, Throwable, B]`
and a `ZLayer[B, Throwable, C]`, depending on how you combine them, you can get a `ZLayer[A, Throwable, C]`
, `ZLayer[A with B, Throwable, B with C]`, or even a `ZLayer[A, Throwable, B with C]`. This is due to the fact that you
can horizontally, and vertically combine layers.

For example, let's look at some type signatures:

```scala
val l1: ZLayer[Console, Throwable, Random] = ???
val l2: ZLayer[Random, Throwable, Clock] = ???
val l3: ZLayer[Console, Throwable, Clock] = l1 >>> l2 // Vertically
val l4: ZLayer[Console with Random, Throwable, Random with Clock] = l1 ++ l2 // Horizontally
val l5: ZLayer[Console, Throwable, Random with Clock] = l1 >+> l2 // A bit of both
```

For `l3`, we have combined the layers _vertically_. This means we used the output of `l1` and fed it into`l2` - which
now means in this example we now have a layer where "If you give me a `Console` I will produce a `Clock` for you".

For `l4`, we have combined them _horizontally_, which mainly just means we stack the `R`s and the `A`s - here, you end
up with a layer that when given a `Console` and a `Random`, it will produce a `Random` and a `Clock`.

In the case of `l5`, it's a bit of both. With `>+>` it just stacks the `A`s - so we end up with a layer that says "Give
me a `Console`, and I'll give you a `Random` and a `Clock`".

So which of these you need, really just depends on if you are going to use the resulting layer to build any other layers -
and if you wanted/needed to easily re-use the dependencies in the `R` channel. A really nice thing is that your overall
program is a collection of ZIOs, and as you combine them all, all of their resources stack up - so you know exactly what
dependencies your program needs to run, and then you can build a layer to provide them all! For example:

```scala
// Get the current time
def currentTime: URIO[Clock, OffsetDateTime] = Clock.currentDateTime
//Log something
def log(msg: String): ZIO[Console, IOException, Unit] = printLine(msg)
// Log the current time
def logTime: ZIO[Console with Clock, IOException, Unit] = for {
  time <- currentTime
  _    <- log(s"The current time is ${time}")
} yield ()
```

We can see that if I want to run `logTime`, I need to provide `Console with Clock`, which is the combined set of
dependencies of the individual ZIOs used to build that method.

## The Runtime[Env]

The awesome follow up to the concepts of ZLayers, and knowing what resources your applications needs to run - is that *
they're just there*. By that, I mean the `Runtime` which is running our application has to know about all the
resources needed. For `logTime` above, that means I have at least a
`Runtime[Clock with Console]`. Whatever the ultimate layer provided to the application (call it `AppEnv`
where `type AppEnv = This with That with Other`...), you have a `Runtime[AppEnv]` - and that means you can access any of
those dependencies! For example, `logTime` could be written as

```scala
val fromEnv: ZIO[Console with Clock, IOException, Unit] = for {
  clock   <- ZIO.service[Clock]
  time    <- clock.currentDateTime
  console <- ZIO.service[Console]
  _       <- console.printLine(s"The current time is $time")
} yield ()
```

Looking at `clock <- ZIO.service[Clock]` - that's basically saying "from the runtime environment, grab a `Clock` for me to use".
So anywhere in your program's logic, if you're writing a line in a ZIO for-comprehension, and you _know_ there's a
service of type `S` provided, you could quickly grab a reference to it with `s <- ZIO.service[S]` - even if a
companion/helper object hasn't been set up to provide it "nicely" via something like `Clock.currentDateTime`.

## Why use an effect system?

Ok, cool. You can do dependency injection and exception handling without an effect system - so what? Well, in addition
to the powerful, tightly integrated ergonomics above - this is all run on a performant fiber based system, which means
that it takes near zero effort to take any of your code and add retry logic, scheduling, and async operations. What if I
wanted to print the current time, 30 seconds in the future? `logTime.delay(30 second)`. Do that 5
times? `logTime.delay(30 second).repeatN(5)`. Log forever in the background while moving ahead in the
application? `logTime.repeat(Schedule.spaced(1.second)).forkDaemon`

What if you're asking for user input, and you want to retry some number of times in case of mistyping?

```scala
val fromuser = (for {
    _      <- Console.printLine("Enter a number")
    input  <- Console.readLine
    number <- ZIO.attempt(input.toInt) // This could blow up!
    _      <- Console.printLine(s"You entered number $number")
} yield ()).retryN(5)
```

These are of course silly example, but in a real-world application what if you're making a REST call, get an error code
with a `Retry-After` header set you can recursively call yourself with the appropriate timeout with ease!

## Wrapping up

I hope that helped hit some highlights of ZIO, and perhaps make it less scary to jump into!
