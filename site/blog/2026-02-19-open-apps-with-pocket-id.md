---
title: Open Apps with Pocket ID
description: Setting up Pocket ID for passwordless authentication across self-hosted apps
author: Mark Rudolph
published: 2026-02-19T18:42:00Z
lastUpdated: 2026-02-19T18:42:00Z
tags:
  - PocketID
  - Open Source
  - Scala
  - Passkeys
  - Self-Hosting
  - Authentication
---

I've decided to take some time off of work recently, and thought it would be fun to put a spin on "how to" blog posts.
In addition to writing about a particular topic, I thought it could be cool to actually deploy it somewhere and allow it
to be publicly used. I've had this idea before, but I'd still like to have user authentication that I can streamline
across various applications at different subdomains. There are plenty of auth solutions out there, but I recently came
across one that is simple to deploy called [Pocket ID](https://pocket-id.org), which exclusively
uses [passkeys](https://www.passkeys.io).

Pocket ID is open source and can be self-hosted. Passkeys are a modern, passwordless authentication method that replaces
passwords with cryptographic key pairs (public/private) stored on your device — easy and secure auth, with no managing
people's passwords!

I was also recently re-reading [Hands on Scala](https://www.handsonscala.com/about.html) (which is now free online and
updated for Scala 3), and was inspired to use more of the libraries
in [The lihaoyi Scala Platform 🇸🇬](https://github.com/com-lihaoyi#the-lihaoyi-scala-platform). In my spare time, I had
been working on a zero-dependency Scala framework called [branch](https://github.com/alterationx10/branch). It was a
more educational endeavor, and I thought about porting out the more interesting components, and replacing modules with
existing, more battle-tested libraries from this ecosystem. I know... I know... what will Scala do with one *less* JSON
library? 😁 It's probably for the best. I've broken most of those out to their own libraries. They're still "hobby"
projects, but you could learn more about them here:

- [lzy](https://github.com/alterationx10/lzy) - Somewhere between lazy Futures, and a tiny Effect System for Scala
- [spider](https://github.com/alterationx10/spider) - A server-side reactive UI library for Scala 3, inspired by Phoenix
  LiveView
- [keanu](https://github.com/alterationx10/keanu) - A typed EventBus implementation and a local ActorSystem for
  message-based concurrency patterns
- [mustachio](https://github.com/alterationx10/mustachio) - A Mustache template engine implementation in Scala
- [hollywood](https://github.com/alterationx10/hollywood) - A library for building LLM agents in Scala 3
- [piggy](https://github.com/alterationx10/piggy) - A Scala library for working with SQL via `java.sql`

I have deployed an instance of Pocket ID, and made a small, reusable library with some auth helpers
called [hookshot](https://github.com/alterationx10/hookshot). Hopefully soon, I will write a post about the
authentication flow, and then about the first app I'm planning - a short link server. 