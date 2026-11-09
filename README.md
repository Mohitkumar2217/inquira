# Inquira – a conversational form builder

A Typeform-style app: build forms in a three-pane builder, publish a public link, collect answers
through a one-question-at-a-time animated flow, and review results.

**Naming used in this codebase:** form = *Inquiry*, question = *Prompt*, submission = *Reply*, answer = *ReplyItem*.

## Tech stack
- Frontend: Next.js 14 (App Router) + TypeScript, plain CSS (no UI kit)
- Backend: Python, FastAPI, SQLAlchemy 2
- Database: SQLite (`backend/inquira.db`, created and seeded on first start)

## Setup
```bash
# backend (http://localhost:8000, docs at /docs)
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# frontend (http://localhost:3000)
cd frontend
cp .env.local.example .env.local      # set NEXT_PUBLIC_API_URL for deployed backend
npm install
npm run dev
```
Seeded: `/f/feedback1` and `/f/rsvp2024` (published, with sample replies) and one draft.

## Architecture
```
backend/app
  database.py  engine/session (SQLite, foreign keys ON)
  models.py    ORM tables
  schemas.py   request bodies (pydantic)
  rules.py     server-side answer validation (required, email, number, choice, rating…)
  seed.py      sample data
  main.py      routes: creator API + public respondent API
frontend
  app/page.tsx            dashboard (list, create, rename, duplicate, delete, publish)
  app/builder/[id]        builder: question list (drag reorder) | live preview | settings panel
  app/f/[slug]            public respondent page (no login)
  app/results/[id]        summary stats, responses table, response detail, CSV export
  components/Runner.tsx   the one-question-at-a-time engine (shared by preview and public page)
  components/Modal.tsx, Toasts.tsx, lib/api.ts, lib/types.ts
```
The builder saves the whole inquiry with one `PUT`; the server upserts prompts by id (new prompts use ids ≤ 0),
removes missing ones and stores the order in `position`. Existing replies stay linked to kept prompts.

## Database schema
| table | columns |
|---|---|
| inquiries | id, slug (unique), title, status (draft/published), accent, closing_heading, closing_text, created_at, updated_at |
| prompts | id, inquiry_id → inquiries (cascade), position, kind, label, hint, mandatory, choices (JSON) |
| replies | id, inquiry_id → inquiries (cascade), submitted_at |
| reply_items | id, reply_id → replies (cascade), prompt_id → prompts (cascade), value; UNIQUE(reply_id, prompt_id) |

Prompt kinds: short_text, long_text, choice, dropdown, email, number, yes_no, rating.

## API overview
Creator: `GET/POST /api/inquiries`, `GET/PUT/DELETE /api/inquiries/{id}`, `PATCH …/title`, `POST …/duplicate`,
`POST …/publish`, `POST …/unpublish`, `GET …/replies` (replies + per-question summary), `GET …/export.csv`.
Public: `GET /api/public/{slug}`, `POST /api/public/{slug}/replies` (422 with per-prompt errors on invalid input).

## Assumptions
- A single default creator is assumed; there is no authentication.
- Answers are stored as text and validated by kind on the server (and mirrored on the client).
- Logic jumps, integrations, collaboration, file/payment types and custom fonts are "Coming soon" placeholders.
- Included extras: CSV export, accent colour theme, editable thank-you screen.
- The visual style is inspired by Typeform's UX but built from scratch; pixel-exact parity was not attempted.

## Deploy
Backend: Render/Railway (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`). Frontend: Vercel, with
`NEXT_PUBLIC_API_URL` pointing at the backend. SQLite needs a persistent disk (or swap the URL in `database.py`).
