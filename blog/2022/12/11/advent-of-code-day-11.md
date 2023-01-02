---
title: Advent of Code - Day 11
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, ZIO, ZStream, Advent of Code]
---

My solution for https://adventofcode.com/2022/day/11

```scala
import zio.*
import zio.metrics.Metric
import zio.metrics.MetricState.Counter
import zio.stream.*

object Day11 extends ZIOAppDefault {

  val source: String => ZStream[Any, Throwable, String] =
    fileName =>
      ZStream
        .fromFileName(fileName)
        .via(ZPipeline.utfDecode)

  case class Monkey(
      id: Int,
      startingItems: Seq[Long],
      op: Long => Long,
      test: Long => Boolean,
      action: Boolean => Int,
      mailbox: Queue[Long],
      mod: Long
  ) {

    // Hack the Metric system for counters }:-)
    private val monkeyMetrics =
      Metric.counterInt(id.toString)

    // On start, we'll send out initial items to our mailbox
    def initMailbox: ZIO[Any, Nothing, Unit] =
      mailbox.offerAll(startingItems).unit

    def inspect(
        passTo: Int => Queue[Long],
        worryLevel: Long
    ): ZIO[Any, Nothing, Unit] =
      for {
        mail <-
          mailbox.takeAll
            .map { items =>
              items
                .map(op)
                .map { w =>
                  worryLevel match {
                    case 3 =>
                      Math.floor(w / worryLevel).toLong // Method for pt.1
                    case _ => w % worryLevel // Method for pt.2
                  }
                }
                .map(w => (action(test(w)), w)) // (monkeyId, item)
            }
        _    <- monkeyMetrics.update(mail.length) // Mwahahahahaha!
        _    <- ZIO.foreachDiscard(mail)((mId, item) => passTo(mId).offer(item))
      } yield ()
  }

  // Get all of our Monkey INfo into a single-line
  val formatInput: ZPipeline[Any, Nothing, String, String] =
    ZPipeline.splitLines
      .filter(_.nonEmpty)
      .grouped(6)
      .map(_.mkString(""))

  // Create a Queue "mailbox" for each monkey
  val setupMailboxes: ZPipeline[Any, Nothing, String, (Queue[Long], String)] =
    ZPipeline.mapZIO[Any, Nothing, String, (Queue[Long], String)] { line =>
      Queue.unbounded[Long].map(q => (q, line))
    }

  // Functions all the way down
  val parseMonkey: ZPipeline[Any, Nothing, (Queue[Long], String), Monkey] =
    ZPipeline.map[(Queue[Long], String), Monkey] { case (q, line) =>
      val parseOpVal: String => Long => Long =
        str => default => if (str.equals("old")) default else str.toLong
      line match {
        case s"Monkey $id:  Starting items: $items  Operation: new = old $op $opVal  Test: divisible by $testVal    If true: throw to monkey $onTrueId    If false: throw to monkey $onFalseId" => {
          Monkey(
            id = id.toInt,
            startingItems = items.split(",").map(_.trim.toLong),
            op = op match {
              case "+" => (arg: Long) => arg + parseOpVal(opVal)(arg)
              case "*" => (arg: Long) => arg * parseOpVal(opVal)(arg)
            },
            test = (arg: Long) => (arg % testVal.toInt) == 0,
            action =
              (arg: Boolean) => if (arg) onTrueId.toInt else onFalseId.toInt,
            mailbox = q,
            mod = testVal.toInt
          )
        }
      }
    }

  // Iterate one round of monkey mayhem
  def oneRound(
      monkeyChunk: Chunk[Monkey],
      mailMap: Map[Int, Queue[Long]],
      worryLevel: Long
  ): ZIO[Any, Nothing, Unit] =
    ZIO.foreachDiscard(monkeyChunk.map(m => m.inspect(mailMap(_), worryLevel)))(
      identity
    )

  // Check our metric counters for the stats, find the product of the highest two.
  def monkeyStats(monkeyIds: Chunk[Int]): ZIO[Any, Nothing, Double] = for {
    counts <-
      ZIO
        .foreach(monkeyIds)(id =>
          Metric.counterInt(id.toString).value.map(_.count)
        )
  } yield counts.sortBy(-_).take(2).product

  val data = "day-11.data"

  override def run: ZIO[Any, Any, Any] = for {
    monkeyChunk <-
      source(data)
        .via(formatInput)
        .via(setupMailboxes)
        .via(parseMonkey)
        .runCollect
        .map(_.sortBy(_.id))
    _           <-
      ZIO.foreachDiscard(monkeyChunk)(_.initMailbox)
    mailboxes   <-
      ZIO
        .foreach(monkeyChunk)(m => ZIO.succeed((m.id, m.mailbox)))
        .map(_.toMap)
    monkeyMod   <-
      ZIO.succeed(monkeyChunk.map(_.mod).product) // .as(3) // use 3 for part 1
    _           <-
      ZIO.foreachDiscard(1 to 10000) { i =>
        oneRound(monkeyChunk, mailboxes, monkeyMod)
      }
    _           <-
      monkeyStats(monkeyChunk.map(_.id))
        .debug("(Too much) Monkey Business")
  } yield ExitCode.success

}
```