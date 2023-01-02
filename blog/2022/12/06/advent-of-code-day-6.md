---
title: Advent of Code - Day 6
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, ZIO, ZStream, Advent of Code]
---

My solution for https://adventofcode.com/2022/day/6

```scala
import zio.*
import zio.stream.*

object Day6 extends ZIOAppDefault {

  val source: String => ZStream[Any, Throwable, Byte] =
    fileName => ZStream.fromFileName(fileName)

  val data                             = "day-6.data"
  val nDistinct                        = 14
  override def run: ZIO[Any, Any, Any] = for {
    _ <- source(data)
           .map(byte => new String(Array(byte)))
           .zipWithIndex
           .sliding(nDistinct)
           .filter(_.map(_._1).toSet.size == nDistinct)
           .take(1)
           .map(_.map(_._2).max + 1)
           .debug(s"Answer for marker length $nDistinct")
           .runDrain
  } yield ExitCode.success

}
```