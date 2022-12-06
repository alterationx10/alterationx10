---
title: Advent of Code - Day 3
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, ZIO, ZStream, Advent of Code]
---

My solution for https://adventofcode.com/2022/day/3

```scala
import zio.*
import zio.stream.*

object Day3 extends ZIOAppDefault {

  val source: String => ZStream[Any, Throwable, String] =
    fileName =>
      ZStream
        .fromFileName(fileName)
        .via(ZPipeline.utfDecode >>> ZPipeline.splitLines)
        .filter(_.nonEmpty)

  // Indexes start at 0. Avoid an extra map by prepending an element, and taking the tail.
  val priorities: Map[Char, Int] =
    (('a' +: ('a' to 'z')) ++ ('A' to 'Z')).zipWithIndex.tail.toMap


  val data = "day-3-1.data"
  override def run: ZIO[Any, Any, Any] = for {
    _ <- source(data)
      .map(str => str.splitAt(str.length / 2)) // Split in two
      .map { case (a, b) => a.intersect(b).head } // Elfs promised there would be only one
      .map(k => priorities.getOrElse(k, throw new RuntimeException("hau ruck")))
      .run(ZSink.sum)
      .debug("Answer pt.1")
    _ <- source(data)
      .grouped(3) // Get it together, Elves!!!
      .map(_.reduceLeft((a, b) => a.intersect(b)).head) // Elfs promised there would be only one
      .map(k => priorities.getOrElse(k, throw new RuntimeException("hau ruck")))
      .run(ZSink.sum)
      .debug("Answer pt.2")
  } yield Exit.Success

}
```