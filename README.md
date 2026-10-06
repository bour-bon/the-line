# THE LINE

### Where do you draw the line?

**[bour-bon.github.io/the-line](https://bour-bon.github.io/the-line/)**

THE LINE is an independent, fully sourced account of what artificial intelligence costs the planet: the electricity it burns, the water it consumes, the carbon it emits, the minerals it digs up and the money it absorbs. It sets those costs against what AI is actually used for and asks each visitor to decide which uses are worth it.

---

## On the page

- **Live counters.** AI's electricity, water and carbon, plus Big Tech's capital spending, accumulating in real time from the latest annual estimates.
- **Money.** Four companies' 2026 data-centre budgets against the climate adaptation finance developing countries actually receive.
- **Energy.** Data-centre electricity today and in 2030, and how little of it anyone explains.
- **Water and carbon.** Peer-reviewed ranges for AI systems in 2025.
- **Minerals, land and waste.** Copper, gallium, land and e-waste.
- **In their own words.** What Google, Microsoft, Amazon, Meta and xAI disclosed in 2026, alongside the strongest case for the defence.
- **Your subscription.** What a month of text, image and video generation costs in energy, water and CO₂.
- **Draw your line.** Visitors rank eight uses of AI, from science to synthetic video, and see where everyone else draws it.
- **Evidence wall.** Anyone can post a source that supports the page, or one that challenges it. Both stay visible.

## Method

Every figure is a published estimate with a date and a citation. Nothing is metered live: the counters spread the latest annual figures evenly across the year, and the page says so. Where studies disagree, the page shows the range rather than picking a number. Editorial verdicts are visually marked and kept apart from the data.

### Principal sources

| Source | Used for |
|---|---|
| IEA, *Key Questions on Energy and AI* (2026) and *Energy and AI* (2025) | Data-centre electricity, AI's share, emissions offsets |
| de Vries-Gao, *Patterns* (2025) | Carbon and water footprint of AI systems |
| UNU-INWEH, *Environmental Cost of AI's Energy Use* (2026) | Water, land and emissions projections |
| Google, Microsoft and Amazon environmental reports (2026) | Company emissions, electricity and water |
| UNEP, *Adaptation Gap Report* (2025) | Climate adaptation finance |
| Stanford HAI, *AI Index* (2026) | Global AI investment |
| IMF, *Finance & Development* (2025) | Critical minerals |
| Wang et al., *Nature Computational Science* (2024) | Generative-AI e-waste |
| Chatterji et al., NBER (2025) | How people use ChatGPT |
| MIT Technology Review (2025) | Energy per text, image and video generation |

The full dated source list is at the bottom of the site.

## Corrections

If a number is wrong or out of date, post the evidence on the site's evidence wall or [open an issue](https://github.com/bour-bon/the-line/issues).

## Built with

- A single static page in plain HTML, CSS and JavaScript, with no framework and no build step, hosted on GitHub Pages
- [Supabase](https://supabase.com) for the shared vote and evidence wall, protected by row-level security ([`supabase/schema.sql`](supabase/schema.sql))
- [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) to keep bots off the vote and the wall

## Privacy

No sign-up, no ads, no analytics. A visitor who votes or posts gets an anonymous ID, stored in their browser, so they can change their vote or delete their own links. Individual votes are never published, only the totals. Fonts load from Google Fonts, and the human check runs on Cloudflare Turnstile.

## Development

Automated tests in [`tests/`](tests/) load the page in a headless browser, exercise every interactive part, and probe the database's access rules directly.
