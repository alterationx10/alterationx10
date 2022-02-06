---
title: Building a ZIO App
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, ZIO, scala-cli]
---

![Bender do it myself meme](/img/build_an_app.jpg)

We're going to build a ZIO App, with our *own* dependencies. 

In my [previous](/2022/02/01/zero-to-zio) post, I covered some highlights about working with ZIO, so this time I thought
I would go through actually writing some code to illustrate some patterns of what you would actually do when developing
in the framework, and then how to inject your resource into a program.

Some important notes about this walk through:

* We're using scala-cli :goggles:
* We're targeting Scala 3 :muscle:
* We're using ZIO 2.0 :tada:

It's a new year, so we should all eat healthier, exercise, and write more things in Scala 3. Since we're using ZIO 2.0 
(RC), the syntax might be a littler different from what you've seen before, but it all generally behaves the same.

## What we are building

We are going to build a simple cli app that will do hashing. If given one argument (a message), it will calculate an
HMAC hash and print in. If given two arguments (a message and a hash), it will compute the hash of the message, and
compare against the provided hash. If provided `< 1` or `> 2` arguments, it will be grumpy at you.

For example:

```shell
./ax10 "Scala is the best"
LIbqLrEYGyr2LkOxlyV7J-6eO4Rvv4odvo6XdjJJlnQ9Tz32LR2raz1U6t-ztHPjjKGPqUu2NIME0mkWM4VixQ
./ax10 "Scala is the best" LIbqLrEYGyr2LkOxlyV7J-6eO4Rvv4odvo6XdjJJlnQ9Tz32LR2raz1U6t-ztHPjjKGPqUu2NIME0mkWM4VixQ
valid
./ax10 "Scala is the best" pd9t4XbrVM-9UtwzJ-O3i5AWxDw_XDKs1bfVstgD2oEdeheL9y82oEfRM9e_YVy1KA93tHjGmjl9l2elNedK1Q
invalid
./ax10 a b c
This app requires 1 argument to hash, and 2 to validate
```

## Service Module Pattern 2

When writing services, you generally follow 3 steps:

1. Define you trait (This is the `Type` that the zio Runtime will know about)
2. Implement your trait (This is what you'll provide to the Runtime via a `ZLayer`)
3. Add a companion object to your trait with accessor methods (This is just general ergonomics for using your service)

### The Service Trait

As described above, our app is going hash a message, and validate a message against a hash. This would be a sensible 
description of what we would want to implement:

```scala
trait Hasher {
  def hash(message: String, key: String): Task[String]
  def validate(message: String, key: String, hash: String): Task[Boolean]
}
```

Note that out return types are `Task`s. You'll likely want to return `ZIO`s with `Any` in the `R` channel here, otherwise
you are leaking an implementation detail into your generic trait!

### The Companion Object

The companion object holds some accessor methods, which basically cut out the boilerplate of you needing to use
`ZIO.serviceWith[MyType](_.myMethod)` everywhere. For example, now we can just call `Hasher.hash(a, b)` in a
for-comprehension.

Note that the type signature on the accessor methods are the same as your trait, but with its type in the `R` channel.

```scala
object Hasher {

  def hash(message: String, key: String): RIO[Hasher, String] =
    ZIO.serviceWithZIO[Hasher](_.hash(message, key))

  def validate(
      message: String,
      key: String,
      hash: String
  ): RIO[Hasher, Boolean] =
    ZIO.serviceWithZIO[Hasher](_.validate(message, key, hash))
  
}
```

### Writing a program before we've implemented it

I'm actually going to jump the gun here, and write out the logic for our entire program. I think that's a very powerful
message to convey - because with our trait and companion objects defined, we actually have enough information to do it!

```scala
  // The overall flow of our program
  val program: ZIO[ZIOAppArgs & (Hasher & Console), Throwable, ExitCode] = for {
    // Read the arguments
    args <- ZIOAppArgs.getArgs
    // Make sure we've been passed only 1 or 2 args
    _    <- ZIO.cond(
              args.size == 1 || args.size == 2,
              (),
              new Exception(
                "This app requires one argument to hash, and 2 to validate"
              )
            )
    // When we've been passed 1 arg, hash it
    _    <- ZIO.when(args.size == 1) {
              Hasher.hash(args.head, superSecretKey).flatMap(h => printLine(h))
            }
    // When we've been passed 2 args, verify it.
    _    <- ZIO.when(args.size == 2) {
              ZIO.ifM(Hasher.validate(args.head, superSecretKey, args.last))(
                onTrue = printLine("valid"),
                onFalse = printLine("invalid")
              )
            }
  } yield ExitCode.success
```

Our program is just a series of effects to run, so we can describe if solely with service/type traits.
`val program: ZIO[ZIOAppArgs & (Hasher & Console), Throwable, ExitCode]` says, "Give me a `ZIOAppArgs`, `Hasher` and a
`Console`, and I will produce for you an `ExitCode`". This means all you have to do is provide it your dependencies, and
run it. This also means that you can test the actual logic of program by providing test implementations of services! We
can also easily swap out one implementation of a service for another, and not have to change the flow/logic of how our
program runs at all.

I think that's a very powerful system.

### Implementing our Service Module

Ok, now for the fun part of writing our very own code. We will write a case class that extends out trait, and takes some
dependencies via the constructor arguments. Hint: these arguments are going to be other dependencies your runtime needs
via a ZLayer at some point!

Out logic is pretty straight forward, and we just use a `Mac` to compute a hash, and Base64 encode it.

```scala
// The live, default implementation of our Hasher Service.
case class HasherLive(mac: Mac) extends Hasher {

  override def hash(message: String, key: String): Task[String] =
    for {
      hash    <- ZIO.attempt(mac.doFinal(message.getBytes("UTF-8")))
      encoded <- HashHelper.base64Encode(hash)
    } yield encoded

  override def validate(
      message: String,
      key: String,
      msgHash: String
  ): Task[Boolean] =
    for {
      hash    <- ZIO.attempt(mac.doFinal(message.getBytes("UTF-8")))
      encoded <- HashHelper.base64Encode(hash)
    } yield encoded == msgHash

}
```

You may have noticed the `HashHelper.base64Encode(hash)`, and that it wasn't a dependency passed to the case class...
Very astute of you, and that leads me to my next point:

### Not everything has to be a Service Module

Everything looks like a nail to a hammer. If you are new to ZIO, and have learned that the service module pattern is
"the way" to inject implementations into your applications, you will sooner or later build some awkward code trying to
force a pattern you don't need. I usually find it's when working with Java and non-ZIO Scala libraries. For example, I
need a `Mac` for my `Hasher`, but to build a `Mac` I need a `SecretKeySpec`. But, I don't want to _implement_ a
SecretKeySpec, I just want _a_ SecretKeySpec. Enter my `HashHelper` object below...

```scala
object HashHelper {

  def hmac512: ZLayer[SecretKeySpec, Throwable, Mac] = {
    (
      for {
        mac     <- ZIO.effect(Mac.getInstance("HmacSHA512"))
        keySpec <- ZIO.service[SecretKeySpec]
        _       <- ZIO.effect(mac.init(keySpec))
      } yield mac
    ).toLayer
  }

  def specForKey512(key: String): ZLayer[Any, Throwable, SecretKeySpec] = {
    ZIO.effect(new SecretKeySpec(key.getBytes("UTF-8"), "HmacSHA512")).toLayer
  }

  def base64Encode(bytes: Array[Byte]): Task[String] =
    ZIO.attempt(Base64.getUrlEncoder.withoutPadding().encodeToString(bytes))

}
```

Sometimes it's useful to put some helper functionality in an object, and save yourself some ceremony.

## Putting it all together

Ok, we've implemented our trait, and built out all the resources we need to instantiate it with our helper object!

### Wiring up our layer

For the same of keeping the app example somewhat simple, I've just hard-coded the secret key to. So we know our `Hasher`
implementation needs a `Mac`: `ZLayer[Mac, Nothing, Hasher]`. A `Mac` needs
a `SecretKeySpec`: `ZLayer[SecretKeySpec, Throwable, Mac]`. We can make a `SecretKeySpec` without any dependencies.
Let's line up the `[R, A]` channels to better see this visually.

```
[Any, SecretKeySpec] >>> [SecretKeySpec, Mac] >>> [Mac, Hasher]
```

So, we just match up the output `A` from one ZLayer into the `R` of the next and combine them vertically! Then, our
resulting combined layer is just a `ZIO[Any, Throwable, Hasher]`.

```scala
  // Shhh! 🤫
  val superSecretKey: String = "abc123"

  // We call .orDie here to give up, instead of having an something in the error channel,
  // because if we can't construct our dependencies, our app isn't going to
  // work anyway.
  val appLayer: ZLayer[Any, Nothing, Hasher] = {
    (HashHelper.specForKey512(
      superSecretKey
    ) >>> HashHelper.hmac512) >>> Hasher.layer
  }.orDie
```

### Some things in life *are* free

Our program is a `ZIO[ZIOAppArgs & (Hasher & Console), Throwable, ExitCode] `, but we only build
a `ZLayer[Any, Nothing, Hasher]`. Luckily, the ZIO Environment(`ZEnv`) comes with some things already built in. Those
things are `Clock`, `Console`, `System`, and `Random`. We're going to extend `ZIOAppDefault`, so we'll get that
and `ZIOAppArgs` for free.

Since the other parts are provided, we will only need to use `provideSome` to inject in the remaining dependencies.

### Running our program

```scala
object HashApp extends ZIOAppDefault {
  
  // all the stuff from above...

  def run = program
    .catchAll(err => printLine(err.getMessage))
    .provideSomeLayer(appLayer)

}
```

With our use of `catchAll` here, we will catch any `Throwable`, and recover by printing it to the console.

# The Code

The complete Scala code can be found on GitHub at 
[https://github.com/alterationx10/ax10](https://github.com/alterationx10/ax10). I've also pasted it below.

### scala-cli

To run it, and pass args, you need a `--`: `scala-cli run ax10.scala -- arg1 arg2`. To build an executable, just
run `scala-cli package ax10.scala -f`, which should make an `ax10` you can run and start using. If you wanted to play
with the code, you can easily use VSCode + Metals after running `scala-cli setup-ide .`.

## Full code, for posterity
```scala
//> using scala "3.1.1"
//> using lib "dev.zio::zio:2.0.0-RC2"

import zio._
import zio.Console._
import java.awt.Taskbar
import javax.crypto.Mac
import java.util.Base64
import javax.crypto.spec.SecretKeySpec
import javax.crypto.SecretKey

// Hash-based message authentication code
trait Hasher {
  def hash(message: String, key: String): Task[String]
  def validate(message: String, key: String, hash: String): Task[Boolean]
}

// The live, default implementation of our Hasher Service.
case class HasherLive(mac: Mac) extends Hasher {

  override def hash(message: String, key: String): Task[String] =
    for {
      hash    <- ZIO.attempt(mac.doFinal(message.getBytes("UTF-8")))
      encoded <- HashHelper.base64Encode(hash)
    } yield encoded

  override def validate(
      message: String,
      key: String,
      msgHash: String
  ): Task[Boolean] =
    for {
      hash    <- ZIO.attempt(mac.doFinal(message.getBytes("UTF-8")))
      encoded <- HashHelper.base64Encode(hash)
    } yield encoded == msgHash

}

// Companion object with accessors
object Hasher {

  def hash(message: String, key: String): RIO[Hasher, String] =
    ZIO.serviceWithZIO[Hasher](_.hash(message, key))

  def validate(
      message: String,
      key: String,
      hash: String
  ): RIO[Hasher, Boolean] =
    ZIO.serviceWithZIO[Hasher](_.validate(message, key, hash))

  // Reference implementation layer
  val layer: URLayer[Mac, Hasher] = (HasherLive(_)).toLayer

}

// Not everything needs to be/fit a Service Module pattern
object HashHelper {

  def hmac512: ZLayer[SecretKeySpec, Throwable, Mac] = {
    (
      for {
        mac     <- ZIO.effect(Mac.getInstance("HmacSHA512"))
        keySpec <- ZIO.service[SecretKeySpec]
        _       <- ZIO.effect(mac.init(keySpec))
      } yield mac
    ).toLayer
  }

  def specForKey512(key: String): ZLayer[Any, Throwable, SecretKeySpec] = {
    ZIO.effect(new SecretKeySpec(key.getBytes("UTF-8"), "HmacSHA512")).toLayer
  }

  def base64Encode(bytes: Array[Byte]): Task[String] =
    ZIO.attempt(Base64.getUrlEncoder.withoutPadding().encodeToString(bytes))

}

object HashApp extends ZIOAppDefault {

  val superSecretKey: String = "abc123"

  // The overall flow of our program
  val program: ZIO[ZIOAppArgs & (Hasher & Console), Throwable, ExitCode] = for {
    // Read the arguments
    args <- ZIOAppArgs.getArgs
    // Make sure we've been passed only 1 or 2 args
    _    <- ZIO.cond(
              args.size == 1 || args.size == 2,
              (),
              new Exception(
                "This app requires 1 argument to hash, and 2 to validate"
              )
            )
    // When we've been passed 1 arg, hash it
    _    <- ZIO.when(args.size == 1) {
              Hasher.hash(args.head, superSecretKey).flatMap(h => printLine(h))
            }
    // When we've been passed 2 args, verify it.
    _    <- ZIO.when(args.size == 2) {
              ZIO.ifM(Hasher.validate(args.head, superSecretKey, args.last))(
                onTrue = printLine("valid"),
                onFalse = printLine("invalid")
              )
            }
  } yield ExitCode.success

  // We call .orDie here to give up, instead of having an something in the error channel,
  // because if we can't construct our dependencies, our app isn't going to
  // work anyway.
  val appLayer: ZLayer[Any, Nothing, Hasher] = {
    (HashHelper.specForKey512(
      superSecretKey
    ) >>> HashHelper.hmac512) >>> Hasher.layer
  }.orDie

  def run = program
    .catchAll(err => printLine(err.getMessage))
    .provideSomeLayer(appLayer)

}

```
