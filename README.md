# Inquira – a conversational form builder

A Typeform-style app: build forms in a three-pane builder, publish a public link, collect answers
through a one-question-at-a-time animated flow, and review results.

**Naming used in this codebase:** form = *Inquiry*, question = *Prompt*, submission = *Reply*, answer = *ReplyItem*.

## Tech stack
- Frontend: Next.js 14 (App Router) + TypeScript, Tailwind CSS utilities and custom CSS
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
npm install
# Copy .env.local.example to .env.local when configuring a non-default API URL
npm run dev
```
Seed data is created only when the SQLite database is empty: `/f/feedback1` and `/f/rsvp2024`
(published, with sample replies) and one draft.

## Architecture
```
backend/app
  database.py  engine/session (SQLite, foreign keys ON)
  models.py    ORM tables
  schemas.py   request bodies (pydantic)
  rules.py     server-side answer validation for every supported prompt kind
  seed.py      sample data
  main.py      routes: creator API + public respondent API
frontend
  app/page.tsx            workspace dashboard (create/switch workspaces, sort, drag/drop and manage forms)
  app/builder/[id]        builder: ordered questions (drag reorder) | live preview | settings panel
  app/f/[slug]            public respondent page (no login)
  app/results/[id]        summary stats, responses table, response detail, CSV export
  components/Runner.tsx   the one-question-at-a-time engine (shared by preview and public page)
  components/Modal.tsx, Toasts.tsx, lib/api.ts, lib/types.ts
```
The builder saves changes explicitly with one `PUT`; publishing also saves pending edits first. The server
upserts prompts by id (new prompts use ids ≤ 0), removes missing ones and stores the order in `position`.
Existing replies stay linked to kept prompts. The shared `Runner` powers both the live preview and public
form, while browser and server validation enforce the same answer rules.

## Database schema
| table | columns |
|---|---|
| workspaces | id, name (unique), is_private, created_at |
| inquiries | id, slug (unique), workspace_id → workspaces, title, status (draft/published), accent, closing_heading, closing_text, created_at, updated_at |
| prompts | id, inquiry_id → inquiries (cascade), position, kind, label, hint, mandatory, choices (JSON) |
| replies | id, inquiry_id → inquiries (cascade), submitted_at |
| reply_items | id, reply_id → replies (cascade), prompt_id → prompts (cascade), value; UNIQUE(reply_id, prompt_id) |

Prompt kinds: short_text, long_text, choice, dropdown, email, number, yes_no, rating, contact_info, phone,
address, url, checkbox, legal, nps, opinion_scale, ranking, matrix, date.

Structured answers (contact info, checkbox selections, ranking, and matrix responses) are stored as JSON
text in `reply_items.value`; results and CSV export format those values for reading.

## Tests
Run the backend validation suite from `backend/`:
```bash
python -m unittest discover -s tests -v
```
Run the frontend production build from `frontend/`:
```bash
npm run build
```

## API overview
Creator: `GET/POST /api/workspaces`, `PATCH/DELETE /api/workspaces/{id}`, `POST …/leave`;
`GET/POST /api/inquiries`, `GET/PUT/DELETE /api/inquiries/{id}`, `PATCH …/title`,
`POST …/duplicate`, `POST …/copy-to/{workspace_id}`, `PATCH …/workspace` (also used by dashboard drag-and-drop),
`POST …/publish`, `POST …/unpublish`, `GET …/replies` (replies + per-question summary), `GET …/export.csv`.
Public: `GET /api/public/{slug}`, `POST /api/public/{slug}/replies` (422 with per-prompt errors on invalid input).

## Assumptions
- A single default creator is assumed; there is no authentication or team membership. Leaving or deleting a
  non-private workspace moves its forms into the private workspace so form data is preserved.
- Answers are stored as text (JSON text for structured answers) and validated by kind on the server and client.
- Logic jumps, integrations, collaboration, file/payment uploads, AI services, and custom fonts/backgrounds are placeholders.
- Included extras: CSV export, accent colour theme, editable thank-you screen.
- The UI is an original implementation inspired by conversational form workflows; it does not use Typeform's
  proprietary assets or attempt pixel-exact reproduction.

## Deploy
Backend: Render/Railway (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`). Frontend: Vercel, with
`NEXT_PUBLIC_API_URL` pointing at the backend. SQLite needs a persistent disk (or swap the URL in `database.py`).
