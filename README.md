# Inquira – Typeform Fullstack Builder & Respondent Runner

A production-grade, conversational form-building platform inspired by Typeform. Built for the **SDE Fullstack Assignment**, replicating Typeform's signature design, user experience, live three-pane builder, and animated one-question-at-a-time respondent flow.

---

## 🌟 Feature Checklist & Assignment Requirements

| Category | Requirement | Status | Implementation Details |
|---|---|---|---|
| **1. Form Builder** | Create form with title and questions | ✅ Complete | Dynamic inline title editing, instant auto-save + manual save |
| | Add, edit, reorder (drag & drop), delete | ✅ Complete | HTML5 drag-and-drop reordering, question deletion, duplication |
| | Core Question Types (8 types) | ✅ Complete | `short_text`, `long_text`, `choice`, `dropdown`, `email`, `number`, `yes_no`, `rating` |
| | Bonus Question Types (11 types) | ✅ Complete | `contact_info`, `phone`, `address`, `url`, `checkbox`, `legal`, `nps`, `opinion_scale`, `ranking`, `matrix`, `date` |
| | Per-question settings | ✅ Complete | Required toggle, description/hint, choices manager, country code |
| | Live preview & responsive preview | ✅ Complete | Real-time interactive preview, desktop & mobile frame switcher |
| **2. Form Management** | Form listing with status & count | ✅ Complete | Grid and list views, draft/published badges, response count |
| | Create, rename, duplicate, delete | ✅ Complete | Full CRUD with confirmation modals and optimistic UI updates |
| | Publish / unpublish flow | ✅ Complete | Toggle draft/published, unique shareable link (`/f/{slug}`), Typeform purple celebration effect |
| | Workspaces & persistence | ✅ Complete | Private & team workspaces, drag forms across workspaces, persistent active workspace in SQLite |
| **3. Respondent Flow** | One-question-at-a-time UX | ✅ Complete | Full-screen conversational runner with cascade fade-in transitions |
| | Keyboard navigation | ✅ Complete | `Enter` to advance, `Shift+Enter` for multiline, `↑`/`↓` arrows, `A`-`Z` for choices, `Y`/`N` for yes/no, `1`-`5` for ratings |
| | Progress indicator & branding | ✅ Complete | Smooth animated progress bar at top, customizable "Powered by Inquira" badge |
| | Validation (Client + Server) | ✅ Complete | Email format, required checks, number constraints, 422 error display |
| | Thank-you screen | ✅ Complete | Animated checkmark closing screen with custom heading and text |
| | Public access (no auth required) | ✅ Complete | Public `/f/{slug}` endpoint accessible without authentication |
| **4. Results & Analytics** | Submissions list / table view | ✅ Complete | Responsive tabular view with timestamp and formatted answers |
| | Individual response view | ✅ Complete | Full submission drawer/modal inspecting every response |
| | Summary statistics & charts | ✅ Complete | Visual drop-off funnel chart, bar charts for choice counts, average scores |
| | CSV Export | ✅ Complete | Single-click export via `/api/inquiries/{id}/export.csv` |
| | Test Response Generator | ✅ Complete | Generates realistic sample data for instant analytics preview |
| **5. Look & Feel** | Typeform parity | ✅ Complete | Exact typography, halo checkmark to paper airplane launch celebration, shimmers, dark mode |

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, custom CSS animations
- **Backend**: Python 3, FastAPI, SQLAlchemy 2, Pydantic
- **Database**: SQLite with foreign key enforcement (`PRAGMA foreign_keys = ON`)

---

## 🚀 Quick Setup & Run

### 1. Backend (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server (runs at http://localhost:8000, docs at http://localhost:8000/docs)
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (Next.js)
```bash
# In a separate terminal, navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start development server (runs at http://localhost:3000)
npm run dev
```

> **Sample Data**: The SQLite database seeds automatically on first launch with sample forms (`Customer Feedback Survey` with 14 responses, `Event RSVP` with 6 responses, and a draft contact form).

---

## 🏛 Architecture Overview

```
inquira/
├── backend/
│   ├── app/
│   │   ├── database.py   # SQLAlchemy SQLite engine & session setup (foreign keys enabled)
│   │   ├── models.py     # Relational ORM models (Workspaces, Inquiries, Prompts, Replies, UserPreferences)
│   │   ├── schemas.py    # Pydantic schemas and validation payloads
│   │   ├── rules.py      # Server-side answer validation per question type
│   │   ├── seed.py       # Seed data for workspaces, forms, questions, and replies
│   │   └── main.py       # FastAPI application, REST endpoints, CORS & handlers
│   └── tests/
│       ├── test_forms_api.py # Relational forms, test responses, workspace movements
│       ├── test_pages.py     # Multi-field question pages and clone logic
│       └── test_rules.py     # Server-side validation rules for all 19 question kinds
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # Workspace dashboard (forms list/grid, workspaces, drag-and-drop, sort/search)
│   │   ├── builder/[id]/     # Three-pane builder (questions list, dynamic WYSIWYG canvas, inspector)
│   │   ├── f/[slug]/         # Public respondent runner (one question at a time, keyboard navigation)
│   │   ├── results/[id]/     # Results view: performance funnel, question summaries, responses table, CSV
│   │   ├── globals.css       # Typeform typography, theme variables, animations, publish celebration
│   │   └── layout.tsx        # Root layout with theme provider
│   ├── components/
│   │   ├── Runner.tsx        # One-question-at-a-time interactive runner engine
│   │   ├── PublishCelebration.tsx # Typeform halo sparkle + paper airplane launch animation
│   │   ├── AddContentModal.tsx    # Modal to add any of the 19 question types or import questions
│   │   ├── Dropdown.tsx      # Accessible dropdown menu component
│   │   ├── Modal.tsx         # Generic dialog modal component
│   │   ├── Toasts.tsx        # Notification toast provider
│   │   └── ThemeProvider.tsx # Dark mode / light mode theme manager
│   └── lib/
│       ├── api.ts            # Typed HTTP client helper
│       ├── types.ts          # Core TypeScript interfaces (Inquiry, PromptDTO, Workspace, Kind)
│       └── steps.ts          # Screen step grouping and phone formatting
```

---

## 🗄 Database Schema Design

The SQLite relational schema is normalized with foreign key cascades:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   workspaces    │ 1   * │    inquiries    │ 1   * │     prompts     │
├─────────────────┤──────<├─────────────────┤──────<├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ name (UNIQUE)   │       │ slug (UNIQUE)   │       │ inquiry_id (FK) │
│ is_private      │       │ workspace_id(FK)│       │ position        │
│ order_index     │       │ title           │       │ kind            │
│ last_visited_at │       │ status          │       │ label, hint     │
│ created_at      │       │ theme, accent   │       │ mandatory       │
└─────────────────┘       │ closing_heading │       │ choices (JSON)  │
                          │ closing_text    │       │ page (JSON)     │
                          │ updated_at      │       │ properties(JSON)│
                          └────────┬────────┘       └────────┬────────┘
                                   │ 1                       │ 1
                                   │                         │
                                   │ *                       │ *
                          ┌────────┴────────┐       ┌────────┴────────┐
                          │     replies     │ 1   * │   reply_items   │
                          ├─────────────────┤──────<├─────────────────┤
                          │ id (PK)         │       │ id (PK)         │
                          │ inquiry_id (FK) │       │ reply_id (FK)   │
                          │ submitted_at    │       │ prompt_id (FK)  │
                          └─────────────────┘       │ value (Text)    │
                                                    │ UNIQUE(rep, prm)│
                                                    └─────────────────┘
```

### Table Definitions

1. **`workspaces`**: Organizes forms into private or shared workspaces.
   - `id`, `name`, `is_private`, `order_index`, `last_visited_at`, `created_at`
2. **`user_preferences`**: Tracks global user settings such as `active_workspace_id`.
   - `id`, `user_key` (default), `active_workspace_id` (FK to workspaces), `updated_at`
3. **`inquiries`**: The form definition entity.
   - `id`, `slug`, `title`, `status` (`draft` | `published`), `workspace_id` (FK), `accent`, `theme`, `settings`, `closing_heading`, `closing_text`, `created_at`, `updated_at`
4. **`prompts`**: Individual questions ordered by `position`.
   - `id`, `inquiry_id` (FK), `position`, `kind`, `label`, `hint`, `mandatory`, `choices` (JSON), `page` (JSON), `properties` (JSON), `logic_rules` (JSON)
5. **`replies`**: A submission record created when a respondent finishes a form.
   - `id`, `inquiry_id` (FK), `submitted_at`
6. **`reply_items`**: An individual answer to a prompt within a reply.
   - `id`, `reply_id` (FK), `prompt_id` (FK), `value` (Text/JSON), `UNIQUE(reply_id, prompt_id)`

---

## 📡 API Overview

### Workspace Management
- `GET /api/workspaces` — List workspaces with form counts
- `POST /api/workspaces` — Create a workspace
- `PATCH /api/workspaces/{id}` — Rename a workspace
- `DELETE /api/workspaces/{id}` — Delete a workspace (forms automatically safely migrate to private workspace)
- `POST /api/workspaces/{id}/move-up` & `move-down` — Reorder workspaces
- `GET /api/workspaces/active` & `PUT /api/workspaces/active` — Get and set active workspace

### Form Creator API
- `GET /api/inquiries` — List forms with reply counts and prompt counts
- `POST /api/inquiries` — Create a new form
- `GET /api/inquiries/{id}` — Get full form definition with prompts
- `PUT /api/inquiries/{id}` — Upsert form definition, questions, choices, order
- `PATCH /api/inquiries/{id}/title` — Rename a form
- `DELETE /api/inquiries/{id}` — Delete a form and all associated responses
- `POST /api/inquiries/{id}/duplicate` — Clone a form with all questions
- `POST /api/inquiries/{id}/copy-to/{workspace_id}` — Copy a form to another workspace
- `PATCH /api/inquiries/{id}/workspace` — Move a form to another workspace (also used in drag & drop)
- `POST /api/inquiries/{id}/publish` — Publish form and generate public link
- `POST /api/inquiries/{id}/unpublish` — Revert form to draft (blocks public access)

### Results & Submissions
- `GET /api/inquiries/{id}/replies` — Get list of submissions and per-question analytics summary
- `GET /api/inquiries/{id}/export.csv` — Download responses as CSV file
- `POST /api/inquiries/{id}/generate-test-response` — Generate realistic mock responses for instant testing

### Public Respondent API (No Auth)
- `GET /api/public/{slug}` — Fetch published form questions (returns 404 if in draft)
- `POST /api/public/{slug}/replies` — Submit completed response with server-side validation (returns 422 with field-level errors on invalid input)

---

## 🧪 Testing

### Backend Unit & Integration Tests
Run the complete backend test suite:
```bash
python -m unittest discover -s backend/tests -v
```

### Full E2E Verification Suite
Run the end-to-end integration test verifying all 12 core workflows:
```bash
python scratch/verify_e2e.py
```

### Frontend Typechecking
```bash
cd frontend
npx tsc --noEmit
```

---

## 💡 Assumptions & Design Choices

1. **Authentication**: Simplified default creator session (as permitted in assignment specifications). No authentication is required for respondents to view or submit public forms (`/f/{slug}`).
2. **Workspace Safety**: Deleting or leaving a shared workspace preserves all creator forms by reassigning them to the user's primary private workspace.
3. **Structured Question Data**: Complex question types (`matrix`, `ranking`, `checkbox`, `contact_info`) serialize structured responses as JSON text in `reply_items.value`, allowing flexible schemas while remaining clean in SQLite.
4. **Publish Celebration**: Recreates Typeform's signature halo sparkle burst and paper airplane flight, followed by smooth navigation to the Share tab.
