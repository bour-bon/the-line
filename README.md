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

It's one static file with no build step. Open `index.html` in a browser, or serve the folder with any static host. This repo is published with GitHub Pages.

## Known limitation

The shared vote ("Draw your line") and the evidence wall were built on claude.ai's artifact storage. On a standalone host they show as unavailable, and each visitor's line is saved only in their own browser. Making them worldwide needs a small backend, such as Supabase or Firebase, with moderation for posted links.

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
