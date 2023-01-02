---
title: Advent of Code - Day 8
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, ZIO, ZStream, Advent of Code]
---

My solution for https://adventofcode.com/2022/day/8

```scala
import zio.*
import zio.stream.*

object Day8 extends ZIOAppDefault {

  val source: String => ZStream[Any, Throwable, String] =
    fileName =>
      ZStream
        .fromFileName(fileName)
        .via(ZPipeline.utfDecode >>> ZPipeline.splitLines)

  type Grid = Array[Array[Int]]
  object Grid {
    def apply(arr: Array[Array[Int]]): Grid = arr
  }

  extension (g: Grid) {

    def empty: Grid = Array.fill(g.length)(Array.fill(g.head.length)(0))

    def colToRow(col: Int): Array[Int] = g.map(arr => arr(col))

    def seenGrid: Grid = {
      val result: Grid = g.empty
      for (i <- g.indices) {
        for (j <- g.head.indices) {
          if (
            i == 0 || i == g.indices.max || j == 0 || j == g.head.indices.max
          ) {
            result(i)(j) = 1
          } else {
            val thisTree = g(i)(j)

            val seenByRow = g(i).take(j).forall(_ < thisTree) ||
              g(i).drop(j + 1).forall(_ < thisTree)

            val colRow    = g.colToRow(j)
            val seenByCol =
              colRow.take(i).forall(_ < thisTree) ||
                colRow.drop(i + 1).forall(_ < thisTree)

            result(i)(j) = if (seenByRow || seenByCol) 1 else 0
          }
        }
      }
      result
    }

    def scenicGrid: Grid = {
      val result: Grid = g.empty
      for (i <- g.indices) {
        for (j <- g.head.indices) {
          val thisTree = g(i)(j)
          val colRow   = g.colToRow(j)

          // Since we don't have takeUntil, add an offset if needed
          def offset(arr: Array[Int])   = if (arr.exists(_ >= thisTree)) 1 else 0
          val sizeOp: Array[Int] => Int =
            arr => arr.takeWhile(_ < thisTree).length + offset(arr)

          val up    = sizeOp(colRow.take(i).reverse)
          val down  = sizeOp(colRow.drop(i + 1))
          val left  = sizeOp(g(i).take(j).reverse)
          val right = sizeOp(g(i).drop(j + 1))

          result(i)(j) = up * down * left * right
        }
      }
      result
    }

    def sumElements: Int = g.map(_.sum).sum
    def maxElement: Int  = g.map(_.max).max

  }

  val data                             = "day-8.data"
  override def run: ZIO[Any, Any, Any] = for {
    grid <- source(data)
              .map(line => line.toArray.map(_.toString.toInt))
              .runCollect
              .map(d => Grid(d.toArray))
    _    <- Console.printLine(grid.seenGrid.sumElements)  // Part 1
    _    <- Console.printLine(grid.scenicGrid.maxElement) // Part 2
  } yield ExitCode.success

}
```
