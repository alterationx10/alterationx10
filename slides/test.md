---
title: Test Slides
description: This is a test presentation using Marp
author: Mark Rudolph
keywords: scala,zio
url: https://alterationx10.com
theme: dracula
marp: true
---

# **Marp**

Title slide would go here

https://alterationx10.com

---

# Second slide

Here is some code

```scala
  // Indexes start at 0. Avoid an extra map by prepending an element, and taking the tail.
  val priorities: Map[Char, Int] =
    (('a' +: ('a' to 'z')) ++ ('A' to 'Z')).zipWithIndex.tail.toMap
```

---

# Third most slide

Letters and words, coming together to make sentences.