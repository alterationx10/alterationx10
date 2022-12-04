---
title: Advent of Code - Day 1
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, ZIO, ZStream, Advent of Code]
---

My solution for https://adventofcode.com/2022/day/1


```scala
import zio.*
import zio.stream.*

object Day1 extends ZIOAppDefault {

  // Add a couple new lines so we don't have to collectLeftover
  val source: String => ZStream[Any, Throwable, String] =
    fileName =>
      ZStream.fromFileName(fileName).via(ZPipeline.utfDecode) ++ ZStream("\n\n")

  val pt1Pipeline: ZPipeline[Any, Nothing, String, Int] =
    // Split by lines
    ZPipeline.splitLines >>>
      // group into Chunk[Chunk[_]] based on empty lines
      ZPipeline
        .mapAccum[String, Chunk[String], Chunk[String]] {
          Chunk.empty
        } { (state, elem) =>
          if (elem.nonEmpty) (state :+ elem, Chunk.empty)
          else (Chunk.empty, state)
        }
        //Get rid of empty Chunks
        .filter(_.nonEmpty) >>>
      // Add up the inner Chunk
      ZPipeline.map[Chunk[String], Int](_.map(_.toInt).sum)

  // Find the max
  val pt1Sink: ZSink[Any, Nothing, Int, Nothing, Int] =
    ZSink.collectAll[Int].map(_.max)

  // Sum of biggest 3
  val pt2Sink: ZSink[Any, Nothing, Int, Nothing, Int] =
    ZSink.collectAll[Int].map(_.sortBy(-_).take(3).sum)
  
  override def run: ZIO[Any, Any, Any] = for {
    _ <- source("day-1-1.data")
      .via(pt1Pipeline)
      .run(pt1Sink)
      .debug("Answer pt.1")
    _ <- source("day-1-1.data")
      .via(pt1Pipeline)
      .run(pt2Sink)
      .debug("Answer pt.2")
  } yield ExitCode.success

}
```