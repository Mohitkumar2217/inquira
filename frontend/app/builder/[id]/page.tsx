"use client";
import { Fragment, ReactNode, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import AddContentModal from "@/components/AddContentModal";
import Runner from "@/components/Runner";
import ToggleSwitch from "@/components/ToggleSwitch";
import { ThemeToggleButton } from "@/components/ThemeProvider";
import AccountMenu from "@/components/AccountMenu";
import { useToast } from "@/components/Toasts";
import { call, errorMessage, send } from "@/lib/api";
import { buildSteps, contactInfoPrompts, newPageKey } from "@/lib/steps";
import { USER } from "@/lib/user";
import { Inquiry, Kind, PromptDTO, kindName, KIND_META } from "@/lib/types";

let tempId = -1;
const Soon = ({ what }: { what: string }) => <div className="soon mt-3.5 flex justify-between rounded-md bg-[#f6f6f6] px-3 py-2.5 text-[13px] dark:bg-[#29292d]"><b>{what}</b><span className="text-[#888] dark:text-[#a1a1aa]">Coming soon</span></div>;
type AccentStyle = React.CSSProperties & { "--accent": string };

const getKindIcon = (k: Kind) => {
  switch (k) {
    case "email": return "✉";
    case "short_text": return "≡";
    case "long_text": return "¶";
    case "number": return "#";
    case "choice": return "☰";
    case "dropdown": return "▾";
    case "yes_no": return "✓";
    case "rating": return "★";
    case "phone": return "☎";
    default: return KIND_META.find((m) => m.kind === k)?.icon ?? "≡";
  }
};

const THEMES = [
  { name: "Pearl white", bg: "#ffffff", previewBg: "#f8f8fa", text: "#191919", accent: "#262627", border: "#e4e4e7" },
  { name: "Classic blue", bg: "#f0f4fc", previewBg: "#e5effb", text: "#0c2340", accent: "#1d5fa8", border: "#c8daf5" },
  { name: "Inky black", bg: "#19191c", previewBg: "#222126", text: "#f2eff3", accent: "#a855f7", border: "#39353e" },
  { name: "Forest green", bg: "#f1f7f4", previewBg: "#e2f0e9", text: "#0d3829", accent: "#087663", border: "#b8dfcf" },
];

export default function Builder() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [inq, setInq] = useState<Inquiry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [tab, setTab] = useState<"create" | "settings" | "connect" | "share">("create");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewSession, setPreviewSession] = useState(0);
  const [pageSel, setPageSel] = useState(false); // true: the page itself (not one of its fields) is selected
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [answerDropdownOpen, setAnswerDropdownOpen] = useState(false);
  const [mapToContacts, setMapToContacts] = useState(false);
  const [answerValidation, setAnswerValidation] = useState(false);
  const [customPlaceholder, setCustomPlaceholder] = useState(false);
  const [autofillAnswer, setAutofillAnswer] = useState(false);
  const [canvasMode, setCanvasMode] = useState<"edit" | "interactive">("edit");
  const [defaultCountryCode, setDefaultCountryCode] = useState("+1 (US)");
  const [designOpen, setDesignOpen] = useState(false);
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState<string>("Pearl white");
  const [formSettingsOpen, setFormSettingsOpen] = useState(false);
  const [formSettingsTab, setFormSettingsTab] = useState<"general" | "access" | "language">("general");
  const [typeformBranding, setTypeformBranding] = useState(true);
  const [navArrows, setNavArrows] = useState(true);
  const [progressBar, setProgressBar] = useState(true);
  const [closeDateEnabled, setCloseDateEnabled] = useState(false);
  const [formLanguage, setFormLanguage] = useState("English");
  const [logicModalOpen, setLogicModalOpen] = useState(false);
  const [logicAccordion, setLogicAccordion] = useState<"display" | "branching" | "calculations" | null>("branching");
  const dragFrom = useRef<number | null>(null);
  const revision = useRef(0);

  useEffect(() => {
    if (!previewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewOpen]);

  useEffect(() => {
    let active = true;
    setInq(null);
    setLoadError(null);
    call<Inquiry>(`/api/inquiries/${id}`)
      .then((d) => {
        if (!active) return;
        setInq(d);
        setSel(d.prompts[0]?.id ?? null);
        setPageSel(!!d.prompts[0]?.page);
        setDirty(false);
        revision.current = 0;
      })
      .catch((e: Error) => {
        if (active) setLoadError(e.message);
      });
    return () => { active = false; };
  }, [id]);

  const mutate = (fn: (d: Inquiry) => void) => {
    setInq((prev) => { if (!prev) return prev; const c = structuredClone(prev); fn(c); return c; });
    revision.current += 1;
    setDirty(true);
  };
  if (loadError) return <div className="center-page grid min-h-screen place-content-center text-center"><p role="alert" className="text-[#c0392b]">{loadError}</p><Link className="btn inline-block rounded border border-[#ccc] bg-white px-3.5 py-2 text-sm text-[#262627] hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-[#29292d] dark:text-[#e4e4e7]" href="/">Back to forms</Link></div>;
  if (!inq) return <div className="center-page muted grid min-h-screen place-content-center text-center text-[#777] dark:text-[#a1a1aa]">Loading…</div>;

  const steps = buildSteps(inq.prompts);
  const idx = inq.prompts.findIndex((p) => p.id === sel);
  const cur = inq.prompts[idx];
  const curStep = cur ? steps.findIndex((st) => st.some((q) => q.id === cur.id)) : -1;
  const curPage = cur?.page ?? null;
  const onPage = !!(cur && curPage && pageSel);
  const patch = (c: Partial<PromptDTO>) => mutate((d) => Object.assign(d.prompts[idx], c));
  const patchPage = (c: { title?: string; hint?: string }) => {
    if (!curPage) return;
    mutate((d) => d.prompts.forEach((q) => { if (q.page?.key === curPage.key) q.page = { ...q.page, ...c }; }));
  };
  const choose = (id: number | null, page = false) => { setSel(id); setPageSel(page); setRowMenu(null); };

  const addPrompt = (kind: Kind) => {
    const p: PromptDTO = { id: tempId--, kind, label: "", hint: "", mandatory: false, page: null,
      choices: ["choice", "dropdown", "checkbox", "ranking", "matrix"].includes(kind)
        ? ["Option 1", "Option 2"] : [] };
    mutate((d) => d.prompts.push(p));
    choose(p.id); setAdding(false);
  };
  const addContact = () => {
    const ps = contactInfoPrompts();
    mutate((d) => d.prompts.push(...ps));
    choose(ps[0].id, true); setAdding(false);
  };
  const removePrompt = (pid: number) => {
    const i = inq.prompts.findIndex((p) => p.id === pid);
    const next = inq.prompts[i + 1] ?? inq.prompts[i - 1];
    mutate((d) => d.prompts.splice(i, 1));
    choose(next?.id ?? null, false);
  };
  const dupPrompt = (pid: number) => {
    const i = inq.prompts.findIndex((p) => p.id === pid);
    const o = inq.prompts[i];
    const c: PromptDTO = { ...o, choices: [...o.choices], page: o.page ? { ...o.page } : null, id: tempId-- };
    mutate((d) => d.prompts.splice(i + 1, 0, c));
    choose(c.id);
  };
  const removeStep = (si: number) => {
    const ids = steps[si].map((q) => q.id);
    const next = steps[si + 1]?.[0] ?? steps[si - 1]?.[0];
    mutate((d) => { d.prompts = d.prompts.filter((q) => !ids.includes(q.id)); });
    choose(next?.id ?? null, !!next?.page);
  };
  const dupStep = (si: number) => {
    const key = newPageKey();
    const copies: PromptDTO[] = steps[si].map((q) => ({ ...q, id: tempId--, choices: [...q.choices], page: q.page ? { ...q.page, key } : null }));
    const at = inq.prompts.findIndex((q) => q.id === steps[si][steps[si].length - 1].id) + 1;
    mutate((d) => d.prompts.splice(at, 0, ...copies));
    choose(copies[0].id, !!copies[0].page);
  };
  // Reordering moves a whole screen: a single question, or a page together with all its fields.
  const dropOn = (to: number) => {
    const from = dragFrom.current; dragFrom.current = null;
    if (from === null || from === to) return;
    mutate((d) => { const st = buildSteps(d.prompts); const [m] = st.splice(from, 1); st.splice(to, 0, m); d.prompts = st.flat(); });
  };
  const toggleOpen = (key: string) => setCollapsed((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key]));

  const rowCls = (on: boolean) =>
    `min-h-[38px] flex cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-xs transition-colors ${
      on
        ? "bg-[#fcecef] text-[#262627] font-medium border border-[#f5d6dc] dark:bg-[#34222d] dark:text-[#f8b4d0] dark:border-[#4d2f40]"
        : "text-[#62626a] hover:bg-[#f3f2f5] hover:text-[#322b35] dark:text-[#d5cfd8] dark:hover:bg-[#333039] dark:hover:text-white"
    }`;
  const MENU_ITEM = "rounded-md border-0 bg-transparent px-3 py-2 text-left text-sm hover:bg-[#f3f3f3] dark:text-[#e4e4e7] dark:hover:bg-[#37313b]";
  const kebab = (id: string, label: string, items: ReactNode) => (
    <span className="relative ml-auto" onClick={(e) => e.stopPropagation()}>
      <button className="builder-question-menu border-0 bg-transparent text-[17px] text-[#777] hover:text-[#333] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#b4acb9] dark:hover:text-white" aria-label={`More options for ${label}`} aria-expanded={rowMenu === id} onClick={() => setRowMenu(rowMenu === id ? null : id)}>···</button>
      {rowMenu === id && (<>
        <div className="fixed inset-0 z-20 bg-transparent" onClick={() => setRowMenu(null)} />
        <div className="absolute right-0 top-7 z-[21] flex min-w-[150px] flex-col rounded-lg border border-[var(--tf-border)] bg-white p-1.5 text-[var(--tf-text)] shadow-[0_8px_24px_rgba(0,0,0,.12)] dark:border-[#39353e] dark:bg-[#26232a]">{items}</div>
      </>)}
    </span>
  );

  const save = async (quiet = false) => {
    if (saving || !inq) return false;
    const snapshot = structuredClone(inq);
    const savedRevision = revision.current;
    const selectedIndex = snapshot.prompts.findIndex((prompt) => prompt.id === sel);
    setSaving(true);
    try {
      const saved = await call<Inquiry>(`/api/inquiries/${snapshot.id}`, send("PUT", snapshot));
      const savedIdByLocalId = new Map(
        snapshot.prompts.map((prompt, index) => [prompt.id, saved.prompts[index]?.id]),
      );
      if (revision.current === savedRevision) {
        setInq(saved);
        setSel(saved.prompts[selectedIndex]?.id ?? saved.prompts[0]?.id ?? null);
        setDirty(false);
        if (!quiet) toast("Changes saved");
      } else {
        setInq((current) => current ? {
          ...current,
          prompts: current.prompts.map((prompt) => ({
            ...prompt,
            id: savedIdByLocalId.get(prompt.id) ?? prompt.id,
          })),
        } : current);
        setSel((current) => current === null ? null : savedIdByLocalId.get(current) ?? current);
        setDirty(true);
      }
      return true;
    } catch (error: unknown) { toast(errorMessage(error)); return false; }
    finally { setSaving(false); }
  };
  const toggleStatus = async () => {
    if (saving || publishing) return;
    setPublishing(true);
    try {
      const publishRevision = revision.current;
      if (dirty) {
        if (!(await save(true))) return;
        if (revision.current !== publishRevision) {
          toast("The form changed while saving. Save the latest edits before publishing.");
          return;
        }
      }
      const path = inq.status === "published" ? "unpublish" : "publish";
      const r = await call<Inquiry>(`/api/inquiries/${inq.id}/${path}`, send("POST"));
      setInq((current) => current ? { ...current, status: r.status } : current);
      toast(r.status === "published" ? "Published! Your link is ready" : "Form unpublished");
    } catch (error: unknown) { toast(errorMessage(error)); }
    finally { setPublishing(false); }
  };
  const link = `${typeof location !== "undefined" ? location.origin : ""}/f/${inq.slug}`;

  return (
    <div className="builder h-screen min-h-[560px] flex flex-col bg-[var(--tf-panel-bg)] text-[var(--tf-text)] zoom-out-enter" style={{ "--accent": inq.accent } as AccentStyle}>
      <header className="builder-header grid h-[46px] flex-[0_0_46px] grid-cols-[minmax(260px,1fr)_auto_minmax(260px,1fr)] items-center gap-[14px] border-b border-[var(--tf-border)] bg-white px-4 dark:bg-[#26232a] max-[900px]:h-[78px] max-[900px]:flex-[0_0_78px] max-[900px]:grid-cols-[minmax(180px,1fr)_auto] max-[900px]:gap-2 max-[900px]:px-2.5 max-[600px]:grid-cols-[minmax(0,1fr)_auto]">
        <div className="builder-breadcrumbs flex min-w-0 items-center gap-2 text-[13px] text-[#56565e] max-[600px]:gap-1.5">
          <Link href="/" className="font-normal text-[#56565e] hover:text-[#262627] dark:text-[#a1a1aa] dark:hover:text-white">Forms</Link>
          <span className="builder-crumb-separator text-[#999]">›</span>
          <input aria-label="Form title" className="title-input min-w-[80px] w-[min(240px,35vw)] rounded px-1.5 py-1 text-[13px] font-normal text-[#262627] hover:bg-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#8a7590] dark:text-[#f2eff3] dark:hover:bg-[#303035]" value={inq.title} onChange={(e) => mutate((d) => { d.title = e.target.value; })} />
        </div>
        <nav className="builder-nav flex h-full items-center gap-1 self-stretch max-[900px]:col-span-full max-[900px]:row-start-2 max-[900px]:justify-center max-[900px]:h-9" aria-label="Form sections">
          <button className={`h-full rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 text-[13px] text-[#55555d] hover:text-[#222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] dark:text-[#d5cfd8] ${tab === "create" ? "on border-b-[#463449] font-semibold text-[#242126] dark:text-white" : ""}`} onClick={() => setTab("create")}>Content</button>
          <button className="h-full rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 text-[13px] text-[#55555d] hover:text-[#222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] dark:text-[#d5cfd8]" onClick={() => toast("Workflow is coming soon")}>Workflow</button>
          <button className={`h-full rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 text-[13px] text-[#55555d] hover:text-[#222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] dark:text-[#d5cfd8] ${tab === "connect" ? "on border-b-[#463449] font-semibold text-[#242126] dark:text-white" : ""}`} onClick={() => setTab("connect")}>Connect</button>
          <button className={`h-full rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 text-[13px] text-[#55555d] hover:text-[#222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] dark:text-[#d5cfd8] ${tab === "share" ? "on border-b-[#463449] font-semibold text-[#242126] dark:text-white" : ""}`} onClick={() => setTab("share")}>Share</button>
          <Link className="builder-results-link flex items-center text-[var(--tf-text-2)] hover:bg-[#f4f1f5] hover:text-[var(--tf-text)] dark:text-[#d5cfd8] dark:hover:bg-[#343039] dark:hover:text-white" href={`/results/${inq.id}`}>Results</Link>
        </nav>
        <div className="builder-header-actions flex items-center justify-end gap-2.5 max-[900px]:col-start-2 max-[900px]:row-start-1 max-[600px]:gap-[5px]">
          <button className="btn builder-share flex size-8 items-center justify-center rounded-lg border border-[#d5d5da] bg-white text-xs font-semibold text-[#262627] hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#4b4550] dark:bg-[#302c34] dark:text-[#f2eff3]" title="Copy link" onClick={() => { navigator.clipboard?.writeText(link); toast(inq.status === "published" ? "Link copied to clipboard" : "Link copied! Publish to make public"); }}>
            <span className="text-sm">🔗</span>
          </button>
          {dirty && <button className="btn builder-share rounded border border-[#ccc] bg-white px-3 py-1.5 text-xs font-semibold text-[#262627] hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-50 dark:bg-[#302c34] dark:text-[#f2eff3]" disabled={saving || publishing} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </button>}
          <button className="builder-plans rounded-lg border-0 bg-[#087663] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#076653] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-50 max-[600px]:hidden" disabled={saving || publishing} onClick={() => void toggleStatus()}>
            {publishing ? "Working…" : inq.status === "published" ? "Unpublish" : "Publish"}
          </button>
          <button className="builder-help size-7 rounded-full border border-[#d5d5da] bg-white text-[13px] text-[#555] hover:bg-[#f3f3f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#4b4550] dark:bg-[#302c34] dark:text-[#e4e4e7] dark:hover:bg-[#3a3540] max-[600px]:hidden" aria-label="Help" onClick={() => toast("Help is coming soon")}>?</button>
          <ThemeToggleButton />
          <AccountMenu size="sm" />
        </div>
      </header>

      <div className="builder-toolbar grid h-[54px] flex-[0_0_54px] grid-cols-[232px_minmax(0,1fr)_236px] items-center gap-3.5 border-b border-[var(--tf-border)] bg-white px-3 py-1.5 dark:border-[#34343a] dark:bg-[#202024] max-[900px]:grid-cols-[190px_minmax(0,1fr)_32px] max-[600px]:grid-cols-[1fr_auto] max-[600px]:p-1.5">
        <button className="builder-mode flex h-10 items-center gap-[9px] rounded-[10px] bg-[#f5f5f6] px-3.5 text-left text-[13px] text-[#53535b] hover:bg-[#efedef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-[#302c34] dark:text-[#d5cfd8] dark:hover:bg-[#39343d] max-[600px]:hidden" onClick={() => toast("Universal mode is selected")}>
          <span className="builder-mode-icon" aria-hidden="true">☷</span><span>Universal mode</span>
          <svg className="tf-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
        </button>
        <div className="builder-tools flex min-w-0 items-center gap-2 max-[600px]:col-start-1">
          <button className="builder-add-content inline-flex min-w-[132px] shrink-0 items-center gap-[7px] whitespace-nowrap rounded-md border border-[#262627] bg-[#262627] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#181819] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[var(--tf-purple)] dark:bg-[var(--tf-purple)] dark:hover:bg-[var(--tf-purple-dark)] max-[600px]:min-w-[30px] max-[600px]:px-[7px]" onClick={() => setAdding(true)}>＋ <span>Add content</span></button>
          <button className={`builder-design-tool h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-xs text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#d5cfd8] dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px] ${designOpen ? "active bg-[#f1eff2] text-[#332b35] dark:bg-[#343039] dark:text-white" : ""}`} aria-pressed={designOpen} onClick={() => setDesignOpen(!designOpen)}>🎨 <span>Design</span></button>
          <span className="builder-tool-divider mx-0.5 h-6 w-px bg-[#e6e6e8] dark:bg-[#38383e] max-[600px]:hidden" />
          <button className={`h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#d5cfd8] dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px] ${previewDevice === "desktop" ? "active bg-[#f1eff2] text-[#332b35] dark:bg-[#343039] dark:text-white" : ""}`} aria-label="Desktop form view" aria-pressed={previewDevice === "desktop"} onClick={() => setPreviewDevice("desktop")}>💻</button>
          <button className={`h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#d5cfd8] dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px] ${previewDevice === "mobile" ? "active bg-[#f1eff2] text-[#332b35] dark:bg-[#343039] dark:text-white" : ""}`} aria-label="Mobile form view" aria-pressed={previewDevice === "mobile"} onClick={() => setPreviewDevice("mobile")}>📱</button>
          <button className="h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-xs font-medium text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#d5cfd8] dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px]" aria-label="Preview form" onClick={() => { setPreviewSession((session) => session + 1); setPreviewOpen(true); }}>👁 <span>Preview</span></button>
          <button className="h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#d5cfd8] dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px]" aria-label="Question info" onClick={() => toast("Select a question to inspect details")}>ⓘ</button>
          <button className="h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#d5cfd8] dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px]" aria-label="Undo" onClick={() => toast("Undo is coming soon")}>↺</button>
          <button className="h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#d5cfd8] dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px]" aria-label="Language settings" onClick={() => { setFormSettingsTab("language"); setFormSettingsOpen(true); }}>A文</button>
          <button className="h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#d5cfd8] dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px]" aria-label="More form settings" onClick={() => { setFormSettingsTab("general"); setFormSettingsOpen(true); }}>⚙</button>
        </div>
        <button className="builder-collapse justify-self-end rounded-md border-0 bg-transparent text-[15px] text-[#666] hover:bg-[#f3f3f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#d5cfd8] dark:hover:bg-[#302c34] max-[600px]:col-start-2 max-[600px]:row-start-1" aria-label="Collapse settings panel" onClick={() => toast("Panel controls are coming soon")}>◧</button>
      </div>

      {tab === "create" && (
        <div className="panes grid min-h-0 flex-1 grid-cols-[232px_minmax(0,1fr)_236px] max-[900px]:grid-cols-[190px_minmax(0,1fr)] max-[600px]:grid-cols-1">
          <aside className="left builder-pages flex min-w-0 flex-col gap-2.5 overflow-auto border-r border-[var(--tf-border)] bg-[#f7f7f8] p-3 dark:border-[#34343a] dark:bg-[#252229] max-[600px]:hidden">
            <div className="flex items-center justify-between text-xs font-semibold text-[#34343b] dark:text-[#f2eff3]">
              <span>Pages</span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {steps.map((st, si) => {
                const pg = st[0].page;
                if (!pg) {
                  const p = st[0];
                  const isCur = p.id === sel;
                  return (
                    <li
                      key={p.id}
                      draggable
                      onDragStart={() => (dragFrom.current = si)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => dropOn(si)}
                      className={rowCls(isCur)}
                      onClick={() => choose(p.id)}
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="text-[13px]">{getKindIcon(p.kind)}</span>
                        <span>{si + 1}</span>
                      </span>
                      {kebab(
                        "p" + p.id,
                        p.label || kindName(p.kind),
                        <>
                          <button className={MENU_ITEM} onClick={() => dupPrompt(p.id)}>Duplicate</button>
                          <button className={MENU_ITEM + " text-[#b43e32]"} onClick={() => removePrompt(p.id)}>Delete</button>
                        </>
                      )}
                    </li>
                  );
                }
                const open = !collapsed.includes(pg.key);
                const headOn = pageSel && st.some((q) => q.id === sel);
                return (
                  <Fragment key={pg.key + si}>
                    <li
                      draggable
                      onDragStart={() => (dragFrom.current = si)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => dropOn(si)}
                      className={rowCls(headOn) + " font-medium"}
                      onClick={() => choose(st[0].id, true)}
                    >
                      <button
                        className="grid h-[22px] w-6 shrink-0 place-items-center rounded-[5px] border-0 bg-transparent text-[9px] text-[#555] hover:bg-black/5 dark:text-[#d5cfd8]"
                        aria-label={`${open ? "Collapse" : "Expand"} ${pg.title || "page"}`}
                        onClick={(e) => { e.stopPropagation(); toggleOpen(pg.key); }}
                      >
                        {open ? "▲" : "▼"}
                      </button>
                      <span className="ellipsis">{pg.title || "Page"}</span>
                      {kebab(
                        "s" + si,
                        pg.title || "page",
                        <>
                          <button className={MENU_ITEM} onClick={() => dupStep(si)}>Duplicate page</button>
                          <button className={MENU_ITEM + " text-[#b43e32]"} onClick={() => removeStep(si)}>Delete page</button>
                        </>
                      )}
                    </li>
                    {open &&
                      st.map((p, k) => (
                        <li
                          key={p.id}
                          className={rowCls(!pageSel && p.id === sel)}
                          onClick={() => choose(p.id)}
                        >
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="text-[13px]">{getKindIcon(p.kind)}</span>
                            <span>{si + 1}.{k + 1}</span>
                          </span>
                          {kebab(
                            "p" + p.id,
                            p.label || kindName(p.kind),
                            <>
                              <button className={MENU_ITEM} onClick={() => dupPrompt(p.id)}>Duplicate</button>
                              <button className={MENU_ITEM + " text-[#b43e32]"} onClick={() => removePrompt(p.id)}>Delete</button>
                            </>
                          )}
                        </li>
                      ))}
                  </Fragment>
                );
              })}
            </ul>

            <button
              className="mt-1 flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#262627] dark:text-[#a1a1aa] dark:hover:text-white"
              onClick={() => setAdding(true)}
            >
              <span>＋</span> <span>add content</span>
            </button>

            <div className="my-2 border-t border-[#ececef] dark:border-[#38353d]" />

            <div className="flex items-center justify-between text-xs font-semibold text-[#34343b] dark:text-[#f2eff3]">
              <span>Endings</span>
              <button
                className="grid size-6 place-items-center rounded-md border border-[#e6e6e9] bg-white text-sm text-[#6b6b73] hover:bg-[#f5f5f6] dark:border-[#44444b] dark:bg-[#303035] dark:text-[#e4e4e7]"
                onClick={() => toast("Endings are coming soon")}
              >
                ＋
              </button>
            </div>

            <div className="mt-auto flex items-center gap-2 rounded-xl border border-[#e6d8ea] bg-white px-2.5 py-2 text-[#75657a] shadow-sm dark:border-[#3d3342] dark:bg-[#26212b] dark:text-[#eadcf0]">
              <span className="text-sm">🎙</span>
              <input
                className="w-full bg-transparent text-xs outline-none placeholder:text-[#958599] dark:placeholder:text-[#aaa]"
                placeholder="Ask Inquira AI"
                onKeyDown={(e) => e.key === "Enter" && toast("AI assistant is coming soon")}
              />
              <button
                className="text-xs text-[#76617c] hover:opacity-80 dark:text-[#eadcf0]"
                onClick={() => toast("AI assistant is coming soon")}
              >
                ▷
              </button>
            </div>
          </aside>

          <section
            className="middle relative flex min-w-0 flex-1 flex-col transition-colors duration-200"
            style={{
              backgroundColor: (THEMES.find((t) => t.name === (hoveredTheme || activeTheme)) || THEMES[0]).bg,
              color: (THEMES.find((t) => t.name === (hoveredTheme || activeTheme)) || THEMES[0]).text,
            }}
          >
            {cur && !onPage ? (
              <div className="flex flex-1 items-center justify-center p-8 max-[600px]:p-4">
                <div className="w-full max-w-2xl from-above">
                  <div className="flex items-start gap-2.5">
                    <span className="tf-badge-num inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-[4px] bg-[#262627] px-1.5 text-[12px] font-bold text-white shadow-sm dark:bg-[#39343d] dark:text-[#f2eff3]">
                      {curStep + 1}
                    </span>
                    <div className="flex-1">
                      <input
                        className="w-full bg-transparent text-[clamp(22px,3.2vw,28px)] font-normal outline-none placeholder:text-[#a1a1aa]"
                        style={{ color: (THEMES.find((t) => t.name === (hoveredTheme || activeTheme)) || THEMES[0]).text }}
                        placeholder="Your question here. Recall information with @"
                        value={cur.label}
                        onChange={(e) => patch({ label: e.target.value })}
                      />
                      <input
                        className="mt-1 w-full bg-transparent text-[15px] italic text-[#737373] outline-none placeholder:text-[#a1a1aa] dark:text-[#a1a1aa]"
                        placeholder="Description (optional)"
                        value={cur.hint}
                        onChange={(e) => patch({ hint: e.target.value })}
                      />

                      {cur.kind === "address" ? (
                        <div className="mt-6 flex flex-col gap-3.5">
                          <div>
                            <label className="text-xs text-[#737373] dark:text-[#a1a1aa]">Address line 1</label>
                            <input
                              type="text"
                              disabled
                              className="mt-1 w-full border-b border-[#262627] bg-transparent py-1 text-base placeholder:text-[#a1a1aa] dark:border-[#8c8294]"
                              placeholder="e.g. 123 Main St"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[#737373] dark:text-[#a1a1aa]">Address line 2</label>
                            <input
                              type="text"
                              disabled
                              className="mt-1 w-full border-b border-[#262627] bg-transparent py-1 text-base placeholder:text-[#a1a1aa] dark:border-[#8c8294]"
                              placeholder="Apt, Suite, Bldg (optional)"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-[#737373] dark:text-[#a1a1aa]">City / Town</label>
                              <input
                                type="text"
                                disabled
                                className="mt-1 w-full border-b border-[#262627] bg-transparent py-1 text-base placeholder:text-[#a1a1aa] dark:border-[#8c8294]"
                                placeholder="e.g. San Francisco"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[#737373] dark:text-[#a1a1aa]">State / Region / Province</label>
                              <input
                                type="text"
                                disabled
                                className="mt-1 w-full border-b border-[#262627] bg-transparent py-1 text-base placeholder:text-[#a1a1aa] dark:border-[#8c8294]"
                                placeholder="e.g. California"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-[#737373] dark:text-[#a1a1aa]">Zip / Post code</label>
                              <input
                                type="text"
                                disabled
                                className="mt-1 w-full border-b border-[#262627] bg-transparent py-1 text-base placeholder:text-[#a1a1aa] dark:border-[#8c8294]"
                                placeholder="e.g. 94107"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[#737373] dark:text-[#a1a1aa]">Country</label>
                              <div className="mt-1 flex items-center justify-between border-b border-[#262627] py-1 text-base text-[#737373] dark:border-[#8c8294] dark:text-[#a1a1aa]">
                                <span>United States</span>
                                <span className="text-xs">▾</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : cur.kind === "phone" ? (
                        <div className="mt-6 flex items-center gap-3 border-b border-[#262627] pb-2 dark:border-[#8c8294]">
                          <span className="flex items-center gap-1.5 text-base text-[#262627] dark:text-[#f2eff3]">
                            <span>🇺🇸</span>
                            <span className="text-sm font-medium text-[#737373] dark:text-[#a1a1aa]">{defaultCountryCode}</span>
                            <span className="text-[10px] text-[#737373]">▾</span>
                          </span>
                          <span className="text-[clamp(18px,2.5vw,22px)] text-[#a1a1aa]">
                            (201) 555-0123
                          </span>
                        </div>
                      ) : (
                        <div className="mt-6 border-b border-[#262627] pb-2 dark:border-[#8c8294]">
                          <span className="text-[clamp(18px,2.5vw,22px)] text-[#a1a1aa]">
                            {cur.kind === "email" ? "name@example.com" : cur.kind === "number" ? "0" : "Type your answer here…"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <Runner
                  key={`${sel}-${idx}-${inq.accent}-${inq.closing_heading}`}
                  inquiry={inq}
                  startAt={Math.max(curStep, 0)}
                  preview
                  onSubmit={async () => {}}
                />
              </div>
            )}
          </section>

          <aside className="right relative flex min-w-0 flex-col gap-2 overflow-auto border-l border-[var(--tf-border)] bg-[#f7f7f8] p-3.5 dark:border-[#34343a] dark:bg-[#252229] max-[900px]:hidden">
            {/* Theme gallery side panel if Design is active */}
            {designOpen ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[#ececef] pb-2 dark:border-[#39353e]">
                  <h3 className="text-xs font-semibold text-[#262627] dark:text-[#f2eff3]">Theme gallery</h3>
                  <button
                    className="text-xs text-[#737373] hover:text-[#111] dark:text-[#a1a1aa] dark:hover:text-white"
                    onClick={() => { setDesignOpen(false); setHoveredTheme(null); }}
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-[#737373] dark:text-[#a1a1aa]">
                  Hover over any theme to preview live on the canvas. Click to apply.
                </p>
                <div className="flex flex-col gap-2.5">
                  {THEMES.map((th) => {
                    const isSelected = activeTheme === th.name;
                    return (
                      <div
                        key={th.name}
                        onMouseEnter={() => setHoveredTheme(th.name)}
                        onMouseLeave={() => setHoveredTheme(null)}
                        onClick={() => {
                          setActiveTheme(th.name);
                          mutate((d) => { d.accent = th.accent; });
                          toast(`Theme applied: ${th.name}`);
                        }}
                        className={`cursor-pointer rounded-xl border p-3 transition-all ${
                          isSelected
                            ? "border-[#262627] ring-2 ring-[#262627]/20 dark:border-[var(--tf-purple)] dark:ring-[var(--tf-purple)]/30"
                            : "border-[#e4e4e7] hover:border-[#8c8294] dark:border-[#38353e] dark:hover:border-[#666]"
                        }`}
                        style={{ backgroundColor: th.previewBg }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold" style={{ color: th.text }}>{th.name}</span>
                          {isSelected && <span className="text-xs font-bold text-[#087663]">✓</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="size-5 rounded-full border border-black/10" style={{ backgroundColor: th.bg }} title="Background" />
                          <span className="size-5 rounded-full border border-black/10" style={{ backgroundColor: th.text }} title="Text color" />
                          <span className="size-5 rounded-full border border-black/10" style={{ backgroundColor: th.accent }} title="Accent color" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (<>
            {/* Section 1: Question Switcher */}
            <div className="rounded-[10px] border border-[#ececef] bg-white p-3 dark:border-[#39353e] dark:bg-[#252229]">
              <div className="flex items-center justify-between text-xs font-semibold text-[#34343b] dark:text-[#f2eff3]">
                <span>Question</span>
                <span className="text-xs text-[#8c8c94] cursor-pointer" title="Question settings">ⓘ</span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-lg bg-[#f1f1f3] p-1 dark:bg-[#303035]">
                <button className="flex items-center justify-center gap-1.5 rounded-md bg-white py-1.5 text-xs font-semibold text-[#262627] shadow-sm dark:bg-[#26232a] dark:text-white">
                  <span>=</span> <span>Text</span>
                </button>
                <button
                  className="flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-normal text-[#737373] hover:text-[#262627] dark:text-[#a1a1aa] dark:hover:text-white"
                  onClick={() => toast("Video questions are coming soon")}
                >
                  <span>📹</span> <span>Video</span>
                </button>
              </div>
            </div>

            {/* Section 2: Answer Kind Selector */}
            <div className="rounded-[10px] border border-[#ececef] bg-white p-3 dark:border-[#39353e] dark:bg-[#252229]">
              <div className="text-xs font-semibold text-[#34343b] dark:text-[#f2eff3]">Answer</div>
              {cur && (
                <div className="relative mt-2">
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between rounded-lg border border-[#e4e4e7] bg-white px-3 text-xs font-medium text-[#262627] hover:border-[#8c8294] dark:border-[#3f3f46] dark:bg-[#202024] dark:text-[#f2eff3]"
                    onClick={() => setAnswerDropdownOpen((prev) => !prev)}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{getKindIcon(cur.kind)}</span>
                      <span>{kindName(cur.kind)}</span>
                    </span>
                    <span className="text-[10px] text-[#737373]">▼</span>
                  </button>

                  {answerDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setAnswerDropdownOpen(false)} />
                      <div className="absolute left-0 top-11 z-40 max-h-60 w-full overflow-auto rounded-lg border border-[#e4e4e7] bg-white p-1 shadow-lg dark:border-[#3f3f46] dark:bg-[#26232a]">
                        {KIND_META.map((meta) => (
                          <button
                            key={meta.kind}
                            className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs ${
                              cur.kind === meta.kind
                                ? "bg-[#f3f2f5] font-semibold text-[#262627] dark:bg-[#343039] dark:text-white"
                                : "text-[#555] hover:bg-[#f3f2f5] dark:text-[#d5cfd8] dark:hover:bg-[#343039]"
                            }`}
                            onClick={() => {
                              patch({ kind: meta.kind });
                              setAnswerDropdownOpen(false);
                            }}
                          >
                            <span className="text-sm">{getKindIcon(meta.kind)}</span>
                            <span>{meta.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Section 3: Setting Toggles (context-aware for Phone Number) */}
            <div className="flex flex-col gap-3 rounded-[10px] border border-[#ececef] bg-white p-3.5 dark:border-[#39353e] dark:bg-[#252229]">
              <div className="flex items-center justify-between text-xs text-[#34343b] dark:text-[#d5cfd8]">
                <span className="flex items-center gap-1.5">
                  <span>Map to contacts</span>
                  <span className="text-[10px] text-[#8c8c94]">ⓘ</span>
                </span>
                <ToggleSwitch checked={mapToContacts} onChange={setMapToContacts} />
              </div>

              <div className="flex items-center justify-between text-xs text-[#34343b] dark:text-[#d5cfd8]">
                <span>Required</span>
                <ToggleSwitch
                  checked={cur?.mandatory ?? false}
                  onChange={(val) => patch({ mandatory: val })}
                />
              </div>

              {cur?.kind === "phone" ? (
                <div className="flex flex-col gap-1.5 pt-1 text-xs text-[#34343b] dark:text-[#d5cfd8]">
                  <span className="flex items-center gap-1.5">
                    <span>Default country code</span>
                    <span className="text-[10px] text-[#8c8c94]">ⓘ</span>
                  </span>
                  <select
                    className="h-9 w-full rounded-lg border border-[#e4e4e7] bg-white px-2.5 text-xs text-[#262627] outline-none hover:border-[#8c8294] dark:border-[#3f3f46] dark:bg-[#202024] dark:text-[#f2eff3]"
                    value={defaultCountryCode}
                    onChange={(e) => setDefaultCountryCode(e.target.value)}
                  >
                    <option value="+1 (US)">🇺🇸 United States (+1)</option>
                    <option value="+44 (UK)">🇬🇧 United Kingdom (+44)</option>
                    <option value="+91 (IN)">🇮🇳 India (+91)</option>
                    <option value="+1 (CA)">🇨🇦 Canada (+1)</option>
                    <option value="+61 (AU)">🇦🇺 Australia (+61)</option>
                    <option value="+49 (DE)">🇩🇪 Germany (+49)</option>
                    <option value="+33 (FR)">🇫🇷 France (+33)</option>
                  </select>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-[#34343b] dark:text-[#d5cfd8]">
                    <span className="flex items-center gap-1.5">
                      <span>Answer validation</span>
                      <span className="text-[10px] text-[#8c8c94]">ⓘ</span>
                    </span>
                    <ToggleSwitch checked={answerValidation} onChange={setAnswerValidation} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#34343b] dark:text-[#d5cfd8]">
                    <span className="flex items-center gap-1.5">
                      <span>Custom placeholder text</span>
                      <span className="text-[10px] text-[#8c8c94]">ⓘ</span>
                    </span>
                    <ToggleSwitch checked={customPlaceholder} onChange={setCustomPlaceholder} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#34343b] dark:text-[#d5cfd8]">
                    <span className="flex items-center gap-1.5">
                      <span>Autofill answer</span>
                      <span className="text-[10px] text-[#8c8c94]">ⓘ</span>
                    </span>
                    <ToggleSwitch checked={autofillAnswer} onChange={setAutofillAnswer} />
                  </div>
                </>
              )}
            </div>

            {/* Section 4: Accordions */}
            <div className="flex flex-col gap-2">
              <button
                className="flex items-center justify-between rounded-lg border border-[#ececef] bg-white px-3.5 py-2.5 text-xs font-medium text-[#34343b] hover:bg-[#faf9fb] dark:border-[#39353e] dark:bg-[#252229] dark:text-[#d5cfd8]"
                onClick={() => toast("Image or video is coming soon")}
              >
                <span>Image or video</span>
                <span className="text-sm font-normal text-[#737373]">＋</span>
              </button>

              <button
                className="flex items-center justify-between rounded-lg border border-[#ececef] bg-white px-3.5 py-2.5 text-xs font-medium text-[#34343b] hover:bg-[#faf9fb] dark:border-[#39353e] dark:bg-[#252229] dark:text-[#d5cfd8]"
                onClick={() => setLogicModalOpen(true)}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-sm">⌥</span>
                  <span>Logic</span>
                </span>
                <span className="text-sm font-normal text-[#737373]">＋</span>
              </button>

              <button
                className="flex items-center justify-between rounded-lg border border-[#ececef] bg-white px-3.5 py-2.5 text-xs font-medium text-[#34343b] hover:bg-[#faf9fb] dark:border-[#39353e] dark:bg-[#252229] dark:text-[#d5cfd8]"
                onClick={() => toast("Comments are coming soon")}
              >
                <span>Comments</span>
                <span className="text-xs text-[#087663]">💎</span>
              </button>
            </div>

            {cur && (
              <div className="mt-2">
                <button
                  className="w-full rounded-lg border border-[#e6b8b2] bg-white px-3.5 py-2 text-xs font-semibold text-[#c0392b] hover:bg-[#fdf3f2] dark:border-[#522b2b] dark:bg-[#292224] dark:text-[#f87171]"
                  onClick={() => (onPage ? removeStep(curStep) : removePrompt(cur.id))}
                >
                  {onPage ? "Delete page" : "Delete question"}
                </button>
              </div>
            )}
            </>)}
          </aside>
        </div>
      )}

      {tab === "settings" && (
        <div className="page-pad mx-auto my-8 max-w-[560px] px-5">
          <h3>Design</h3>
          <label>Accent colour</label>
          <input type="color" value={inq.accent} onChange={(e) => mutate((d) => { d.accent = e.target.value; })} />
          <h3>Thank-you screen</h3>
          <label>Heading</label>
          <input className="box-input my-1 mb-2.5 w-full rounded border border-[#ccc] px-2.5 py-[9px] text-[13px] focus:border-[#8a6e91] focus:outline focus:outline-2 focus:outline-[#f1e9f2] dark:border-[#44444b] dark:bg-[#1d1d21] dark:text-[#f4f4f5]" value={inq.closing_heading} onChange={(e) => mutate((d) => { d.closing_heading = e.target.value; })} />
          <label>Message</label>
          <textarea className="box-input my-1 mb-2.5 w-full rounded border border-[#ccc] px-2.5 py-[9px] text-[13px] focus:border-[#8a6e91] focus:outline focus:outline-2 focus:outline-[#f1e9f2] dark:border-[#44444b] dark:bg-[#1d1d21] dark:text-[#f4f4f5]" rows={3} value={inq.closing_text} onChange={(e) => mutate((d) => { d.closing_text = e.target.value; })} />
          <Soon what="Custom fonts & backgrounds" />
        </div>
      )}

      {tab === "connect" && (
        <div className="page-pad mx-auto my-8 max-w-[560px] px-5">
          <h3>Share</h3>
          {inq.status === "published" ? <input className="box-input my-1 mb-2.5 w-full rounded border border-[#ccc] px-2.5 py-[9px] text-[13px] focus:border-[#8a6e91] focus:outline focus:outline-2 focus:outline-[#f1e9f2] dark:border-[#44444b] dark:bg-[#1d1d21] dark:text-[#f4f4f5]" readOnly value={link} onFocus={(e) => e.target.select()} /> : <p className="muted text-[#777] dark:text-[#a1a1aa]">Publish the form to get a public link.</p>}
          <Soon what="Integrations & webhooks" /><Soon what="Team collaboration" />
        </div>
      )}

      {tab === "share" && (
        <div className="share-tab flex-1 overflow-auto bg-[#fafafa] p-8 dark:bg-[#18181c] max-[640px]:p-4">
          <div className="mx-auto flex max-w-2xl flex-col items-center">
            <h1 className="mb-8 text-2xl font-normal text-[#262627] dark:text-[#f2eff3] max-[640px]:text-xl">
              Choose how you’d like to share your form
            </h1>

            {/* Main Sharing Card */}
            <div className="w-full rounded-2xl border border-[#ececef] bg-white p-6 shadow-sm dark:border-[#34343a] dark:bg-[#252229]">
              {/* Copy Link Row */}
              <div className="flex items-center gap-3 rounded-xl bg-[#f8f8f9] p-2 dark:bg-[#1e1c22]">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(link);
                    toast(inq.status === "published" ? "Link copied to clipboard!" : "Link copied! Publish to make public");
                  }}
                  className="flex items-center gap-2 rounded-lg bg-[#262627] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#181819] active:scale-95 dark:bg-[#39343d] dark:hover:bg-[#48434f]"
                >
                  <span>🔗</span>
                  <span>Copy link</span>
                </button>
                <input
                  type="text"
                  readOnly
                  value={link}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 bg-transparent px-2 text-xs text-[#262627] outline-none dark:text-[#f2eff3]"
                />
                <button
                  onClick={() => toast("Custom link slug is a Pro feature")}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#62626a] hover:text-[#262627] dark:text-[#a1a1aa] dark:hover:text-white"
                >
                  <span>✎</span> <span>Edit</span>
                </button>
                <button
                  onClick={() => toast("QR code generated!")}
                  className="px-2 py-1.5 text-xs text-[#62626a] hover:text-[#262627] dark:text-[#a1a1aa] dark:hover:text-white"
                  title="QR code"
                >
                  ⊞
                </button>
              </div>

              <div className="my-6 border-t border-[#ececef] dark:border-[#34343a]" />

              {/* Link Preview Row */}
              <div className="flex items-center justify-between text-xs text-[#737373] dark:text-[#a1a1aa]">
                <span>Link preview</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toast("Customize preview is a Pro feature")}
                    className="flex items-center gap-1 hover:text-[#262627] dark:hover:text-white"
                  >
                    <span>Customize</span>
                    <span className="text-[10px]">▾</span>
                  </button>
                  <span className="text-xs text-[#087663]">💎</span>
                </div>
              </div>

              {/* Preview Box */}
              <div className="mt-3 flex items-center gap-4 rounded-xl border border-[#ececef] bg-[#fafafa] p-4 dark:border-[#38353e] dark:bg-[#1e1c22]">
                <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-[#e8e7ea] text-xs font-bold text-[#737373] dark:bg-[#302c35] dark:text-[#aaa]">
                  Inquira
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-[#262627] dark:text-[#f2eff3]">
                    {inq.title || "New form"}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-[#737373] dark:text-[#a1a1aa]">
                    Turn data collection into an experience with Inquira. Create beautiful online forms, surveys, and quizzes.
                  </p>
                  <p className="mt-1 text-[11px] text-[#9c9ca3] dark:text-[#777]">
                    {typeof location !== "undefined" ? location.hostname : "inquira.app"}
                  </p>
                </div>
              </div>
            </div>

            {/* Embed Section */}
            <div className="mt-8 w-full">
              <h2 className="mb-3 text-xs font-semibold text-[#262627] dark:text-[#f2eff3]">
                Embed form
              </h2>
              <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
                <button
                  onClick={() => toast("Website embed code copied to clipboard")}
                  className="flex items-center gap-4 rounded-2xl border border-[#ececef] bg-white p-3.5 text-left transition hover:border-[#8c8294] hover:shadow-sm dark:border-[#34343a] dark:bg-[#252229]"
                >
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-[#c084fc]/30 p-2 text-xs font-semibold text-[#9333ea]">
                    <div className="h-full w-full rounded bg-white/80 p-1 shadow-sm">
                      <div className="h-1.5 w-1/2 rounded bg-[#9333ea]/60" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[#262627] dark:text-[#f2eff3]">On your website</h4>
                  </div>
                </button>

                <button
                  onClick={() => toast("Email embed code copied to clipboard")}
                  className="flex items-center gap-4 rounded-2xl border border-[#ececef] bg-white p-3.5 text-left transition hover:border-[#8c8294] hover:shadow-sm dark:border-[#34343a] dark:bg-[#252229]"
                >
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-[#60a5fa]/30 p-2 text-xs font-semibold text-[#2563eb]">
                    <div className="h-full w-full rounded bg-white/80 p-1 shadow-sm">
                      <div className="h-1.5 w-1/2 rounded bg-[#2563eb]/60" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[#262627] dark:text-[#f2eff3]">In your email</h4>
                  </div>
                </button>
              </div>
            </div>

            {/* Explore More Ways */}
            <div className="mt-8 text-center">
              <button
                onClick={() => toast("More sharing options coming soon")}
                className="rounded-full border border-[#ececef] bg-white px-5 py-2 text-xs font-medium text-[#262627] shadow-sm hover:bg-[#f4f4f5] dark:border-[#38353e] dark:bg-[#252229] dark:text-[#f2eff3] dark:hover:bg-[#302c35]"
              >
                Explore other ways to share
              </button>
            </div>
          </div>

          {/* Ask Inquira AI Pill */}
          <div className="fixed bottom-4 left-4 flex items-center gap-2 rounded-xl border border-[#e6d8ea] bg-white px-3 py-2 text-[#75657a] shadow-sm dark:border-[#3d3342] dark:bg-[#26212b] dark:text-[#eadcf0]">
            <span className="text-sm">🎙</span>
            <input
              className="w-40 bg-transparent text-xs outline-none placeholder:text-[#958599] dark:placeholder:text-[#aaa]"
              placeholder="Ask Inquira AI"
              onKeyDown={(e) => e.key === "Enter" && toast("AI assistant is coming soon")}
            />
            <button
              className="text-xs text-[#76617c] hover:opacity-80 dark:text-[#eadcf0]"
              onClick={() => toast("AI assistant is coming soon")}
            >
              ▷
            </button>
          </div>
        </div>
      )}

      {previewOpen && (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-[#fafafa] dark:bg-[#18181b]"
          role="dialog"
          aria-modal="true"
          aria-label="Form preview"
        >
          {/* Centered Floating Pill Toolbar (matching Image 1 & 3) */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 rounded-full border border-[#e4e4e7] bg-white/95 px-3.5 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] backdrop-blur dark:border-[#3f3f46] dark:bg-[#26232a]/95">
            <button
              className="flex size-6 items-center justify-center text-xs text-[#62626a] hover:text-[#262627] dark:text-[#d5cfd8] dark:hover:text-white"
              aria-label="Close preview"
              onClick={() => setPreviewOpen(false)}
            >
              ✕
            </button>
            <span className="h-3.5 w-px bg-[#e4e4e7] dark:bg-[#3f3f46]" />
            <button
              className="flex size-6 items-center justify-center text-xs text-[#62626a] hover:text-[#262627] dark:text-[#d5cfd8] dark:hover:text-white"
              aria-label="Toggle device view"
              onClick={() => setPreviewDevice((d) => (d === "desktop" ? "mobile" : "desktop"))}
            >
              {previewDevice === "mobile" ? "💻" : "📱"}
            </button>
            <span className="h-3.5 w-px bg-[#e4e4e7] dark:bg-[#3f3f46]" />
            <button
              className="flex size-6 items-center justify-center text-xs text-[#62626a] hover:text-[#262627] dark:text-[#d5cfd8] dark:hover:text-white"
              aria-label="Restart preview"
              onClick={() => setPreviewSession((session) => session + 1)}
            >
              ↻
            </button>
          </div>

          <div
            className={`relative flex flex-1 items-center justify-center overflow-hidden bg-[#fafafa] dark:bg-[#18181b] ${
              previewDevice === "mobile" ? "py-8" : ""
            }`}
          >
            <div
              className={`h-full w-full overflow-hidden transition-all duration-300 ${
                previewDevice === "mobile"
                  ? "max-h-[740px] max-w-[390px] rounded-[14px] bg-white shadow-[0_4px_30px_rgba(0,0,0,0.07)] dark:bg-[#202024]"
                  : "bg-white dark:bg-[#202024]"
              }`}
            >
              <Runner
                key={`full-preview-${previewSession}`}
                inquiry={inq}
                preview
                isMobileView={previewDevice === "mobile"}
                onSubmit={async () => {}}
              />
            </div>
          </div>
        </div>
      )}

      {formSettingsOpen && (
        <Modal title="Form settings" onClose={() => setFormSettingsOpen(false)}>
          <div className="flex border-b border-[#e4e4e7] dark:border-[#38353e] mb-4">
            {(["general", "access", "language"] as const).map((t) => (
              <button
                key={t}
                className={`px-3 py-2 text-xs font-medium border-b-2 capitalize transition-colors ${
                  formSettingsTab === t
                    ? "border-[var(--tf-purple)] text-[#262627] dark:border-[#b7a3bf] dark:text-white"
                    : "border-transparent text-[#737373] hover:text-[#111] dark:text-[#a1a1aa]"
                }`}
                onClick={() => setFormSettingsTab(t)}
              >
                {t === "general" ? "General" : t === "access" ? "Access & Scheduling" : "Language"}
              </button>
            ))}
          </div>

          {formSettingsTab === "general" && (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex items-center justify-between text-xs text-[#262627] dark:text-[#f2eff3]">
                <div>
                  <div className="font-medium">Inquira branding</div>
                  <div className="text-[11px] text-[#737373] dark:text-[#a1a1aa]">Show &ldquo;Powered by Inquira&rdquo; badge</div>
                </div>
                <ToggleSwitch checked={typeformBranding} onChange={setTypeformBranding} />
              </div>
              <div className="flex items-center justify-between text-xs text-[#262627] dark:text-[#f2eff3]">
                <div>
                  <div className="font-medium">Navigation arrows</div>
                  <div className="text-[11px] text-[#737373] dark:text-[#a1a1aa]">Show bottom-right up/down arrow buttons</div>
                </div>
                <ToggleSwitch checked={navArrows} onChange={setNavArrows} />
              </div>
              <div className="flex items-center justify-between text-xs text-[#262627] dark:text-[#f2eff3]">
                <div>
                  <div className="font-medium">Progress bar</div>
                  <div className="text-[11px] text-[#737373] dark:text-[#a1a1aa]">Show completion percentage / progress line</div>
                </div>
                <ToggleSwitch checked={progressBar} onChange={setProgressBar} />
              </div>
            </div>
          )}

          {formSettingsTab === "access" && (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex items-center justify-between text-xs text-[#262627] dark:text-[#f2eff3]">
                <div>
                  <div className="font-medium">Schedule close date</div>
                  <div className="text-[11px] text-[#737373] dark:text-[#a1a1aa]">Automatically close form on specified date</div>
                </div>
                <ToggleSwitch checked={closeDateEnabled} onChange={setCloseDateEnabled} />
              </div>
              <div className="text-xs text-[#262627] dark:text-[#f2eff3]">
                <label className="font-medium mb-1 block">Response limit</label>
                <input
                  type="number"
                  defaultValue={100}
                  className="w-full rounded-lg border border-[#e4e4e7] bg-white px-2.5 py-1.5 text-xs text-[#262627] dark:border-[#3f3f46] dark:bg-[#19191c] dark:text-[#f2eff3]"
                />
              </div>
            </div>
          )}

          {formSettingsTab === "language" && (
            <div className="flex flex-col gap-3 py-2">
              <label className="text-xs font-medium text-[#262627] dark:text-[#f2eff3]">Primary language</label>
              <select
                className="h-9 w-full rounded-lg border border-[#e4e4e7] bg-white px-2.5 text-xs text-[#262627] dark:border-[#3f3f46] dark:bg-[#19191c] dark:text-[#f2eff3]"
                value={formLanguage}
                onChange={(e) => setFormLanguage(e.target.value)}
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="French">French (Français)</option>
                <option value="German">German (Deutsch)</option>
                <option value="Japanese">Japanese (日本語)</option>
              </select>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2 border-t border-[#ececef] pt-3 dark:border-[#38353e]">
            <button
              className="rounded-lg border border-[var(--tf-purple)] bg-[var(--tf-purple)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--tf-purple-dark)]"
              onClick={() => { setFormSettingsOpen(false); toast("Settings saved"); }}
            >
              Done
            </button>
          </div>
        </Modal>
      )}

      {logicModalOpen && (
        <Modal title="Logic" onClose={() => setLogicModalOpen(false)}>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#737373] dark:text-[#a1a1aa]">
              Control question visibility, branching paths, and calculations.
            </p>

            {/* Accordion 1: Question display */}
            <div className="rounded-xl border border-[#ececef] dark:border-[#38353e] overflow-hidden">
              <button
                className="flex w-full items-center justify-between bg-[#fafafa] px-3.5 py-2.5 text-xs font-semibold text-[#262627] dark:bg-[#252229] dark:text-[#f2eff3]"
                onClick={() => setLogicAccordion(logicAccordion === "display" ? null : "display")}
              >
                <span>Question display</span>
                <span>{logicAccordion === "display" ? "▲" : "▼"}</span>
              </button>
              {logicAccordion === "display" && (
                <div className="p-3.5 text-xs text-[#555] dark:text-[#d5cfd8] bg-white dark:bg-[#1e1c22] flex flex-col gap-2">
                  <p className="text-[11px] text-[#737373] dark:text-[#a1a1aa]">
                    Show or hide specific questions based on earlier choices.
                  </p>
                  <div className="rounded-lg border border-[#e4e4e7] p-2.5 dark:border-[#34343a] bg-[#fbfbfc] dark:bg-[#252229]">
                    <span className="font-medium text-[#262627] dark:text-[#f2eff3]">Rule 1: </span>
                    <span>Always show when previous questions are completed.</span>
                  </div>
                  <button
                    className="self-start rounded-md border border-[#d5d5da] bg-white px-2.5 py-1 text-xs font-medium text-[#262627] hover:bg-[#f4f4f4] dark:border-[#444] dark:bg-[#2a2730] dark:text-[#f2eff3]"
                    onClick={() => toast("Question display rule added")}
                  >
                    ＋ Add display rule
                  </button>
                </div>
              )}
            </div>

            {/* Accordion 2: Branching */}
            <div className="rounded-xl border border-[#ececef] dark:border-[#38353e] overflow-hidden">
              <button
                className="flex w-full items-center justify-between bg-[#fafafa] px-3.5 py-2.5 text-xs font-semibold text-[#262627] dark:bg-[#252229] dark:text-[#f2eff3]"
                onClick={() => setLogicAccordion(logicAccordion === "branching" ? null : "branching")}
              >
                <span>Branching</span>
                <span>{logicAccordion === "branching" ? "▲" : "▼"}</span>
              </button>
              {logicAccordion === "branching" && (
                <div className="p-3.5 text-xs text-[#555] dark:text-[#d5cfd8] bg-white dark:bg-[#1e1c22] flex flex-col gap-2">
                  <p className="text-[11px] text-[#737373] dark:text-[#a1a1aa]">
                    Jump to different questions or endings based on respondent answers.
                  </p>
                  <div className="rounded-lg border border-[#e4e4e7] p-2.5 dark:border-[#34343a] bg-[#fbfbfc] dark:bg-[#252229]">
                    <span className="font-medium text-[#262627] dark:text-[#f2eff3]">If </span>
                    <span>question answer is provided </span>
                    <span className="font-medium text-[#262627] dark:text-[#f2eff3]">→ Jump to </span>
                    <span>Next question in flow</span>
                  </div>
                  <button
                    className="self-start rounded-md border border-[#d5d5da] bg-white px-2.5 py-1 text-xs font-medium text-[#262627] hover:bg-[#f4f4f4] dark:border-[#444] dark:bg-[#2a2730] dark:text-[#f2eff3]"
                    onClick={() => toast("Branch rule added")}
                  >
                    ＋ Add branch rule
                  </button>
                </div>
              )}
            </div>

            {/* Accordion 3: Calculations */}
            <div className="rounded-xl border border-[#ececef] dark:border-[#38353e] overflow-hidden">
              <button
                className="flex w-full items-center justify-between bg-[#fafafa] px-3.5 py-2.5 text-xs font-semibold text-[#262627] dark:bg-[#252229] dark:text-[#f2eff3]"
                onClick={() => setLogicAccordion(logicAccordion === "calculations" ? null : "calculations")}
              >
                <span>Calculations</span>
                <span>{logicAccordion === "calculations" ? "▲" : "▼"}</span>
              </button>
              {logicAccordion === "calculations" && (
                <div className="p-3.5 text-xs text-[#555] dark:text-[#d5cfd8] bg-white dark:bg-[#1e1c22] flex flex-col gap-2">
                  <p className="text-[11px] text-[#737373] dark:text-[#a1a1aa]">
                    Assign scores or compute variables based on answers.
                  </p>
                  <div className="rounded-lg border border-[#e4e4e7] p-2.5 dark:border-[#34343a] bg-[#fbfbfc] dark:bg-[#252229]">
                    <span className="font-medium text-[#262627] dark:text-[#f2eff3]">Score: </span>
                    <span>Computed automatically on submission.</span>
                  </div>
                  <button
                    className="self-start rounded-md border border-[#d5d5da] bg-white px-2.5 py-1 text-xs font-medium text-[#262627] hover:bg-[#f4f4f4] dark:border-[#444] dark:bg-[#2a2730] dark:text-[#f2eff3]"
                    onClick={() => toast("Calculation rule added")}
                  >
                    ＋ Add calculation
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-[#ececef] pt-3 dark:border-[#38353e]">
              <button
                className="rounded-lg border border-[var(--tf-purple)] bg-[var(--tf-purple)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--tf-purple-dark)]"
                onClick={() => { setLogicModalOpen(false); toast("Logic rules saved"); }}
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {adding && (
        <AddContentModal onClose={() => setAdding(false)} onAdd={addPrompt} onAddContact={addContact}
          onImport={(ps) => { mutate((d) => d.prompts.push(...ps)); choose(ps[0].id); setAdding(false); }} />)}
    </div>
  );
}