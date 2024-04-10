---
title: "Contextual Abstractions: Using, Given"
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, Scala 3, scala-cli, Scala 2 => 3]
---

:::tip Scala 2 => 3 Series

This is a part in an ongoing series dealing with migrating old ways of doing
things from Scala 2 to Scala 3. It will cover the
[What's New in Scala 3](https://docs.scala-lang.org/scala3/new-in-scala3.html)
from the official site.

For the repo containing all the code, visit
[GitHub](https://github.com/alterationx10/three4s). There are code samples for
both Scala 2 and Scala 3 together, that are easy to run via `scala-cli`. :::

This post is centered around the new way of passing implicit arguments to
methods via
[using-clauses](https://docs.scala-lang.org/scala3/reference/contextual/using-clauses.html).

> Abstracting over contextual information. Using clauses allow programmers to
> abstract over information that is available in the calling context and should
> be passed implicitly. As an improvement over Scala 2 implicits, using clauses
> can be specified by type, freeing function signatures from term variable names
> that are never explicitly referred to.

## The preface

For this example, let's say that we have some interface that we're going to be
passing around a lot, and that it could have multiple implementations.

```scala
trait BaseLogger {
    def log[T](t: T): Unit
}

case class PrintLogger() extends BaseLogger {
  def log[T](t: T): Unit = println(s"Logger result: ${t.toString}")
}

case class FancyLogger() extends BaseLogger {
  def log[T](t: T): Unit = println(s"Ye Olde Logger result: ${t.toString}")
}
```

## Scala 2

In Scala 2, we could write a method, and have our trait's implementation passed
in as a separate implicit argument.

```scala
  def loggingOp[A,B](a: A, b: B)(implicit logger: BaseLogger): Int = {
      val result = a.toString.map(_.toInt).sum + b.toString.map(_.toInt).sum
      logger.log(result)
      result
  }
```

At this point, we could call our method by still passing the argument in
explicitly

```scala
object Using_2 extends App {

  val printLogger: PrintLogger = PrintLogger()
  val fancyLogger: FancyLogger = FancyLogger()

  loggingOp(40, 2)(printLogger)
  loggingOp(40, 2)(fancyLogger)

}
```

However, if we define an instance of type `BaseLogger` in scope _implicitly_,
then we don't need to pass it in as an argument every time! Of course, we still
have the option to pass something in explicitly, if we don't want to use the
instance that is in scope implicitly.

```scala

object Using_2 extends App {

  val printLogger: PrintLogger = PrintLogger()
  val fancyLogger: FancyLogger = FancyLogger()

  loggingOp(40, 2)(printLogger)
  loggingOp(40, 2)(fancyLogger)

  // With an implicit of type BaseLogger in scope...
  implicit val defaultLogger = printLogger

  // ... I no longer need to pass it as an argument
  loggingOp(true, false)
  loggingOp(17, "purple")
  // ... but I can still call implicit arguments explicitly!
  loggingOp("car", printLogger)(fancyLogger)

}
```

## Scala 3

In Scala 3, we don't use the implicit key word when defining a method - we now
use `using`. A faithful port of the Scala 2 code above would look something
like:

```scala
  // You can specify the name logger, but don't have to
  def loggingOp_withParamName[A, B](a: A, b: B)(using logger: BaseLogger): Int = {
    val result = a.toString.map(_.toInt).sum + b.toString.map(_.toInt).sum
    logger.log(result)
    result
  }
```

The awesomeness of Scala 3 doesn't stop there, though, because you can define
your methods by just declaring the type! In this case, we just `summon` an
instance internally, and use reference to that.

> There are only two hard things in Computer Science: cache invalidation and
> naming things.

Guess it's just invalidating caches now!

```scala
  def loggingOp[A, B](a: A, b: B)(using BaseLogger): Int = {
    val logger = summon[BaseLogger]
    val result = a.toString.map(_.toInt).sum + b.toString.map(_.toInt).sum
    logger.log(result)
    result
  }
```

From here, our code works mostly the same - one caveat being that when
explicitly passing arguments, you need to use the `using` keyword - where
previously you didn't need to declare the values you were passing in were
`implicit`. We're also declaring our `BaseLogger` in scope using
[alias givens](https://docs.scala-lang.org/scala3/reference/contextual/givens.html#alias-givens)

```scala
object Using_3 {

  val printLogger: PrintLogger = PrintLogger()
  val fancyLogger: FancyLogger = FancyLogger()

  @main
  def main = {

    // We can still call things explicitly...
    loggingOp(40, 2)(using printLogger)
    loggingOp(40, 2)(using fancyLogger)

    // .. but we have a new way of defining what type is in scope implicitly
    // implicit val defaultLogger = printLogger // <- this would still work
    given defaultLogger: BaseLogger = printLogger // <- but probably use this

    loggingOp(true, false)
    loggingOp(true, false)
    loggingOp(17, "purple")
    loggingOp("car", printLogger)(using fancyLogger)
  }

}
```

## Final Thoughts

Using clauses can be a bit more complex, but with the simple example outlined
above - we have one less scary new thing, that we can mentally map back to our
years of Scala 2 use!
