---
title: Advent of Code - Day 5
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, ZIO, ZStream, Advent of Code]
---

My solution for https://adventofcode.com/2022/day/5


```scala
import zio.*
import zio.stream.*

import scala.annotation.tailrec
import scala.collection.mutable

object Day5 extends ZIOAppDefault {

  // Do NOT NOT NOT use a mutable data structure inside a FiberRef
  type SafeStack[A] = List[A]
  extension[A](safeStack: SafeStack[A]) {
    def push(a: A): SafeStack[A] = a +: safeStack
    def pop: (A, SafeStack[A]) = (safeStack.head, safeStack.tail)
    def peek: A = safeStack.head
    def popN(n: Int): (List[A], SafeStack[A]) =
      (safeStack.take(n), safeStack.drop(n))
    def pushN(l: List[A]): SafeStack[A] = l ++ safeStack
  }

  val source: String => ZStream[Any, Throwable, String] =
    fileName =>
      ZStream
        .fromFileName(fileName)
        .via(ZPipeline.utfDecode >>> ZPipeline.splitLines)

  // Moves one item at a time, multiple times.
  def craneOperation[A](
      a: FiberRef[SafeStack[A]],
      b: FiberRef[SafeStack[A]],
      amount: Int = 1
  ): UIO[Unit] = {
    (
      for {
        stackA <- a.get
        stackB <- b.get
        _ <- b.set(stackB.push(stackA.pop._1))
        _ <- a.set(stackA.pop._2)
      } yield ()
    ).repeatN(Math.max(0, amount - 1)).when(amount > 0).unit
  }

  // Move many items all at once
  def craneOperation9001[A](
      a: FiberRef[SafeStack[A]],
      b: FiberRef[SafeStack[A]],
      amount: Int = 1
  ): UIO[Unit] = {
    (
      for {
        stackA <- a.get
        stackB <- b.get
        _ <- b.set(stackB.pushN(stackA.popN(amount)._1))
        _ <- a.set(stackA.popN(amount)._2)
      } yield ()
    ).when(amount > 0).unit
  }

  // Scala is the best!
  def parseOperation(line: String): (Int, Int, Int) = line match {
    case s"move $amount from $stackA to $stackB" =>
      (amount.toInt, stackA.toInt, stackB.toInt)
  }

  // Parse out letters from a string located at multiple indices
  @tailrec
  def charsAt(
      str: String,
      indexes: Array[Int],
      accum: Seq[String] = Seq.empty
  ): Seq[String] = {
    if (indexes.nonEmpty) {
      charsAt(str, indexes.tail, accum :+ str.charAt(indexes.head).toString)
    } else {
      accum
    }
  }

  // Who doesn't love parsing an ascii diagram to an initial computational state?
  def parseInit(data: Chunk[String]): (Int, Chunk[Seq[String]]) = {
    val bottomsUp: Chunk[String] = data.reverse
    val nStacks: Int =
      bottomsUp.head.trim.split("""\s+""").map(_.toInt).max
    val stackIndexes: Array[Int] = bottomsUp.head.toCharArray.zipWithIndex
      .map { case (c, i) => if (c == ' ') -1 else i }
      .filter(_ >= 0)
    val stackData: Chunk[Seq[String]] =
      bottomsUp.tail.map(line => charsAt(line, stackIndexes))
    (nStacks, stackData)
  }

  val data = "day-5.data"
  override def run: ZIO[Scope, Any, Any] = for {
    // Load/parse the initial state
    initData: (Int, Chunk[Seq[String]]) <- source(data)
      .takeWhile(_.nonEmpty)
      .run(
        ZSink.collectAll
          .map(data => parseInit(data))
      )
    // Stage a map of empty FiberRef[SafeStack[String]]
    refMap <- ZIO
      .foreach(1 to initData._1)(i =>
        FiberRef.make[SafeStack[String]](List.empty[String]).map(s => (i -> s))
      )
      .map(_.toMap)
    // Load our initial state into our FiberRefs
    ziosToRun <- ZIO.attempt {
      initData._2.flatMap { rowToLoad =>
        rowToLoad.zipWithIndex.map { case (s, i) =>
          val stackRef: FiberRef[SafeStack[String]] =
            refMap.getOrElse(i + 1, throw new Exception(""))
          stackRef.get
            .flatMap(stack => stackRef.set(stack.push(s)))
            .when(s != " ")
        }
      }
    }
    _ <- ZIO.foreach(ziosToRun)(identity)
    // DO IT TO IT
    _ <- source(data)
      .dropUntil(_.isEmpty)
      .map(parseOperation)
      .tap(cmd =>
        // use craneOperation for part1
        craneOperation9001(
          refMap.getOrElse(cmd._2, throw new Exception("")),
          refMap.getOrElse(cmd._3, throw new Exception("")),
          cmd._1
        )
      )
      .runDrain
    results <- ZIO.foreach(refMap.toSeq.sortBy(_._1)) { case (_, ref) =>
      ref.get.map(_.peek)
    }
    _ <- ZIO.attempt(results.mkString).debug("Top Boxes")
  } yield ExitCode.success

}
```
