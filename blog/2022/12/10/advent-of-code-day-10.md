---
title: Advent of Code - Day 10
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, ZIO, ZStream, Advent of Code]
---

My solution for https://adventofcode.com/2022/day/10

```scala
import zio.*
import zio.stream.*

object Day10 extends ZIOAppDefault {

  val source: String => ZStream[Any, Throwable, String] =
    fileName =>
      ZStream
        .fromFileName(fileName)
        .via(ZPipeline.utfDecode >>> ZPipeline.splitLines)

  case class CPU(register: Int, cycle: Int) {
    def noop: CPU =
      this.copy(cycle = cycle + 1)

    def addx(v: Int) =
      this.copy(register = register + v, cycle = cycle + 2)

    def signalStrength: Int =
      register * cycle

    def render(pixel: Int): String = {
      if ((register - 1 to register + 1).contains(pixel)) "#" else "."
    }
  }

  val commandParser: ZPipeline[Any, Nothing, String, (String, Int)] =
    ZPipeline.map[String, (String, Int)] {
      case "noop"     => "noop" -> 0
      case s"addx $v" => "addx" -> v.toInt
      case _          => throw new Exception("Unrecognized command")
    }

  val cycleStream: ZPipeline[Any, Nothing, (String, Int), Chunk[CPU]] =
    ZPipeline.mapAccum[(String, Int), CPU, Chunk[CPU]](CPU(1, 0)) {
      (state, cmd) =>
        cmd._1 match {
          case "noop" => (state.noop, Chunk(state.noop))
          case "addx" =>
            (state.addx(cmd._2), Chunk(state.noop, state.noop.noop))
        }
    }

  val interestingCycles: Set[Int] =
    (20 to 220 by 40).toSet

  val cycleFilter: ZPipeline[Any, Nothing, CPU, CPU] =
    ZPipeline.filter[CPU](cpu => interestingCycles.contains(cpu.cycle))

  val data = "day-10.data"

  override def run: ZIO[Any, Any, Any] = for {
    _ <- source(data)
           .via(commandParser >>> cycleStream)
           .flattenChunks
           .via(cycleFilter)
           .map(_.signalStrength)
           .runSum
           .debug("Answer pt.1")
    _ <- source(data)
           .via(commandParser >>> cycleStream)
           .flattenChunks
           .grouped(40)
           .map(_.zipWithIndex.map((cpu, pixel) => cpu.render(pixel)).mkString)
           .debug("Answer pt.2")
           .runDrain
  } yield ExitCode.success

}
```