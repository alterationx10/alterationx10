---
title: Advent of Code - Day 7
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, ZIO, ZStream, Advent of Code]
---

My solution for https://adventofcode.com/2022/day/7

```scala
import zio.*
import zio.stream.*

object Day7 extends ZIOAppDefault {

  val source: String => ZStream[Any, Throwable, String] =
    fileName =>
      ZStream
        .fromFileName(fileName)
        .via(ZPipeline.utfDecode >>> ZPipeline.splitLines)

  type Path = List[String]

  case class Directory(
      path: Path
  )

  case class File(
      path: Path,
      size: Long
  )

  case class ElfFS(
      dirs: List[Directory],
      files: List[File],
      currentPath: Path
  )

  object ElfFS {
    def apply(): ElfFS =
      ElfFS(List.empty, List.empty, List.empty)
  }

  extension (efs: ElfFS) {

    // Add a directory, if we haven't seen it before
    def mkDirectoryIfNotExists(dir: String): ElfFS = {
      val dirAtPath = Directory(efs.currentPath :+ dir)
      if (efs.dirs.contains(dirAtPath)) {
        efs
      } else {
        efs.copy(dirs = efs.dirs :+ dirAtPath)
      }
    }

    // Add a file, if we haven't seen it before
    def mkFileIfNotExists(name: String, size: Long): ElfFS = {
      val fileAtPath = File(efs.currentPath :+ name, size)
      if (efs.files.contains(fileAtPath)) {
        efs
      } else {
        efs.copy(files = efs.files :+ fileAtPath)
      }
    }

    // Process the input
    def process(line: String): ElfFS = line match {
      case s"$$ cd $path"   =>
        path match {
          case ".." => efs.copy(currentPath = efs.currentPath.dropRight(1))
          case _    => efs.copy(currentPath = efs.currentPath :+ path)
        }
      case "$ ls"           => efs
      case s"dir $dir"      => mkDirectoryIfNotExists(dir)
      case s"$fSize $fName" => mkFileIfNotExists(fName, fSize.toLong)
    }

    def sumFilesUnder(dir: Directory): Long = {
      efs.files
        .filter(f => f.path.mkString.startsWith(dir.path.mkString))
        .map(_.size)
        .sum
    }

    def sumResult(sizeLimit: Long): Long = {
      efs.dirs
        .map(sumFilesUnder)
        .filter(_ <= sizeLimit)
        .sum
    }

    def findMinFolderSize: Long = {
      val capacity: Long    = 70000000
      val spaceNeeded: Long = 30000000
      val totalUsed         = efs.files.map(_.size).sum
      val unused            = capacity - totalUsed
      val needToDelete      = spaceNeeded - unused

      efs.dirs
        .map(sumFilesUnder)
        .filter(_ >= needToDelete)
        .min
    }

  }

  val data                               = "day-7.data"
  override def run: ZIO[Scope, Any, Any] = for {
    elfRef <- FiberRef.make(ElfFS())
    _      <- source(data)
                .foreach(line => elfRef.getAndUpdate(efs => efs.process(line)))
    _      <- elfRef.get
                .map(efs => efs.sumResult(100000))
                .debug("Answer pt.1")
    _      <- elfRef.get
                .map(_.findMinFolderSize)
                .debug("Answer pt.2")
  } yield ExitCode.success

}
```