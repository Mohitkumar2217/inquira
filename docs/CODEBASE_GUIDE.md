# Inquira — Complete File-by-File Codebase Study Guide

A complete reference explaining **every coding and configuration file** across the **Backend (FastAPI + SQLAlchemy + SQLite)** and **Frontend (Next.js 14 + TypeScript + Tailwind CSS)** of Inquira.

For each file, this guide documents:
1. **Why Created** — The responsibility it owns in the architecture.
2. **Why Used** — Why this library, pattern, or data model was chosen.
3. **When In Use** — Exact runtime triggers (startup, HTTP request, build time, user interaction).
4. **Key Logic & Symbols** — Important classes, functions, and hooks inside the file.
5. **Potential Issues** — Real edge cases, scaling limits, security gaps, or technical debt in the current code.
6. **Future Solutions** — Production-grade upgrades and interview-ready improvements.

---

## Table of Contents

- [Backend Files (`backend/`)](#backend-files)
  - [`backend/requirements.txt`](#backendrequirementstxt)
  - [`backend/render.yaml`](#backendrenderyaml)
  - [`backend/app/__init__.py`](#backendapp__init__py)
  - [`backend/app/database.py`](#backendappdatabasepy)
  - [`backend/app/models.py`](#backendappmodelspy)
  - [`backend/app/schemas.py`](#backendappschemaspy)
  - [`backend/app/rules.py`](#backendapprulespy)
  - [`backend/app/seed.py`](#backendappseedpy)
  - [`backend/app/main.py`](#backendappmainpy)
  - [`backend/tests/test_rules.py`](#backendteststest_rulespy)
  - [`backend/tests/test_pages.py`](#backendteststest_pagespy)
  - [`backend/tests/test_forms_api.py`](#backendteststest_forms_apipy)
- [Frontend Configuration & Styling (`frontend/`)](#frontend-configuration--styling)
  - [`frontend/package.json`](#frontendpackagejson)
  - [`frontend/next.config.js`](#frontendnextconfigjs)
  - [`frontend/tsconfig.json`](#frontendtsconfigjson)
  - [`frontend/tailwind.config.js`](#frontendtailwindconfigjs)
  - [`frontend/postcss.config.js`](#frontendpostcssconfigjs)
  - [`frontend/app/globals.css`](#frontendappglobalscss)
  - [`frontend/app/icon.svg`](#frontendappiconsvg)
- [Frontend App Router Pages (`frontend/app/`)](#frontend-app-router-pages)
  - [`frontend/app/layout.tsx`](#frontendapplayouttsx)
  - [`frontend/app/loading.tsx`](#frontendapploadingtsx)
  - [`frontend/app/page.tsx`](#frontendapppagetsx)
  - [`frontend/app/new/page.tsx`](#frontendappnewpagetsx)
  - [`frontend/app/builder/[id]/page.tsx`](#frontendappbuilderidpagetsx)
  - [`frontend/app/f/[slug]/page.tsx`](#frontendappfslugpagetsx)
  - [`frontend/app/results/[id]/page.tsx`](#frontendappresultsidpagetsx)
- [Frontend Shared Libraries (`frontend/lib/`)](#frontend-shared-libraries)
  - [`frontend/lib/types.ts`](#frontendlibtypests)
  - [`frontend/lib/api.ts`](#frontendlibapits)
  - [`frontend/lib/steps.ts`](#frontendlibstepsts)
  - [`frontend/lib/guess.ts`](#frontendlibguessts)
  - [`frontend/lib/styles.ts`](#frontendlibstylests)
  - [`frontend/lib/user.ts`](#frontendlibuserts)
- [Frontend Reusable Components (`frontend/components/`)](#frontend-reusable-components)
  - [`frontend/components/ThemeProvider.tsx`](#frontendcomponentsthemeprovidertsx)
  - [`frontend/components/Toasts.tsx`](#frontendcomponentstoaststsx)
  - [`frontend/components/Modal.tsx`](#frontendcomponentsmodaltsx)
  - [`frontend/components/Dropdown.tsx`](#frontendcomponentsdropdowntsx)
  - [`frontend/components/ToggleSwitch.tsx`](#frontendcomponentstoggleswitchtsx)
  - [`frontend/components/AccountMenu.tsx`](#frontendcomponentsaccountmenutsx)
  - [`frontend/components/PhoneField.tsx`](#frontendcomponentsphonefieldtsx)
  - [`frontend/components/AddContentModal.tsx`](#frontendcomponentsaddcontentmodaltsx)
  - [`frontend/components/PublishCelebration.tsx`](#frontendcomponentspublishcelebrationtsx)
  - [`frontend/components/Confetti.tsx`](#frontendcomponentsconfettitsx)
  - [`frontend/components/Runner.tsx`](#frontendcomponentsrunnertsx)
  - [`frontend/components/RespondentFlow.tsx`](#frontendcomponentsrespondentflowtsx)

---

## Backend Files

### `backend/requirements.txt`
- **Why Created**: Declares all Python packages required to run the FastAPI API and ORM layer (`fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`).
- **Why Used**: Uses `>=` minimum bounds (`fastapi>=0.115.0`, `uvicorn>=0.30.0`, `sqlalchemy>=2.0.35`, `pydantic>=2.9.2`) instead of brittle exact pins so `pip` resolves prebuilt binary wheels (notably `pydantic-core`) cleanly on Python 3.11+ without needing Rust/Cargo compilation in containers.
- **When In Use**: During local environment setup (`pip install -r requirements.txt`) and Render/CI builds.
- **Potential Issues**:
  1. Currently omits a PostgreSQL driver (`psycopg2-binary` or `psycopg[binary]`), so setting `DATABASE_URL` to a Postgres database will fail with an import error.
  2. Loose `>=` bounds without a lockfile allow future major releases (e.g., SQLAlchemy 2.x/3.x or Starlette breaking changes) to be pulled in on fresh builds.
- **Future Solutions**: Add `psycopg2-binary>=2.9.9` for managed Postgres, and commit upper bounds (`<3.0`) or generate a `requirements.lock` / `uv.lock` for deterministic builds.

---

### `backend/render.yaml`
- **Why Created**: Infrastructure-as-code blueprint defining how the backend web service is built and started on Render.
- **Why Used**: Ensures consistent `rootDir` (`backend`), Python `3.11.9`, `--prefer-binary` install flags, and `--host 0.0.0.0 --port $PORT` binding required by Render's reverse proxy health checks.
- **When In Use**: Whenever Render provisions or syncs the `inquira-backend` service from Git.
- **Potential Issues**: Does not declare a managed Postgres database or persistent disk, so free-tier deployments fall back to local ephemeral SQLite and lose data after container spin-down.
- **Future Solutions**: Add a `databases:` block (or Neon/Supabase `DATABASE_URL` env var) and a separate frontend service definition in a root `render.yaml` monorepo blueprint.

---

### `backend/app/__init__.py`
- **Why Created**: Marks `backend/app` as a Python importable package.
- **Why Used**: Enables relative imports (`from .database import Base`, `from .models import ...`) and running `uvicorn app.main:app` or `unittest` from `backend/`.
- **When In Use**: Every time Python resolves `app.*` imports.
- **Potential Issues**: None (empty marker file). If commands are run from the repo root instead of `backend/`, Python won't find `app` unless `PYTHONPATH=backend` is set.
- **Future Solutions**: Keep clean; optionally add `pyproject.toml` so `app` can be installed in editable mode (`pip install -e .`).

---

### `backend/app/database.py`
- **Why Created**: Centralizes SQLAlchemy `engine`, `SessionLocal`, `Base`, and FastAPI's `get_db()` dependency generator.
- **Why Used**: Guarantees a single database file path (`backend/inquira.db` resolved relative to `database.py`, avoiding duplicate `.db` files when `uvicorn` starts from different working directories), falls back to `/tmp/inquira.db` if the target directory is read-only, and enables SQLite foreign key enforcement (`PRAGMA foreign_keys=ON`).
- **When In Use**: Imported once at server startup (`engine`, `Base`) and on every HTTP request via `Depends(get_db)`.
- **Key Logic**: `DATABASE_URL` parsing, writable-directory check with `/tmp` fallback, `connect_args={"check_same_thread": False}` for multi-threaded FastAPI with SQLite, and `get_db()` `try/finally` session cleanup.
- **Potential Issues**:
  1. Does not rewrite legacy `postgres://` URLs to `postgresql://` (rejected by SQLAlchemy 2.0).
  2. Does not enable `pool_pre_ping=True`, which causes `SSL SYSCALL` / stale-connection errors on cloud Postgres after idle timeouts.
  3. On Render free tier without `DATABASE_URL`, local SQLite files are wiped on spin-down.
- **Future Solutions**:
  ```python
  if DATABASE_URL.startswith("postgres://"):
      DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
  engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=not DATABASE_URL.startswith("sqlite"))
  ```

---

### `backend/app/models.py`
- **Why Created**: Defines the SQLAlchemy ORM tables and relational foreign-key cascades.
- **Why Used**: Keeps schema relational and normalized while using JSON columns for flexible per-question attributes (`choices`, `page`, `properties`, `logic_rules`, `settings`).
- **When In Use**: On startup (`Base.metadata.create_all(engine)`) and across every ORM query/insert/delete in `main.py`.
- **Key Entities**:
  - Core builder tables: `Workspace`, `UserPreference`, `Inquiry`, `Prompt`, `Reply`, `ReplyItem`.
  - Assignment spec tables: `Form`, `Question`, `FormResponse`, `Answer`.
- **Potential Issues**:
  1. Maintains **two parallel schemas** (`Inquiry`/`Prompt`/`Reply` vs `Form`/`Question`/`FormResponse`/`Answer`). The Next.js UI uses `Inquiry`, while `/forms/*` endpoints write to `Form` (except fallback reads).
  2. Uses deprecated `datetime.utcnow` defaults (scheduled for removal in future Python versions).
  3. No multi-user `User` table or `owner_id` column (`UserPreference.user_key` defaults to `"default"`).
- **Future Solutions**: Consolidate onto a single canonical `Form`/`Question`/`Response` schema (or deprecate the duplicate), replace `datetime.utcnow` with `lambda: datetime.now(timezone.utc)`, and add `users` + `workspace_members` tables for multi-tenant auth.

---

### `backend/app/schemas.py`
- **Why Created**: Defines Pydantic v2 request/response schemas and the canonical `KINDS` tuple (19 supported question types).
- **Why Used**: Enforces runtime type safety, string length bounds (`PageIn.key` max 40 chars, `WorkspaceIn.name` 1–100 chars), default values, and automatic OpenAPI `/docs` generation.
- **When In Use**: Every `POST`, `PUT`, and `PATCH` request body in FastAPI is parsed and validated through these models before route handlers run.
- **Potential Issues**:
  1. `InquiryIn.settings`, `PromptIn.properties`, `PromptIn.logic_rules`, and `ReplyIn.answers` are untyped `dict`s, allowing arbitrary nested payloads.
  2. `FormResponseOut` uses deprecated Pydantic v1 `class Config: from_attributes = True` instead of `model_config = ConfigDict(from_attributes=True)`.
  3. `TitleIn.title` lacks `max_length` validation.
- **Future Solutions**: Replace untyped `dict` fields with typed Pydantic models (`WelcomeScreenSettings`, `LogicRuleSchema`), migrate `FormResponseOut` to `ConfigDict`, and enforce `max_length` bounds consistently.

---

### `backend/app/rules.py`
- **Why Created**: Implements authoritative server-side answer validation (`check_value(prompt, raw)`) for all 19 question kinds.
- **Why Used**: Never trusts client-side validation alone—validates emails, finite numbers (`math.isfinite`), phone regex, `http/https` URLs, ISO dates (`YYYY-MM-DD`), NPS/rating/opinion scale bounds, choice membership, checkbox/ranking JSON arrays, matrix row completeness, and `contact_info` JSON objects.
- **When In Use**: Called inside `POST /api/public/{slug}/replies` for every prompt in the published form, and tested directly in `backend/tests/test_rules.py`.
- **Potential Issues**:
  1. Duplicated in TypeScript inside `frontend/components/Runner.tsx` (`checkValue`), creating slight drift (e.g., `url` length check is 2048/255 in `rules.py` vs missing length check on `url` in `Runner.tsx`).
  2. The `EMAIL` regex accepts simple invalid domains (`a@b.c`); `PHONE` is regex-only without country-aware `phonenumbers` parsing.
  3. `submit_response` (`/forms/{form_id}/submit`) does not call `check_value`.
- **Future Solutions**: Unify `/forms/{form_id}/submit` validation through `check_value`, adopt `email-validator` / `phonenumbers` if strict telecom/RFC validation is required, and generate shared validation rules/JSON Schema from backend metadata.

---

### `backend/app/seed.py`
- **Why Created**: Populates the database automatically on first launch when empty (`seed_if_empty(db)`).
- **Why Used**: Provides an out-of-the-box demo experience with `My workspace`, `Marketing Team`, `Customer Feedback Survey` (14 mock replies), `Event RSVP` (6 mock replies), a multi-page `New form` draft, and sample `Form`/`Question`/`FormResponse` rows.
- **When In Use**: Invoked once during FastAPI `lifespan` startup whenever `db.query(Inquiry).count() == 0`.
- **Potential Issues**:
  1. If a user intentionally deletes **all** forms in production and the server restarts, `seed_if_empty` treats `count() == 0` as fresh and re-seeds demo data.
  2. Uses a hardcoded `datetime.utcnow()` and fixed `random.Random(7)` seed.
- **Future Solutions**: Gate seeding behind an environment flag (`SEED_DEMO_DATA=true`) or track a `system_state` flag (`seeded=True`) so intentionally emptied databases aren't re-populated.

---

### `backend/app/main.py`
- **Why Created**: The core FastAPI application housing startup migrations, CORS middleware, workspace CRUD, inquiry/form CRUD, publish/unpublish transitions, public respondent endpoints, analytics summarization, CSV export, and mock response generation.
- **Why Used**: Centralizes REST API routing, SQLAlchemy transaction boundaries, and CSV generation (`io.StringIO` + `csv.writer`) in one cleanly sectioned module.
- **When In Use**: Runs continuously as the ASGI server (`uvicorn app.main:app`) handling every frontend API call and public `/api/public/{slug}` submission.
- **Potential Issues**:
  1. `CORSMiddleware(allow_origins=["*"])` permits any origin; production should restrict `allow_origins` to the deployed frontend domain.
  2. Startup schema migrations use raw `ALTER TABLE ... DATETIME` in `lifespan` (note: `DATETIME` syntax is SQLite-specific; PostgreSQL uses `TIMESTAMP` if a legacy table ever triggers line 50).
  3. No authentication/authorization layer—any caller can read/delete/modify creator workspaces and forms.
  4. `export_csv` writes user answers verbatim, which can trigger CSV formula injection in Excel if a response starts with `=`, `+`, `-`, or `@`.
  5. `list_inquiries` triggers `len(i.prompts)` N+1 lazy loads across all inquiries.
- **Future Solutions**: Replace ad-hoc `ALTER TABLE` blocks with **Alembic** migrations, add JWT/session authentication, sanitize CSV cells starting with formula characters (`'` prefix), use `selectinload`/`func.count` to eliminate N+1 queries, and split routes into FastAPI `APIRouter` modules (`routes/workspaces.py`, `routes/inquiries.py`, `routes/public.py`).

---

### `backend/tests/test_rules.py`
- **Why Created**: Unit test suite verifying `valid_kind` and `check_value` across all 19 question types.
- **Why Used**: Prevents regressions in server-side respondent validation (NaN/Infinity rejection, invalid ISO dates like Feb 31, unranked items, missing matrix rows, invalid URLs).
- **When In Use**: Executed via `python -m unittest discover -s tests -v` inside `backend/`.
- **Potential Issues**: Tests only `check_value` in isolation without HTTP status assertions (`422`) or boundary fuzzing (e.g., exact 255/256-char strings).
- **Future Solutions**: Add FastAPI `TestClient` tests verifying HTTP `422` payload structure (`{"detail": {"errors": {...}}}`) and edge-length boundary tests.

---

### `backend/tests/test_pages.py`
- **Why Created**: Unit tests for multi-field Page grouping (`page` JSON object) during save, ungrouping, form cloning, and `PageIn` Pydantic bounds.
- **Why Used**: Ensures duplicated forms generate fresh `page.key` IDs so cloned forms never accidentally share page metadata, and verifies `key` length constraints (`1..40`).
- **When In Use**: Executed via `python -m unittest discover -s tests -v` inside `backend/`.
- **Potential Issues**: Uses an in-memory SQLite DB directly via `apply_payload`/`clone_prompts` rather than full HTTP `PUT /api/inquiries/{id}` integration requests.
- **Future Solutions**: Add end-to-end `TestClient` tests for reordering pages and moving prompts between pages via HTTP.

---

### `backend/tests/test_forms_api.py`
- **Why Created**: Integration tests for workspace ordering (`move-up`/`move-down`), test response generation (`generate_test_response`), and the `/forms/` relational API endpoints.
- **Why Used**: Validates relational cascade persistence, ordering edge cases, and workspace movement logic against an isolated in-memory SQLite engine.
- **When In Use**: Executed via `python -m unittest discover -s tests -v` inside `backend/`.
- **Potential Issues**: Calls route functions directly rather than via FastAPI `TestClient` (so Pydantic HTTP serialization, CORS headers, and 404/422 HTTP middleware aren't exercised here), and leaves an open SQLAlchemy connection warning in test teardown (`engine.dispose()` not called).
- **Future Solutions**: Call `self.engine.dispose()` in `tearDown`, migrate to `fastapi.testclient.TestClient` / `pytest` fixtures, and unify with `scratch/verify_e2e.py`.

---

## Frontend Configuration & Styling

### `frontend/package.json`
- **Why Created**: Defines the Next.js (`14.2.15`), React (`18.3.1`), TypeScript (`5.5.4`), and Tailwind CSS (`3.4.17`) dependencies and npm scripts (`dev`, `build`, `start`).
- **Why Used**: Configures local development on port `3000` (`next dev -p 3000`) and production bundling.
- **When In Use**: During `npm install`, `npm run dev`, `npm run build`, and `npm run start`.
- **Potential Issues**: No `lint` (`eslint`) or `test` (`vitest`/`playwright`) scripts configured in `scripts`.
- **Future Solutions**: Add `"typecheck": "tsc --noEmit"`, `"lint": "next lint"`, and Playwright E2E scripts for CI automation.

---

### `frontend/next.config.js`
- **Why Created**: Next.js configuration file (`reactStrictMode: true`).
- **Why Used**: Enables React 18 Strict Mode checks in development to surface unsafe effects and double-render bugs early.
- **When In Use**: Read at startup by `next dev` and `next build`.
- **Potential Issues**: If future features add external user avatars or uploaded form cover images via `<Image />`, Next.js will reject remote domains unless configured here.
- **Future Solutions**: Add `images: { remotePatterns: [...] }` when media uploads or CDN assets are introduced.

---

### `frontend/tsconfig.json`
- **Why Created**: TypeScript compiler settings (`strict: true`, `@/*` path alias to `./*`, Next.js TS plugin).
- **Why Used**: Enforces strict type safety (`noImplicitAny`, `strictNullChecks`) and clean absolute imports (`@/components/...`, `@/lib/...`).
- **When In Use**: Continuously in the IDE and when running `npx tsc --noEmit` or `next build`.
- **Potential Issues**: None; note `next-env.d.ts` and `.next/types/**/*.ts` are included automatically.
- **Future Solutions**: Enable `noUncheckedIndexedAccess: true` for even safer array/dictionary indexing (`prompts[idx]`).

---

### `frontend/tailwind.config.js`
- **Why Created**: Tailwind CSS configuration specifying content scan paths (`./app/**/*`, `./components/**/*`) and `darkMode: "class"`.
- **Why Used**: Pairs class-based dark mode (`html.dark`) with `ThemeProvider.tsx` instead of `prefers-color-scheme` so users can toggle themes manually with zero flash.
- **When In Use**: At build/dev CSS compilation via PostCSS.
- **Potential Issues**: `frontend/lib/` is not listed in `content` (workaround currently works only because `lib/styles.ts` utility strings happen to match or be standard classes—if custom classes are added inside `lib/*.ts`, Tailwind JIT could purge them!).
- **Future Solutions**: Add `"./lib/**/*.{js,ts,tsx}"` to the `content` array in `tailwind.config.js` so classes in `frontend/lib/styles.ts` are guaranteed to be scanned.

---

### `frontend/postcss.config.js`
- **Why Created**: Registers `tailwindcss` and `autoprefixer` PostCSS plugins.
- **Why Used**: Required by Next.js to compile `@tailwind` directives and vendor-prefix CSS properties.
- **When In Use**: Every CSS bundle compilation in `next dev` and `next build`.
- **Potential Issues**: None.
- **Future Solutions**: Add `cssnano` automatically handled by Next.js production builds.

---

### `frontend/app/globals.css`
- **Why Created**: Global stylesheet (~5,380 lines) declaring Tailwind layers, CSS design tokens (`--tf-purple`, `--tf-border`, `--tf-text`, etc.), Typeform animations (`fromAbove`, `rise`, `pop`, `haloDotPulse`, `tf-shimmer`), light/dark theme overrides, and builder/runner layout rules.
- **Why Used**: Supplies custom keyframe choreography and CSS variable theming alongside Tailwind utility classes.
- **When In Use**: Imported once in `app/layout.tsx`, affecting every route.
- **Potential Issues**:
  1. Contains legacy unlayered CSS rules (`.builder .slide`, `.modal`, `.toast`, `html.dark ... !important`) after `@tailwind utilities`, which can override Tailwind utility classes due to CSS cascade order and specificity.
  2. `* { scrollbar-width: none !important }` hides all scrollbars globally, hurting accessibility for desktop users without trackpads/wheel mice.
  3. Very large monolithic file containing unused/superseded styles from earlier iterations.
- **Future Solutions**: Gradually remove superseded class selectors in favor of pure Tailwind utilities, wrap base resets in `@layer base`, remove global `!important` scrollbar hiding (scope `.no-scrollbar` only where intentional), and trim dead CSS rules.

---

### `frontend/app/icon.svg`
- **Why Created**: Browser tab favicon matching Typeform's rounded white square icon with vertical pill + rounded square mark.
- **Why Used**: Uses Next.js App Router's built-in file metadata convention (`app/icon.svg`) so every route automatically gets a crisp vector favicon without manual `<link>` tags.
- **When In Use**: Served as `/icon.svg` on all pages by browser tabs and bookmarks.
- **Potential Issues**: Very old browsers/Safari iOS home-screen pins sometimes prefer a `180×180` PNG (`apple-icon.png`) or `favicon.ico` fallback.
- **Future Solutions**: Optionally generate `app/apple-icon.png` alongside `app/icon.svg` for iOS Safari home screen shortcuts.

---

## Frontend App Router Pages

### `frontend/app/layout.tsx`
- **Why Created**: Root Next.js App Router layout wrapping every page in `ThemeProvider` and `ToastProvider`.
- **Why Used**: Injects an inline synchronous `<head>` script reading `localStorage.getItem("inquira-theme")` before React hydrates so dark mode never flashes white on reload, and makes `useTheme()` / `useToast()` globally available.
- **When In Use**: Wraps every single page (`/`, `/new`, `/builder/[id]`, `/f/[slug]`, `/results/[id]`).
- **Potential Issues**: Inline script relies on `localStorage`, which can differ if SSR/cookies were ever used; no `<ErrorBoundary>` wraps `{children}`.
- **Future Solutions**: Add a global React `error.tsx` boundary in `app/` and optionally use cookies for SSR-aware theme rendering.

---

### `frontend/app/loading.tsx`
- **Why Created**: Next.js App Router route-transition skeleton screen using `.tf-shimmer` animations.
- **Why Used**: Displays an instant structural skeleton matching the dashboard layout during route navigation so transitions feel responsive rather than blank.
- **When In Use**: Automatically rendered by Next.js Suspense boundaries while route chunks load.
- **Potential Issues**: Hardcoded to look like the Dashboard layout (`/`), even when navigating directly to `/f/[slug]` (public form) or `/results/[id]`.
- **Future Solutions**: Add route-specific `loading.tsx` skeletons under `app/f/[slug]/loading.tsx` and `app/builder/[id]/loading.tsx`.

---

### `frontend/app/page.tsx`
- **Why Created**: Main Creator Dashboard (`/`) for workspace management and form CRUD.
- **Why Used**: Replicates the Typeform workspace experience: left workspace sidebar (`Private` / custom workspaces, `+ Create form`, response quota meter, search modal trigger), top tabs, promo banners, `List` / `Grid` toggle persisted in `localStorage`, sorting, workspace drag-and-drop form movement, rename/duplicate/delete/publish/unpublish/copy-to/move-to actions.
- **When In Use**: Loaded when visiting `/` or clicking `Forms` / `Homepage`.
- **Potential Issues**:
  1. `RESPONSE_LIMIT = 10` is hardcoded in the client rather than fetched from backend plan settings.
  2. Workspace action dots (`···`) rely on hover (`opacity-0 group-hover/ws:opacity-100`), making them hard to discover on touch screens.
  3. On mobile/tablet (`<= 900px`), the `<aside>` stacks above `<main>`, pushing forms below the fold, and the workspace header toolbar doesn't wrap on narrow viewports.
  4. Top-level nav tabs (`Contacts`, `Automations`, `Insights`, `Pages`, `Research Flow`) are UI placeholders triggering `"coming soon"` toasts.
- **Future Solutions**: Move `<main>` above `<aside>` (or turn `<aside>` into a mobile drawer), add `flex-wrap` to the workspace toolbar, fetch plan quotas from an API, and implement real Contacts/Automations/Insights views.

---

### `frontend/app/new/page.tsx`
- **Why Created**: New Form entry screen (`/new`) offering natural-language question import (`toPrompts`) or `"Start from scratch"`.
- **Why Used**: Provides Typeform's signature `"What would you like to create?"` onboarding flow while reading the active workspace ID from `sessionStorage` so new forms land in the currently selected workspace.
- **When In Use**: Opened when clicking `+ Create form` or `Create form` on dashboard banners.
- **Potential Issues**:
  1. `overflow-hidden` on the outer grid container can clip action buttons on very short mobile screens when the virtual keyboard opens.
  2. `"Sync to CRM"` and voice/attachment icons are `"coming soon"` stubs.
  3. `toPrompts()` is purely heuristic keyword matching rather than an actual LLM generator.
- **Future Solutions**: Change `overflow-hidden` to `overflow-y-auto`, connect the compose box to an LLM API endpoint for smart question + choices generation, and add form templates.

---

### `frontend/app/builder/[id]/page.tsx`
- **Why Created**: The flagship Three-Pane Form Builder Studio (`/builder/[id]`): Left Pages/Questions/Endings tree with cross-page drag-and-drop, Center live WYSIWYG canvas (Welcome, Ending, Question, Multi-field Page preview), and Right Question/Theme/Welcome/Ending Inspector, plus Share tab and full-screen Preview Modal.
- **Why Used**: Uses optimistic immutable state cloning (`structuredClone` via `mutate`) paired with a `revision` counter + `700ms` debounced auto-save so typing feels instantaneous while reconciling server-assigned IDs cleanly without overwriting newer keystrokes.
- **When In Use**: Opened whenever editing any form (`/builder/{id}`).
- **Key Logic**:
  - `buildSteps` groups consecutive questions with the same `page.key` into one screen.
  - `handlePageDragStart/Drop` & `handlePromptDragStart/Drop` reorder whole pages or move questions between pages.
  - `patch()` safely updates prompts by ID (`typeof sel !== "number"` guard prevents welcome/ending crashes).
  - `canvasBgColor` / `canvasTextColor` compute theme-aware light/dark contrast.
  - `handleShareClick` auto-saves, publishes via API, triggers `PublishCelebration`, and reveals the Share tab.
- **Potential Issues**:
  1. Single ~2,300-line monolithic component—hard to maintain and re-renders the entire tree on every keystroke.
  2. Left sidebar (`<= 600px`) and Right inspector (`<= 900px`) are hidden on small viewports without a mobile drawer/sheet.
  3. Welcome/Ending/Question headings use single-line `<input>` elements, clipping long headings in narrow mobile preview frames instead of wrapping.
  4. `Logic` modal, `Undo`, `Comments`, and `Question image/video` are UI placeholders (`logic_rules` are stored in state/DB but not yet evaluated at runtime in `Runner.tsx`).
- **Future Solutions**: Refactor into modular components (`BuilderHeader.tsx`, `PagesSidebar.tsx`, `CanvasEditor.tsx`, `InspectorPanel.tsx`, `PreviewModal.tsx`, `ShareTab.tsx`), replace heading `<input>`s with auto-wrapping `<textarea>`s, add mobile slide-over drawers, and implement runtime conditional branching in `Runner.tsx`.

---

### `frontend/app/f/[slug]/page.tsx`
- **Why Created**: Public unauthenticated respondent page (`/f/[slug]`).
- **Why Used**: Clean, minimal wrapper fetching `GET /api/public/{slug}` and passing the published `Inquiry` to `Runner` with `POST /api/public/{slug}/replies`. Requires zero authentication so anyone with the shareable link can fill and submit the form.
- **When In Use**: Whenever a respondent opens a shared form link (`/f/{slug}`).
- **Potential Issues**:
  1. Draft forms or invalid slugs show a plain unstyled error state (`404`) without branding.
  2. Uses `h-screen` instead of `min-h-[100dvh]`, which can slightly clip under mobile Safari/Chrome address bars.
  3. Does not fetch or apply custom form `theme` (`Pearl white`, `Classic blue`, `Inky black`, `Forest green`) on the outer wrapper.
- **Future Solutions**: Use `h-[100dvh]`, pass the saved `inq.theme` / `settings` (`progressBar`, `navArrows`, `typeformBranding`, `welcome_screen`) into `Runner`, and style the 404/closed-form state cleanly.

---

### `frontend/app/results/[id]/page.tsx`
- **Why Created**: Creator Analytics & Responses dashboard (`/results/[id]`).
- **Why Used**: Renders three tabs (`Form Performance`, `Response Summary`, `Responses (N)`), metric cards, a step-by-step Visual Drop-off Chart, per-question bar charts/averages, individual response inspection modal, one-click `Export CSV`, and `Generate test response`.
- **When In Use**: Opened via `Results` in the Builder nav or a form's `···` menu on the Dashboard.
- **Potential Issues**:
  1. `simulatedViews` and `simulatedStarts` (lines 63–64) are derived deterministically from `replies.length` rather than tracked via real view/start analytics events in the backend.
  2. On `< 400px` mobile screens, the 3-button segmented tab bar (`inline-flex overflow-hidden`) and drop-off chart bar labels can feel cramped without `overflow-x-auto`.
  3. Responses table renders all rows at once without pagination or search/filtering.
- **Future Solutions**: Add lightweight `POST /api/public/{slug}/events` (`view` / `start`) tracking in SQLite, add pagination & date/text filtering on the responses table, and make the sub-nav tabs horizontally scrollable on small phones.

---

## Frontend Shared Libraries

### `frontend/lib/types.ts`
- **Why Created**: Central TypeScript domain definitions (`Kind`, `PageInfo`, `PromptDTO`, `Inquiry`, `Workspace`, `KIND_META`, `kindName`).
- **Why Used**: Keeps API contracts and UI metadata (`KIND_META` icons and human-readable names for all 19 question kinds) strongly typed across pages and components.
- **When In Use**: Imported at compile time across nearly every frontend file.
- **Potential Issues**: `properties`, `logic_rules`, and `settings` are typed as `Record<string, any>`, weakening strict TypeScript checking.
- **Future Solutions**: Define strict interfaces (`WelcomeScreenConfig`, `FormSettings`, `LogicRule`) instead of `any`.

---

### `frontend/lib/api.ts`
- **Why Created**: Typed `fetch` wrapper (`call`, `send`, `errorMessage`, `isApiError`, `API`).
- **Why Used**: Centralizes `NEXT_PUBLIC_API_URL` resolution (defaulting to `http://localhost:8000`), `cache: "no-store"` (preventing stale form/dashboard reads), and structured parsing of FastAPI `422` field-level validation errors (`detail.errors`).
- **When In Use**: Every API call made by Dashboard, Builder, New Form, Public Form, and Results.
- **Potential Issues**:
  1. No request timeout (`AbortController`) or automatic retry for Render cold-start wakeups (~20–40s on free tier).
  2. No auth header injection hook if user login is added later.
- **Future Solutions**: Add `AbortController` timeouts, friendly cold-start retry/loading indicator, and an `Authorization` header injector when authentication is added.

---

### `frontend/lib/steps.ts`
- **Why Created**: Screen-grouping & field helper (`buildSteps`, `newPageKey`, `holdFor`, `contactInfoPrompts`).
- **Why Used**: Powers Inquira's multi-field Page model—consecutive prompts sharing `page.key` render on one screen, while ungrouped prompts render one question per screen.
- **When In Use**: In `builder/[id]/page.tsx` (Pages tree + drag/drop) and `Runner.tsx` (step-by-step navigation).
- **Potential Issues**: `newPageKey` uses `Math.random().toString(36)` (tiny theoretical collision risk compared to `crypto.randomUUID()`), and non-consecutive prompts with the same `page.key` would split into separate steps.
- **Future Solutions**: Use `crypto.randomUUID().slice(0, 8)` (with fallback) and normalize prompt ordering so same-key page items stay contiguous.

---

### `frontend/lib/guess.ts`
- **Why Created**: Rule-based text parser (`guessKind`, `toPrompts`) converting pasted lines into typed `PromptDTO[]`.
- **Why Used**: Lets creators paste bulleted or numbered survey questions into `/new` or `AddContentModal` ("Import questions") and automatically get `email`, `phone`, `date`, `rating`, `yes_no`, `number`, `url`, `long_text`, or `short_text` prompts.
- **When In Use**: When importing text in `app/new/page.tsx` or `AddContentModal.tsx`.
- **Potential Issues**: Cannot extract multiple-choice options inline (e.g., `"Role (Engineer / Designer)"`) and only supports English keywords.
- **Future Solutions**: Extend parser to recognize bracketed/indented choices (`- Option A`) or delegate to an AI endpoint.

---

### `frontend/lib/styles.ts`
- **Why Created**: Shared Tailwind class strings (`LINE`, `LINE_CC`, `ERR`) for respondent underline inputs and error badges.
- **Why Used**: Prevents duplicating long Tailwind class lists with dark-mode variants across `Runner.tsx`, `PhoneField.tsx`, and `RespondentFlow.tsx`.
- **When In Use**: Rendered on every text/phone/email/number/date/url input and validation message in the respondent flow.
- **Potential Issues**: Because `styles.ts` lives in `lib/` (outside `tailwind.config.js` `content` paths), custom arbitrary classes added here later wouldn't be scanned unless already used in `app/` or `components/`.
- **Future Solutions**: Include `./lib/**/*.{ts,tsx}` in `tailwind.config.js` or turn these into tiny reusable React UI primitives (`<LineInput />`, `<ErrorBadge />`).

---

### `frontend/lib/user.ts`
- **Why Created**: Static creator identity object (`USER`: `name`, `email`, `initials`, `workspace`).
- **Why Used**: Displays creator profile details in the Dashboard header, organization switcher, and `AccountMenu` without requiring login for the assignment scope.
- **When In Use**: Imported by `app/page.tsx`, `app/builder/[id]/page.tsx`, `app/new/page.tsx`, and `components/AccountMenu.tsx`.
- **Potential Issues**: Hardcoded single creator; editing profile or logging out isn't backed by real auth.
- **Future Solutions**: Replace with an `AuthProvider` context fetching `/api/me` when authentication is introduced.

---

## Frontend Reusable Components

### `frontend/components/ThemeProvider.tsx`
- **Why Created**: React context managing `"light"` vs `"dark"` theme state (`ThemeProvider`, `useTheme`, `ThemeToggleButton`).
- **Why Used**: Synchronizes `document.documentElement.classList` (`dark`) with `localStorage` (`inquira-theme`) and provides an accessible moon/sun toggle button.
- **When In Use**: Mounted at the root in `app/layout.tsx` and rendered in headers across Dashboard, Builder, Results, and New Form.
- **Potential Issues**: Defaults initial React state to `"light"` before `useEffect` syncs `localStorage`, which can cause a brief icon flip on dark-mode page load (even though the inline `<head>` script prevents background flicker).
- **Future Solutions**: Sync initial button icon via CSS (`dark:hidden` / `hidden dark:block`) or `useSyncExternalStore` so the icon never flips after hydration.

---

### `frontend/components/Toasts.tsx`
- **Why Created**: Global toast notification provider (`ToastProvider`, `useToast`).
- **Why Used**: Gives instant non-blocking feedback for saves, copies, publish/unpublish, errors, and `"coming soon"` stubs, using semantic tone detection (`success`, `error`, `soon`, `info`), themed white/dark frosted cards, and manual dismiss buttons.
- **When In Use**: Mounted at the root in `app/layout.tsx` and triggered via `toast("...")` across every page.
- **Potential Issues**: Tone detection relies on regex matching English keywords (`saved`, `error`, `coming soon`) rather than an explicit optional parameter (`toast(msg, { tone })`).
- **Future Solutions**: Support an optional second parameter `toast(msg, tone?)` with automatic keyword detection as fallback, plus localization support.

---

### `frontend/components/Modal.tsx`
- **Why Created**: Reusable accessible dialog shell (`role="dialog"`, `aria-modal="true"`, `Escape` key handler, backdrop click-to-close).
- **Why Used**: Standardizes Rename, Add/Rename Workspace, Leave/Delete Workspace, Search, Form Settings, Logic, and Response inspection dialogs with consistent borders, animations, and responsive sizing.
- **When In Use**: Whenever any confirmation, search, settings, or response detail dialog opens.
- **Potential Issues**: Does not trap `Tab` keyboard focus strictly inside the dialog (`focus-trap`) or restore focus to the trigger button on close.
- **Future Solutions**: Add focus trapping + focus restoration (or adopt Radix UI / Headless UI Dialog primitives).

---

### `frontend/components/Dropdown.tsx`
- **Why Created**: Accessible custom `role="combobox"` + `role="listbox"` select component supporting keyboard navigation (`ArrowUp`, `ArrowDown`, `Home`, `End`, `Enter`, `Escape`).
- **Why Used**: Replaces native `<select>` for Dashboard sorting and Respondent `dropdown` / `matrix` fields so styling, dark mode, and keyboard UX match Typeform across all browsers.
- **When In Use**: Dashboard sort control (`page.tsx`) and `dropdown` / `matrix` question rendering (`Runner.tsx`).
- **Potential Issues**: Does not flip upward automatically if opened near the bottom edge of a short mobile viewport, and lacks type-ahead character search for long option lists.
- **Future Solutions**: Measure `getBoundingClientRect()` on open to flip `bottom-full` when space below is tight, and add type-ahead filtering.

---

### `frontend/components/ToggleSwitch.tsx`
- **Why Created**: Accessible `role="switch"` toggle button with `aria-checked` state and smooth thumb slide animation.
- **Why Used**: Renders binary settings cleanly in the Builder Right Inspector (`Required`, `Show time to complete`, `Answer validation`, etc.) and Form Settings modal.
- **When In Use**: Builder Inspector and Form Settings modal.
- **Potential Issues**: None significant; relies cleanly on `aria-checked` and disabled states.
- **Future Solutions**: Optionally support `size="sm" | "md"` variants if compact toolbars need switches later.

---

### `frontend/components/AccountMenu.tsx`
- **Why Created**: Creator avatar button (`M2`) opening a Typeform-style account & resources popover (`Escape` + click-outside dismissal).
- **Why Used**: Houses account profile info, `Homepage` navigation, and resource links (`Support`, `Help center`, etc.) cleanly in all creator headers (`size="sm"` in Builder, `size="md"` in Dashboard/Results).
- **When In Use**: Displayed in the top-right header of Dashboard, Builder, Results, and New Form.
- **Potential Issues**: Most menu items currently trigger `"coming soon"` toasts; `Log out` is a stub until real authentication exists.
- **Future Solutions**: Connect `Account settings`, `Support`, and `Log out` to real routes and auth session termination.

---

### `frontend/components/PhoneField.tsx`
- **Why Created**: Compound phone input combining a country dial-code `<select>` (`US +1`, `IN +91`, `GB +44`, etc.) with a national `tel` `<input>`.
- **Why Used**: Serializes clean `"+<code> <number>"` strings (or `""` when blank) so required/optional phone validation works seamlessly with `Runner.tsx` and `rules.py`, using `min-w-0 flex-1` to stay visible next to the picker even inside narrow mobile frames.
- **When In Use**: Rendered by `Runner.tsx` whenever a question (or page field) has `kind === "phone"`.
- **Potential Issues**:
  1. Hardcodes 8 countries (`COUNTRIES`); countries sharing `+1` (`US` and `CA`) match the first entry (`US`) on value re-parse.
  2. Does not read the builder's `default_country_code` property (`cur.properties.default_country_code`).
- **Future Solutions**: Pass `prompt.properties?.default_country_code` as initial country default, expand the country list (or add searchable country picker), and store structured E.164 numbers.

---

### `frontend/components/AddContentModal.tsx`
- **Why Created**: Three-tab Typeform-style content picker (`Add form elements`, `Import questions`, `Create with AI`).
- **Why Used**: Groups all 19 question kinds into color-coded categories (`Recommended`, `Contact Info`, `Text & Media`, `Choice`, `Rating & Ranking`, `Other`), offers one-click `Contact Info` multi-field page creation and `LEAD_TEMPLATE` insertion, and supports live element search.
- **When In Use**: Opened by `+ Add content` in the Builder toolbar or Pages sidebar.
- **Potential Issues**:
  1. Selecting `Welcome Screen` or `Endings` inside the modal currently only shows a toast rather than calling `choose("welcome")` / `choose("ending")` in the Builder.
  2. `File Upload` and `Product recommendation quiz` / `Personality quiz` are disabled placeholders.
  3. On narrow mobile screens (`< 420px`), `.am-tpl` cards can squeeze text beside the `56px` icon.
- **Future Solutions**: Wire `onSelectWelcome` and `onSelectEnding` callbacks from `Builder`, wrap `.am-tpl` on mobile (`flex-wrap`), and implement File Upload via S3/Cloudflare R2 presigned URLs.

---

### `frontend/components/PublishCelebration.tsx`
- **Why Created**: Animated full-screen Typeform publish celebration overlay: radiating 24-dot halo ring + purple gradient badge morphing from a checkmark (`0–900ms`) into a flying paper airplane (`900–1850ms`) before fading to the Share tab (`2200ms`).
- **Why Used**: Replicates Typeform's signature publish launch micro-interaction smoothly using pure CSS keyframes (`globals.css`) and SVG transitions without heavy third-party animation dependencies.
- **When In Use**: Triggered by `handleShareClick` in `builder/[id]/page.tsx` when publishing a draft form.
- **Potential Issues**: Uses a fixed `2200ms` timeline (`onComplete` in `useEffect` dependency array—if the parent recreates `onComplete` on re-render mid-animation, the timers could reset).
- **Future Solutions**: Store `onComplete` in a `useRef` inside `PublishCelebration` so parent re-renders never restart the `2.2s` timer, and respect `prefers-reduced-motion`.

---

### `frontend/components/Confetti.tsx`
- **Why Created**: HTML5 `<canvas>` particle burst confetti animation (`140` multi-shape particles with gravity and drag).
- **Why Used**: Built as an alternative celebration overlay earlier in development before switching to Typeform's `PublishCelebration` halo + paper airplane animation.
- **When In Use**: Currently **unused** (retained in `components/` as an optional visual effect).
- **Potential Issues**: Unused dead code slightly increases repo maintenance surface.
- **Future Solutions**: Either remove it to keep the bundle minimal or trigger it optionally on form submission thank-you screens / milestones.

---

### `frontend/components/Runner.tsx`
- **Why Created**: The main conversational one-screen-at-a-time respondent engine powering both live public forms (`/f/[slug]`) and Builder desktop/mobile previews.
- **Why Used**: Supports all 19 question kinds, multi-field page steps (`buildSteps`), cascade slide transitions (`from-above`, `text-cascade-*`), full keyboard shortcuts (`Enter`, `Ctrl/Cmd+Enter`, `ArrowUp`/`ArrowDown`, `A–Z`, `Y/N`, `1–5`), auto-advance for single-question choices, client + server `422` validation mapping back to the offending step, and `isMobileView` layout adaptation.
- **When In Use**: Mounted in `app/f/[slug]/page.tsx` and inside `app/builder/[id]/page.tsx` (inline page preview & full-screen Preview Modal).
- **Potential Issues**:
  1. Ignores `inquiry.settings` toggles (`progressBar`, `navArrows`, `typeformBranding`, `welcome_screen`)—currently always renders progress bar and bottom-right nav/branding.
  2. Client validation (`checkValue`) duplicates backend `rules.py` logic.
  3. Does not yet evaluate `prompt.logic_rules` for conditional skip/branching jumps.
  4. Clicking browser Back button leaves the page rather than stepping to the previous question.
- **Future Solutions**: Render `welcome_screen` as step `-1` when enabled, respect `settings.progressBar`/`navArrows`/`typeformBranding`, evaluate `logic_rules` in `advance()`, and save partial answers in `sessionStorage` so accidental refreshes don't lose respondent progress.

---

### `frontend/components/RespondentFlow.tsx`
- **Why Created**: Earlier simplified Typeform respondent flow component built for the `/forms/{id}/submit` relational API (`Form` / `Question`).
- **Why Used**: Handles basic `short_text`, `long_text`, `email`, `number`, `choice`, `yes_no`, `rating` questions against `/forms/{id}/submit`.
- **When In Use**: Currently **not mounted** by `/f/[slug]` or `/builder/[id]` (superseded by the fuller 19-type + multi-page `Runner.tsx`).
- **Potential Issues**:
  1. Uses hardcoded `window.location.port === "3000" ? "http://localhost:8000" : ""` instead of `NEXT_PUBLIC_API_URL` (`lib/api.ts`).
  2. Supports only 7 question types and single-question screens (no multi-field pages or `PhoneField`).
- **Future Solutions**: Either remove `RespondentFlow.tsx` (and consolidate on `Runner.tsx`) or update it to import `API` from `@/lib/api` if `/forms/` routes remain active.
