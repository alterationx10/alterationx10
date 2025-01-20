---
title: Publishing Artifacts to GitHub
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags:
  - scala
  - sbt
  - github
  - github actions
---

Hello, class. Today we're going to use sbt to publish artifacts to GitHub packages via GitHub Actions when we
tag/release our codebase, and we're not going to use *any* sbt plugins to do it!

## It's not that scary

If you check the official [SBT Documentation](https://www.scala-sbt.org/1.x/docs/Publishing.html), you can see that the
main things you need to do are specify _where_ you are going to publish

```scala
publishTo := Some("Sonatype Snapshots Nexus" at "https://oss.sonatype.org/content/repositories/snapshots")
```

and how to authenticate with that repository

```scala
credentials += Credentials("Sonatype Nexus Repository Manager", "my.artifact.repo.net", "admin", "admin123")
```

that's it!™️

## Lead by example

I'm working on a (very new) project that's a slim framework to build ZIO based CLI apps
called [ursula](https://github.com/alterationx10/ursula), so I will use this as an example, and talk through the
`build.sbt` file, and what the important "gotchas" are. The general plan is:

1. Show the full build.sbt file
2. Discuss parsing tags to artifact versions using default environment variables
3. Configure SBT to publish to our repositories package endpoint
4. Cover some SBT gotchas

### 1 The full build.dbt

The general structure of this project is that the main library lives in a project/folder named `ursual`, and there
is an `example` project that depends on it. We'll cover this in the "gotchas", but there is _not_ a `root` project.

```scala
val tagWithQualifier: String => String => String =
  qualifier =>
    tagVersion => s"%s.%s.%s-${qualifier}%s".format(tagVersion.split("\\."): _*)

val tagAlpha: String => String = tagWithQualifier("a")
val tagBeta: String => String = tagWithQualifier("b")
val tagMilestone: String => String = tagWithQualifier("m")
val tagRC: String => String = tagWithQualifier("rc")

val defaultVersion: String = "0.0.0-a0"
val versionFromTag: String = sys.env
  .get("GITHUB_REF_TYPE")
  .filter(_ == "tag")
  .flatMap(_ => sys.env.get("GITHUB_REF_NAME"))
  .flatMap { t =>
    t.headOption.map {
      case 'a' => tagAlpha(t.tail) // Alpha build, a1.2.3.4
      case 'b' => tagBeta(t.tail) // Beta build, b1.2.3.4
      case 'm' => tagMilestone(t.tail) // Milestone build, m1.2.3.4
      case 'r' => tagRC(t.tail) // RC build, r1.2.3.4
      case 'v' => t.tail // Production build, should be v1.2.3
      case _ => defaultVersion
    }
  }
  .getOrElse(defaultVersion)

ThisBuild / organization := "com.alterationx10"
ThisBuild / version := versionFromTag
ThisBuild / scalaVersion := "2.13.8"
ThisBuild / publish / skip := true
ThisBuild / publishMavenStyle := true
ThisBuild / versionScheme := Some("early-semver")
ThisBuild / publishTo := Some(
  "GitHub Package Registry " at "https://maven.pkg.github.com/alterationx10/ursula"
)
ThisBuild / credentials += Credentials(
  "GitHub Package Registry", // realm
  "maven.pkg.github.com", // host
  "alterationx10", // user
  sys.env.getOrElse("GITHUB_TOKEN", "abc123") // password
)

lazy val ursula = project
  .in(file("ursula"))
  .settings(
    name := "ursula",
    libraryDependencies ++= Seq(
      "dev.zio" %% "zio" % "2.0.0-RC6"
    ),
    fork := true,
    publish / skip := false
  )

lazy val example = project
  .in(file("example"))
  .settings(
    publishArtifact := false,
    fork := true
  )
  .dependsOn(ursula)

```

### 2 Setting the package version

Note that this section is more about how I am deploying versions for packages. You likely already have a versioning
scheme, and are handling that mapping, but here you go anyway 😆

Maven as a [version ordering specification](https://maven.apache.org/pom.html#version-order-specification) that we'll
use for non-numeric qualifiers, which has this ordering:

> "alpha" < "beta" < "milestone" < "rc" = "cr" < "snapshot" < "" = "final" = "ga" < "sp"

In all honesty, for simple projects this many qualifiers is probably overkill! I've mapped out `alpha`, `beta`
, `milestone`, `rc` and `""` (which is no qualifier, or "final"/"ga").

A note about GitHub packages that was true the _last_ time I tried publishing `SNAPSHOTS` (not sure if this is still the
case), but they do not allow you to overwrite a package - so to publish over top of an existing SNAPSHOT - you'd need to
delete it first, and upload the new one. That's more work than it's worth, so I've designated `alpha`s as my "snapshots"

With that in mind, I want to use git tags to map to these, so, for example, I've designated that tags `a.1.2.3.4` should
build with version `1.2.3-a4`. So by providing a different initial character (`a/b/m/r`), I can control what qualifier
it's release as.

With that outlined, I can achieve this with the `tagWithQualifier` function below (and it's helpers).

```scala
val tagWithQualifier: String => String => String =
  qualifier =>
    tagVersion => s"%s.%s.%s-${qualifier}%s".format(tagVersion.split("\\."): _*)

val tagAlpha: String => String = tagWithQualifier("a")
val tagBeta: String => String = tagWithQualifier("b")
val tagMilestone: String => String = tagWithQualifier("m")
val tagRC: String => String = tagWithQualifier("rc")
```

And when I want to do a "production release", I just use the common `v1.2.3` tag.

We will
use [default environment variables](https://docs.github.com/en/actions/learn-github-actions/environment-variables#default-environment-variables)
to read the git tags, so we can parse them.

We will check + filter for `GITHUB_REF_TYPE`; this can be `branch` or `tag` (we want `tag`). If we made it this far,
we will then check `GITHUB_REF_NAME` - which at this point, should be the value of out git tag.

```scala
val defaultVersion: String = "0.0.0-a0"
val versionFromTag: String = sys.env
  .get("GITHUB_REF_TYPE")
  .filter(_ == "tag")
  .flatMap(_ => sys.env.get("GITHUB_REF_NAME"))
  .flatMap { t =>
    t.headOption.map {
      case 'a' => tagAlpha(t.tail) // Alpha build, a1.2.3.4
      case 'b' => tagBeta(t.tail) // Beta build, b1.2.3.4
      case 'm' => tagMilestone(t.tail) // Milestone build, m1.2.3.4
      case 'r' => tagRC(t.tail) // RC build, r1.2.3.4
      case 'v' => t.tail // Production build, should be v1.2.3
      case _ => defaultVersion
    }
  }
  .getOrElse(defaultVersion)
```

Now we have a way to dynamically set the version published based on git tagging!

```scala
ThisBuild / version := versionFromTag
```

### 3 Where to publish

We need to set our `publishTo` and `credentials`. For the publishTo, GitHub has the structure
`"https://maven.pkg.github.com/USER/REP"`, so just update with your information. This pattern should hold for orgs as
well. An important thing to note is the realm `"GitHub Package Registry"`. This is handled automatically, but when
publishing hits the repository, it'll give back a
[401](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401) and tell you how you should authenticate and _what
the realm is_. The significant thing to note, is that the value here for the realm is fixed, and determined by the
hosting server. sbt will use this realm to find the matching set of `credentials`.

```scala
ThisBuild / publishTo := Some(
  "GitHub Package Registry" at "https://maven.pkg.github.com/alterationx10/ursula"
)
ThisBuild / credentials += Credentials(
  "GitHub Package Registry", // realm
  "maven.pkg.github.com", // host
  "alterationx10", // user
  sys.env.getOrElse("GITHUB_TOKEN", "abc123") // password
)
```

We will use an environment variable `GITHUB_TOKEN` to provide our password. Note, that you could do the same thing for
the user value.

### 4 SBT gotchas

This isn't an all-inclusive list, but just a couple of things to keep in mind.

GitHub packages only supports Maven structure, so we need to set `publishMavenStyle` to true. We will set out version
schema to "early-semver", which keeps binary compatibility across patch updates within `0.Y.z` until you hit `1.0.0`.

The most important "gotcha" here is `ThisBuild / publish / skip    := true`. Since I do not have a `root` project here,
sbt will make a `default` one, and aggregate the projects into. This means that it will also try to publish a package
named `default`! We can either define a `root` project as a placeholder, and configure it accordingly - or globally set
the default to skip publishing, but then re-enabling it in the project we're looking to deploy. The latter is shown
here.

```scala
ThisBuild / publish / skip := true
ThisBuild / publishMavenStyle := true
ThisBuild / versionScheme := Some("early-semver")

lazy val ursula = project
  .in(file("ursula"))
  .settings(
    name := "ursula",
    libraryDependencies ++= Seq(
      "dev.zio" %% "zio" % "2.0.0-RC6"
    ),
    fork := true,
    publish / skip := false
  )
```

## Lights! Camera! GitHub Action!

Now that sbt has been included in the environment loaded into the setup-java action, this is easier than it's ever been.
For any action, you can use that and just `sbt <your task>`.

For out case, we only want this to run when we create a release (which is a git tag action), so note the `on:` block.

We've set up our `build.sbt` file to use ENV variables that are automatically provided, but we also use the
auto-generated ci token: `GITHUB_TOKEN` which is available automatically - that should be set in the `env:` block. If
you wanted to use a personal access token, you could store and access the secret in the same way!

```yaml
name: Publish Artifact on Release
on:
  release:
    types: [ created ]
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Set up JDK
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
          cache: 'sbt'
      - name: Publish
        run: sbt publish
```

To kick it off, you just need to create a release with a structured git tag. the hardest part is not mistyping for tag
🤣 The packages wills tart to show up on you repositories page, right below the "release" section.

## Wrapping up

Now, you too can publish your scala artifacts to GitHub packages without relying on a pre-made sbt plugin! How exciting.

