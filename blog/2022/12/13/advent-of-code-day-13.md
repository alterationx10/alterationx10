---
title: Advent of Code - Day 13
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, ZIO, ZStream, Advent of Code]
---

My solution for https://adventofcode.com/2022/day/13

```scala
import zio.*
import zio.stream.*

import scala.annotation.tailrec

object Day13 extends ZIOAppDefault {

  val source: String => ZStream[Any, Throwable, String] =
    fileName =>
      ZStream
        .fromFileName(fileName)
        .via(ZPipeline.utfDecode >>> ZPipeline.splitLines)

  // My beautiful parser only works on single digits 😭
  // Fix it? NO!
  // Hack the encoding!
  // Example, turns "10" into ":" which is 10 higher than "0" as a Char
  extension (s: String) {
    def needsEncoding(line: String): List[String] = {
      line
        .sliding(2)
        .filterNot(c => c.contains('['))
        .filterNot(c => c.contains(']'))
        .filterNot(c => c.contains(','))
        .toList
    }

    @tailrec
    def encodeLoop(str: String, toReplace: List[String]): String = toReplace match {
      case Nil      => str
      case h :: Nil => str.replace(h, (h.toInt + 48).toChar.toString)
      case h :: t   => encodeLoop(str.replace(h, (h.toInt + 48).toChar.toString), t)
    }

    def rawPacket: List[Any] = {
      val hacked = encodeLoop(s, needsEncoding(s))
      hacked.toList.drop(1).dropRight(1).map(_.toString).filterNot(_ == ",").map {
        case "[" => "["
        case "]" => "]"
        case n   => n.toCharArray.head - 48
      }
    }
  }

  // Handy methods to go back to the String version of the input
  // for when you don't realize you've been parsing 10 as 1,0 for a day,
  // and you start questioning your life and what it all means.
  extension (l: List[Any]) {
    def subPacket(la: List[Any]): String = la
      .map {
        case e: Int       => e.toString
        case l: List[Any] => "[" + subPacket(l) + "]"
      }
      .mkString(",")

    def toRawPacket: String = "[" + subPacket(l) + "]"
  }

  // Good for data that occupies one character width 😃
  @tailrec
  def parsePacket(lst: List[Any]): List[Any] = {
    if (lst.contains("[")) {
      val indexed = lst.zipWithIndex
      val open    = indexed.findLast(_._1 == "[").get._2
      val close   = indexed.drop(open).find(_._1 == "]").get._2
      val spliced =
        (lst.take(open) :+ lst.slice(open + 1, close)) ++ lst.drop(close + 1)
      if (spliced.contains("[")) {
        parsePacket(spliced)
      } else {
        spliced
      }
    } else lst

  }

  // Did we succeed? Did we fail? Or did we just *maybe* fail?
  def innerCompare(packets: (List[Any], List[Any])): Option[Boolean] = {
    if (packets._1.isEmpty && packets._2.nonEmpty) return Some(true)
    if (packets._1.nonEmpty && packets._2.isEmpty) return Some(false)

    (for {
      left  <- packets._1.headOption
      right <- packets._2.headOption
    } yield {
      (left, right) match {
        case (l: Int, r: Int) if l == r   => innerCompare(packets._1.tail, packets._2.tail)
        case (l: Int, r: Int)             => Some(l < r)
        case (_: List[Any], r: Int)       => innerCompare(packets._1, List(r) +: packets._2.drop(1))
        case (l: Int, _: List[Any])       => innerCompare(List(l) +: packets._1.drop(1), packets._2)
        case (l: List[Any], r: List[Any]) => innerCompare(l, r)
      }
    }).flatten

  }

  // Where the magic happens
  def compare(packets: (List[Any], List[Any])): Boolean = {
    if (packets._1.isEmpty && packets._2.nonEmpty) return true
    if (packets._1.nonEmpty && packets._2.isEmpty) return false

    (for {
      left  <- packets._1.headOption
      right <- packets._2.headOption
    } yield {
      (left, right) match {
        case (l: Int, r: Int) if l == r   => compare(packets._1.tail, packets._2.tail)
        case (l: Int, r: Int)             => l < r
        case (l: List[Any], r: Int)       => compare(packets._1, List(r) +: packets._2.tail)
        case (l: Int, r: List[Any])       => compare(List(l) +: packets._1.tail, packets._2)
        case (l: List[Any], r: List[Any]) => {
          // Need to distinguish against a fail from empty vs a fail from actually failing
          // in order to recurse and not lose information
          innerCompare(l, r).getOrElse(compare(packets._1.tail, packets._2.tail))
        }
      }
    }).getOrElse(false)

  }

  val data = "day-13.test"

  // I'm not even going to clean this up.
  override def run: ZIO[Any, Any, Any] = for {
    _ <- source(data)
           .split(_ == "")
           .map(_.map(_.rawPacket))
           .map(_.map(parsePacket))
           .map(c => (c.head, c.last))
           .map(compare)
           .zipWithIndex
           .filter(_._1 == true)
           .map(_._2 + 1)
           .runSum
           .debug("Answer pt 1")
    _ <- (source(data) ++ ZStream("[[2]]", "[[6]]"))
           .filterNot(_ == "")
           .map(_.rawPacket)
           .map(parsePacket)
           .runCollect
           .map(
             _.sortWith((a, b) => compare(a, b)).zipWithIndex
               .filter((l, i) => l == List(List(2)) || l == List(List(6)))
               .map(_._2 + 1)
               .product
           )
           .debug("Answer pt 2")
  } yield ExitCode.success

}
```