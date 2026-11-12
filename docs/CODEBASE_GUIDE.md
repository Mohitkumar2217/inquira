# Inquira Codebase Guide (Master Index)

This guide indexes **every coding and configuration file** in the **Inquira** project (36 Backend + 30 Frontend = **66 files**). Each linked `.md` guide explains:

1. **Why Created** — Architectural role & problem solved
2. **Why Used** — Technology, pattern, or library rationale
3. **When In Use** — Startup, build, request, or UI lifecycle triggers
4. **Key Symbols & Walkthrough** — Exact classes, functions, and data flow
5. **Potential Issues** — Real edge cases, scaling limits, and technical debt
6. **Future Solutions** — Production-grade upgrades

---

## High-Level Architecture

```
Next.js 14 App Router (frontend/)
  ├── /                ──▶ Dashboard (workspaces, drag-drop, grid/list)
  ├── /new             ──▶ New Form + Plain-Text Parser
  ├── /builder/[id]    ──▶ 3-Pane Studio, Auto-Save, Preview, Publish
  ├── /f/[slug]        ──▶ Public Respondent Runner (19 kinds + multi-field pages)
  └── /results/[id]    ──▶ Performance Funnel, Summary Charts, Table, CSV
          │
          ▼  HTTP / JSON (lib/api.ts)
FastAPI Modular Backend (backend/app/)
  ├── routes/          ──▶ APIRouter endpoint bindings (/health, /api/*)
  ├── controllers/     ──▶ Request/DI adapters (Depends(get_db))
  ├── services/        ──▶ Business rules & DB transactions
  ├── lib/             ──▶ Pure validators (19 kinds), formatters, seed
  ├── middleware/      ──▶ CORS & X-Process-Time-Ms timing/logging
  ├── schemas/         ──▶ Pydantic v2 request/response DTOs
  ├── models/          ──▶ SQLAlchemy ORM tables (Workspace, Inquiry)
  └── config/          ──▶ Env settings, SQLite/Postgres engine, migrations
```

---

## Backend Files (`backend/` — 36 Files)

### Root & Entrypoint (4)
| File | Guide | Role |
| :--- | :--- | :--- |
| `backend/requirements.txt` | [requirements.txt.md](files/backend/requirements.txt.md) | Python dependencies (`fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`) |
| `backend/render.yaml` | [render.yaml.md](files/backend/render.yaml.md) | Render Blueprint build & start manifest |
| `backend/app/__init__.py` | [__init__.py.md](files/backend/app/__init__.py.md) | Marks `app` as a regular Python package |
| `backend/app/main.py` | [main.py.md](files/backend/app/main.py.md) | `create_app()` factory, `lifespan()` DB init, legacy re-exports |

### Config (`backend/app/config/` — 3)
| File | Guide | Role |
| :--- | :--- | :--- |
| `backend/app/config/__init__.py` | [__init__.py.md](files/backend/app/config/__init__.py.md) | Config barrel exports |
| `backend/app/config/settings.py` | [settings.py.md](files/backend/app/config/settings.py.md) | Env config, `postgres://` fix, writable SQLite fallback |
| `backend/app/config/database.py` | [database.py.md](files/backend/app/config/database.py.md) | Engine, SQLite WAL/FK pragmas, `get_db()`, `_run_migrations()`, `init_db()` |

### Models (`backend/app/models/` — 3)
| File | Guide | Role |
| :--- | :--- | :--- |
| `backend/app/models/__init__.py` | [__init__.py.md](files/backend/app/models/__init__.py.md) | Registers all 6 ORM tables with `Base.metadata` |
| `backend/app/models/workspace.py` | [workspace.py.md](files/backend/app/models/workspace.py.md) | `Workspace`, `UserPreference` |
| `backend/app/models/inquiry.py` | [inquiry.py.md](files/backend/app/models/inquiry.py.md) | `Inquiry`, `Prompt`, `Reply`, `ReplyItem` |

### Schemas (`backend/app/schemas/` — 3)
| File | Guide | Role |
| :--- | :--- | :--- |
| `backend/app/schemas/__init__.py` | [__init__.py.md](files/backend/app/schemas/__init__.py.md) | Pydantic DTO barrel exports |
| `backend/app/schemas/workspace.py` | [workspace.py.md](files/backend/app/schemas/workspace.py.md) | `WorkspaceIn`, `WorkspaceMoveIn`, `ActiveWorkspaceIn`, `UserPreferencesIn` |
| `backend/app/schemas/inquiry.py` | [inquiry.py.md](files/backend/app/schemas/inquiry.py.md) | `KINDS` (19 types), `PageIn`, `PromptIn`, `InquiryIn`, `TitleIn`, `ReplyIn` |

### Middleware (`backend/app/middleware/` — 3)
| File | Guide | Role |
| :--- | :--- | :--- |
| `backend/app/middleware/__init__.py` | [__init__.py.md](files/backend/app/middleware/__init__.py.md) | `register_middleware()` wiring |
| `backend/app/middleware/cors.py` | [cors.py.md](files/backend/app/middleware/cors.py.md) | CORS policy from `settings.cors_origins` |
| `backend/app/middleware/logging.py` | [logging.py.md](files/backend/app/middleware/logging.py.md) | `X-Process-Time-Ms` header & unhandled exception logging |

### Lib (`backend/app/lib/` — 4)
| File | Guide | Role |
| :--- | :--- | :--- |
| `backend/app/lib/__init__.py` | [__init__.py.md](files/backend/app/lib/__init__.py.md) | Pure utilities & seed barrel exports |
| `backend/app/lib/validators.py` | [validators.py.md](files/backend/app/lib/validators.py.md) | `check_value()` & `valid_kind()` across all 19 question types |
| `backend/app/lib/formatters.py` | [formatters.py.md](files/backend/app/lib/formatters.py.md) | `new_slug()`, DTO serialization, `reply_rows()`, `summarize()` |
| `backend/app/lib/seed.py` | [seed.py.md](files/backend/app/lib/seed.py.md) | Default workspace & reproducible demo data seeder |

### Services (`backend/app/services/` — 4)
| File | Guide | Role |
| :--- | :--- | :--- |
| `backend/app/services/__init__.py` | [__init__.py.md](files/backend/app/services/__init__.py.md) | Service layer barrel exports |
| `backend/app/services/workspace_service.py` | [workspace_service.py.md](files/backend/app/services/workspace_service.py.md) | Workspace CRUD, ordering, form re-homing, active preference |
| `backend/app/services/inquiry_service.py` | [inquiry_service.py.md](files/backend/app/services/inquiry_service.py.md) | Form CRUD, prompt diffing (`apply_payload`), cloning, publish/unpublish |
| `backend/app/services/response_service.py` | [response_service.py.md](files/backend/app/services/response_service.py.md) | Public fetch/submit, analytics, CSV export, test response generator |

### Controllers (`backend/app/controllers/` — 4)
| File | Guide | Role |
| :--- | :--- | :--- |
| `backend/app/controllers/__init__.py` | [__init__.py.md](files/backend/app/controllers/__init__.py.md) | Controller barrel exports |
| `backend/app/controllers/workspace_controller.py` | [workspace_controller.py.md](files/backend/app/controllers/workspace_controller.py.md) | FastAPI DI handlers for workspaces & preferences |
| `backend/app/controllers/inquiry_controller.py` | [inquiry_controller.py.md](files/backend/app/controllers/inquiry_controller.py.md) | FastAPI DI handlers for form authoring |
| `backend/app/controllers/response_controller.py` | [response_controller.py.md](files/backend/app/controllers/response_controller.py.md) | FastAPI DI handlers for public replies & results |

### Routes (`backend/app/routes/` — 5)
| File | Guide | Role |
| :--- | :--- | :--- |
| `backend/app/routes/__init__.py` | [__init__.py.md](files/backend/app/routes/__init__.py.md) | `register_routes()` router mounting |
| `backend/app/routes/health_routes.py` | [health_routes.py.md](files/backend/app/routes/health_routes.py.md) | `GET /health` liveness probe |
| `backend/app/routes/workspace_routes.py` | [workspace_routes.py.md](files/backend/app/routes/workspace_routes.py.md) | `/api/workspaces*` & `/api/user/preferences` routes |
| `backend/app/routes/inquiry_routes.py` | [inquiry_routes.py.md](files/backend/app/routes/inquiry_routes.py.md) | `/api/inquiries*` authoring & results routes |
| `backend/app/routes/public_routes.py` | [public_routes.py.md](files/backend/app/routes/public_routes.py.md) | `/api/public/{slug}*` respondent routes |

### Tests (`backend/tests/` — 3)
| File | Guide | Role |
| :--- | :--- | :--- |
| `backend/tests/test_rules.py` | [test_rules.py.md](files/backend/tests/test_rules.py.md) | Unit tests for all 19 question validators |
| `backend/tests/test_pages.py` | [test_pages.py.md](files/backend/tests/test_pages.py.md) | Multi-field page storage & clone key tests |
| `backend/tests/test_forms_api.py` | [test_forms_api.py.md](files/backend/tests/test_forms_api.py.md) | Controller integration tests (test responses, workspace move) |

---

## Frontend Files (`frontend/` — 30 Files)

### Config & Tooling (`frontend/` — 5)
| File | Guide | Role |
| :--- | :--- | :--- |
| `frontend/package.json` | [package.json.md](files/frontend/package.json.md) | Next.js 14 / React 18 / Tailwind scripts & deps |
| `frontend/next.config.js` | [next.config.js.md](files/frontend/next.config.js.md) | Enables `reactStrictMode: true` |
| `frontend/tsconfig.json` | [tsconfig.json.md](files/frontend/tsconfig.json.md) | Strict TypeScript & `@/*` path alias config |
| `frontend/tailwind.config.js` | [tailwind.config.js.md](files/frontend/tailwind.config.js.md) | Class dark mode & custom Typeform animations |
| `frontend/postcss.config.js` | [postcss.config.js.md](files/frontend/postcss.config.js.md) | PostCSS `tailwindcss` + `autoprefixer` pipeline |

### App Router Pages & Styling (`frontend/app/` — 9)
| File | Guide | Role |
| :--- | :--- | :--- |
| `frontend/app/globals.css` | [globals.css.md](files/frontend/app/globals.css.md) | Light/dark `--tf-*` tokens, base styles, focus rings |
| `frontend/app/icon.svg` | [icon.svg.md](files/frontend/app/icon.svg.md) | Typeform-inspired SVG favicon |
| `frontend/app/layout.tsx` | [layout.tsx.md](files/frontend/app/layout.tsx.md) | Root HTML shell, anti-FOUC script, global providers |
| `frontend/app/loading.tsx` | [loading.tsx.md](files/frontend/app/loading.tsx.md) | Dashboard Suspense shimmer skeleton |
| `frontend/app/page.tsx` | [page.tsx.md](files/frontend/app/page.tsx.md) | Studio dashboard, workspaces, drag-drop, grid/list |
| `frontend/app/new/page.tsx` | [new/page.tsx.md](files/frontend/app/new/page.tsx.md) | New form creation & plain-text question parser |
| `frontend/app/builder/[id]/page.tsx` | [builder/[id]/page.tsx.md](files/frontend/app/builder/[id]/page.tsx.md) | 3-pane builder, auto-save, live preview, themes, publish |
| `frontend/app/f/[slug]/page.tsx` | [f/[slug]/page.tsx.md](files/frontend/app/f/[slug]/page.tsx.md) | Public respondent page mounting `<Runner />` |
| `frontend/app/results/[id]/page.tsx` | [results/[id]/page.tsx.md](files/frontend/app/results/[id]/page.tsx.md) | Funnel performance, summary charts, responses table, CSV |

### Shared Libraries (`frontend/lib/` — 6)
| File | Guide | Role |
| :--- | :--- | :--- |
| `frontend/lib/types.ts` | [types.ts.md](files/frontend/lib/types.ts.md) | Shared `Kind`, `PromptDTO`, `Inquiry`, `Workspace`, `KIND_META` |
| `frontend/lib/api.ts` | [api.ts.md](files/frontend/lib/api.ts.md) | Typed `fetch` wrapper & `422` `fieldErrors` parser |
| `frontend/lib/steps.ts` | [steps.ts.md](files/frontend/lib/steps.ts.md) | `buildSteps()` multi-field grouping, `holdFor()`, Contact Info template |
| `frontend/lib/guess.ts` | [guess.ts.md](files/frontend/lib/guess.ts.md) | Regex `guessKind()`, `toPrompts()`, `nextTempId()` |
| `frontend/lib/styles.ts` | [styles.ts.md](files/frontend/lib/styles.ts.md) | Shared `LINE`, `ERR`, and `SHIMMER` Tailwind constants |
| `frontend/lib/user.ts` | [user.ts.md](files/frontend/lib/user.ts.md) | Hardcoded creator profile (`USER`) |

### UI Components (`frontend/components/` — 10)
| File | Guide | Role |
| :--- | :--- | :--- |
| `frontend/components/ThemeProvider.tsx` | [ThemeProvider.tsx.md](files/frontend/components/ThemeProvider.tsx.md) | Light/dark theme context & toggle button |
| `frontend/components/Toasts.tsx` | [Toasts.tsx.md](files/frontend/components/Toasts.tsx.md) | Auto-toned toast queue (`ToastProvider`, `useToast`) |
| `frontend/components/Modal.tsx` | [Modal.tsx.md](files/frontend/components/Modal.tsx.md) | Accessible modal dialog with `Escape` & backdrop close |
| `frontend/components/Dropdown.tsx` | [Dropdown.tsx.md](files/frontend/components/Dropdown.tsx.md) | ARIA `combobox`/`listbox` dropdown (`compact`, `answer`, `matrix`) |
| `frontend/components/ToggleSwitch.tsx` | [ToggleSwitch.tsx.md](files/frontend/components/ToggleSwitch.tsx.md) | Accessible `role="switch"` pill toggle |
| `frontend/components/AccountMenu.tsx` | [AccountMenu.tsx.md](files/frontend/components/AccountMenu.tsx.md) | Profile avatar popover menu |
| `frontend/components/PhoneField.tsx` | [PhoneField.tsx.md](files/frontend/components/PhoneField.tsx.md) | Country dial-code picker + phone input |
| `frontend/components/AddContentModal.tsx` | [AddContentModal.tsx.md](files/frontend/components/AddContentModal.tsx.md) | Searchable element catalog, bulk import, & AI/template tab |
| `frontend/components/PublishCelebration.tsx` | [PublishCelebration.tsx.md](files/frontend/components/PublishCelebration.tsx.md) | Checkmark-to-paper-airplane publish overlay |
| `frontend/components/Runner.tsx` | [Runner.tsx.md](files/frontend/components/Runner.tsx.md) | Conversational respondent runner (19 kinds + keyboard nav) |
