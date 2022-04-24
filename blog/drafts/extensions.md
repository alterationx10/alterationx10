---
title: "Contextual Abstractions: Extensions"
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Scala, Scala 3, scala-cli, Scala 2 => 3]
---

:::tip Scala 2 => 3 Series

This is a part in an ongoing series dealing with migrating old ways of doing things from Scala 2 to Scala 3. It will
cover
the [What's New in Scala 3](https://docs.scala-lang.org/scala3/new-in-scala3.html) from the official site.

Check the [`Scala 2 => 3`](/tags/scala-2-3) tag for others in the series! For the repo containing all the code,
visit [GitHub](https://github.com/alterationx10/three4s). There are code samples for both Scala 2 and Scala 3 together,
that are easy to run via `acala-cli`.
:::

This post is centered around [retroactively extending classes](https://docs.scala-lang.org/scala3/reference/contextual/extension-methods.html).

> In Scala 2, extension methods had to be encoded using implicit conversions or
> implicit classes. In contrast, in Scala 3 extension methods are now directly built into the language, leading to better
> error messages and improved type inference.

Extensions are one of my favorite things to use in Scala. Personally, I like the ability to add functionality to "
upstream" resources implicitly, but call that functionality explicitly. To me, it makes it a lot less likely to break
things during a refactor when you don't have to un-ravel a mysterious series of implicit def methods / conversions that
you might not realize are being called.

## The preface

For this example, let's say that we have some upstream domain model from a service we use but don't control.

```scala
case class UpstreamUser(id: Long, created: Instant, lastSeen: Instant)
```

In our service, we have a concept of when a user goes "stale" based on usage - but other services also
have this notion, and differing beliefs about what conditions make a user _stale_ - so we can't ask the upstream service 
to implement this for us on our model. Perhaps our model of what a stale user is changes over time as well.

Our conditions for a user going stale are:
* A user was created over a year ago
* A user hasn't been seen in the last week.

With that in mind, we could write some logic such as 

```scala
import java.time.Instant
import java.time.temporal.ChronoUnit._
def isStale(created: Instant, lastSeen: Instant):Boolean = {
     lastSeen.plus(7, DAYS).isBefore(Instant.now) &&
      created.plus(365, DAYS).isBefore(Instant.now)
  }
```

but calling that everywhere becomes a bit cumbersome, and it would be great if we could attach that 
functionality directly on `UpstreamUser`.

## Scala 2

In scala 2, we can use an `implicit class` to achieve our goal. An implicit class should
have *only one* constructor argument, of the Type that is being extended. It also needs to be housed
in something, typically an outer object. This can make setting up implicit classes feel a bit "boilerplate-y".

```scala
object UpstreamUserExtensions {
  implicit class ExtendedUpstreamUser(u: UpstreamUser) {
    def isStale: Boolean = {
      u.lastSeen.plus(7, DAYS).isBefore(Instant.now) &&
      u.created.plus(365, DAYS).isBefore(Instant.now)
    }
  }
}
```

Now, with `ExtendedUpstreamUser` in scope to implicitly add our new functionality, we can (explicitly) call 
`upstreamUserInstance.isStale` as if it were on the model directly.

## Scala 3

In Scala 3, it works much the same, but with less boilerplate. Instead of declaring an
implicit class, you declare an extension: `extension (u: UpstreamUser)` where the argument matches the `Type` you're
adding functionality to. This _doesn't_ need to be housed in an object either!

The corresponding Scala 3 code would look like:

```scala
extension (u: UpstreamUser) {
  def isStale: Boolean = {
    u.lastSeen.plus(7, DAYS).isBefore(Instant.now) &&
    u.created.plus(365, DAYS).isBefore(Instant.now)
  }
}
```

and then we'll get the same `upstreamUserInstance.isStale` functionality as before.

## Final Thoughts

Although the looks of the code have changed, if you're used to Scala 2 implicit classes, Scala 3 extensions will
probably be a welcomed ergonomics change, with a familiar feel for usage.
