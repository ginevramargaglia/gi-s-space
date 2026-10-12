# Cloud login and AI

For the hosted private version, follow [DEPLOY.md](DEPLOY.md). Cloud saving and live AI require the Supabase SQL setup and Netlify runtime variables; unconfigured hosting shows a setup error. All sections save to your account after activation.

# Ginevra’s personal app

Phone-friendly personal workspace with tasks, gym workouts and runs, grocery checklists, EUR expenses, and meetings/events/outings. Work drafting supports CLS Events and Monaco Stays.

## Everyday lists

Open the running server’s home page. Lists save in browser localStorage, not the server: there is no account, cloud sync, automatic reminder, or calendar connection. Each device/browser has separate lists. Export backups regularly; clearing browser storage removes records. Import replaces all lists after confirmation. Monaco time is used for the date and monthly expense totals. The downloadable standalone HTML supports lists without a server; AI drafting requires the server. File-based browser storage support varies.

## Run

Node 22+ is required. No external dependencies.

```sh
cd /workspace/gi-s-space
npm test
npm start
```

Port defaults to 3000. If you want AI drafts, create `.env` from `.env.example` without overwriting an existing file and set `ASSISTANT_API_KEY` securely. Never commit credentials. Without it the assistant reports demo mode. Each AI request is independent and does not read your lists. No live calendar, mailbox, booking system or research connection is provided.

## Hosting and phone access

A public HTTPS host is needed for a normal phone link and home-screen bookmark. Hosting is not configured by this prototype. Everyday lists can be served as static files; the AI endpoint currently permits loopback clients only. Before exposing AI through a reverse proxy, add account authentication, origin validation and rate limits. Do not put API keys in browser code. A home-screen bookmark is supported by normal phone browsers after hosting; offline PWA installation is not implemented.

## Optional WhatsApp adapter

WhatsApp is optional, and disabled by default. Configure a Meta Cloud API app, HTTPS `/webhook`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and owner number (digits with country code). Set `WHATSAPP_ENABLED=true` only to enable replies to that owner. Inbound signatures and recipient phone IDs are validated. Replies are drafts to the owner; no guests or suppliers are contacted. Live delivery is unverified. The Graph API adapter uses v23.0. Current Meta account and production requirements must be checked before deploying.

Webhook duplicate tracking and queues are in memory, reset on restart, and failed sends are not retried. Durable queues, rate limits, monitoring and authentication are required before production. AI calls use `store:false`, but send supplied message content to the AI provider. Avoid access codes and unnecessary guest details.

## Checks

`npm test` validates the backend demo, webhook signatures/handshake, owner-only sending and deduplication with mocked providers. Browser smoke tests additionally validate task persistence, grocery completion, expense totals and plan entry. AI and live WhatsApp require credentials and are not verified by mocked tests.

## Weekly meals

The Meals tab defaults to one person: seven breakfasts, lunches and dinners, with simple 5–30 minute recipes. Choose balanced or vegetarian, swap individual recipes, adjust servings, and mark pantry ingredients. Build the grocery list to sum ingredient quantities and exclude pantry items. Rebuilding replaces only meal-generated grocery entries, preserving manual entries, after confirmation. Quantities use recipe totals and drained weights, not retail pack sizes. Meal preferences save separately in localStorage; the current export backs up everyday lists, runs and meal preferences. No allergy filtering, calorie targets or clinical nutrition guidance is provided. Browser validation checked 21 meals, pantry exclusion, exact totals, portion scaling, saved settings and vegetarian options.

## Running

Dedicated Running tab stores a half-marathon/marathon goal, race date, starting mileage, and planned/completed runs. Track distance, duration, effort, notes, calculated pace, weekly completed kilometres and longest logged run. Running records persist in separate browser storage and are included in exported backups. A provisional December 20, 2026 half-marathon outline assumes three days a week and remains separate from logged sessions; current weekly mileage is required to personalise it. Browser checks verified race defaults, pace, run persistence and mobile layout.

## Reading, writing and design

The Reading space tracks book status (want to read, reading, finished), pages, author, rating, quotes/notes, and a yearly goal. The Writing space supports creating, reopening, editing and deleting notes with dates and word counts; press Save note to persist. Unsaved writing prompts before changing spaces. Both sections are included in account storage and exported backups. Older cloud records and backups still load. No Supabase schema migration is needed for these additions because they use the existing JSON record. Live cloud service verification still requires account configuration.

The blue design uses locally hosted Poppins Light and EB Garamond, obtained from the Google Fonts repository. Their SIL Open Font License files are included in `public/fonts`. Fonts do not make requests to an external provider. The optional downloadable standalone HTML includes the fonts and supports local lists; it is separate from the hosted cloud login.

## Home and notebook layout

Home is the landing page: tasks, upcoming plans, today's meals and movement, and a selectable Monday–Sunday recap. Weekly totals use saved entry dates, count completed runs/Move sessions only, and do not infer unrecorded activity. Writing counts the latest saved date, not a revision history. Tasks are managed on Home. Spaces follow Home, Meal plan, Groceries, Expenses, Plans, Running, Reading, Writing, Move, Assistant. The notebook style adds original SVG doodles and locally hosted Caveat handwriting; its Open Font License is included alongside the other fonts.
