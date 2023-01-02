---
title: Advent of Code - Day 9
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, ZIO, ZStream, Advent of Code]
---

My solution for https://adventofcode.com/2022/day/9

```scala
import zio.*
import zio.stream.*

import scala.annotation.tailrec
import scala.language.postfixOps

object Day9 extends ZIOAppDefault {

  val source: String => ZStream[Any, Throwable, String] =
    fileName =>
      ZStream
        .fromFileName(fileName)
        .via(ZPipeline.utfDecode >>> ZPipeline.splitLines)

  type Position = (Int, Int)
  extension (p: Position) {

    def add(that: Position): Position        = (p._1 + that._1, p._2 + that._2)
    def towards(that: Position): Position    = (that._1 - p._1, that._2 - p._2)
    def distanceFrom(that: Position): Double = {
      Math.abs(
        Math.sqrt(
          Math.pow(that._1 - p._1, 2) + Math.pow(that._2 - p._2, 2)
        )
      )
    }

    def diagonalTo(that: Position): Boolean = {
      p._1 != that._1 && p._2 != that._2
    }

    def adjacentTo(that: Position): Boolean = {
      p.distanceFrom(that) <= 1 || (p.distanceFrom(that) > 1 && p.distanceFrom(
        that
      ) < 2 && p.diagonalTo(that))
    }

    // Read the directions and directly you will be directed in the right direction.
    def follow(target: Position): Position = {
      // It they're not touching...
      if (!p.adjacentTo(target)) {
        // ... move p towards target via a unit distance...
        val unitDistance = p.towards(target) match {
          case (0, 0) => (0, 0)
          case (0, y) => (0, y / Math.abs(y))
          case (x, 0) => (x / Math.abs(x), 0)
          case (x, y) => (x / Math.abs(x), y / Math.abs(y))
        }
        p.add(unitDistance)
      } else p // ... otherwise, dont move.
    }
  }

  type Snek   = Array[Position]
  type Visits = Set[Position]

  object Snek {
    def apply(size: Int): Snek = Array.fill[Position](size)((0, 0))
  }

  extension (s: Snek) {

    // Move one
    def move(direction: String): (Snek, Visits) = {

      val newHead: Position = direction match {
        case "U" => (s.head._1, s.head._2 + 1)
        case "D" => (s.head._1, s.head._2 - 1)
        case "L" => (s.head._1 - 1, s.head._2)
        case "R" => (s.head._1 + 1, s.head._2)
      }

      val slithered =
        s.tail.foldLeft(Array(newHead))((snk, elem) =>
          snk :+ elem.follow(snk.last)
        )

      (slithered, Set(s.last, slithered.last))
    }

    // Move one...a bunch of times.
    @tailrec
    def loop(
        direction: String,
        amount: Int,
        snek: Snek = s,
        accum: Visits = Set.empty
    ): (Snek, Visits) = {
      if (amount == 0) {
        (snek, accum)
      } else {
        val moved = snek.move(direction)
        loop(direction, amount - 1, moved._1, accum ++ moved._2)
      }
    }

  }

  // No FiberRefs, today!
  def snekOps(size: Int) =
    ZPipeline.mapAccum[(String, Int), (Snek, Visits), Visits](
      (Snek(size), Set((0, 0)))
    ) { case (state, cmd) =>
      val movedSnek = state._1.loop(cmd._1, cmd._2)
      (movedSnek, movedSnek._2)
    }

  val data = "day-9.data"

  override def run: ZIO[Any, Any, Any] = for {
    _ <- source(data)
           .map { case s"$dir $amnt" =>
             (dir, amnt.toInt)
           }
           .via(snekOps(2))
           .runCollect
           .map(_.toSet.flatten.size)
           .debug("Answer pt1")
    _ <- source(data)
           .map { case s"$dir $amnt" =>
             (dir, amnt.toInt)
           }
           .via(snekOps(10))
           .runCollect
           .map(_.toSet.flatten.size)
           .debug("Answer pt2")
  } yield ExitCode.success

}
```