# AGENTS.md

This repository holds the standard every repository follows, and is its working example. Read [docs/standard.md](docs/standard.md) first, then [docs/lessons.md](docs/lessons.md).

- Before committing, `pnpm run verify` must pass. Run tools through `pnpm run …` and `pnpm exec`, not global installs.
- A change to how things are done is a change to the standard. Make it here first, in the config, in `docs/standard.md` and, when it's checkable, in `scripts/drift.ts`. Then `pnpm drift` lists the repositories to bring in line.
- What a change taught goes in `docs/lessons.md`, in the same change. Say what happened and what to do about it.
- Explanations go in `@prose` comments beside what they explain, in [markz](https://markz.amitkaps.com/docs/syntax.md)'s Markdown: `_emphasis_`, never `*emphasis*`, and no raw HTML. Each starts with a short paragraph saying what the file or setting is for, then the why. Prose says what the code can't, like why it exists and what was ruled out. Rules for writing it are in [prose's usage](https://prose.amitkaps.com/docs/usage.md).
- The `.html` pages carry no prose, since their comments ship to the browser.
- Don't name a script after a pnpm command (`deploy`, `publish`, `audit`, `ci`, `pipeline`, `pack`).
