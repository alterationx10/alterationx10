---
title: Advent of Code - Day 2
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, ZIO, ZStream, Advent of Code]
---

My solution for https://adventofcode.com/2022/day/2


```scala
import zio.*
import zio.stream.*

object Day2 extends ZIOAppDefault {

  sealed trait RPS
  object RPS {

    case object Rock extends RPS
    case object Paper extends RPS
    case object Scissors extends RPS

    def apply(s: String): RPS = s match {
      case "A" | "X" => Rock
      case "B" | "Y" => Paper
      case "C" | "Z" => Scissors
      case _         => throw new RuntimeException("That's cheating!")
    }

    extension(rps: RPS) {
      def losesTo: RPS = rps match {
        case Rock     => Paper
        case Paper    => Scissors
        case Scissors => Rock
      }
      def winsAgainst = rps match {
        case Rock     => Scissors
        case Paper    => Rock
        case Scissors => Paper
      }
    }

    def score(a: RPS, b: RPS): Int = {
      val choice = b match {
        case Rock     => 1
        case Paper    => 2
        case Scissors => 3
      }
      val outcome = (a, b) match {
        case (x, y) if x == y            => 3 // Draw
        case (x, Rock) if x == Scissors  => 6 // Winner
        case (x, Paper) if x == Rock     => 6 // Winner
        case (x, Scissors) if x == Paper => 6 // Chicken substitute dinner
        case _                           => 0 // If ya ain't first, yer last
      }
      // A refactor of outcome, after extension methods were added for part 2
      val betterOutcome = (a, b) match {
        case (x, y) if x == y         => 3 // Draw
        case (x, y) if x.losesTo == y => 6 // Winner
        case _                        => 0 // If ya ain't first, yer last
      }
      choice + betterOutcome
    }

    def throwTheGame(a: RPS, b: RPS): Int = (a, b) match {
      case (x, Rock)     => score(x, x.winsAgainst) // Need to lose
      case (x, Paper)    => score(x, x) // Need to tie
      case (x, Scissors) => score(x, x.losesTo) // Need to win
    }

  }

  val source: String => ZStream[Any, Throwable, String] =
    fileName => ZStream.fromFileName(fileName).via(ZPipeline.utfDecode)

  val pt1Pipeline: ZPipeline[Any, Nothing, String, Int] =
    ZPipeline.splitLines >>>
      ZPipeline.map[String, Int] { str =>
        val arr = str.split(" ").map(RPS.apply)
        RPS.score(arr.head, arr.last)
      }

  val pt2Pipeline: ZPipeline[Any, Nothing, String, Int] =
    ZPipeline.splitLines >>>
      ZPipeline.map[String, Int] { str =>
        val arr = str.split(" ").map(RPS.apply)
        RPS.throwTheGame(arr.head, arr.last)
      }

  val scoreSink: ZSink[Any, Nothing, Int, Nothing, Int] = ZSink.sum[Int]

  val data = "day-2-1.data"
  override def run: ZIO[Any, Any, Any] = for {
    _ <- source(data)
      .via(pt1Pipeline)
      .run(scoreSink)
      .debug("Answer pt.1")
    _ <- source(data)
      .via(pt2Pipeline)
      .run(scoreSink)
      .debug("Answer pt.2")
  } yield ExitCode.success

}
```