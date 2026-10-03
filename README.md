# claude-certified-architect-quiz

Keyboard-first practice quiz for the **Claude Certified Architect – Foundations** (CCAR-F) exam.

Based on the exam guide from Anthropic: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification

> Independent study tool — not affiliated with or endorsed by Anthropic. Topics follow the official exam guide's
> domains and task statements; all practice questions in this repo are original and unofficial.

## Features

- 72 original scenario-based questions covering all 5 domains and 30 task statements
- Practice by domain, review missed / flagged questions, or a timed 60-question exam simulation weighted like the real blueprint
- Explanations for every answer, inline code highlighting, and a plain-language glossary for tricky terms
- Progress saved in your browser — pick up where you left off
- Full keyboard control (`?` shows all shortcuts), mobile friendly with swipe navigation, light/dark themes

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Static Vite app — import the repo in Vercel (framework preset: Vite, output `dist`).

## Local-only extras

Any `*.json` question files placed in `private/` (git-ignored) are loaded automatically in local builds,
e.g. personal copies of the official sample questions. They are never committed or deployed.
