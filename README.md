# THE LINE

**Where do you draw the line?**

A single-page, sourced ledger of what AI costs the planet: money, electricity, water, carbon, minerals and land. It ends by asking each visitor which uses of AI are worth that cost.

## What's on the page

- **Live counters.** Electricity, water, CO₂ and Big Tech spending, ticking since the visitor arrived or since 1 January. They are calculated from the latest annual estimates, not metered.
- **Money.** Big Tech's 2026 capex compared with climate adaptation finance for developing countries.
- **Energy.** Data-centre electricity in 2025 and 2030, and how little of it is explained by chatbot text.
- **Water and carbon.** Estimated ranges for AI systems in 2025.
- **Minerals, land and waste.** Copper, gallium, e-waste, land and water projections.
- **In their own words.** What Google, Microsoft, Amazon, Meta and xAI disclosed in 2026, plus the case for the defence.
- **Your subscription.** A calculator for the footprint of text, image and video use.
- **Draw your line.** Visitors rank which uses of AI are worth the cost.
- **Evidence wall.** Visitors post links that support or challenge the page.
- **Sources.** A dated table, last checked on 5 October 2026.

## Running it

It's one static file with no build step, published with GitHub Pages. Open `index.html` in a browser or serve the folder from any static host.

## Backend: the vote and the evidence wall

The shared vote and the evidence wall store their data in [Supabase](https://supabase.com). The project URL and the public anon key sit at the top of the script in `index.html`. The anon key is public by design. What protects the data is the access rules in [`supabase/schema.sql`](supabase/schema.sql):

- Visitors get an anonymous account the first time they vote or post. Nobody has to sign up.
- **Votes:** one per person, a position from 0 to 8. Individual votes are private, and everyone can read the totals through `vote_counts()`.
- **Evidence links:** must be `http(s)` links. Titles are capped at 120 characters and notes at 200. Each person can post at most 10 links, one every 30 seconds. Posts can be deleted by their author but never edited.
- The server sets each post's timestamp and visibility, so a visitor can't fake either.

If the page is opened inside claude.ai, it uses the artifact's own storage instead.

### Moderating the evidence wall

In Supabase, open **Table Editor → evidence** and set `hidden` to `true` on a row. The link disappears for everyone except its author. To ban someone, delete their user under **Authentication → Users**; their posts and vote are deleted with them.

### Setting up a fresh Supabase project

1. Create the project and run `supabase/schema.sql` in the SQL Editor.
2. Turn on **Authentication → Sign In / Providers → Allow anonymous sign-ins**.
3. Put the project URL and anon key into `SUPABASE_URL` and `SUPABASE_KEY` in `index.html`.

Never put the `service_role` key in the page.

## Tests

- `tests/page.test.js` loads the page in jsdom, a headless browser, and exercises every interactive part. Install with `npm install` in `tests/`, then run:
  - `node page.test.js supabase` for the live database
  - `node page.test.js claude` for a mock of the claude.ai store
  - `node page.test.js none` for no backend
- `tests/security.ps1` attacks the database directly, bypassing the page, to prove the access rules hold.
- `tests/limit.ps1` checks the 10-links-per-person cap. It takes about 5 minutes.

## Sources

Every figure is cited on the page. Key sources:

- IEA, *Key Questions on Energy and AI* (April 2026) and *Energy and AI* (2025)
- de Vries-Gao, *Patterns* (2025): AI's carbon and water footprint
- UNU-INWEH, *Environmental Cost of AI's Energy Use* (June 2026)
- Google, Microsoft and Amazon 2026 environmental and sustainability reports
- UNEP *Adaptation Gap Report 2025*
- Stanford *AI Index 2026*
- IMF *Finance & Development* (2025): minerals
- Wang et al., *Nature Computational Science* (2024): e-waste
- Chatterji et al., NBER (2025): *How People Use ChatGPT*
- MIT Technology Review (2025): energy per AI task

The verdicts in yellow are THE LINE's opinion. Everything else is published data.
