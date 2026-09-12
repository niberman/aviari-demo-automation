# Decisions

A log of the calls made where the brief left room, and why.

## Architecture

- The demo database lives in the browser. The whole world derives from a seed
  based on the current UTC hour, writes layer on top in memory, and the hour
  rollover regenerates everything. This made the strongest version of the
  isolation rule: there is no server data path at all, so no production
  system is reachable from this demo even in principle. It also gives the
  fastest possible cold load and keeps visitors from stepping on each other's
  session, which a shared server database would not.
- The reset job is the hour seed itself. State returns to seed on the hour,
  every hour, in every tab, which is observable mid visit as a reset toast. A
  cron endpoint that cleared nothing would have been theater, so there is
  none. Schedule, stated as cron: `0 * * * *`.
- The build still gates on isolation. `check-isolation.mjs` scans source and
  environment for connection strings and live credential shapes and fails the
  build if any appear, on every local and Vercel build.

## Simulation

- Base state is hour seeded, but the event program is visit relative: the
  scripted morning starts when the visitor arrives, so everyone sees the
  feed move, a message arrive, and milk cross below par in the first minute,
  not just visitors who happen to arrive at the top of the hour.
- The simulated clock maps the real minute of the hour onto the 6 AM hour in
  Denver, so the morning brief is always read at the hour it was built for.
- The milk rule crossing early in the program doubles as the preview clip
  moment and as the first thing most visitors see happen live.
- A callout, a delivery restock, vendor acknowledgements after replies, and
  filler preorders keep all five screens moving for long visits.
- `?clock=` and `?speed=` query parameters exist for testing, capture, and
  reviewers, and are documented in the README.

## Content

- All names are invented. Vendors use unlikely word pairs, staff use common
  fictional names, and the purchase order PDF carries a fictional data
  disclaimer. No street addresses appear anywhere.
- Copy follows the house rules: no em dashes, en dashes, exclamation points,
  or emoji anywhere, enforced by `lint-copy.mjs` at build time and by a unit
  test over the generated world.
- The weekly labor budget was set so the seed week runs close to it without
  going over, since a schedule that starts over budget would contradict the
  suggestion copy beside it.

## Build

- No router, chart, or state libraries. A small history router, hand drawn
  SVG sparkbars, and a `useSyncExternalStore` store cover what the five
  screens need. React is the only runtime dependency besides the two fonts.
- The purchase order PDF is written by hand as a minimal single page PDF 1.4
  file with standard fonts. A unit test validates the xref table offsets and
  parses the output with a real PDF parser.
- Inter and JetBrains Mono are self hosted through Fontsource, so no third
  party font requests happen at runtime.
- The four non landing screens are lazy loaded to keep the first paint of
  the brief light. The reveal choreography ends in a terminal settled state
  driven by a timer, so browsers that pause animations in hidden tabs never
  strand the page mid fade.

## Accessibility and motion

- Shift moves work three ways: pointer drag, and a keyboard mode where Enter
  picks a shift up, arrow keys choose the day, Enter places, and Escape
  cancels, announced through a live region.
- All motion respects `prefers-reduced-motion`, including the intro reveal
  and the live pulse, which is compositor only so it costs no main thread
  time.

## Preview clip

- The clip is rendered deterministically: animations are paused and their
  clocks advanced by hand one frame at a time at two times scale, which
  sidesteps headless environments that only advance animation time when
  frames happen to be produced. The sequence is the brief revealing, milk
  crossing below par with the order drafting toast, then a calm settled
  frame that also serves as the poster.

## Deploy

- Static site on Vercel with a single page app rewrite and immutable caching
  for hashed assets. The committed `/preview` assets are copied into the
  build output so the poster and clips are servable from the deployed origin.
