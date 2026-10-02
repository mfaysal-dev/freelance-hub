# Freelane — clients, projects & cash flow for freelancers

A polished, privacy-first mini CRM that runs **entirely in your browser**. No accounts, no backend, no API keys — data lives in `localStorage` with JSON export/import.

**Live:** https://freelance-hub-gamma-beige.vercel.app

## Features
- **Clients** — leads / active / past, hourly rates, notes, last-contact tracking, one-click follow-up messages (copied to clipboard) and `mailto:` links.
- **Projects kanban** — drag cards across Backlog → In progress → In review → Done; hourly or fixed-fee billing, deadlines, progress & risk badges.
- **Tasks** — per-project tasks with due dates and priorities; "Up next" widget across all projects.
- **Time tracking** — live start/stop timer, manual entries, billable vs non-billable, 14-day hours chart.
- **Invoices** — line items, tax, auto numbering, draft → sent → paid, overdue detection, and a clean **printable invoice / Save as PDF** via the browser print dialog.
- **Customizable dashboard** — drag to reorder, S/M/L/XL resize, add/remove widgets (Business pulse, Assistant, Revenue, Timer, Deadlines, Open invoices, Up next, Hours, Top clients). Layout is saved.
- **Freelane Copilot** — a rule-based, fully on-device assistant: flags overdue & soon-due invoices (with ready-to-send reminder text), at-risk/late deadlines, overdue tasks, fixed-fee budget burn, cold leads and clients to check in with, forgotten timers and client concentration — with one-click actions (mark paid, invoice unbilled hours, push deadline, reschedule tasks, log follow-up…).
- Command palette (`Ctrl/⌘ + K`), `Ctrl/⌘ + .` for the assistant, dark/light/system theme, accent picker, selectable currency, demo data with "Clear demo data".

## Stack
Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn-style components · framer-motion · lucide-react · recharts · dnd-kit · zustand · vitest

## Develop
```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

## Author

Built by [Mahir Faysal](https://mfaysal.com), a web developer in Bangladesh.

- Project page: [Freelane on mfaysal.com](https://mfaysal.com/projects/freelance-hub)
- More projects: [mfaysal.com/projects](https://mfaysal.com/projects) · Blog: [mfaysal.com/blog](https://mfaysal.com/blog)
