---
title: Contextual Abstractions: Using, Given
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, Scala 3, scala-cli, Scala 2 => 3]
---

## How I would use it in Scala 2

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


object Using_2 extends App {

  def loggingOp[A,B](a: A, b: B)(implicit logger: BaseLogger): Int = {
      val result = a.toString.map(_.toInt).sum + b.toString.map(_.toInt).sum
      logger.log(result)
      result
  }

  val printLogger: PrintLogger = PrintLogger()
  val fancyLogger: FancyLogger = FancyLogger()

  loggingOp(40, 2)(printLogger)
  loggingOp(40, 2)(fancyLogger)


  implicit val defaultLogger = printLogger
  
  loggingOp(true, false)
  loggingOp(17, "purple")
  loggingOp("car", printLogger)(fancyLogger)

}
```

```shell
➜ using scala-cli Using_2.scala
Downloading JVM index
Getting list of Scala CLI-supported Scala versions
Logger result: 150
Ye Olde Logger result: 150
Logger result: 971
Logger result: 768
Ye Olde Logger result: 1524
```
## How to Scala 3

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

object Using_3 {

  // You can specify the name logger, but don't have to
  def loggingOp_withParamName[A, B](a: A, b: B)(using logger: BaseLogger): Int = {
    val result = a.toString.map(_.toInt).sum + b.toString.map(_.toInt).sum
    logger.log(result)
    result
  }

  def loggingOp[A, B](a: A, b: B)(using BaseLogger): Int = {
    val logger = summon[BaseLogger]
    val result = a.toString.map(_.toInt).sum + b.toString.map(_.toInt).sum
    logger.log(result)
    result
  }

  val printLogger: PrintLogger = PrintLogger()
  val fancyLogger: FancyLogger = FancyLogger()

  @main
  def main = {

    loggingOp(40, 2)(using printLogger)
    loggingOp(40, 2)(using fancyLogger)

    // implicit val defaultLogger = printLogger // <- this still works!
    given defaultLogger: BaseLogger = printLogger // <- but probably use this

    loggingOp(true, false)
    loggingOp(true, false)
    loggingOp(17, "purple")
    loggingOp("car", printLogger)(using fancyLogger)
  }

}
```

```shell
➜ using scala-cli Using_3.scala
Compiling project (Scala 3.0.2, JVM)
Compiled project (Scala 3.0.2, JVM)
Logger result: 150
Ye Olde Logger result: 150
Logger result: 971
Logger result: 971
Logger result: 768
Ye Olde Logger result: 1524
```
