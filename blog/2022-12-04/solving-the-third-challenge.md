---
title: Advent of Code - Solving the Third Problem
author: Mark Rudolph
author_url: https://github.com/alterationx10
author_image_url: https://avatars1.githubusercontent.com/u/149476?s=460&v=4
tags: [Advent of Code, Unsolicited Advice, Scala]
---

It's that time of the year again, and the 2022
[Advent of Code](https://adventofcode.com) is up and running! If you're
unfamiliar with it, the Advent of Code (AoC) is a series of programming puzzles
that runs from December 1 - 25; one question a day, with two parts each. You can
claim points on a leader board by being the fastest to solve a problem, but I
generally just do them for fun.

I don't think I've ever finished all 25 days before, due to inevitably falling
too far behind over the course of the month, but I have a fondness for it,
because it pushed me to use a very valuable skill, that I try to use every day:
**solve the next question before it's asked.** Or, you know, _try to_.

When I first started participating, as a casual player, I would usually try to
solve the problem with one-liners, and add operating logic while mapping through
steps that was as close to a series of one-liners as I could make it. Then, for
the second part, I'd find myself doing mostly the same, _from scratch_, to solve
the **twist** on the original question that the second part asked for. It was a
real slog. Eventually, I stopped trying to solve the first question for what was
asked, and started to solve it for what I thought the second question was going
to be.

That's what I consider the third, and most challenging problem; solving the
first one in such a way that the code can be (mostly) re-used in anticipation of
the second part with minimal re-write, but also not over-engineering a bloated
solution that would be a pain to maintain. Also, it's the most fun problem to
solve! It's always exciting to get it right, and worse case you've invested
yourself deeper in the problem-space you're trying to solve.

Here's an example of from Day 4. The premise of the question is that some elves
are assigned rooms to clean, but it's noticed that, given a pair of elves, some
of their assigned rooms overlap. The (literal) question to part one:

> In how many assignment pairs does one range fully contain the other?

The straight-forward thing to do, as we iterate over pairs of elves, is to check
_does one completely overlap, or not?_

```scala
def redundant: Boolean =
    (workers._1.assignedTo.toSet, workers._2.assignedTo.toSet) match {
        case (a, b) if a.subsetOf(b) | b.subsetOf(a) => true
        case _                                       => false
    }
```

And that's the right solution! It will get you the answer. Ship it! But, perhaps
ask yourself, "What's a next logical question I might be asked once I know if
there has been overlapping rooms assigned?". My solution for this part of the
question answers if there is a redundancy, _and if so, which elf is redundant_.

```scala
def redundant: Option[Int] =
    (workers._1.assignedTo.toSet, workers._2.assignedTo.toSet) match {
        case (a, b) if a.subsetOf(b) => Some(1)
        case (a, b) if b.subsetOf(a) => Some(2)
        case _                       => None
    }
```

That solution serves the same logic as the first - I can check if the `Option`
is defined or not for a true/false solution, but now I have the added power of
peaking into the result if I need to know which one to re-assign. _Spoiler
alert, the follow up question didn't ask about it this time._

I've found these little pieces of logic can start to add up in a larger code
base encompassing some domain, and when you're asked how long it would take to
roll out some new feature, instead of saying "2 weeks", you can say, "We'll,
it's funny you should ask that..."

If you're interested in my full solution for day 4, you can find it
[here](./advent-of-code-day-4.md).
