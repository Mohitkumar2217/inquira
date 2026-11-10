"use client";
import { DragEvent, Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import Dropdown from "@/components/Dropdown";
import AccountMenu from "@/components/AccountMenu";
import { ThemeToggleButton } from "@/components/ThemeProvider";
import { useToast } from "@/components/Toasts";
import { call, errorMessage, send } from "@/lib/api";
import { Inquiry, Workspace } from "@/lib/types";
import { USER } from "@/lib/user";

const TABS = ["Forms", "Contacts", "Automations", "Insights", "Pages", "Research Flow"];
const TAB_ICONS: Record<string, string> = {
  Forms: "▣", Contacts: "♧", Automations: "♧", Insights: "⌁", Pages: "▧", "Research Flow": "⊕",
};
const BANNERS = [
  "Capture incoming requests, urgency, requirements, and preferred deadlines to prioritize work efficiently.",
  "Gather goals, stakeholders, timelines, resources before a project begins.",
];
const RESPONSE_LIMIT = 10;
const fmt = (s?: string) => (s ? new Date(s + "Z").toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "-");

export default function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<Inquiry[] | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("inquira.active_workspace_id");
      if (saved && !isNaN(Number(saved))) return Number(saved);
    }
    return null;
  });
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"created" | "updated" | "name">("created");
  const [view, setView] = useState<"list" | "grid">("grid");
  const [menu, setMenu] = useState<number | null>(null);
  const [submenu, setSubmenu] = useState<{ id: number; action: "copy" | "move" } | null>(null);
  const [org, setOrg] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspaceToRename, setWorkspaceToRename] = useState<Workspace | null>(null);
  const [workspaceToRemove, setWorkspaceToRemove] = useState<{ workspace: Workspace; action: "leave" | "delete" } | null>(null);
  const [privateExpanded, setPrivateExpanded] = useState(true);
  const [workspaceName, setWorkspaceName] = useState("");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragTargetId, setDragTargetId] = useState<number | null>(null);
  const [banners, setBanners] = useState([true, true]);
  const [renaming, setRenaming] = useState<Inquiry | null>(null);
  const [deleting, setDeleting] = useState<Inquiry | null>(null);
  const [name, setName] = useState("");
  const [isZoomingOut, setIsZoomingOut] = useState(false);
  const [activeWsItemMenu, setActiveWsItemMenu] = useState<number | null>(null);

  const selectWorkspace = (wsId: number) => {
    setSelectedWorkspaceId(wsId);
    try {
      localStorage.setItem("inquira.active_workspace_id", String(wsId));
      sessionStorage.setItem("inquira.workspace", String(wsId));
    } catch {}
    // Persist active workspace choice to the backend database
    call("/api/workspaces/active", send("PUT", { workspace_id: wsId })).catch(() => {});
  };

  const moveWorkspace = async (wsId: number, direction: "up" | "down") => {
    setActiveWsItemMenu(null);
    try {
      await call(`/api/workspaces/${wsId}/move-${direction}`, send("POST"));
      await loadWorkspaces();
      toast(`Workspace moved ${direction}`);
    } catch (err: unknown) {
      toast(errorMessage(err));
    }
  };

  const load = async () => {
    try { setRows(await call<Inquiry[]>("/api/inquiries")); }
    catch (error: unknown) { toast(errorMessage(error)); }
  };
  const loadWorkspaces = async () => {
    try {
      const [data, activeInfo] = await Promise.all([
        call<Workspace[]>("/api/workspaces"),
        call<{ active_workspace_id: number | null }>("/api/workspaces/active").catch(() => null),
      ]);
      setWorkspaces(data);

      setSelectedWorkspaceId((current) => {
        // 1. Current selection if it exists in data
        if (current !== null && data.some((w) => w.id === current)) {
          return current;
        }
        // 2. Active workspace from backend database
        if (activeInfo?.active_workspace_id && data.some((w) => w.id === activeInfo.active_workspace_id)) {
          try {
            localStorage.setItem("inquira.active_workspace_id", String(activeInfo.active_workspace_id));
            sessionStorage.setItem("inquira.workspace", String(activeInfo.active_workspace_id));
          } catch {}
          return activeInfo.active_workspace_id;
        }
        // 3. LocalStorage saved ID if valid
        if (typeof window !== "undefined") {
          const localSaved = Number(localStorage.getItem("inquira.active_workspace_id"));
          if (localSaved && data.some((w) => w.id === localSaved)) {
            return localSaved;
          }
        }
        // 4. Default to private workspace or first workspace
        const fallback = data.find((w) => w.is_private)?.id ?? data[0]?.id ?? null;
        if (fallback !== null) {
          try {
            localStorage.setItem("inquira.active_workspace_id", String(fallback));
            sessionStorage.setItem("inquira.workspace", String(fallback));
          } catch {}
        }
        return fallback;
      });
    } catch (error: unknown) { toast(errorMessage(error)); }
  };
  useEffect(() => {
    void load();
    void loadWorkspaces();
    try {
      const savedView = localStorage.getItem("inquira.dashboard.view");
      if (savedView === "list" || savedView === "grid") {
        setView(savedView);
      }
      const savedSort = localStorage.getItem("inquira.dashboard.sort");
      if (savedSort === "created" || savedSort === "updated" || savedSort === "name") {
        setSort(savedSort);
      }
    } catch {}
  }, []);

  const changeView = (nextView: "list" | "grid") => {
    setView(nextView);
    try {
      localStorage.setItem("inquira.dashboard.view", nextView);
    } catch {}
  };

  const changeSort = (nextSort: "created" | "updated" | "name") => {
    setSort(nextSort);
    try {
      localStorage.setItem("inquira.dashboard.sort", nextSort);
    } catch {}
  };

  const shown = useMemo(() => {
    const privateWsId = workspaces.find((w) => w.is_private)?.id ?? workspaces[0]?.id;
    const list = (rows || []).filter((r) => {
      const formWsId = r.workspace_id ?? privateWsId;
      return formWsId === selectedWorkspaceId && r.title.toLowerCase().includes(q.toLowerCase());
    });
    return list.sort((a, b) =>
      sort === "name" ? a.title.localeCompare(b.title)
        : (sort === "created" ? b.created_at! : b.updated_at!).localeCompare(sort === "created" ? a.created_at! : a.updated_at!));
  }, [rows, q, sort, selectedWorkspaceId, workspaces]);
  const total = (rows || []).reduce((n, r) => n + (r.reply_count || 0), 0);

  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);
  const searchResults = useMemo(() => (rows || []).filter((row) =>
    searchTerm.trim() && row.title.toLowerCase().includes(searchTerm.trim().toLowerCase())),
    [rows, searchTerm]);
  const create = () => {
    if (selectedWorkspaceId !== null) sessionStorage.setItem("inquira.workspace", String(selectedWorkspaceId));
    setIsZoomingOut(true);
    setTimeout(() => {
      router.push("/new");
    }, 180);
  };
  const openForm = (formOrId: Inquiry | number, wsId?: number | null) => {
    const targetWsId = typeof formOrId === "object" ? formOrId.workspace_id : wsId;
    const formId = typeof formOrId === "object" ? formOrId.id : formOrId;
    if (targetWsId) {
      selectWorkspace(targetWsId);
    }
    setIsZoomingOut(true);
    setTimeout(() => {
      router.push(`/builder/${formId}`);
    }, 180);
  };
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setMenu(null);
    setSubmenu(null);
    try { await fn(); toast(msg); void load(); void loadWorkspaces(); } catch (error: unknown) { toast(errorMessage(error)); }
  };
  const soon = (w: string) => toast(`${w} is coming soon`);
  const copyLink = (s: string) => { setMenu(null); navigator.clipboard?.writeText(`${location.origin}/f/${s}`); toast("Link copied to clipboard"); };
  const addWorkspace = async () => {
    try {
      const workspace = await call<Workspace>("/api/workspaces", send("POST", { name: workspaceName }));
      setWorkspaceName("");
      setWorkspaceOpen(false);
      await loadWorkspaces();
      selectWorkspace(workspace.id);
      toast("Workspace created");
    } catch (error: unknown) { toast(errorMessage(error)); }
  };
  const renameWorkspace = async () => {
    if (!workspaceToRename) return;
    try {
      const updated = await call<Workspace>(`/api/workspaces/${workspaceToRename.id}`, send("PATCH", { name: workspaceName }));
      setWorkspaceToRename(null);
      setWorkspaceName("");
      setWorkspaces((current) => current.map((workspace) => workspace.id === updated.id ? { ...workspace, name: updated.name } : workspace));
      toast("Workspace renamed");
    } catch (error: unknown) { toast(errorMessage(error)); }
  };
  const removeWorkspace = async () => {
    if (!workspaceToRemove) return;
    const { workspace, action } = workspaceToRemove;
    try {
      await call(`/api/workspaces/${workspace.id}${action === "leave" ? "/leave" : ""}`,
        action === "leave" ? send("POST") : send("DELETE"));
      setWorkspaceToRemove(null);
      const privateWs = workspaces.find((item) => item.is_private)?.id ?? null;
      if (privateWs) selectWorkspace(privateWs);
      await load();
      await loadWorkspaces();
      toast(action === "leave" ? "You left the workspace; its forms were moved to My workspace" : "Workspace deleted; its forms were moved to My workspace");
    } catch (error: unknown) { toast(errorMessage(error)); }
  };
  const moveForm = async (formId: number, workspaceId: number) => {
    setDraggingId(null);
    setDragTargetId(null);
    try {
      await call(`/api/inquiries/${formId}/workspace`, send("PATCH", { workspace_id: workspaceId }));
      await load();
      await loadWorkspaces();
      toast("Form moved to workspace");
    } catch (error: unknown) { toast(errorMessage(error)); }
  };
  const startFormDrag = (event: DragEvent<HTMLDivElement>, form: Inquiry) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(form.id));
    setDraggingId(form.id);
  };
  const acceptFormDrop = (event: DragEvent<HTMLButtonElement>, workspace: Workspace) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragTargetId(workspace.id);
  };
  const dropForm = (event: DragEvent<HTMLButtonElement>, workspace: Workspace) => {
    event.preventDefault();
    const formId = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isInteger(formId) && formId > 0) void moveForm(formId, workspace.id);
    else { setDraggingId(null); setDragTargetId(null); }
  };

  const Menu = ({ f }: { f: Inquiry }) => (
    <div className="tf-menu-wrap relative z-20" onClick={(e) => e.stopPropagation()}>
      <button className="tf-dots rounded-md border-0 bg-transparent px-2 py-1 text-xl tracking-[1px] text-[var(--tf-muted)] hover:bg-[#eee] dark:hover:bg-[#303035]" aria-label={`Actions for ${f.title}`} onClick={() => { setMenu(menu === f.id ? null : f.id); setSubmenu(null); }}>···</button>
      {menu === f.id && (<>
        <div className="fixed inset-0 z-20 bg-transparent" onClick={() => setMenu(null)} />
        <div className="absolute right-0 top-[34px] z-[21] flex min-w-[220px] flex-col overflow-visible rounded-lg border border-[var(--tf-border)] bg-white p-1.5 text-[var(--tf-text)] shadow-[0_8px_24px_rgba(0,0,0,.12)] dark:border-[#39353e] dark:bg-[#26232a]">
          {f.status === "published" ? (
            <>
              <button className="rounded-md border-0 bg-transparent px-3 py-2.5 text-left text-sm hover:bg-[#f3f3f3] dark:text-[#e4e4e7] dark:hover:bg-[#37313b]" onClick={() => copyLink(f.slug)}>Copy link</button>
              <button className="rounded-md border-0 bg-transparent px-3 py-2.5 text-left text-sm text-[#b43e32] hover:bg-[#f3f3f3] dark:text-[#f87171] dark:hover:bg-[#37313b]" onClick={() => act(() => call(`/api/inquiries/${f.id}/unpublish`, send("POST")), "Form unpublished (saved as draft)")}>Unpublish</button>
            </>
          ) : (
            <button className="rounded-md border-0 bg-transparent px-3 py-2.5 text-left text-sm text-[var(--tf-purple)] font-medium hover:bg-[#f3f3f3] dark:text-[#d8b4e2] dark:hover:bg-[#37313b]" onClick={() => act(() => call(`/api/inquiries/${f.id}/publish`, send("POST")), "Form published")}>Publish</button>
          )}
          <Link className="rounded-md px-3 py-2.5 text-sm hover:bg-[#f3f3f3] dark:text-[#e4e4e7] dark:hover:bg-[#37313b]" href={`/builder/${f.id}`}>Content</Link>
          <button className="rounded-md border-0 bg-transparent px-3 py-2.5 text-left text-sm hover:bg-[#f3f3f3] dark:text-[#e4e4e7] dark:hover:bg-[#37313b]" onClick={() => { setMenu(null); soon("Workflow"); }}>Workflow</button>
          <button className="rounded-md border-0 bg-transparent px-3 py-2.5 text-left text-sm hover:bg-[#f3f3f3] dark:text-[#e4e4e7] dark:hover:bg-[#37313b]" onClick={() => { setMenu(null); soon("Connect"); }}>Connect</button>
          <Link className="rounded-md px-3 py-2.5 text-sm hover:bg-[#f3f3f3] dark:text-[#e4e4e7] dark:hover:bg-[#37313b]" href={`/builder/${f.id}?tab=share`}>Share</Link>
          <Link className="rounded-md px-3 py-2.5 text-sm hover:bg-[#f3f3f3] dark:text-[#e4e4e7] dark:hover:bg-[#37313b]" href={`/results/${f.id}`}>Results</Link>
          <hr className="my-1.5 w-full border-0 border-t border-[var(--tf-border)]" />
          <button className="rounded-md border-0 bg-transparent px-3 py-2.5 text-left text-sm hover:bg-[#f3f3f3] dark:text-[#e4e4e7] dark:hover:bg-[#37313b]" onClick={() => { setMenu(null); setRenaming(f); setName(f.title); }}>Rename</button>
          <button className="rounded-md border-0 bg-transparent px-3 py-2.5 text-left text-sm hover:bg-[#f3f3f3] dark:text-[#e4e4e7] dark:hover:bg-[#37313b]" onClick={() => act(() => call(`/api/inquiries/${f.id}/duplicate`, send("POST")), "Form duplicated")}>Duplicate</button>
          <div className="tf-submenu-wrap relative">
            <button className="flex w-full items-center justify-between rounded-md border-0 bg-transparent px-3 py-2.5 text-left text-sm hover:bg-[#f3f3f3] dark:text-[#e4e4e7] dark:hover:bg-[#37313b]" onClick={() => setSubmenu(submenu?.id === f.id && submenu.action === "copy" ? null : { id: f.id, action: "copy" })}>Copy to <span>›</span></button>
            {submenu?.id === f.id && submenu.action === "copy" && <div className="tf-submenu absolute left-full top-0 z-[22] flex min-w-[180px] flex-col rounded-lg border border-[var(--tf-border)] bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,.12)] dark:border-[#39353e] dark:bg-[#26232a] max-[620px]:left-auto max-[620px]:right-full">
              {workspaces.filter((w) => w.id !== f.workspace_id).map((w) => <button className="rounded-md border-0 bg-transparent px-3 py-2.5 text-left text-sm text-[var(--tf-text)] hover:bg-[#f3f3f3] dark:text-[#e4e4e7] dark:hover:bg-[#37313b]" key={w.id} onClick={() => act(
                () => call(`/api/inquiries/${f.id}/copy-to/${w.id}`, send("POST")), `Copied to ${w.name}`)}>{w.name}</button>)}
              {workspaces.length < 2 && <span className="px-3 py-2 text-xs text-[var(--tf-muted)]">Create another workspace first</span>}
            </div>}
          </div>
          <div className="tf-submenu-wrap relative">
            <button className="flex w-full items-center justify-between rounded-md border-0 bg-transparent px-3 py-2.5 text-left text-sm hover:bg-[#f3f3f3] dark:text-[#e4e4e7] dark:hover:bg-[#37313b]" onClick={() => setSubmenu(submenu?.id === f.id && submenu.action === "move" ? null : { id: f.id, action: "move" })}>Move to <span>›</span></button>
            {submenu?.id === f.id && submenu.action === "move" && <div className="tf-submenu absolute left-full top-0 z-[22] flex min-w-[180px] flex-col rounded-lg border border-[var(--tf-border)] bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,.12)] dark:border-[#39353e] dark:bg-[#26232a] max-[620px]:left-auto max-[620px]:right-full">
              {workspaces.filter((w) => w.id !== f.workspace_id).map((w) => <button className="rounded-md border-0 bg-transparent px-3 py-2.5 text-left text-sm text-[var(--tf-text)] hover:bg-[#f3f3f3] dark:text-[#e4e4e7] dark:hover:bg-[#37313b]" key={w.id} onClick={() => act(
                () => call(`/api/inquiries/${f.id}/workspace`, send("PATCH", { workspace_id: w.id })), `Moved to ${w.name}`)}>{w.name}</button>)}
              {workspaces.length < 2 && <span className="px-3 py-2 text-xs text-[var(--tf-muted)]">Create another workspace first</span>}
            </div>}
          </div>
          <hr className="my-1.5 w-full border-0 border-t border-[var(--tf-border)]" />
          <button className="rounded-md border-0 bg-transparent px-3 py-2.5 text-left text-sm text-[#b43e32] hover:bg-[#f3f3f3] dark:hover:bg-[#37313b]" onClick={() => { setMenu(null); setDeleting(f); }}>Delete</button>
        </div>
      </>)}
    </div>
  );
  const Thumb = ({ f }: { f: Inquiry }) => <div className="h-10 w-10 shrink-0 rounded-lg" style={{ background: f.accent }} />;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--tf-panel-bg)] px-[18px] pb-[18px] text-[var(--tf-text)] max-[700px]:px-[10px] max-[700px]:pb-[10px]">
      <header className="flex h-[60px] items-center justify-between border-b border-[var(--tf-border)] bg-white px-5 dark:border-[#39353e] dark:bg-[#26232a] max-[700px]:h-auto max-[700px]:min-h-[60px] max-[700px]:gap-2">
        <div className="flex items-center gap-2">
          <div className="mr-0.5 h-10 w-[14px] rounded-[7px] bg-[var(--tf-purple)]" /><div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--tf-purple)] text-lg text-white">{USER.workspace[0]}</div>
          <div className="tf-org-wrap relative">
            <button className="tf-ws-name inline-flex items-center whitespace-nowrap rounded-md border-0 bg-transparent px-1.5 py-1.5 text-base text-[var(--tf-text)] hover:bg-[#efedef] dark:hover:bg-[#303035]" onClick={() => setOrg(!org)}>
              <span className="max-w-[150px] truncate sm:max-w-none">{USER.workspace}</span>
              <svg className={"tf-chevron inline-block shrink-0" + (org ? " up" : "")} viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="m4 6 4 4 4-4" />
              </svg>
            </button>
            {org && (<>
              <div className="fixed inset-0 z-20 bg-transparent" onClick={() => setOrg(false)} />
              <div className="tf-org absolute left-0 top-[42px] z-[22] w-[280px] rounded-[18px] border border-[var(--tf-border)] bg-white p-4 text-[var(--tf-text)] shadow-[0_8px_30px_rgba(39,31,42,.14)] dark:border-[#39353e] dark:bg-[#26232a]">
                <h5 className="mb-2 mt-1 px-2 text-sm font-semibold">Organization</h5>
                {["Admin settings", "Org members", "Plan & billing", "Developer apps"].map((x) => (
                  <button className="block w-full rounded-md border-0 bg-transparent px-2 py-2 text-left text-sm text-[var(--tf-text-2)] hover:bg-[#f5f3f5] dark:text-[#d5cfd8] dark:hover:bg-[#37313b]" key={x} onClick={() => { setOrg(false); soon(x); }}>{x}</button>))}
                <hr className="my-2 w-full border-0 border-t border-[var(--tf-border)]" />
                <h5 className="mb-2 mt-1 px-2 text-sm font-semibold">All organizations</h5>
                <div className="flex items-center gap-2.5 rounded-lg p-2"><div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--tf-purple)] text-lg text-white">{USER.workspace[0]}</div>
                  <div><div className="text-sm">{USER.workspace} <span className="ml-1 rounded-full bg-[#f0edf1] px-2 py-0.5 text-xs text-[var(--tf-text-2)] dark:bg-[#39313d] dark:text-[#d5cfd8]">Owner</span></div><div className="text-xs text-[var(--tf-muted)]">Free Plan - 1 member</div></div></div>
              </div>
            </>)}
          </div>
        </div>
        <div className="flex items-center gap-2 max-[700px]:gap-1">
          <button className="rounded-md border-0 bg-transparent px-2.5 py-1.5 text-base text-[var(--tf-text)] hover:bg-[#efedef] dark:hover:bg-[#343039] max-[700px]:hidden" onClick={() => soon("Integrations")}>Integrations</button>
          <button className="rounded-md border-0 bg-transparent px-2.5 py-1.5 text-base text-[var(--tf-text)] hover:bg-[#efedef] dark:hover:bg-[#343039] max-[700px]:hidden" onClick={() => soon("Brand kit")}>Brand kit</button>
          <button className="rounded-md border-0 bg-[var(--tf-green)] px-4 py-2.5 text-base font-semibold text-white hover:bg-[#0d6758] max-[700px]:hidden" onClick={() => soon("Plans")}>View plans</button>
          <div className="tf-help-wrap relative">
            <button className="tf-round grid h-8 w-8 place-items-center rounded-full border border-[var(--tf-border-mid)] bg-white text-sm text-[var(--tf-text)] dark:bg-[#26232a]" aria-label="Help menu" onClick={() => setHelpOpen(!helpOpen)}>?</button>
            {helpOpen && (<>
              <div className="fixed inset-0 z-20 bg-transparent" onClick={() => setHelpOpen(false)} />
              <div className="tf-help-menu absolute right-0 top-[34px] z-[22] min-w-[166px] rounded-xl border border-[var(--tf-border)] bg-white p-1.5 shadow-[0_6px_20px_rgba(39,31,42,.14)] dark:border-[#39353e] dark:bg-[#26232a]">
                {["Help center", "Community", "Give Feedback", "Support"].map((item) =>
                  <button className="block w-full rounded-md border-0 bg-transparent px-2.5 py-2.5 text-left text-sm text-[var(--tf-text-2)] hover:bg-[#f5f3f5] dark:text-[#d5cfd8] dark:hover:bg-[#37313b]" key={item} onClick={() => { setHelpOpen(false); soon(item); }}>{item}</button>)}
              </div>
            </>)}
          </div>
          <ThemeToggleButton />
          <AccountMenu />
        </div>
      </header>

      <div className={`flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--tf-border)] bg-white dark:border-[#39353e] dark:bg-[#1d1b20] ${isZoomingOut ? "zoom-out-exit" : "zoom-out-enter"}`}>
        <nav className="flex gap-1.5 border-b border-[var(--tf-border)] bg-white px-4 pt-4 max-[700px]:overflow-x-auto dark:border-[#39353e] dark:bg-[#1d1b20]">
          {TABS.map((t) => (
            <Fragment key={t}>{t === "Research Flow" && <span className="mx-2.5 mb-1.5 h-6 w-px self-center bg-[var(--tf-border)]" aria-hidden="true" />}<button className={`whitespace-nowrap rounded-t-md border-0 border-b-[3px] px-3.5 pb-3.5 pt-2.5 text-base ${t === "Forms" ? "border-[var(--tf-purple)] bg-[#ececec] font-semibold text-[#111] dark:border-[#b7a3bf] dark:bg-[#303035] dark:text-white" : "border-transparent bg-transparent text-[#444] hover:bg-[#ececec] dark:text-[#c4c4ca] dark:hover:bg-[#303035]"}`} onClick={() => t !== "Forms" && soon(t)}>
              <span className="mr-2 inline-block text-[15px] text-[var(--tf-text-2)]" aria-hidden="true">{TAB_ICONS[t]}</span>{t}
              {t === "Insights" && <span className="ml-2.5 inline-grid h-5 w-5 place-items-center rounded-full border border-[#b7ddd5] text-sm text-[var(--tf-green)]" aria-label="Insights">◇</span>}
              {t === "Pages" && <span className="ml-2 rounded-[10px] border border-[#9cc3ef] bg-[#eaf3fd] px-2 py-px text-xs text-[#1d5fa8] dark:border-[#3c5874] dark:bg-[#253449] dark:text-[#b8d7ff]">Beta</span>}</button></Fragment>))}
        </nav>

        <div className="grid min-h-0 flex-1 grid-cols-1 min-[901px]:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-1.5 border-r border-[var(--tf-border)] bg-[#f7f6f7] p-4 dark:border-[#39353e] dark:bg-[#1d1b20]">
            <button className="mb-1.5 rounded-[7px] border-0 bg-[var(--tf-purple)] p-3.5 text-[17px] font-semibold text-white hover:bg-[var(--tf-purple-dark)] active:scale-95 transition-transform duration-150" onClick={create}>+ Create form</button>
            <button className="mt-3.5 flex w-full cursor-pointer items-center gap-2.5 rounded-md border-y border-[var(--tf-border)] bg-transparent px-3 py-3.5 text-left text-base text-[var(--tf-muted)]" onClick={() => { setSearchTerm(""); setSearchOpen(true); }}>
              <span>⌕</span><span className="flex-1">Search</span>
            </button>
            <div className="flex items-center justify-between px-3 pb-2 pt-[18px] text-[17px] text-[var(--tf-muted)]"><span>▦ Workspaces</span>
              <button className="h-10 w-10 rounded-md border border-[var(--tf-border-mid)] bg-white text-xl text-[var(--tf-text)] dark:border-[#48434d] dark:bg-[#222225] dark:text-[#f2eff3]" aria-label="Create workspace" onClick={() => setWorkspaceOpen(true)}>+</button></div>
            <button className="flex w-full cursor-pointer justify-between border-0 bg-transparent px-3.5 py-3.5 text-left text-base font-semibold text-[var(--tf-text)]" onClick={() => setPrivateExpanded(!privateExpanded)}>Private <span className="text-[11px] text-[var(--tf-muted)]">{privateExpanded ? "▲" : "▼"}</span></button>
            {privateExpanded && workspaces.length === 0 && (
              <div className="space-y-1 px-1 py-1">
                {[1, 2].map((k) => (
                  <div key={k} className="flex h-10 items-center justify-between rounded-md px-3">
                    <div className="h-4 w-24 rounded tf-shimmer" />
                    <div className="h-4 w-4 rounded tf-shimmer" />
                  </div>
                ))}
              </div>
            )}
            {privateExpanded && workspaces.map((w) => {
              const nonPrivateWorkspaces = workspaces.filter((item) => !item.is_private);
              const nonPrivateIndex = nonPrivateWorkspaces.findIndex((item) => item.id === w.id);
              return (
                <div key={w.id} className="relative group/ws flex items-center">
                  <button className={`flex flex-1 items-center justify-between rounded-md border-0 px-3 py-3 text-left text-base text-[var(--tf-text)] ${w.id === selectedWorkspaceId ? "bg-[#eeecef] dark:bg-[#39343d]" : "bg-transparent hover:bg-[#eeecef] dark:hover:bg-[#303035]"} ${w.id === dragTargetId ? "outline outline-2 outline-offset-1 outline-[#9a7ba4] bg-[#f0eaf2] dark:bg-[#39313d]" : ""}`}
                    onClick={() => selectWorkspace(w.id)}
                    onDragOver={(event) => acceptFormDrop(event, w)}
                    onDragLeave={() => setDragTargetId((current) => current === w.id ? null : current)}
                    onDrop={(event) => dropForm(event, w)}
                    aria-label={`${w.name}, ${w.form_count} forms. Drop a form here to move it.`}>
                    <span className="truncate pr-2">{w.name}</span>
                    <span className="rounded px-1 text-sm text-[var(--tf-muted)]">{w.form_count}</span>
                  </button>
                  <div className="relative">
                    <button
                      className="grid h-8 w-6 place-items-center rounded text-sm text-[var(--tf-muted)] opacity-0 group-hover/ws:opacity-100 hover:bg-[#e4e1e5] dark:hover:bg-[#3a3540] transition-opacity"
                      aria-label={`Options for ${w.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveWsItemMenu(activeWsItemMenu === w.id ? null : w.id);
                      }}
                    >
                      ···
                    </button>
                    {activeWsItemMenu === w.id && (
                      <>
                        <div className="fixed inset-0 z-30 bg-transparent" onClick={() => setActiveWsItemMenu(null)} />
                        <div className="absolute left-full top-0 ml-1 z-40 min-w-[150px] rounded-xl border border-[var(--tf-border)] bg-white p-1.5 shadow-[0_6px_20px_rgba(39,31,42,.14)] dark:border-[#39353e] dark:bg-[#26232a]">
                          {!w.is_private && (
                            <>
                              <button
                                className="block w-full rounded-md border-0 bg-transparent px-2.5 py-2 text-left text-xs text-[var(--tf-text-2)] hover:bg-[#f5f3f5] disabled:opacity-40 disabled:hover:bg-transparent dark:text-[#d5cfd8] dark:hover:bg-[#37313b]"
                                disabled={nonPrivateIndex <= 0}
                                onClick={() => void moveWorkspace(w.id, "up")}
                              >
                                ↑ Move up
                              </button>
                              <button
                                className="block w-full rounded-md border-0 bg-transparent px-2.5 py-2 text-left text-xs text-[var(--tf-text-2)] hover:bg-[#f5f3f5] disabled:opacity-40 disabled:hover:bg-transparent dark:text-[#d5cfd8] dark:hover:bg-[#37313b]"
                                disabled={nonPrivateIndex === -1 || nonPrivateIndex >= nonPrivateWorkspaces.length - 1}
                                onClick={() => void moveWorkspace(w.id, "down")}
                              >
                                ↓ Move down
                              </button>
                              <hr className="my-1 border-0 border-t border-[var(--tf-border)] dark:border-[#39353e]" />
                            </>
                          )}
                          <button
                            className="block w-full rounded-md border-0 bg-transparent px-2.5 py-2 text-left text-xs text-[var(--tf-text-2)] hover:bg-[#f5f3f5] dark:text-[#d5cfd8] dark:hover:bg-[#37313b]"
                            onClick={() => {
                              setActiveWsItemMenu(null);
                              setWorkspaceToRename(w);
                              setWorkspaceName(w.name);
                            }}
                          >
                            Rename
                          </button>
                          {!w.is_private && (
                            <button
                              className="block w-full rounded-md border-0 bg-transparent px-2.5 py-2 text-left text-xs text-[#b43e32] hover:bg-[#f5f3f5] dark:hover:bg-[#37313b]"
                              onClick={() => {
                                setActiveWsItemMenu(null);
                                setWorkspaceToRemove({ workspace: w, action: "delete" });
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex-1" />
            <div className="border-t border-[var(--tf-border)] pt-[18px] text-base text-[var(--tf-muted)]">
              <div>Responses collected</div>
              <div className="my-2.5 h-1 rounded-sm bg-[#e4e0e5] dark:bg-[#39353e]"><div className="h-full rounded-sm bg-[var(--tf-purple)]" style={{ width: `${Math.min(100, (total / RESPONSE_LIMIT) * 100)}%` }} /></div>
              <div className="text-xl text-[var(--tf-text)]">{total} <small className="text-[13px] text-[var(--tf-muted)]">/ {RESPONSE_LIMIT}</small></div>
              <button className="mt-2.5 rounded-md border border-[var(--tf-border-mid)] bg-white px-3 py-1.5 text-sm text-[var(--tf-text)] hover:bg-[#f4f4f4] dark:border-[#48434d] dark:bg-[#29292d] dark:text-[#f2eff3] dark:hover:bg-[#343039]" onClick={() => soon("Plans")}>Increase response limit</button>
            </div>
            <form className="mt-3.5 flex min-h-14 items-center gap-2 rounded-lg border border-[#dcd5df] bg-white p-2 dark:border-[#39353e] dark:bg-[#19191c]" onSubmit={(event) => { event.preventDefault(); soon("AI assistant"); }}>
              <button className="grid h-7 w-7 flex-none place-items-center rounded-md border-0 bg-transparent text-lg text-[var(--tf-muted)] hover:text-[var(--tf-purple)]" type="button" aria-label="Voice input" onClick={() => soon("Voice input")}>♩</button>
              <input className="min-w-0 flex-1 border-0 bg-transparent p-2 text-sm text-[var(--tf-text)] outline-none placeholder:text-[var(--tf-muted)]" aria-label="Ask Inquira AI" placeholder="Ask Inquira AI" />
              <button className="grid h-7 w-7 flex-none place-items-center rounded-md border border-[var(--tf-border)] bg-[#faf9fa] text-lg text-[var(--tf-muted)] hover:text-[var(--tf-purple)] dark:border-[#48434d] dark:bg-[#302c34] dark:text-[#aaa2ae] dark:hover:text-[#d9c9df]" type="submit" aria-label="Send to Inquira AI">▷</button>
            </form>
          </aside>

          <main className="min-w-0 overflow-auto bg-white p-8 text-[var(--tf-text)] max-[700px]:p-[22px_16px] dark:bg-[#1d1b20]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><h1 className="m-0 text-[30px] font-normal text-[var(--tf-text)]">{selectedWorkspace?.name || "My workspace"}</h1>
                <div className="tf-menu-wrap relative z-20">
                  <button className="tf-dots rounded-md border-0 bg-transparent px-2 py-1 text-xl tracking-[1px] text-[var(--tf-muted)] hover:bg-[#eee] dark:hover:bg-[#303035]" aria-label="Workspace options" onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}>···</button>
                  {workspaceMenuOpen && selectedWorkspace && (<>
                    <div className="fixed inset-0 z-20 bg-transparent" onClick={() => setWorkspaceMenuOpen(false)} />
                    <div className="tf-workspace-menu absolute left-0 top-[34px] z-[22] min-w-[160px] rounded-xl border border-[var(--tf-border)] bg-white p-1.5 shadow-[0_6px_20px_rgba(39,31,42,.14)] dark:border-[#39353e] dark:bg-[#26232a]">
                      <button className="block w-full rounded-md border-0 bg-transparent px-2.5 py-2.5 text-left text-sm text-[var(--tf-text-2)] hover:bg-[#f5f3f5] disabled:cursor-not-allowed disabled:opacity-45 dark:text-[#d5cfd8] dark:hover:bg-[#37313b]" onClick={() => { setWorkspaceMenuOpen(false); setWorkspaceToRename(selectedWorkspace); setWorkspaceName(selectedWorkspace.name); }}>Rename</button>
                      <button className="block w-full rounded-md border-0 bg-transparent px-2.5 py-2.5 text-left text-sm text-[var(--tf-text-2)] hover:bg-[#f5f3f5] disabled:cursor-not-allowed disabled:opacity-45 dark:text-[#d5cfd8] dark:hover:bg-[#37313b]" disabled={selectedWorkspace.is_private} onClick={() => { setWorkspaceMenuOpen(false); setWorkspaceToRemove({ workspace: selectedWorkspace, action: "leave" }); }}>Leave</button>
                      <button className="block w-full rounded-md border-0 bg-transparent px-2.5 py-2.5 text-left text-sm text-[#b43e32] hover:bg-[#f5f3f5] disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-[#37313b]" disabled={selectedWorkspace.is_private} onClick={() => { setWorkspaceMenuOpen(false); setWorkspaceToRemove({ workspace: selectedWorkspace, action: "delete" }); }}>Delete</button>
                    </div>
                  </>)}
                </div>
                <button className="rounded-md border-0 bg-transparent px-2.5 py-1.5 text-base text-[var(--tf-text)] hover:bg-[#efedef] dark:hover:bg-[#303035]" onClick={() => soon("Invites")}>Invite</button><span className="inline-grid h-5 w-5 place-items-center rounded-full border border-[#b7ddd5] text-sm text-[var(--tf-green)]" aria-hidden="true">◇</span></div>
              <div className="flex items-center gap-2">
                <Dropdown ariaLabel="Sort forms" value={sort} onChange={(value) => changeSort(value as typeof sort)}
                  options={[{ value: "created", label: "Date created" }, { value: "updated", label: "Last updated" }, { value: "name", label: "Alphabetical" }]} />
                <div className="flex rounded-lg border border-[#e2e2e2] bg-[#f0f0f0] p-[3px] text-base dark:border-[#39353e] dark:bg-[#29292d]">
                  <button className={`rounded-md border-0 px-3.5 py-2 text-base ${view === "list" ? "bg-white text-[#111] dark:bg-[#48484f] dark:text-white" : "bg-transparent text-[#555] dark:text-[#e4e4e7]"}`} onClick={() => changeView("list")}><span aria-hidden="true">☷</span> List</button>
                  <button className={`rounded-md border-0 px-3.5 py-2 text-base ${view === "grid" ? "bg-white text-[#111] dark:bg-[#48484f] dark:text-white" : "bg-transparent text-[#555] dark:text-[#e4e4e7]"}`} onClick={() => changeView("grid")}><span aria-hidden="true">▦</span> Grid</button></div>
              </div>
            </div>
            <hr className="my-6 border-0 border-t border-[#e6e6e6] dark:border-[#39353e]" />

            <div className="mb-[34px] grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
              {BANNERS.map((b, i) => banners[i] && (
                <div className="flex items-start gap-4 rounded-[10px] bg-[#faf8fa] p-5 dark:bg-[#26232a]" key={i}>
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-[#eee9ef] text-[var(--tf-purple)] dark:bg-[#39313d] dark:text-[#d9c9df]">✦</span>
                  <div className="flex-1"><p className="m-0 text-base leading-6 text-[var(--tf-text-2)]">{b}</p><button className="mt-2.5 rounded-md border border-[var(--tf-border-mid)] bg-white px-3 py-1.5 text-sm text-[var(--tf-text)] hover:bg-[#f4f4f4] active:scale-95 transition-transform duration-150 dark:border-[#48434d] dark:bg-[#211f25] dark:text-[#f2eff3] dark:hover:bg-[#343039]" onClick={create}>Create form</button></div>
                  <button className="border-0 bg-transparent text-base text-[var(--tf-text)] hover:opacity-75" onClick={() => setBanners((s) => s.map((v, k) => (k === i ? false : v)))}>✕</button>
                </div>))}
            </div>

            {rows === null && view === "list" && (
              <div className="zoom-in-enter">
                <div className="grid grid-cols-[minmax(220px,1fr)_100px_110px_110px_130px_110px_44px] items-center gap-1.5 px-4 pb-3.5 text-base text-[var(--tf-muted)] dark:text-[#aaa2ae] max-[900px]:grid-cols-[1fr_44px]">
                  <span /><span className="max-[900px]:hidden">Contacts</span><span className="max-[900px]:hidden">Responses</span><span className="max-[900px]:hidden">Completed</span><span className="max-[900px]:hidden">Updated</span><span className="max-[900px]:hidden">Integrations</span><span />
                </div>
                {[1, 2, 3].map((k) => (
                  <div
                    key={k}
                    className="mb-2 grid h-[60px] grid-cols-[minmax(220px,1fr)_100px_110px_110px_130px_110px_44px] items-center gap-1.5 rounded-xl border border-[var(--tf-border)] bg-white px-4 dark:border-[#39353e] dark:bg-[#26232a] max-[900px]:grid-cols-[1fr_44px] max-[900px]:[&>*:not(:first-child):not(:last-child)]:hidden"
                  >
                    <div className="flex min-w-0 items-center gap-2.5 overflow-hidden">
                      <div className="h-10 w-10 shrink-0 rounded-lg tf-shimmer" />
                      <div className="h-4 w-32 rounded-md tf-shimmer" />
                      <div className="h-4 w-14 rounded-[10px] tf-shimmer" />
                    </div>
                    <div className="h-3.5 w-4 rounded tf-shimmer" />
                    <div className="h-3.5 w-6 rounded tf-shimmer" />
                    <div className="h-3.5 w-6 rounded tf-shimmer" />
                    <div className="h-3.5 w-20 rounded tf-shimmer" />
                    <div className="h-6 w-6 rounded tf-shimmer" />
                    <div className="h-4 w-4 rounded tf-shimmer" />
                  </div>
                ))}
              </div>
            )}

            {rows === null && view === "grid" && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5 max-[620px]:grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] zoom-in-enter">
                {[1, 2, 3, 4].map((k) => (
                  <div
                    key={k}
                    className="flex min-h-[136px] flex-col justify-between rounded-xl border border-[var(--tf-border)] bg-white p-5 dark:border-[#39353e] dark:bg-[#26232a]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-32 rounded tf-shimmer" />
                      <div className="h-4 w-4 rounded tf-shimmer" />
                    </div>
                    <div className="h-7 w-7 rounded-[7px] tf-shimmer" />
                  </div>
                ))}
              </div>
            )}
            {rows && shown.length === 0 && <p className="text-[var(--tf-muted)]">No forms found.</p>}

            {view === "list" && shown.length > 0 && (<div key={`list-${selectedWorkspaceId}`} className="zoom-in-enter">
              <div className="grid grid-cols-[minmax(220px,1fr)_100px_110px_110px_130px_110px_44px] items-center gap-1.5 px-4 pb-3.5 text-base text-[var(--tf-muted)] dark:text-[#aaa2ae] max-[900px]:grid-cols-[1fr_44px]">
                <span /><span className="max-[900px]:hidden">Contacts</span><span className="max-[900px]:hidden">Responses</span><span className="max-[900px]:hidden">Completed</span><span className="max-[900px]:hidden">Updated</span><span className="max-[900px]:hidden">Integrations</span><span /></div>
              {shown.map((f) => (
                <div className={`mb-2 grid h-[60px] cursor-pointer grid-cols-[minmax(220px,1fr)_100px_110px_110px_130px_110px_44px] items-center gap-1.5 rounded-xl border border-[var(--tf-border)] bg-white px-4 text-base hover:shadow-[0_2px_8px_rgba(0,0,0,.06)] dark:border-[#39353e] dark:bg-[#26232a] dark:text-[#f2eff3] max-[900px]:grid-cols-[1fr_44px] max-[900px]:[&>*:not(:first-child):not(:last-child)]:hidden ${draggingId === f.id ? "opacity-50 cursor-grabbing" : ""}`} key={f.id}
                  draggable onDragStart={(event) => startFormDrag(event, f)} onDragEnd={() => { setDraggingId(null); setDragTargetId(null); }}
                  onClick={() => openForm(f)}>
                  <div className="flex min-w-0 items-center gap-2.5 overflow-hidden">
                    <Thumb f={f} />
                    <span className="block min-w-0 flex-1 truncate text-base font-semibold text-[var(--tf-text)] dark:text-[#f2eff3]" title={f.title}>{f.title}</span>
                    <i className={`shrink-0 rounded-[10px] px-2 py-0.5 text-xs not-italic ${f.status === "published" ? "bg-[var(--tf-green-bg)] text-[var(--tf-green)]" : "bg-[#eee] text-[#666] dark:bg-[#39393e] dark:text-[#d4d4d8]"}`}>{f.status === "published" ? "Published" : "Draft"}</i>
                  </div>
                  <span className="text-[#888] dark:text-[#aaa2ae]">-</span>
                  <span className="text-[#888] dark:text-[#aaa2ae]">{f.reply_count || "-"}</span>
                  <span className="text-[#888] dark:text-[#aaa2ae]">{f.reply_count || "-"}</span>
                  <span>{fmt(f.updated_at)}</span>
                  <span><button className="border-0 bg-transparent text-xl text-[#555] dark:text-[#d5cfd8]" onClick={(e) => { e.stopPropagation(); soon("Integrations"); }}>⊞</button></span>
                  <Menu f={f} />
                </div>))}
            </div>)}

            {view === "grid" && (
              <div key={`grid-${selectedWorkspaceId}`} className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5 max-[620px]:grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] zoom-in-enter">
                {shown.map((f) => (
                  <div className={`flex min-h-[136px] cursor-pointer flex-col rounded-xl border border-[var(--tf-border)] bg-white px-5 shadow-none transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-[var(--tf-border-mid)] hover:shadow-[0_3px_10px_rgba(39,31,42,.05)] dark:border-[#39353e] dark:bg-[#26232a] ${draggingId === f.id ? "opacity-50 cursor-grabbing" : ""}`} key={f.id}
                    draggable onDragStart={(event) => startFormDrag(event, f)} onDragEnd={() => { setDraggingId(null); setDragTargetId(null); }}
                    onClick={() => openForm(f)}>
                    <div className="flex min-h-[136px] flex-col gap-3.5 py-[17px]">
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="block min-w-0 flex-1 truncate text-base font-semibold text-[var(--tf-text)] dark:text-[#f2eff3]" title={f.title}>{f.title}</span>
                        <Menu f={f} />
                      </div>
                      <div className="grid h-[29px] w-[29px] place-items-center rounded-[7px] border border-[var(--tf-border-mid)] bg-white text-[19px] text-[var(--tf-text-2)] dark:border-[#4b4550] dark:bg-[#26232a] dark:text-[#d5cfd8]" aria-hidden="true">⊞</div>
                    </div>
                  </div>))}
              </div>)}
          </main>
        </div>
      </div>

      {renaming && (
        <Modal title="Rename form" onClose={() => setRenaming(null)}>
          <input className="my-1 mb-2.5 w-full rounded-lg border border-[var(--tf-border-mid)] bg-white px-2.5 py-[9px] text-[var(--tf-text)] dark:border-[#48434d] dark:bg-[#19191c] dark:text-[#f2eff3]" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          <div className="mt-4 flex justify-end"><button className="rounded-lg border border-[var(--tf-purple)] bg-[var(--tf-purple)] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[var(--tf-purple-dark)]" onClick={() => { const r = renaming; setRenaming(null); act(() => call(`/api/inquiries/${r.id}/title`, send("PATCH", { title: name })), "Form renamed"); }}>Save</button></div>
        </Modal>)}
      {workspaceOpen && (
        <Modal title="Add workspace" onClose={() => { setWorkspaceOpen(false); setWorkspaceName(""); }}>
          <label className="mb-1.5 mt-2.5 block text-sm text-[var(--tf-text-2)] dark:text-[#d5cfd8]" htmlFor="workspace-name">Workspace name</label>
          <input id="workspace-name" className="my-1 mb-2.5 w-full rounded-lg border border-[var(--tf-border-mid)] bg-white px-2.5 py-[9px] text-[var(--tf-text)] placeholder:text-[var(--tf-muted)] dark:border-[#48434d] dark:bg-[#19191c] dark:text-[#f2eff3] dark:placeholder:text-[#85858e]" autoFocus maxLength={100} placeholder="New workspace"
            value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && workspaceName.trim()) void addWorkspace(); }} />
          <div className="mt-4 flex justify-end gap-2">
            <button className="inline-block rounded-lg border border-[var(--tf-border-mid)] bg-white px-3.5 py-2 text-sm text-[var(--tf-text)] hover:bg-[#f4f4f4] dark:border-[#45454b] dark:bg-[#29292d] dark:text-[#e4e4e7] dark:hover:bg-[#343039]" onClick={() => { setWorkspaceOpen(false); setWorkspaceName(""); }}>Cancel</button>
            <button className="rounded-lg border border-[var(--tf-purple)] bg-[var(--tf-purple)] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[var(--tf-purple-dark)] disabled:cursor-default disabled:opacity-50" disabled={!workspaceName.trim()} onClick={() => void addWorkspace()}>Add workspace</button>
          </div>
        </Modal>)}
      {workspaceToRename && (
        <Modal title="Rename workspace" onClose={() => { setWorkspaceToRename(null); setWorkspaceName(""); }}>
          <label className="mb-1.5 mt-2.5 block text-sm text-[var(--tf-text-2)] dark:text-[#d5cfd8]" htmlFor="rename-workspace-name">Workspace name</label>
          <input id="rename-workspace-name" className="my-1 mb-2.5 w-full rounded-lg border border-[var(--tf-border-mid)] bg-white px-2.5 py-[9px] text-[var(--tf-text)] dark:border-[#48434d] dark:bg-[#19191c] dark:text-[#f2eff3]" autoFocus maxLength={100}
            value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && workspaceName.trim()) void renameWorkspace(); }} />
          <div className="mt-4 flex justify-end gap-2">
            <button className="inline-block rounded-lg border border-[var(--tf-border-mid)] bg-white px-3.5 py-2 text-sm text-[var(--tf-text)] hover:bg-[#f4f4f4] dark:border-[#45454b] dark:bg-[#29292d] dark:text-[#e4e4e7] dark:hover:bg-[#343039]" onClick={() => { setWorkspaceToRename(null); setWorkspaceName(""); }}>Cancel</button>
            <button className="rounded-lg border border-[var(--tf-purple)] bg-[var(--tf-purple)] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[var(--tf-purple-dark)] disabled:cursor-default disabled:opacity-50" disabled={!workspaceName.trim()} onClick={() => void renameWorkspace()}>Save</button>
          </div>
        </Modal>)}
      {workspaceToRemove && (
        <Modal title={workspaceToRemove.action === "leave" ? "Leave workspace?" : "Delete workspace?"}
          onClose={() => setWorkspaceToRemove(null)}>
          <p>
            Forms in <b>{workspaceToRemove.workspace.name}</b> will be moved to My workspace and kept.
            {workspaceToRemove.action === "delete" ? " The workspace will then be deleted." : " You will leave this workspace."}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button className="inline-block rounded-lg border border-[var(--tf-border-mid)] bg-white px-3.5 py-2 text-sm text-[var(--tf-text)] hover:bg-[#f4f4f4] dark:border-[#45454b] dark:bg-[#29292d] dark:text-[#e4e4e7] dark:hover:bg-[#343039]" onClick={() => setWorkspaceToRemove(null)}>Cancel</button>
            <button className="rounded-lg border border-[#c0392b] bg-[#c0392b] px-3.5 py-2 text-sm font-semibold text-white" onClick={() => void removeWorkspace()}>
              {workspaceToRemove.action === "leave" ? "Leave workspace" : "Delete workspace"}
            </button>
          </div>
        </Modal>)}
      {searchOpen && (
        <Modal title="Search" onClose={() => setSearchOpen(false)}>
          <input className="mb-3 h-[46px] w-full rounded-xl border border-[var(--tf-border-mid)] bg-white px-2.5 py-[9px] text-[var(--tf-text)] dark:border-[#48434d] dark:bg-[#19191c] dark:text-[#f2eff3] dark:placeholder:text-[#85858e]" autoFocus value={searchTerm}
            placeholder={`Search in ${selectedWorkspace?.name || "your workspace"}`}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchResults[0]) {
                if (searchResults[0].workspace_id) selectWorkspace(searchResults[0].workspace_id);
                setSearchOpen(false);
                openForm(searchResults[0]);
              }
            }} />
          {searchTerm.trim() && <div className="flex max-h-[260px] flex-col gap-[3px] overflow-auto">
            {searchResults.length ? searchResults.map((result) => (
              <button className="flex justify-between gap-3 rounded-md border-0 bg-transparent p-2.5 text-left text-[var(--tf-text)] hover:bg-[#f5f3f5] dark:hover:bg-[#37313b]" key={result.id} onClick={() => {
                if (result.workspace_id) selectWorkspace(result.workspace_id);
                setSearchOpen(false);
                openForm(result);
              }}>
                <span>{result.title}</span>
                <small className="text-[var(--tf-muted)]">{workspaces.find((workspace) => workspace.id === result.workspace_id)?.name || "Workspace"}</small>
              </button>
            )) : <p className="m-2 text-[var(--tf-muted)]">No matching forms.</p>}
          </div>}
        </Modal>)}
      {deleting && (
        <Modal title="Delete form?" onClose={() => setDeleting(null)}>
          <p>&ldquo;{deleting.title}&rdquo; and all of its responses will be permanently removed.</p>
          <div className="mt-4 flex justify-end gap-2"><button className="inline-block rounded-lg border border-[var(--tf-border-mid)] bg-white px-3.5 py-2 text-sm text-[var(--tf-text)] hover:bg-[#f4f4f4] dark:border-[#45454b] dark:bg-[#29292d] dark:text-[#e4e4e7] dark:hover:bg-[#343039]" onClick={() => setDeleting(null)}>Cancel</button>
            <button className="rounded-lg border border-[#c0392b] bg-[#c0392b] px-3.5 py-2 text-sm font-semibold text-white" onClick={() => { const d = deleting; setDeleting(null); act(() => call(`/api/inquiries/${d.id}`, send("DELETE")), "Form deleted"); }}>Delete</button></div>
        </Modal>)}
    </div>
  );
}