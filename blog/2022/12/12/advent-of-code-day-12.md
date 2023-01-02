---
title: Advent of Code - Day 12
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, ZIO, ZStream, Advent of Code]
---

My solution for https://adventofcode.com/2022/day/12

```scala
import zio.*
import zio.stream.*

object Day12 extends ZIOAppDefault {

  val source: String => ZStream[Any, Throwable, String] =
    fileName =>
      ZStream
        .fromFileName(fileName)
        .via(ZPipeline.utfDecode >>> ZPipeline.splitLines)

  type Position = (Int, Int)

  // Naming stuff is hard
  case class Thing(
      position: Position,
      visited: Seq[Position],
      altitude: Int,
      target: Position
  ) {

    val hasArrived: Boolean = position == target
    val stepsTaken: Int     = visited.length

    // Safely bounded neighbors
    def neighbors(grid: Array[Array[Int]]): Seq[Thing] = {
      val up: Position    = (position._1, position._2 + 1)
      val down: Position  = (position._1, position._2 - 1)
      val left: Position  = (position._1 - 1, position._2)
      val right: Position = (position._1 + 1, position._2)
      Seq(
        Thing.neighborApply(up, grid),
        Thing.neighborApply(left, grid),
        Thing.neighborApply(down, grid),
        Thing.neighborApply(right, grid)
      ).flatten
    }

    // Don't visit places we've been, or are geographically locked from
    private def canVisit(grid: Array[Array[Int]]): Seq[Thing] = neighbors(grid)
      .filterNot(n => visited.contains(n.position))
      .filter(n => n.altitude - this.altitude <= 1)

    private def moveTo(that: Thing): Thing = that.copy(
      visited = this.visited :+ that.position,
      target = this.target
    )

    def branch(grid: Array[Array[Int]]): Seq[Thing] = if (hasArrived) {
      Seq.empty
    } else {
      canVisit(grid).map(moveTo)
    }

  }

  object Thing {

    // Only use to init neighbors - lacks info to safely propagate
    def neighborApply(
        position: Position,
        grid: Array[Array[Int]]
    ): Option[Thing] = {
      if (
        grid.head.indices
          .contains(position._1) && grid.indices.contains(position._2)
      ) {
        Some(
          Thing(
            position = position,
            visited = Seq.empty,
            target = (0, 0),
            altitude = grid(position._2)(position._1)
          )
        )
      } else {
        None
      }
    }

  }

  def charLocations(c: Char, grid: Array[Array[Char]]): Array[(Int, Int)] =
    grid
      .map(_.zipWithIndex.filter(_._1 == c))
      .zipWithIndex
      .filter(_._1.nonEmpty)
      .map { case (arr, y) => (arr.map(_._2).head, y) }

  val data = "day-12.data"

  override def run: ZIO[Scope, Any, Any] = for {
    shortestArrival <- FiberRef.make[Int](Int.MaxValue)
    visited         <- FiberRef.make[List[Position]](List.empty)
    branchingQueue  <- Queue.unbounded[Thing]
    arrivalQueue    <- Queue.unbounded[Thing]
    charGrid        <- source(data)
                         .map(_.toCharArray)
                         .runCollect
                         .map(_.toArray)
    altGrid         <- ZIO.attempt {
                         charGrid.map { rows =>
                           rows
                             .map {
                               case 'S' => 'a'
                               case 'E' => 'z'
                               case any => any
                             }
                             .map(_.toInt - 97)
                         }
                       }
    initCoords      <- ZIO
                         .attempt {
                           val sPosition  = charLocations('S', charGrid).head
                           val aPositions = charLocations('a', charGrid)
                           val ePosition  = charLocations('E', charGrid).head
                           (
                             sPosition +: aPositions.toList,
                             ePosition
                           )
                         }
    _               <- branchingQueue.offerAll(
                         initCoords._1
                           .map { pos =>
                             Thing(
                               position = pos,
                               visited = Seq.empty,
                               target = initCoords._2,
                               altitude = altGrid(pos._2)(pos._1)
                             )
                           }
//                           .take(1) // use just the S position for part 1
                       )
    _               <- branchingQueue.take
                         .flatMap { item =>
                           for {
                             shortest <- shortestArrival.get
                             visits   <- visited.get
                             _        <- visited
                                           .set(visits :+ item.position)
                                           .when(!visits.contains(item.position))
                             _        <-
                               branchingQueue
                                 .offerAll(
                                   item
                                     .branch(altGrid)
                                     .filter(_.stepsTaken < shortest)
                                 )
                                 .when(!visits.contains(item.position))
                             _        <- arrivalQueue.offer(item).when(item.hasArrived)
                             _        <- shortestArrival
                                           .set(item.stepsTaken)
                                           .when(item.hasArrived && item.stepsTaken < shortest)
                           } yield ()
                         }
                         .repeatUntilZIO(_ =>
                           branchingQueue.isEmpty
                         ) *> branchingQueue.shutdown
    _               <- arrivalQueue.takeAll
                         .map(_.map(_.stepsTaken).min)
                         .debug("Min")
  } yield ExitCode.success

}
```