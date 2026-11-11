"use client";
import { Fragment, ReactNode, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import AddContentModal from "@/components/AddContentModal";
import Runner from "@/components/Runner";
import ToggleSwitch from "@/components/ToggleSwitch";
import PublishCelebration from "@/components/PublishCelebration";
import { ThemeToggleButton, useTheme } from "@/components/ThemeProvider";
import AccountMenu from "@/components/AccountMenu";
import { useToast } from "@/components/Toasts";
import { call, errorMessage, send } from "@/lib/api";
import { buildSteps, contactInfoPrompts, newPageKey } from "@/lib/steps";
import { USER } from "@/lib/user";
import { Inquiry, Kind, PromptDTO, kindName, KIND_META } from "@/lib/types";

let tempId = -1;
const Soon = ({ what }: { what: string }) => <div className="mt-3.5 flex justify-between rounded-md border border-[#ececef] bg-[#f7f7f8] px-3 py-2.5 text-[13px] dark:border-[#38383e] dark:bg-[#29292d]"><b>{what}</b><span className="text-[#888] dark:text-[#a1a1aa]">Coming soon</span></div>;
type AccentStyle = React.CSSProperties & { "--accent": string };
type SelectionId = number | "welcome" | "ending";

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

function getTypeformBadge(kind: Kind, letterOrNum: string) {
  let bg = "bg-[#cde4f7]";
  let text = "text-[#0369a1]";
  let icon = "=";

  switch (kind) {
    case "short_text":
    case "long_text":
      bg = "bg-[#cde4f7]";
      text = "text-[#0369a1]";
      icon = "=";
      break;
    case "number":
      bg = "bg-[#fef08a]";
      text = "text-[#854d0e]";
      icon = "#";
      break;
    case "phone":
    case "contact_info":
    case "address":
      bg = "bg-[#fbcfe8]";
      text = "text-[#be185d]";
      icon = "📞";
      break;
    case "email":
      bg = "bg-[#e0e7ff]";
      text = "text-[#4338ca]";
      icon = "✉";
      break;
    case "choice":
    case "dropdown":
    case "checkbox":
    case "ranking":
    case "matrix":
      bg = "bg-[#f3e8ff]";
      text = "text-[#7e22ce]";
      icon = "☰";
      break;
    case "yes_no":
    case "legal":
      bg = "bg-[#ccfbf1]";
      text = "text-[#0f766e]";
      icon = "✓";
      break;
    case "rating":
    case "nps":
    case "opinion_scale":
      bg = "bg-[#dcfce7]";
      text = "text-[#15803d]";
      icon = "★";
      break;
    case "date":
      bg = "bg-[#fed7aa]";
      text = "text-[#c2410c]";
      icon = "📅";
      break;
    case "url":
      bg = "bg-[#cffafe]";
      text = "text-[#0e7490]";
      icon = "↗";
      break;
    default:
      bg = "bg-[#e4e4e7]";
      text = "text-[#3f3f46]";
      icon = "≡";
  }

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold text-[11px] ${bg} ${text} shrink-0`}>
      <span className="text-[10px] leading-none">{icon}</span>
      <span className="leading-none">{letterOrNum}</span>
    </span>
  );
}

const DesktopIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

const MobileIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <line x1="12" x2="12.01" y1="18" y2="18" />
  </svg>
);

const ReloadIcon = ({ className = "size-3.5" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.57L21 8" />
    <polyline points="21 3 21 8 16 8" />
  </svg>
);

const CloseIcon = ({ className = "size-3.5" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

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
  const [sel, setSel] = useState<SelectionId | null>("welcome");
  const [tab, setTab] = useState<"create" | "settings" | "connect" | "share">("create");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewSession, setPreviewSession] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTestToast, setPreviewTestToast] = useState(false);

  const launchPreview = () => {
    setPreviewLoading(true);
    setPreviewSession((session) => session + 1);
    setPreviewOpen(true);
    setPreviewTestToast(false);
    setTimeout(() => setPreviewLoading(false), 350);
  };

  const restartPreview = () => {
    setPreviewLoading(true);
    setPreviewSession((session) => session + 1);
    setTimeout(() => setPreviewLoading(false), 300);
  };
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [designOpen, setDesignOpen] = useState(false);
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState<string>("Pearl white");

  const currentTheme = THEMES.find((t) => t.name === (hoveredTheme || activeTheme)) || THEMES[0];
  const isCustomTheme = hoveredTheme || activeTheme !== "Pearl white";

  const canvasBgColor = isDark
    ? (isCustomTheme && currentTheme.name !== "Pearl white" ? currentTheme.bg : "#19191c")
    : currentTheme.bg;

  const canvasTextColor = isDark
    ? (isCustomTheme && currentTheme.name !== "Pearl white" ? currentTheme.text : "#f2eff3")
    : currentTheme.text;
  const [formSettingsOpen, setFormSettingsOpen] = useState(false);
  const [formSettingsTab, setFormSettingsTab] = useState<"general" | "access" | "language">("general");
  const [typeformBranding, setTypeformBranding] = useState(true);
  const [navArrows, setNavArrows] = useState(true);
  const [progressBar, setProgressBar] = useState(true);
  const [closeDateEnabled, setCloseDateEnabled] = useState(false);
  const [formLanguage, setFormLanguage] = useState("English");
  const [logicModalOpen, setLogicModalOpen] = useState(false);
  const [logicAccordion, setLogicAccordion] = useState<"display" | "branching" | "calculations" | null>("branching");
  const [publishEffectActive, setPublishEffectActive] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const dragFrom = useRef<number | null>(null);
  const revision = useRef(0);

  // Drag-and-drop state for Pages and Questions
  const [dragType, setDragType] = useState<"page" | "prompt" | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [dragPromptId, setDragPromptId] = useState<number | null>(null);
  const [dragTargetPromptId, setDragTargetPromptId] = useState<number | null>(null);

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
        if (d.workspace_id) {
          try {
            localStorage.setItem("inquira.active_workspace_id", String(d.workspace_id));
            sessionStorage.setItem("inquira.workspace", String(d.workspace_id));
          } catch {}
          call("/api/workspaces/active", send("PUT", { workspace_id: d.workspace_id })).catch(() => {});
        }
        if (d.theme) setActiveTheme(d.theme);
        if (d.settings) {
          if (typeof d.settings.typeformBranding === "boolean") setTypeformBranding(d.settings.typeformBranding);
          if (typeof d.settings.navArrows === "boolean") setNavArrows(d.settings.navArrows);
          if (typeof d.settings.progressBar === "boolean") setProgressBar(d.settings.progressBar);
          if (typeof d.settings.closeDateEnabled === "boolean") setCloseDateEnabled(d.settings.closeDateEnabled);
          if (typeof d.settings.formLanguage === "string") setFormLanguage(d.settings.formLanguage);
        }
        if (d.prompts.length > 0) {
          setSel("welcome");
          setPageSel(false);
        } else {
          setSel("welcome");
        }
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

  // Auto-save: debounced save after 700ms of inactivity when dirty
  useEffect(() => {
    if (!dirty || !inq || saving) return;
    const timer = setTimeout(() => {
      void save(true);
    }, 700);
    return () => clearTimeout(timer);
  }, [dirty, inq, saving]);

  // Keep selection valid when questions are added, removed, or reordered
  useEffect(() => {
    if (!inq) return;
    if (sel === "welcome" || sel === "ending") return;
    if (inq.prompts.length === 0) {
      setSel("welcome");
      return;
    }
    if (sel === null || !inq.prompts.some((p) => p.id === sel)) {
      setSel(inq.prompts[0].id);
      setPageSel(!!inq.prompts[0].page);
    }
  }, [inq, sel]);

  // Prevent accidental unload with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);
  if (loadError) return <div className="grid min-h-screen place-content-center text-center"><p role="alert" className="text-[#c0392b]">{loadError}</p><Link className="inline-block rounded border border-[#ccc] bg-white px-3.5 py-2 text-sm text-[#262627] hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-[#29292d] dark:text-[#e4e4e7]" href="/">Back to forms</Link></div>;
  if (!inq) return <div className="grid min-h-screen place-content-center text-center text-[#777] dark:text-[#a1a1aa]">Loading…</div>;

  const steps = buildSteps(inq.prompts);
  const idx = typeof sel === "number" ? inq.prompts.findIndex((p) => p.id === sel) : -1;
  const cur = typeof sel === "number" ? (idx >= 0 ? inq.prompts[idx] : inq.prompts[0]) ?? null : null;
  const curStep = cur ? steps.findIndex((st) => st.some((q) => q.id === cur.id)) : -1;
  const curPage = cur?.page ?? null;
  const onPage = !!(cur && curPage && pageSel);

  // Safe prompt patch: guarantees a valid target in d.prompts and prevents undefined assignment
  const patch = (c: Partial<PromptDTO>) => {
    if (typeof sel !== "number") return;
    const targetId = cur?.id ?? sel;
    if (targetId == null) return;
    mutate((d) => {
      const target = d.prompts.find((p) => p.id === targetId);
      if (target) {
        Object.assign(target, c);
      }
    });
  };

  const patchWelcome = (c: Partial<{ title: string; hint: string; buttonText: string; timeToComplete: string; showTimeToComplete: boolean }>) => {
    mutate((d) => {
      d.settings = d.settings || {};
      const curr = d.settings.welcome_screen || {
        enabled: true,
        title: "Say hi! Recall information with @",
        hint: "",
        buttonText: "Start",
        timeToComplete: "Takes X minutes",
        showTimeToComplete: true,
      };
      d.settings.welcome_screen = { ...curr, ...c };
    });
  };

  const patchEnding = (c: { closing_heading?: string; closing_text?: string }) => {
    mutate((d) => {
      if (c.closing_heading !== undefined) d.closing_heading = c.closing_heading;
      if (c.closing_text !== undefined) d.closing_text = c.closing_text;
    });
  };

  const choose = (id: SelectionId | null, page = false) => {
    setSel(id);
    setPageSel(page);
    setRowMenu(null);
  };

  // Drag and drop handlers
  const handlePageDragStart = (e: React.DragEvent, si: number) => {
    e.stopPropagation();
    setDragType("page");
    setDragSourceIndex(si);
    setDragTargetIndex(si);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `page:${si}`);
  };

  const handlePageDragOver = (e: React.DragEvent, si: number) => {
    e.preventDefault();
    if (dragType === "page" && dragTargetIndex !== si) {
      setDragTargetIndex(si);
    }
  };

  const handlePageDragLeave = () => {
    // leave callback
  };

  const handlePageDrop = (e: React.DragEvent, toStep: number) => {
    e.preventDefault();
    const fromStep = dragSourceIndex;
    setDragType(null);
    setDragSourceIndex(null);
    setDragTargetIndex(null);
    if (fromStep === null || fromStep === toStep) return;

    mutate((d) => {
      const currentSteps = buildSteps(d.prompts);
      if (fromStep < 0 || fromStep >= currentSteps.length || toStep < 0 || toStep >= currentSteps.length) return;
      const [moved] = currentSteps.splice(fromStep, 1);
      currentSteps.splice(toStep, 0, moved);
      d.prompts = currentSteps.flat().map((p, idx) => ({ ...p, position: idx }));
    });
  };

  const handlePromptDragStart = (e: React.DragEvent, promptId: number, si: number, pi: number) => {
    e.stopPropagation();
    setDragType("prompt");
    setDragPromptId(promptId);
    setDragTargetPromptId(promptId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `prompt:${promptId}`);
  };

  const handlePromptDragOver = (e: React.DragEvent, promptId: number, si: number, pi: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragType === "prompt" && dragTargetPromptId !== promptId) {
      setDragTargetPromptId(promptId);
    }
  };

  const handlePromptDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
  };

  const handlePromptDrop = (e: React.DragEvent, targetPromptId: number, targetSi: number, targetPi: number) => {
    e.preventDefault();
    e.stopPropagation();
    const sourcePromptId = dragPromptId;
    setDragType(null);
    setDragPromptId(null);
    setDragTargetPromptId(null);
    if (sourcePromptId === null || sourcePromptId === targetPromptId) return;

    mutate((d) => {
      const sourceIdx = d.prompts.findIndex((p) => p.id === sourcePromptId);
      const targetIdx = d.prompts.findIndex((p) => p.id === targetPromptId);
      if (sourceIdx < 0 || targetIdx < 0) return;

      const [sourcePrompt] = d.prompts.splice(sourceIdx, 1);
      const targetPrompt = d.prompts[sourceIdx < targetIdx ? targetIdx - 1 : targetIdx];

      // Assign target's page if target has a page
      if (targetPrompt?.page) {
        sourcePrompt.page = { ...targetPrompt.page };
      } else {
        sourcePrompt.page = null;
      }

      const insertIdx = d.prompts.findIndex((p) => p.id === targetPromptId);
      d.prompts.splice(insertIdx >= 0 ? insertIdx : targetIdx, 0, sourcePrompt);

      d.prompts.forEach((p, idx) => {
        p.position = idx;
      });
    });
  };

  const addQuestionToPage = (stepIndex: number) => {
    const targetStep = steps[stepIndex];
    if (!targetStep) return;
    let pageInfo = targetStep[0].page;
    if (!pageInfo) {
      const key = newPageKey();
      pageInfo = { key, title: `Page ${stepIndex + 1}`, hint: "" };
      mutate((d) => {
        const p = d.prompts.find((x) => x.id === targetStep[0].id);
        if (p) p.page = { ...pageInfo! };
      });
    }
    const newPrompt: PromptDTO = {
      id: tempId--,
      kind: "short_text",
      label: "",
      hint: "",
      mandatory: false,
      choices: [],
      page: { ...pageInfo },
    };
    const at = inq.prompts.findIndex((q) => q.id === targetStep[targetStep.length - 1].id) + 1;
    mutate((d) => {
      d.prompts.splice(at, 0, newPrompt);
      d.prompts.forEach((p, idx) => { p.position = idx; });
    });
    choose(newPrompt.id);
  };

  const movePromptToNewPage = (promptId: number) => {
    mutate((d) => {
      const p = d.prompts.find((x) => x.id === promptId);
      if (p) {
        p.page = { key: newPageKey(), title: p.label || "New page", hint: "" };
      }
    });
  };

  const patchPage = (c: { title?: string; hint?: string }) => {
    if (!curPage) return;
    mutate((d) => d.prompts.forEach((q) => { if (q.page?.key === curPage.key) q.page = { ...q.page, ...c }; }));
  };

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
    if (i < 0) return;
    const next = inq.prompts[i + 1] ?? inq.prompts[i - 1];
    mutate((d) => {
      const targetIdx = d.prompts.findIndex((p) => p.id === pid);
      if (targetIdx >= 0) d.prompts.splice(targetIdx, 1);
    });
    choose(next?.id ?? null, false);
  };
  const dupPrompt = (pid: number) => {
    const i = inq.prompts.findIndex((p) => p.id === pid);
    if (i < 0) return;
    const o = inq.prompts[i];
    const c: PromptDTO = { ...o, choices: [...(o.choices || [])], page: o.page ? { ...o.page } : null, id: tempId-- };
    mutate((d) => {
      const targetIdx = d.prompts.findIndex((p) => p.id === pid);
      if (targetIdx >= 0) d.prompts.splice(targetIdx + 1, 0, c);
      else d.prompts.push(c);
    });
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
        ? "bg-[#fae8ee] text-[#d83b6f] font-medium border border-[#f5d0dc] dark:bg-[#34222d] dark:text-[#f8b4d0] dark:border-[#4d2f40]"
        : "text-[#62626a] hover:bg-[#f3f2f5] hover:text-[#322b35] dark:text-[#d5cfd8] dark:hover:bg-[#333039] dark:hover:text-white"
    }`;
  const MENU_ITEM = "rounded-md border-0 bg-transparent px-3 py-2 text-left text-sm hover:bg-[#f3f3f3] dark:text-[#e4e4e7] dark:hover:bg-[#37313b]";
  const kebab = (id: string, label: string, items: ReactNode) => (
    <span className="relative ml-auto" onClick={(e) => e.stopPropagation()}>
      <button className="border-0 bg-transparent text-[17px] text-[#777] hover:text-[#333] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#b4acb9] dark:hover:text-white" aria-label={`More options for ${label}`} aria-expanded={rowMenu === id} onClick={() => setRowMenu(rowMenu === id ? null : id)}>···</button>
      {rowMenu === id && (<>
        <div className="fixed inset-0 z-20 bg-transparent" onClick={() => setRowMenu(null)} />
        <div className="absolute right-0 top-7 z-[21] flex min-w-[150px] flex-col rounded-lg border border-[var(--tf-border)] bg-white p-1.5 text-[var(--tf-text)] shadow-[0_8px_24px_rgba(0,0,0,.12)] dark:border-[#39353e] dark:bg-[#26232a]">{items}</div>
      </>)}
    </span>
  );

  const save = async (quiet = false) => {
    if (saving || !inq) return false;
    const snapshot = structuredClone(inq);
    snapshot.theme = activeTheme;
    snapshot.settings = {
      typeformBranding,
      navArrows,
      progressBar,
      closeDateEnabled,
      formLanguage,
    };
    const savedRevision = revision.current;
    const selectedIndex = typeof sel === "number" ? snapshot.prompts.findIndex((prompt) => prompt.id === sel) : -1;
    setSaving(true);
    try {
      const saved = await call<Inquiry>(`/api/inquiries/${snapshot.id}`, send("PUT", snapshot));
      const savedIdByLocalId = new Map(
        snapshot.prompts.map((prompt, index) => [prompt.id, saved.prompts[index]?.id]),
      );
      if (revision.current === savedRevision) {
        setInq(saved);
        if (typeof sel === "number") {
          setSel(saved.prompts[selectedIndex]?.id ?? saved.prompts[0]?.id ?? null);
        }
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
        if (typeof sel === "number") {
          setSel((current) => typeof current === "number" ? (savedIdByLocalId.get(current) ?? current) : current);
        }
        setDirty(true);
      }
      return true;
    } catch (error: unknown) { toast(errorMessage(error)); return false; }
    finally { setSaving(false); }
  };
  const handleShareClick = async () => {
    if (publishing || !inq) return;
    if (inq.status !== "published") {
      setPublishing(true);
      try {
        if (dirty) {
          await save(true);
        }
        const r = await call<Inquiry>(`/api/inquiries/${inq.id}/publish`, send("POST"));
        setInq((current) => (current ? { ...current, status: r.status } : current));
        setPublishEffectActive(true);
      } catch (error: unknown) {
        toast(errorMessage(error));
      } finally {
        setPublishing(false);
      }
    } else {
      setTab("share");
    }
  };

  const handlePublishEffectComplete = () => {
    setPublishEffectActive(false);
    setTab("share");
    setShareLoading(true);
    setTimeout(() => {
      setShareLoading(false);
    }, 450);
  };

  const handleUnpublish = async () => {
    if (!inq) return;
    try {
      const r = await call<Inquiry>(`/api/inquiries/${inq.id}/unpublish`, send("POST"));
      setInq((current) => (current ? { ...current, status: r.status } : current));
      setTab("create");
      toast("Form unpublished (saved as draft)");
    } catch (error: unknown) {
      toast(errorMessage(error));
    }
  };
  const link = `${typeof location !== "undefined" ? location.origin : ""}/f/${inq.slug}`;

  return (
    <div className="h-screen min-h-[560px] flex flex-col bg-[var(--tf-panel-bg)] text-[var(--tf-text)] animate-zoom-out-enter motion-reduce:animate-none" style={{ "--accent": inq.accent } as AccentStyle}>
      <header className="grid h-[46px] flex-[0_0_46px] grid-cols-[minmax(260px,1fr)_auto_minmax(260px,1fr)] items-center gap-[14px] border-b border-[var(--tf-border)] bg-white px-4 dark:border-[#34343a] dark:bg-[#26232a] max-[900px]:h-[78px] max-[900px]:flex-[0_0_78px] max-[900px]:grid-cols-[minmax(180px,1fr)_auto] max-[900px]:gap-2 max-[900px]:px-2.5 max-[600px]:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-2 text-[13px] text-[#56565e] max-[600px]:gap-1.5">
          <Link href="/" className="font-normal text-[#56565e] hover:text-[#262627] dark:text-[#a1a1aa] dark:hover:text-white">Forms</Link>
          <span className="text-[#999]">›</span>
          <input aria-label="Form title" className="min-w-[80px] w-[min(200px,28vw)] max-[600px]:w-[100px] rounded border-0 bg-transparent px-1.5 py-1 text-[13px] font-normal text-[#262627] outline-none hover:bg-[#f4f4f5] focus:bg-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#8a7590] dark:text-[#f2eff3] dark:hover:bg-[#303035] dark:focus:bg-[#303035]" value={inq.title} onChange={(e) => mutate((d) => { d.title = e.target.value; })} />
          <div className="hidden sm:flex items-center pl-1 text-[11px]">
            {saving ? (
              <span className="flex items-center gap-1.5 text-[#737373] dark:text-[#a1a1aa]">
                <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Saving…</span>
              </span>
            ) : dirty ? (
              <span className="flex items-center gap-1.5 text-[#8c8294] dark:text-[#a1a1aa]">
                <span className="size-2 rounded-full bg-amber-500" />
                <span>Unsaved</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#087663] dark:text-emerald-400 font-medium">
                <svg className="size-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Saved</span>
              </span>
            )}
          </div>
        </div>
        <nav className="flex h-full items-center gap-1 self-stretch max-[900px]:col-span-full max-[900px]:row-start-2 max-[900px]:justify-center max-[900px]:h-9" aria-label="Form sections">
          <button className={`h-full rounded-none border-0 border-b-2 bg-transparent px-3 text-[13px] hover:text-[#222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] dark:hover:text-white ${tab === "create" ? "border-b-[#463449] font-semibold text-[#242126] dark:border-b-[#d6a5e8] dark:text-white" : "border-transparent text-[#55555d] dark:text-[#d5cfd8]"}`} onClick={() => setTab("create")}>Content</button>
          <button className="h-full rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 text-[13px] text-[#55555d] hover:text-[#222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] dark:text-[#d5cfd8] dark:hover:text-white" onClick={() => toast("Workflow is coming soon")}>Workflow</button>
          <button className={`h-full rounded-none border-0 border-b-2 bg-transparent px-3 text-[13px] hover:text-[#222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] dark:hover:text-white ${tab === "connect" ? "border-b-[#463449] font-semibold text-[#242126] dark:border-b-[#d6a5e8] dark:text-white" : "border-transparent text-[#55555d] dark:text-[#d5cfd8]"}`} onClick={() => setTab("connect")}>Connect</button>
          {inq.status === "published" && (
            <>
              <button className={`h-full rounded-none border-0 border-b-2 bg-transparent px-3 text-[13px] hover:text-[#222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] dark:hover:text-white ${tab === "share" ? "border-b-[#463449] font-semibold text-[#242126] dark:border-b-[#d6a5e8] dark:text-white" : "border-transparent text-[#55555d] dark:text-[#d5cfd8]"}`} onClick={() => setTab("share")}>Share</button>
              <Link className="flex h-full items-center border-b-2 border-transparent px-3 text-[13px] text-[var(--tf-text-2)] hover:bg-[#f4f1f5] hover:text-[var(--tf-text)] dark:text-[#d5cfd8] dark:hover:bg-[#343039] dark:hover:text-white" href={`/results/${inq.id}`}>Results</Link>
            </>
          )}
        </nav>
        <div className="flex items-center justify-end gap-2 max-[900px]:col-start-2 max-[900px]:row-start-1 max-[600px]:gap-[5px]">
          {inq.status !== "published" ? (
            /* BEFORE share click (Unpublished): displays "> Share" button */
            <button
              className="flex items-center gap-1.5 rounded-lg border border-[#d5d5da] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#262627] shadow-sm hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-60 dark:border-[#4b4550] dark:bg-[#302c34] dark:text-[#f2eff3]"
              disabled={publishing}
              onClick={() => void handleShareClick()}
              title="Share form"
            >
              {publishing ? (
                <span className="size-3.5 rounded-full border-2 border-neutral-400 border-t-neutral-800 animate-spin dark:border-neutral-500 dark:border-t-white" />
              ) : (
                <svg className="size-3.5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              )}
              <span>{publishing ? "Publishing…" : "Share"}</span>
            </button>
          ) : (
            /* AFTER share click (Published): displays copy link and open link */
            <div className="flex items-center gap-1.5">
              <button
                className="flex size-8 items-center justify-center rounded-lg border border-[#d5d5da] bg-white text-xs font-semibold text-[#262627] hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#4b4550] dark:bg-[#302c34] dark:text-[#f2eff3]"
                title="Copy link"
                onClick={() => {
                  navigator.clipboard?.writeText(link);
                  toast("Link copied to clipboard!");
                }}
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </button>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="flex size-8 items-center justify-center rounded-lg border border-[#d5d5da] bg-white text-xs font-semibold text-[#262627] hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#4b4550] dark:bg-[#302c34] dark:text-[#f2eff3]"
                title="Open public form in new tab"
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          )}

          {/* View plans CTA (Green button) */}
          <button
            className="rounded-lg border-0 bg-[#087663] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#076653] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 max-[600px]:hidden"
            onClick={() => toast("View plans is coming soon")}
          >
            View plans
          </button>
          <button
            className="size-7 rounded-full border border-[#d5d5da] bg-white text-[13px] text-[#555] hover:bg-[#f3f3f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#4b4550] dark:bg-[#302c34] dark:text-[#e4e4e7] dark:hover:bg-[#3a3540] max-[600px]:hidden"
            aria-label="Help"
            onClick={() => toast("Help is coming soon")}
          >
            ?
          </button>
          <ThemeToggleButton />
          <AccountMenu size="sm" />
        </div>
      </header>

      <div className="grid h-[54px] flex-[0_0_54px] grid-cols-[250px_minmax(0,1fr)_250px] items-center gap-3.5 border-b border-[var(--tf-border)] bg-white px-3 py-1.5 dark:border-[#34343a] dark:bg-[#202024] max-[900px]:grid-cols-[210px_minmax(0,1fr)_32px] max-[600px]:grid-cols-[1fr_auto] max-[600px]:p-1.5">
        <button className="flex h-10 w-full items-center justify-between rounded-2xl bg-[#f4f4f6] px-3.5 text-left text-[13px] font-medium text-[#2d2d30] hover:bg-[#eaeaea] focus-visible:outline focus-visible:outline-2 dark:bg-[#2a272f] dark:text-[#e4e4e7] max-[600px]:hidden" onClick={() => toast("Universal mode is selected")}>
          <div className="flex items-center gap-2">
            <svg className="size-4 text-[#555] dark:text-[#aaa]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="4" y1="9" x2="20" y2="9" />
              <line x1="4" y1="15" x2="20" y2="15" />
            </svg>
            <span>Universal mode</span>
          </div>
          <svg className="size-3 text-[#666]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 6 4 4 4-4" /></svg>
        </button>
        <div className="flex min-w-0 items-center gap-2 max-[600px]:col-start-1">
          <button className="inline-flex min-w-[132px] shrink-0 items-center gap-[7px] whitespace-nowrap rounded-md border border-[#262627] bg-[#262627] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#181819] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[var(--tf-purple)] dark:bg-[var(--tf-purple)] dark:hover:bg-[var(--tf-purple-dark)] max-[600px]:min-w-[30px] max-[600px]:px-[7px]" onClick={() => setAdding(true)}>＋ <span className="max-[600px]:hidden">Add content</span></button>
          <button className={`h-9 min-w-9 rounded-[7px] border border-transparent px-2.5 text-xs hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px] ${designOpen ? "bg-[#f1eff2] text-[#332b35] dark:bg-[#343039] dark:text-white" : "bg-transparent text-[#62626a] dark:text-[#d5cfd8]"}`} aria-pressed={designOpen} onClick={() => setDesignOpen(!designOpen)}>🎨 <span className="max-[600px]:hidden">Design</span></button>
          <span className="mx-0.5 h-6 w-px bg-[#e6e6e8] dark:bg-[#38383e] max-[600px]:hidden" />
          <button
            className={`h-9 min-w-9 rounded-[7px] border border-transparent px-2.5 flex items-center justify-center hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px] ${previewDevice === "desktop" ? "bg-[#f1eff2] text-[#332b35] dark:bg-[#343039] dark:text-white font-bold" : "bg-transparent text-[#62626a] dark:text-[#d5cfd8]"}`}
            aria-label="Desktop view"
            title="Desktop view"
            onClick={() => setPreviewDevice("desktop")}
          >
            <DesktopIcon className="size-4" />
          </button>
          <button
            className={`h-9 min-w-9 rounded-[7px] border border-transparent px-2.5 flex items-center justify-center hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px] ${previewDevice === "mobile" ? "bg-[#f1eff2] text-[#332b35] dark:bg-[#343039] dark:text-white font-bold" : "bg-transparent text-[#62626a] dark:text-[#d5cfd8]"}`}
            aria-label="Mobile view"
            title="Mobile view"
            onClick={() => setPreviewDevice("mobile")}
          >
            <MobileIcon className="size-4" />
          </button>
          <div className="relative group">
            <button
              className="h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 flex items-center justify-center text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#d5cfd8] dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px]"
              aria-label="Preview"
              onClick={launchPreview}
            >
              <svg className="size-4 fill-current" viewBox="0 0 24 24">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            </button>
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 hidden rounded-md bg-[#18181b] px-2 py-1 text-[11px] font-medium text-white shadow-md group-hover:block whitespace-nowrap z-50">
              Preview
            </div>
          </div>
          <button className="h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#d5cfd8] dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px]" aria-label="Question info" onClick={() => toast("Select a question to inspect details")}>ⓘ</button>
          <button className="h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#d5cfd8] dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px]" aria-label="Undo" onClick={() => toast("Undo is coming soon")}>↺</button>
          <button className="h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#d5cfd8] dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px]" aria-label="Language settings" onClick={() => { setFormSettingsTab("language"); setFormSettingsOpen(true); }}>A文</button>
          <button className="h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#d5cfd8] dark:hover:bg-[#302c34] dark:hover:text-white max-[600px]:min-w-[30px] max-[600px]:px-[7px]" aria-label="More form settings" onClick={() => { setFormSettingsTab("general"); setFormSettingsOpen(true); }}>⚙</button>
        </div>
        <button className="size-[34px] justify-self-end rounded-md border-0 bg-transparent text-[15px] text-[#666] hover:bg-[#f3f3f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#d5cfd8] dark:hover:bg-[#302c34] max-[600px]:col-start-2 max-[600px]:row-start-1" aria-label="Collapse settings panel" onClick={() => toast("Panel controls are coming soon")}>◧</button>
      </div>

      {tab === "create" && (
        <div className="grid min-h-0 flex-1 grid-cols-[250px_minmax(0,1fr)_250px] max-[900px]:grid-cols-[210px_minmax(0,1fr)] max-[600px]:grid-cols-1">
          <aside className="flex min-w-0 flex-col gap-2.5 overflow-y-auto border-r border-[#e5e5e8] bg-white p-3 dark:border-[#34343a] dark:bg-[#1d1b20] max-[600px]:hidden select-none">
            {/* Pages Container (light gray rounded container) */}
            <div className="flex flex-col gap-2 rounded-2xl bg-[#f4f4f6] p-2.5 dark:bg-[#252229]">
              <div className="flex items-center justify-between px-1 text-xs font-semibold text-[#262627] dark:text-[#f2eff3]">
                <span>Pages</span>
              </div>

              {/* Welcome screen pill item */}
              <div
                onClick={() => choose("welcome")}
                className={`group flex h-9 cursor-pointer items-center justify-center rounded-xl transition-all ${
                  sel === "welcome"
                    ? "bg-[#e2e2e6] shadow-sm ring-1 ring-[#c7c7cc] dark:bg-[#343039] dark:ring-[#4d4855]"
                    : "bg-[#ececee] hover:bg-[#e4e4e8] dark:bg-[#2e2a33] dark:hover:bg-[#383340]"
                }`}
                title="Welcome screen"
              >
                <div className="flex items-center justify-center size-7 rounded-lg bg-[#e2e2e6] dark:bg-[#383340] text-[#4b5563] dark:text-[#d5cfd8]">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                </div>
              </div>

              {/* Page Cards */}
              <div className="flex flex-col gap-2.5">
                {steps.map((st, si) => {
                  const isDraggingThisPage = dragType === "page" && dragSourceIndex === si;
                  const isPageDropTarget = dragType === "page" && dragTargetIndex === si;
                  const pageNum = si + 1;

                  return (
                    <div
                      key={`page-${si}`}
                      draggable
                      onDragStart={(e) => handlePageDragStart(e, si)}
                      onDragOver={(e) => handlePageDragOver(e, si)}
                      onDragLeave={handlePageDragLeave}
                      onDrop={(e) => handlePageDrop(e, si)}
                      className={`rounded-2xl bg-white p-2.5 shadow-sm border transition-all dark:bg-[#1e1c22] ${
                        isDraggingThisPage
                          ? "opacity-40 border-dashed border-[#7e22ce]"
                          : isPageDropTarget
                          ? "border-2 border-[#7e22ce] ring-2 ring-[#7e22ce]/20"
                          : "border-[#e5e5e8] dark:border-[#39353e] hover:border-[#c7c7cc]"
                      }`}
                    >
                      {/* Page Header Badge [ ☲  1 ] */}
                      <div className="flex items-center justify-between mb-2 px-0.5">
                        <div
                          className="inline-flex items-center gap-1.5 rounded-md bg-[#f0f0f2] px-2 py-0.5 text-xs font-semibold text-[#374151] dark:bg-[#302c34] dark:text-[#d5cfd8] cursor-grab active:cursor-grabbing"
                          title={`Drag to reorder Page ${pageNum}`}
                        >
                          <svg className="size-3 text-[#6b7280] dark:text-[#9ca3af]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                          </svg>
                          <span className="leading-none">{pageNum}</span>
                        </div>

                        {/* Kebab menu for page */}
                        {kebab(
                          `page-${si}`,
                          `Page ${pageNum}`,
                          <>
                            <button className={MENU_ITEM} onClick={() => addQuestionToPage(si)}>+ Add question to page</button>
                            <button className={MENU_ITEM} onClick={() => dupStep(si)}>Duplicate page</button>
                            <button className={MENU_ITEM + " text-[#b43e32]"} onClick={() => removeStep(si)}>Delete page</button>
                          </>
                        )}
                      </div>

                      {/* Question Rows inside Page Card */}
                      <div className="flex flex-col gap-1.5">
                        {st.map((p, pi) => {
                          const isSelected = sel === p.id;
                          const letter = String.fromCharCode(65 + pi);
                          const isDraggingPrompt = dragType === "prompt" && dragPromptId === p.id;
                          const isPromptDropTarget = dragType === "prompt" && dragTargetPromptId === p.id;

                          return (
                            <div
                              key={p.id}
                              draggable
                              onDragStart={(e) => handlePromptDragStart(e, p.id, si, pi)}
                              onDragOver={(e) => handlePromptDragOver(e, p.id, si, pi)}
                              onDragLeave={handlePromptDragLeave}
                              onDrop={(e) => handlePromptDrop(e, p.id, si, pi)}
                              onClick={() => choose(p.id)}
                              className={`group/row flex min-h-[34px] cursor-pointer items-center gap-2 rounded-xl px-2 py-1 text-xs transition-all ${
                                isSelected
                                  ? "bg-[#fae8ee] text-[#d83b6f] font-medium border border-[#f5d0dc] dark:bg-[#34222d] dark:text-[#f8b4d0] dark:border-[#4d2f40]"
                                  : "text-[#4b5563] hover:bg-[#f3f4f6] dark:text-[#d5cfd8] dark:hover:bg-[#2b2732]"
                              } ${
                                isDraggingPrompt
                                  ? "opacity-40 border-dashed border-[#7e22ce]"
                                  : isPromptDropTarget
                                  ? "border-t-2 border-[#7e22ce] bg-purple-50/50"
                                  : ""
                              }`}
                            >
                              {/* Typeform colored badge */}
                              {getTypeformBadge(p.kind, letter)}

                              {/* Question title / ellipsis */}
                              <span className="truncate flex-1 min-w-0 text-left text-xs" title={p.label || "..."}>
                                {p.label || "..."}
                              </span>

                              {/* Kebab menu on hover */}
                              {kebab(
                                `p-${p.id}`,
                                p.label || kindName(p.kind),
                                <>
                                  <button className={MENU_ITEM} onClick={() => dupPrompt(p.id)}>Duplicate</button>
                                  <button className={MENU_ITEM} onClick={() => movePromptToNewPage(p.id)}>Move to new page</button>
                                  <button className={MENU_ITEM + " text-[#b43e32]"} onClick={() => removePrompt(p.id)}>Delete</button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Content button inside Pages */}
              <button
                className="mt-1 flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[#6b7280] hover:text-[#18181b] dark:text-[#a1a1aa] dark:hover:text-white"
                onClick={() => setAdding(true)}
              >
                <span className="text-sm font-bold">＋</span> <span>Add content</span>
              </button>
            </div>

            {/* Centered Divider Pill */}
            <div className="w-12 h-1 bg-[#d1d1d6] dark:bg-[#484852] rounded-full mx-auto my-2 shrink-0" />

            {/* Endings Container */}
            <div className="flex flex-col gap-2 rounded-2xl bg-[#f4f4f6] p-2.5 dark:bg-[#252229]">
              <div className="flex items-center justify-between px-1 text-xs font-semibold text-[#262627] dark:text-[#f2eff3]">
                <span>Endings</span>
                <button
                  className="grid size-6 place-items-center rounded-lg bg-white border border-[#e5e5e8] text-xs font-semibold text-[#374151] hover:bg-gray-50 dark:bg-[#2a272f] dark:border-[#39353e] dark:text-white shadow-sm"
                  onClick={() => {
                    choose("ending");
                    toast("Ending screen selected");
                  }}
                  title="Add ending"
                >
                  ＋
                </button>
              </div>

              {/* Ending item card */}
              <div
                onClick={() => choose("ending")}
                className={`flex min-h-[36px] cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-all ${
                  sel === "ending"
                    ? "bg-[#fae8ee] text-[#d83b6f] font-medium border border-[#f5d0dc] dark:bg-[#34222d] dark:text-[#f8b4d0] dark:border-[#4d2f40]"
                    : "bg-white text-[#4b5563] border border-[#e5e5e8] hover:bg-gray-50 dark:bg-[#1e1c22] dark:border-[#39353e] dark:text-[#d5cfd8]"
                }`}
              >
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold text-[11px] bg-[#f3e8ff] text-[#7e22ce] shrink-0">
                  <span className="text-[10px]">◧</span>
                  <span>A</span>
                </span>
                <span className="truncate flex-1 min-w-0 text-left text-xs" title={inq.closing_heading}>
                  {inq.closing_heading || "..."}
                </span>
              </div>
            </div>

            {/* Bottom AI Pill */}
            <div className="mt-auto pt-2">
              <div className="flex items-center gap-2 rounded-2xl border border-[#d8b4e2] bg-white px-3.5 py-2 text-[#75657a] shadow-sm dark:border-[#583f66] dark:bg-[#202024] dark:text-[#eadcf0]">
                <span className="text-base">🎙</span>
                <input
                  className="w-full bg-transparent text-xs outline-none placeholder:text-[#958599] dark:placeholder:text-[#aaa]"
                  placeholder="Ask Typeform AI"
                  onKeyDown={(e) => e.key === "Enter" && toast("Ask Typeform AI is coming soon")}
                />
                <button
                  className="grid size-6 place-items-center rounded-full bg-[#f4e8f8] text-xs text-[#7e22ce] hover:bg-[#edd8f3] dark:bg-[#392e44] dark:text-[#e9d5ff]"
                  onClick={() => toast("Ask Typeform AI is coming soon")}
                  title="Send"
                >
                  ▷
                </button>
              </div>
            </div>
          </aside>

          <section
            className="relative flex min-w-0 flex-1 flex-col transition-colors duration-200"
            style={{
              backgroundColor: canvasBgColor,
              color: canvasTextColor,
            }}
          >
            {sel === "welcome" ? (
              <div className="flex flex-1 items-center justify-center p-8 max-[600px]:p-4 overflow-auto">
                <div
                  className={`w-full animate-from-above transition-all duration-300 text-center flex flex-col items-center ${
                    previewDevice === "mobile"
                      ? "max-w-[390px] rounded-[24px] border-2 border-neutral-300/80 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-[#202024]"
                      : "max-w-2xl"
                  }`}
                >
                  <input
                    aria-label="Welcome screen heading"
                    className="w-full bg-transparent text-center text-[clamp(24px,3.5vw,34px)] font-normal outline-none placeholder:text-[#a1a1aa] dark:placeholder:text-[#71717a] mb-2"
                    style={{ color: canvasTextColor }}
                    placeholder="Say hi! Recall information with @"
                    value={inq.settings?.welcome_screen?.title ?? "Say hi! Recall information with @"}
                    onChange={(e) => patchWelcome({ title: e.target.value })}
                  />
                  <input
                    aria-label="Welcome screen description"
                    className="w-full bg-transparent text-center text-[15px] italic text-[#737373] outline-none placeholder:text-[#a1a1aa] dark:text-[#c4c4ca] dark:placeholder:text-[#71717a] mb-8"
                    placeholder="Description (optional)"
                    value={inq.settings?.welcome_screen?.hint ?? ""}
                    onChange={(e) => patchWelcome({ hint: e.target.value })}
                  />
                  <div className="mb-4">
                    <button
                      className="rounded-lg bg-[#262627] px-7 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-[#181819] active:scale-95 transition-all dark:bg-[#39343d]"
                      onClick={() => {
                        if (inq.prompts.length > 0) choose(inq.prompts[0].id);
                      }}
                    >
                      {inq.settings?.welcome_screen?.buttonText || "Start"}
                    </button>
                  </div>
                  {(inq.settings?.welcome_screen?.showTimeToComplete !== false) && (
                    <div className="flex items-center gap-1.5 text-xs text-[#737373] dark:text-[#a1a1aa]">
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{inq.settings?.welcome_screen?.timeToComplete || "Takes X minutes"}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : sel === "ending" ? (
              <div className="flex flex-1 items-center justify-center p-8 max-[600px]:p-4 overflow-auto">
                <div
                  className={`w-full animate-from-above transition-all duration-300 text-center flex flex-col items-center ${
                    previewDevice === "mobile"
                      ? "max-w-[390px] rounded-[24px] border-2 border-neutral-300/80 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-[#202024]"
                      : "max-w-2xl"
                  }`}
                >
                  <div className="mb-5 grid size-16 place-items-center rounded-full border-2 border-[#262627] text-2xl font-bold dark:border-white">
                    ✓
                  </div>
                  <input
                    aria-label="Ending heading"
                    className="w-full bg-transparent text-center text-[clamp(22px,3.2vw,30px)] font-normal outline-none placeholder:text-[#a1a1aa] dark:placeholder:text-[#71717a] mb-2"
                    style={{ color: canvasTextColor }}
                    placeholder="Thanks for completing this form"
                    value={inq.closing_heading}
                    onChange={(e) => patchEnding({ closing_heading: e.target.value })}
                  />
                  <textarea
                    aria-label="Ending message"
                    rows={2}
                    className="w-full max-w-md bg-transparent text-center text-base text-[#737373] outline-none placeholder:text-[#a1a1aa] dark:text-[#c4c4ca] dark:placeholder:text-[#71717a] mb-6 resize-none"
                    placeholder="Your answers have been recorded."
                    value={inq.closing_text}
                    onChange={(e) => patchEnding({ closing_text: e.target.value })}
                  />
                  <button
                    className="rounded-lg bg-[#262627] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#181819] active:scale-95 transition-all dark:bg-[#39343d]"
                    onClick={() => toast("Button clicked")}
                  >
                    Create a form
                  </button>
                </div>
              </div>
            ) : cur && !onPage ? (
              <div className="flex flex-1 items-center justify-center p-8 max-[600px]:p-4 overflow-auto">
                <div
                  className={`w-full animate-from-above transition-all duration-300 ${
                    previewDevice === "mobile"
                      ? "max-w-[390px] rounded-[24px] border-2 border-neutral-300/80 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-[#202024]"
                      : "max-w-2xl"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-[4px] bg-[#262627] px-1.5 text-[12px] font-bold leading-none text-white shadow-sm dark:bg-[#39343d] dark:text-[#f2eff3]">
                      {curStep + 1}
                    </span>
                    <div className="flex-1">
                      <input
                        className="w-full bg-transparent text-[clamp(22px,3.2vw,28px)] font-normal outline-none placeholder:text-[#a1a1aa] dark:placeholder:text-[#71717a]"
                        style={{ color: canvasTextColor }}
                        placeholder="Your question here. Recall information with @"
                        value={cur.label}
                        onChange={(e) => patch({ label: e.target.value })}
                      />
                      <input
                        className="mt-1 w-full bg-transparent text-[15px] italic text-[#737373] outline-none placeholder:text-[#a1a1aa] dark:text-[#c4c4ca] dark:placeholder:text-[#71717a]"
                        placeholder="Description (optional)"
                        value={cur.hint}
                        onChange={(e) => patch({ hint: e.target.value })}
                      />

                      {/* Dynamic Answer UI for all question types */}
                      {cur.kind === "address" ? (
                        <div className="mt-6 flex flex-col gap-3.5 max-w-[500px]">
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
                        <div className="mt-6 flex items-center gap-3 border-b border-[#262627] pb-2 dark:border-[#8c8294] max-w-[400px]">
                          <span className="flex items-center gap-1.5 text-base text-[#262627] dark:text-[#f2eff3]">
                            <span>🇺🇸</span>
                            <span className="text-sm font-medium text-[#737373] dark:text-[#a1a1aa]">{defaultCountryCode}</span>
                            <span className="text-[10px] text-[#737373]">▾</span>
                          </span>
                          <span className="text-[clamp(18px,2.5vw,22px)] text-[#a1a1aa]">
                            (201) 555-0123
                          </span>
                        </div>
                      ) : ["choice", "dropdown", "checkbox", "ranking"].includes(cur.kind) ? (
                        <div className="mt-6 flex flex-col gap-2.5 max-w-[500px]">
                          {(cur.choices && cur.choices.length > 0 ? cur.choices : ["Option 1", "Option 2"]).map((c, ki) => (
                            <div
                              key={ki}
                              className="group flex items-center gap-2.5 rounded-lg border border-[#e4e4e7] bg-white p-2.5 text-sm text-[#262627] shadow-sm transition hover:border-[#8c8294] dark:border-[#3f3f46] dark:bg-[#202024] dark:text-[#f2eff3]"
                            >
                              <span className="grid size-6 shrink-0 place-items-center rounded border border-[#d4d4d8] text-xs font-semibold text-[#71717a] dark:border-[#52525b] dark:text-[#a1a1aa]">
                                {cur.kind === "ranking" ? ki + 1 : String.fromCharCode(65 + ki)}
                              </span>
                              <input
                                type="text"
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#a1a1aa]"
                                value={c}
                                placeholder={`Option ${ki + 1}`}
                                onChange={(e) => {
                                  const cs = [...(cur.choices || [])];
                                  cs[ki] = e.target.value;
                                  patch({ choices: cs });
                                }}
                              />
                              {(cur.choices?.length ?? 0) > 1 && (
                                <button
                                  className="grid size-6 shrink-0 place-items-center rounded text-xs text-[#a1a1aa] hover:bg-[#f4f4f5] hover:text-[#b43e32] dark:hover:bg-[#302c34]"
                                  title="Remove option"
                                  onClick={() => patch({ choices: cur.choices.filter((_, j) => j !== ki) })}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            className="mt-1 flex items-center gap-1.5 self-start rounded-md border border-dashed border-[#d4d4d8] px-3 py-1.5 text-xs font-medium text-[#52525b] hover:border-[#8c8294] hover:text-[#18181b] dark:border-[#4b4550] dark:text-[#a1a1aa] dark:hover:text-white"
                            onClick={() => patch({ choices: [...(cur.choices || []), `Option ${(cur.choices?.length ?? 0) + 1}`] })}
                          >
                            <span>＋</span> <span>Add option</span>
                          </button>
                        </div>
                      ) : cur.kind === "yes_no" ? (
                        <div className="mt-6 flex gap-3 max-w-[320px]">
                          <div className="flex flex-1 items-center justify-between rounded-lg border border-[#e4e4e7] bg-white px-4 py-3 text-sm font-semibold text-[#262627] shadow-sm dark:border-[#3f3f46] dark:bg-[#202024] dark:text-[#f2eff3]">
                            <span>Yes</span>
                            <span className="grid size-5 place-items-center rounded border border-[#d4d4d8] text-[10px] text-[#71717a] dark:border-[#52525b] dark:text-[#a1a1aa]">Y</span>
                          </div>
                          <div className="flex flex-1 items-center justify-between rounded-lg border border-[#e4e4e7] bg-white px-4 py-3 text-sm font-semibold text-[#262627] shadow-sm dark:border-[#3f3f46] dark:bg-[#202024] dark:text-[#f2eff3]">
                            <span>No</span>
                            <span className="grid size-5 place-items-center rounded border border-[#d4d4d8] text-[10px] text-[#71717a] dark:border-[#52525b] dark:text-[#a1a1aa]">N</span>
                          </div>
                        </div>
                      ) : cur.kind === "rating" ? (
                        <div className="mt-6 flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <div key={s} className="grid size-11 place-items-center rounded-xl border border-[#e4e4e7] bg-white text-xl text-amber-400 shadow-sm transition hover:scale-105 dark:border-[#3f3f46] dark:bg-[#202024]">
                              ★
                            </div>
                          ))}
                        </div>
                      ) : cur.kind === "opinion_scale" || cur.kind === "nps" ? (
                        <div className="mt-6 flex flex-col gap-2 max-w-[560px]">
                          <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {(cur.kind === "opinion_scale" ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((num) => (
                              <div key={num} className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#e4e4e7] bg-white text-xs font-semibold text-[#262627] shadow-sm dark:border-[#3f3f46] dark:bg-[#202024] dark:text-[#f2eff3]">
                                {num}
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between text-[11px] text-[#737373] dark:text-[#a1a1aa]">
                            <span>Not likely at all</span>
                            <span>Extremely likely</span>
                          </div>
                        </div>
                      ) : cur.kind === "contact_info" ? (
                        <div className="mt-6 flex flex-col gap-3 max-w-[500px]">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-[#737373] dark:text-[#a1a1aa]">First name</label>
                              <input type="text" disabled className="mt-1 w-full border-b border-[#262627] bg-transparent py-1 text-sm placeholder:text-[#a1a1aa] dark:border-[#8c8294]" placeholder="Jane" />
                            </div>
                            <div>
                              <label className="text-xs text-[#737373] dark:text-[#a1a1aa]">Last name</label>
                              <input type="text" disabled className="mt-1 w-full border-b border-[#262627] bg-transparent py-1 text-sm placeholder:text-[#a1a1aa] dark:border-[#8c8294]" placeholder="Doe" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-[#737373] dark:text-[#a1a1aa]">Phone number</label>
                            <input type="text" disabled className="mt-1 w-full border-b border-[#262627] bg-transparent py-1 text-sm placeholder:text-[#a1a1aa] dark:border-[#8c8294]" placeholder="(201) 555-0123" />
                          </div>
                          <div>
                            <label className="text-xs text-[#737373] dark:text-[#a1a1aa]">Email</label>
                            <input type="text" disabled className="mt-1 w-full border-b border-[#262627] bg-transparent py-1 text-sm placeholder:text-[#a1a1aa] dark:border-[#8c8294]" placeholder="name@example.com" />
                          </div>
                        </div>
                      ) : cur.kind === "legal" ? (
                        <div className="mt-6 flex items-start gap-3 rounded-lg border border-[#e4e4e7] bg-white p-3.5 text-sm text-[#262627] shadow-sm dark:border-[#3f3f46] dark:bg-[#202024] dark:text-[#f2eff3] max-w-[500px]">
                          <input type="checkbox" disabled className="mt-0.5 size-4 rounded" />
                          <span>I accept the terms and conditions and privacy policy.</span>
                        </div>
                      ) : cur.kind === "matrix" ? (
                        <div className="mt-6 overflow-x-auto rounded-lg border border-[#e4e4e7] bg-white p-3 text-xs dark:border-[#3f3f46] dark:bg-[#202024] max-w-[500px]">
                          <div className="grid grid-cols-4 gap-2 font-medium text-[#737373] pb-2 border-b dark:border-[#3f3f46]">
                            <span></span><span>Poor</span><span>Good</span><span>Excellent</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 pt-2 items-center">
                            <span>Quality</span>
                            <span className="grid place-items-center"><input type="radio" disabled /></span>
                            <span className="grid place-items-center"><input type="radio" disabled /></span>
                            <span className="grid place-items-center"><input type="radio" disabled /></span>
                          </div>
                        </div>
                      ) : cur.kind === "date" ? (
                        <div className="mt-6 flex items-center gap-3 border-b border-[#262627] pb-2 dark:border-[#8c8294] max-w-[320px]">
                          <span className="text-base text-[#737373]">📅</span>
                          <span className="text-[clamp(16px,2vw,18px)] text-[#a1a1aa]">YYYY-MM-DD</span>
                        </div>
                      ) : (
                        <div className="mt-6 border-b border-[#262627] pb-2 dark:border-[#8c8294] max-w-[500px]">
                          <span className="text-[clamp(18px,2.5vw,22px)] text-[#a1a1aa]">
                            {cur.kind === "email" ? "name@example.com" : cur.kind === "number" ? "0" : cur.kind === "url" ? "https://" : "Type your answer here…"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <div
                  className={`w-full transition-all duration-300 ${
                    previewDevice === "mobile"
                      ? "max-w-[390px] h-[680px] max-h-[85vh] rounded-[24px] border-2 border-neutral-300/80 bg-white shadow-xl overflow-hidden dark:border-neutral-700 dark:bg-[#202024]"
                      : "w-full h-full"
                  }`}
                >
                  <Runner
                    key={`${sel}-${idx}-${inq.accent}-${inq.closing_heading}-${previewDevice}`}
                    inquiry={inq}
                    startAt={Math.max(curStep, 0)}
                    preview
                    isMobileView={previewDevice === "mobile"}
                    onSubmit={async () => {}}
                  />
                </div>
              </div>
            )}
          </section>

          <aside className="relative flex min-w-0 flex-col gap-2 overflow-auto border-l border-[var(--tf-border)] bg-[#f7f7f8] p-3.5 dark:border-[#34343a] dark:bg-[#252229] max-[900px]:hidden">
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
                          mutate((d) => {
                            d.accent = th.accent;
                            d.theme = th.name;
                          });
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
            ) : sel === "welcome" ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-[10px] border border-[#ececef] bg-white p-3 dark:border-[#39353e] dark:bg-[#252229]">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#34343b] dark:text-[#f2eff3]">
                    <span>Welcome screen</span>
                    <span className="text-xs text-[#8c8c94] cursor-pointer">ⓘ</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#737373] dark:text-[#a1a1aa]">
                    Greet respondents and explain what your form is about.
                  </p>
                </div>

                <div className="flex flex-col gap-3 rounded-[10px] border border-[#ececef] bg-white p-3.5 dark:border-[#39353e] dark:bg-[#252229]">
                  <div>
                    <label className="text-xs font-semibold text-[#34343b] dark:text-[#f2eff3]">Button text</label>
                    <input
                      type="text"
                      className="mt-1.5 w-full rounded-md border border-[#e4e4e7] bg-white px-2.5 py-1.5 text-xs text-[#262627] outline-none hover:border-[#8c8294] focus:border-[#7e22ce] dark:border-[#3f3f46] dark:bg-[#202024] dark:text-[#f2eff3]"
                      value={inq.settings?.welcome_screen?.buttonText ?? "Start"}
                      onChange={(e) => patchWelcome({ buttonText: e.target.value })}
                      placeholder="Start"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f2] dark:border-[#34343a]">
                    <div>
                      <span className="text-xs font-semibold text-[#34343b] dark:text-[#f2eff3]">Time to complete</span>
                      <p className="text-[11px] text-[#737373] dark:text-[#a1a1aa]">Show estimated completion time</p>
                    </div>
                    <ToggleSwitch
                      checked={inq.settings?.welcome_screen?.showTimeToComplete !== false}
                      onChange={(checked) => patchWelcome({ showTimeToComplete: checked })}
                      ariaLabel="Show time to complete"
                    />
                  </div>

                  {inq.settings?.welcome_screen?.showTimeToComplete !== false && (
                    <input
                      type="text"
                      className="w-full rounded-md border border-[#e4e4e7] bg-white px-2.5 py-1.5 text-xs text-[#262627] outline-none hover:border-[#8c8294] focus:border-[#7e22ce] dark:border-[#3f3f46] dark:bg-[#202024] dark:text-[#f2eff3]"
                      value={inq.settings?.welcome_screen?.timeToComplete ?? "Takes X minutes"}
                      onChange={(e) => patchWelcome({ timeToComplete: e.target.value })}
                      placeholder="Takes X minutes"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    className="flex items-center justify-between rounded-lg border border-[#ececef] bg-white px-3.5 py-2.5 text-xs font-medium text-[#34343b] hover:bg-[#faf9fb] dark:border-[#39353e] dark:bg-[#252229] dark:text-[#d5cfd8]"
                    onClick={() => toast("Image or video is coming soon")}
                  >
                    <span>Image or video</span>
                    <span className="text-sm font-normal text-[#737373]">＋</span>
                  </button>
                </div>
              </div>
            ) : sel === "ending" ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-[10px] border border-[#ececef] bg-white p-3 dark:border-[#39353e] dark:bg-[#252229]">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#34343b] dark:text-[#f2eff3]">
                    <span>Ending screen</span>
                    <span className="text-xs text-[#8c8c94] cursor-pointer">ⓘ</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#737373] dark:text-[#a1a1aa]">
                    Shown right after a respondent completes their submission.
                  </p>
                </div>

                <div className="flex flex-col gap-3 rounded-[10px] border border-[#ececef] bg-white p-3.5 dark:border-[#39353e] dark:bg-[#252229]">
                  <div>
                    <label className="text-xs font-semibold text-[#34343b] dark:text-[#f2eff3]">Heading</label>
                    <input
                      type="text"
                      className="mt-1.5 w-full rounded-md border border-[#e4e4e7] bg-white px-2.5 py-1.5 text-xs text-[#262627] outline-none hover:border-[#8c8294] focus:border-[#7e22ce] dark:border-[#3f3f46] dark:bg-[#202024] dark:text-[#f2eff3]"
                      value={inq.closing_heading}
                      onChange={(e) => patchEnding({ closing_heading: e.target.value })}
                      placeholder="Thanks for completing this form"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#34343b] dark:text-[#f2eff3]">Message</label>
                    <textarea
                      rows={3}
                      className="mt-1.5 w-full rounded-md border border-[#e4e4e7] bg-white px-2.5 py-1.5 text-xs text-[#262627] outline-none hover:border-[#8c8294] focus:border-[#7e22ce] dark:border-[#3f3f46] dark:bg-[#202024] dark:text-[#f2eff3] resize-none"
                      value={inq.closing_text}
                      onChange={(e) => patchEnding({ closing_text: e.target.value })}
                      placeholder="Your answers have been recorded."
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    className="flex items-center justify-between rounded-lg border border-[#ececef] bg-white px-3.5 py-2.5 text-xs font-medium text-[#34343b] hover:bg-[#faf9fb] dark:border-[#39353e] dark:bg-[#252229] dark:text-[#d5cfd8]"
                    onClick={() => toast("Social share buttons are coming soon")}
                  >
                    <span>Social share icons</span>
                    <span className="text-sm font-normal text-[#737373]">＋</span>
                  </button>
                  <button
                    className="flex items-center justify-between rounded-lg border border-[#ececef] bg-white px-3.5 py-2.5 text-xs font-medium text-[#34343b] hover:bg-[#faf9fb] dark:border-[#39353e] dark:bg-[#252229] dark:text-[#d5cfd8]"
                    onClick={() => toast("Redirect to URL is a Pro feature")}
                  >
                    <span>Redirect to URL</span>
                    <span className="text-xs text-[#087663]">💎</span>
                  </button>
                </div>
              </div>
            ) : cur ? (<>
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

            {/* Section: Options Management for choice-based questions */}
            {cur && ["choice", "dropdown", "checkbox", "ranking", "matrix"].includes(cur.kind) && (
              <div className="flex flex-col gap-2.5 rounded-[10px] border border-[#ececef] bg-white p-3 dark:border-[#39353e] dark:bg-[#252229]">
                <div className="flex items-center justify-between text-xs font-semibold text-[#34343b] dark:text-[#f2eff3]">
                  <span>Options</span>
                  <span className="text-[11px] text-[#737373] dark:text-[#a1a1aa]">{cur.choices?.length ?? 0}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {(cur.choices && cur.choices.length > 0 ? cur.choices : ["Option 1", "Option 2"]).map((c, k) => (
                    <div className="flex items-center gap-1.5" key={k}>
                      <span className="grid size-5 shrink-0 place-items-center rounded bg-[#f4f4f5] text-[10px] font-semibold text-[#71717a] dark:bg-[#302c34] dark:text-[#a1a1aa]">
                        {cur.kind === "ranking" ? k + 1 : String.fromCharCode(65 + k)}
                      </span>
                      <input
                        className="h-8 flex-1 rounded-md border border-[#e4e4e7] bg-white px-2 text-xs text-[#262627] outline-none hover:border-[#8c8294] focus:border-[#8c8294] dark:border-[#3f3f46] dark:bg-[#202024] dark:text-[#f2eff3]"
                        value={c}
                        placeholder={`Option ${k + 1}`}
                        onChange={(e) => {
                          const cs = [...(cur.choices || [])];
                          cs[k] = e.target.value;
                          patch({ choices: cs });
                        }}
                      />
                      <button
                        className="grid size-6 shrink-0 place-items-center rounded text-xs text-[#a1a1aa] hover:bg-[#f4f4f5] hover:text-[#b43e32] dark:hover:bg-[#302c34]"
                        disabled={(cur.choices?.length ?? 0) <= 1}
                        onClick={() => patch({ choices: cur.choices.filter((_, j) => j !== k) })}
                        title="Remove option"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    className="mt-1 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-[#d4d4d8] py-1.5 text-xs font-medium text-[#52525b] hover:border-[#8c8294] hover:text-[#18181b] dark:border-[#4b4550] dark:text-[#a1a1aa] dark:hover:text-white"
                    onClick={() => patch({ choices: [...(cur.choices || []), `Option ${(cur.choices?.length ?? 0) + 1}`] })}
                  >
                    <span>＋</span> <span>Add option</span>
                  </button>
                </div>
              </div>
            )}

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
                    onChange={(e) => {
                      setDefaultCountryCode(e.target.value);
                      patch({ properties: { ...(cur.properties || {}), default_country_code: e.target.value } });
                    }}
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
            </>) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-[#737373] dark:text-[#a1a1aa]">
                <div className="text-2xl mb-2">☰</div>
                <span>Select or add a question to configure its settings.</span>
              </div>
            )}
          </aside>
        </div>
      )}

      {tab === "settings" && (
        <div className="mx-auto my-6 w-full max-w-[760px] flex-1 rounded-xl border border-[#ececef] bg-white px-8 py-7 dark:border-[#38383e] dark:bg-[#242428] max-[600px]:m-3.5 max-[600px]:p-5">
          <h3 className="mb-3 text-[17px] font-semibold">Design</h3>
          <label className="mb-1.5 mt-3.5 block text-[13px] text-[#555] dark:text-[#a1a1aa]">Accent colour</label>
          <input type="color" value={inq.accent} onChange={(e) => mutate((d) => { d.accent = e.target.value; })} />
          <h3 className="mb-3 mt-7 text-[17px] font-semibold">Thank-you screen</h3>
          <label className="mb-1.5 mt-3.5 block text-[13px] text-[#555] dark:text-[#a1a1aa]">Heading</label>
          <input className="my-1 mb-2.5 w-full rounded-lg border border-[#ccc] px-2.5 py-[9px] text-[13px] focus:border-[#8a6e91] focus:outline focus:outline-2 focus:outline-[#f1e9f2] dark:border-[#44444b] dark:bg-[#1d1d21] dark:text-[#f4f4f5]" value={inq.closing_heading} onChange={(e) => mutate((d) => { d.closing_heading = e.target.value; })} />
          <label className="mb-1.5 mt-3.5 block text-[13px] text-[#555] dark:text-[#a1a1aa]">Message</label>
          <textarea className="my-1 mb-2.5 w-full rounded-lg border border-[#ccc] px-2.5 py-[9px] text-[13px] focus:border-[#8a6e91] focus:outline focus:outline-2 focus:outline-[#f1e9f2] dark:border-[#44444b] dark:bg-[#1d1d21] dark:text-[#f4f4f5]" rows={3} value={inq.closing_text} onChange={(e) => mutate((d) => { d.closing_text = e.target.value; })} />
          <Soon what="Custom fonts & backgrounds" />
        </div>
      )}

      {tab === "connect" && (
        <div className="mx-auto my-6 w-full max-w-[760px] flex-1 rounded-xl border border-[#ececef] bg-white px-8 py-7 dark:border-[#38383e] dark:bg-[#242428] max-[600px]:m-3.5 max-[600px]:p-5">
          <h3 className="mb-3 text-[17px] font-semibold">Share</h3>
          {inq.status === "published" ? <input className="my-1 mb-2.5 w-full rounded-lg border border-[#ccc] px-2.5 py-[9px] text-[13px] focus:border-[#8a6e91] focus:outline focus:outline-2 focus:outline-[#f1e9f2] dark:border-[#44444b] dark:bg-[#1d1d21] dark:text-[#f4f4f5]" readOnly value={link} onFocus={(e) => e.target.select()} /> : <p className="text-[#777] dark:text-[#a1a1aa]">Publish the form to get a public link.</p>}
          <Soon what="Integrations & webhooks" /><Soon what="Team collaboration" />
        </div>
      )}

      {tab === "share" && (
        <div className="flex-1 overflow-auto bg-[#fafafa] p-8 dark:bg-[#18181c] max-[640px]:p-4">
          {shareLoading ? (
            <div className="flex flex-1 items-center justify-center min-h-[450px]">
              <div className="size-8 rounded-full border-2 border-[#e4e4e7] border-t-[#262627] animate-spin dark:border-[#38353e] dark:border-t-white" />
            </div>
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col items-center animate-zoom-out-enter motion-reduce:animate-none">
              <h1 className="mb-8 text-2xl font-normal text-[#262627] dark:text-[#f2eff3] max-[640px]:text-xl">
                Choose how you’d like to share your form
              </h1>

            {/* Main Sharing Card */}
            <div className="w-full rounded-2xl border border-[#ececef] bg-white p-6 shadow-sm dark:border-[#34343a] dark:bg-[#252229]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f0f0f3] dark:border-[#34343a]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Published &amp; Live
                  </span>
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#737373] hover:text-[#262627] dark:text-[#a1a1aa] dark:hover:text-white"
                  >
                    <span>View live</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                </div>
                <button
                  onClick={handleUnpublish}
                  className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 hover:text-red-600 dark:border-neutral-700 dark:bg-[#202024] dark:text-neutral-300 dark:hover:text-red-400 transition-colors"
                >
                  Unpublish form
                </button>
              </div>

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
          )}

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
          className="fixed inset-0 z-[80] flex flex-col bg-[#f7f7f8] dark:bg-[#141416] animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Form preview"
        >
          {/* Centered Floating Pill Toolbar (matching video) */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-1.5 rounded-2xl border border-neutral-200/90 bg-white/95 px-2.5 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur dark:border-neutral-700 dark:bg-[#201d24]/95">
            {/* 1. Close Button */}
            <div className="relative group">
              <button
                className="flex size-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition dark:text-neutral-400 dark:hover:bg-[#2e2b34] dark:hover:text-white"
                aria-label="Close"
                onClick={() => setPreviewOpen(false)}
              >
                <CloseIcon className="size-3.5" />
              </button>
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden rounded-md bg-[#18181b] px-2 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block whitespace-nowrap z-50">
                Close
              </div>
            </div>

            {/* 2. Device View Toggle */}
            <div className="relative group">
              <button
                className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 shadow-xs hover:bg-neutral-100 transition dark:border-neutral-700 dark:bg-[#2a2730] dark:text-neutral-200 dark:hover:bg-[#322e3a]"
                aria-label={previewDevice === "desktop" ? "Mobile view" : "Desktop view"}
                onClick={() => setPreviewDevice((d) => (d === "desktop" ? "mobile" : "desktop"))}
              >
                {previewDevice === "desktop" ? (
                  <MobileIcon className="size-4" />
                ) : (
                  <DesktopIcon className="size-4" />
                )}
              </button>
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden rounded-md bg-[#18181b] px-2 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block whitespace-nowrap z-50">
                {previewDevice === "desktop" ? "Mobile view" : "Desktop view"}
              </div>
            </div>

            {/* 3. Restart Button */}
            <div className="relative group">
              <button
                className="flex size-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition dark:text-neutral-400 dark:hover:bg-[#2e2b34] dark:hover:text-white"
                aria-label="Restart"
                onClick={restartPreview}
              >
                <ReloadIcon className="size-3.5" />
              </button>
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden rounded-md bg-[#18181b] px-2 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block whitespace-nowrap z-50">
                Restart
              </div>
            </div>
          </div>

          {/* Form Frame Area */}
          <div className="relative flex flex-1 items-center justify-center p-6 pt-16 overflow-hidden">
            <div
              className={`relative flex flex-col overflow-hidden bg-white shadow-[0_20px_50px_rgba(0,0,0,0.12)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:bg-[#1e1c22] ${
                previewDevice === "mobile"
                  ? "h-[720px] max-h-[85vh] w-[375px] max-w-[90vw] rounded-[38px] border-[6px] border-neutral-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] dark:border-neutral-600"
                  : "h-[calc(100vh-84px)] max-h-[840px] w-[94vw] max-w-[1140px] rounded-2xl border border-neutral-200/90 dark:border-neutral-700/80"
              }`}
            >
              {previewDevice === "mobile" && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 h-3.5 w-24 rounded-full bg-neutral-900/90 dark:bg-neutral-800 z-30 pointer-events-none" />
              )}

              {previewLoading ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="size-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800 dark:border-neutral-700 dark:border-t-white" />
                </div>
              ) : (
                <div className="h-full w-full flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
                  <Runner
                    key={`full-preview-${previewSession}`}
                    inquiry={inq}
                    preview
                    isMobileView={previewDevice === "mobile"}
                    onSubmit={async () => {
                      await new Promise((r) => setTimeout(r, 350));
                      setPreviewTestToast(true);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Test successful toast notification */}
          {previewTestToast && (
            <div className="fixed bottom-6 right-6 z-[100] flex max-w-md items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-bottom-3 duration-200 dark:border-neutral-700 dark:bg-[#202024]">
              <div className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </div>
              <div className="text-xs text-[#262627] dark:text-neutral-200">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Test successful!</span> View your published form to submit a real response.
              </div>
              <button
                onClick={() => setPreviewTestToast(false)}
                className="ml-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-xs"
                aria-label="Dismiss toast"
              >
                ✕
              </button>
            </div>
          )}
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
              onClick={() => {
                setFormSettingsOpen(false);
                mutate((d) => {
                  d.settings = {
                    typeformBranding,
                    navArrows,
                    progressBar,
                    closeDateEnabled,
                    formLanguage,
                  };
                });
                toast("Settings saved");
              }}
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

      {/* Typeform Publish Celebration (Halo checkmark -> paper airplane) */}
      <PublishCelebration active={publishEffectActive} onComplete={handlePublishEffectComplete} />
    </div>
  );
}