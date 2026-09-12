# Larkspur Bakery, a live operations demo

An example of the operational software Aviari builds for a small business.

The client is fictional: Larkspur Bakery, two shops in Denver, owner operated.
The demo lands on the owner's morning brief and keeps moving while you watch.
A simulated register feed, inbox, and inventory run through the morning, rules
draft vendor orders when items fall below par, and everything you do writes to
an isolated demo database that returns to seed data on the hour.

Live demo: https://aviari-demo-automation.vercel.app

## Screens

- Morning brief, the landing page. Yesterday's sales per shop, today's
  staffing with gaps flagged, inventory below par with one tap reorder drafts,
  the messages that need a reply, and the weather's read on foot traffic.
- Inbox triage. Vendor, staff, and customer messages sorted into needs reply,
  FYI, and done, each with a plain draft ready to edit and send. Sending
  updates the thread, and some senders write back.
- Scheduling. A drag and drop week, a suggestion panel that fills gaps from
  availability and the labor budget, and a staff view with an English and
  Spanish toggle.
- Vendor orders. Par levels and pace, drafts built from both, and a send
  button that produces the purchase order as a PDF and marks it sent.
- Automations. The rules behind all of it in plain language, each with a
  switch and a live run log.

## How the reset works

There is no server and no real database behind the demo. The entire world is
generated from a seed derived from the current hour, so every write lands in
an in browser store that regenerates from seed at the top of each hour, in
every open tab, everywhere in the world at once. The reset schedule is hourly
on the hour, the cron equivalent of `0 * * * *`. Mid visit, the rollover
appears as a quiet toast and a fresh morning.

Because nothing leaves the browser, the demo cannot reach a production
database, key, or webhook. The build enforces this: `scripts/check-isolation.mjs`
fails the build if anything resembling a connection string or live credential
appears in the source tree or environment, and `scripts/lint-copy.mjs` holds
the interface copy to its style rules.

## Run it

```
npm install
npm run dev        # local dev server
npm run build      # gated production build into dist
npm run preview    # serve the production build
```

Testing, against a running preview server:

```
npm test           # seed, program, and PDF unit checks
npm run e2e        # full interaction pass with Playwright
npm run capture    # re-render the preview clip into /preview
```

Useful query parameters while exploring: `?clock=120` starts the visit two
minutes into the simulated morning, `?speed=4` runs it faster.

## Notes

Every name in the demo is fictional, including the bakery, its vendors, its
staff, and its customers. Any resemblance to a real business or person is
coincidental. The preview clip in `/preview` is rendered from the running app
by `scripts/capture.mjs`.
