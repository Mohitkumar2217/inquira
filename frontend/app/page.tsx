"use client";
import { DragEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toasts";
import { call, send } from "@/lib/api";
import { Inquiry, Workspace } from "@/lib/types";

const TABS = ["Forms", "Contacts", "Automations", "Insights", "Pages", "Research Flow"];
const TAB_ICONS: Record<string, string> = {
  Forms: "▣", Contacts: "♧", Automations: "♧", Insights: "⌁", Pages: "▧", "Research Flow": "⊕",
};
const BANNERS = [
  "Track incoming requests with their urgency, needs and target dates so your team can sort work faster.",
  "Collect goals, people involved, schedules and success criteria before a project kicks off.",
];
const RESPONSE_LIMIT = 10;
const fmt = (s?: string) => (s ? new Date(s + "Z").toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "-");

export default function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<Inquiry[] | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"created" | "updated" | "name">("created");
  const [view, setView] = useState<"list" | "grid">("grid");
  const [menu, setMenu] = useState<number | null>(null);
  const [submenu, setSubmenu] = useState<{ id: number; action: "copy" | "move" } | null>(null);
  const [org, setOrg] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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

  const load = async () => {
    try { setRows(await call<Inquiry[]>("/api/inquiries")); }
    catch (e: any) { toast(e.message); }
  };
  const loadWorkspaces = async () => {
    try {
      const data = await call<Workspace[]>("/api/workspaces");
      setWorkspaces(data);
      setSelectedWorkspaceId((current) => current ?? data.find((w) => w.is_private)?.id ?? data[0]?.id ?? null);
    } catch (e: any) { toast(e.message); }
  };
  useEffect(() => { void load(); void loadWorkspaces(); }, []);

  const shown = useMemo(() => {
    const list = (rows || []).filter((r) =>
      r.workspace_id === selectedWorkspaceId && r.title.toLowerCase().includes(q.toLowerCase()));
    return list.sort((a, b) =>
      sort === "name" ? a.title.localeCompare(b.title)
        : (sort === "created" ? b.created_at! : b.updated_at!).localeCompare(sort === "created" ? a.created_at! : a.updated_at!));
  }, [rows, q, sort, selectedWorkspaceId]);
  const total = (rows || []).reduce((n, r) => n + (r.reply_count || 0), 0);

  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);
  const searchResults = useMemo(() => (rows || []).filter((row) =>
    searchTerm.trim() && row.title.toLowerCase().includes(searchTerm.trim().toLowerCase())),
  [rows, searchTerm]);
  const create = () => {
    if (selectedWorkspaceId !== null) sessionStorage.setItem("inquira.workspace", String(selectedWorkspaceId));
    router.push("/new");
  };
  const act = async (fn: () => Promise<any>, msg: string) => {
    setMenu(null);
    setSubmenu(null);
    try { await fn(); toast(msg); void load(); void loadWorkspaces(); } catch (e: any) { toast(e.message); }
  };
  const soon = (w: string) => toast(`${w} is coming soon`);
  const copyLink = (s: string) => { setMenu(null); navigator.clipboard?.writeText(`${location.origin}/f/${s}`); toast("Link copied to clipboard"); };
  const addWorkspace = async () => {
    try {
      const workspace = await call<Workspace>("/api/workspaces", send("POST", { name: workspaceName }));
      setWorkspaceName("");
      setWorkspaceOpen(false);
      await loadWorkspaces();
      setSelectedWorkspaceId(workspace.id);
      toast("Workspace created");
    } catch (e: any) { toast(e.message); }
  };
  const renameWorkspace = async () => {
    if (!workspaceToRename) return;
    try {
      const updated = await call<Workspace>(`/api/workspaces/${workspaceToRename.id}`, send("PATCH", { name: workspaceName }));
      setWorkspaceToRename(null);
      setWorkspaceName("");
      setWorkspaces((current) => current.map((workspace) => workspace.id === updated.id ? { ...workspace, name: updated.name } : workspace));
      toast("Workspace renamed");
    } catch (e: any) { toast(e.message); }
  };
  const removeWorkspace = async () => {
    if (!workspaceToRemove) return;
    const { workspace, action } = workspaceToRemove;
    try {
      await call(`/api/workspaces/${workspace.id}${action === "leave" ? "/leave" : ""}`,
        action === "leave" ? send("POST") : send("DELETE"));
      setWorkspaceToRemove(null);
      setSelectedWorkspaceId(workspaces.find((item) => item.is_private)?.id ?? null);
      await load();
      await loadWorkspaces();
      toast(action === "leave" ? "You left the workspace; its forms were moved to My workspace" : "Workspace deleted; its forms were moved to My workspace");
    } catch (e: any) { toast(e.message); }
  };
  const moveForm = async (formId: number, workspaceId: number) => {
    setDraggingId(null);
    setDragTargetId(null);
    try {
      await call(`/api/inquiries/${formId}/workspace`, send("PATCH", { workspace_id: workspaceId }));
      await load();
      await loadWorkspaces();
      toast("Form moved to workspace");
    } catch (e: any) { toast(e.message); }
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
    <div className="tf-menu-wrap" onClick={(e) => e.stopPropagation()}>
      <button className="tf-dots" aria-label={`Actions for ${f.title}`} onClick={() => { setMenu(menu === f.id ? null : f.id); setSubmenu(null); }}>···</button>
      {menu === f.id && (<>
        <div className="tf-menu-bg" onClick={() => setMenu(null)} />
        <div className="tf-menu">
          {f.status === "published" && <button onClick={() => copyLink(f.slug)}>Copy link</button>}
          <Link href={`/builder/${f.id}`}>Content</Link>
          <button onClick={() => { setMenu(null); soon("Workflow"); }}>Workflow</button>
          <button onClick={() => { setMenu(null); soon("Connect"); }}>Connect</button>
          <hr />
          <button onClick={() => { setMenu(null); setRenaming(f); setName(f.title); }}>Rename</button>
          <button onClick={() => act(() => call(`/api/inquiries/${f.id}/duplicate`, send("POST")), "Form duplicated")}>Duplicate</button>
          <div className="tf-submenu-wrap">
            <button onClick={() => setSubmenu(submenu?.id === f.id && submenu.action === "copy" ? null : { id: f.id, action: "copy" })}>Copy to <span>›</span></button>
            {submenu?.id === f.id && submenu.action === "copy" && <div className="tf-submenu">
              {workspaces.filter((w) => w.id !== f.workspace_id).map((w) => <button key={w.id} onClick={() => act(
                () => call(`/api/inquiries/${f.id}/copy-to/${w.id}`, send("POST")), `Copied to ${w.name}`)}>{w.name}</button>)}
              {workspaces.length < 2 && <span className="tf-submenu-empty">Create another workspace first</span>}
            </div>}
          </div>
          <div className="tf-submenu-wrap">
            <button onClick={() => setSubmenu(submenu?.id === f.id && submenu.action === "move" ? null : { id: f.id, action: "move" })}>Move to <span>›</span></button>
            {submenu?.id === f.id && submenu.action === "move" && <div className="tf-submenu">
              {workspaces.filter((w) => w.id !== f.workspace_id).map((w) => <button key={w.id} onClick={() => act(
                () => call(`/api/inquiries/${f.id}/workspace`, send("PATCH", { workspace_id: w.id })), `Moved to ${w.name}`)}>{w.name}</button>)}
              {workspaces.length < 2 && <span className="tf-submenu-empty">Create another workspace first</span>}
            </div>}
          </div>
          <hr />
          <button className="red" onClick={() => { setMenu(null); setDeleting(f); }}>Delete</button>
        </div>
      </>)}
    </div>
  );
  const Thumb = ({ f }: { f: Inquiry }) => <div className="tf-thumb" style={{ background: f.accent }} />;

  return (
    <div className="tf-page">
      <header className="tf-top">
        <div className="row center gap">
          <div className="tf-mark" /><div className="tf-ws-icon">2</div>
          <div className="tf-org-wrap">
            <button className="tf-ws-name" onClick={() => setOrg(!org)}>default-creator {org ? "⌃" : "⌄"}</button>
            {org && (<>
              <div className="tf-menu-bg" onClick={() => setOrg(false)} />
              <div className="tf-org">
                <h5>Organization</h5>
                {["Admin settings", "Org members", "Plan & billing", "Developer apps"].map((x) => (
                  <button key={x} onClick={() => { setOrg(false); soon(x); }}>{x}</button>))}
                <hr />
                <h5>All organizations</h5>
                <div className="tf-org-item"><div className="tf-ws-icon">D</div>
                  <div><div>default-creator <span className="tf-owner">Owner</span></div><div className="muted">Free Plan - 1 member</div></div></div>
              </div>
            </>)}
          </div>
        </div>
        <div className="row center gap">
          <button className="tf-link" onClick={() => soon("Integrations")}>Integrations</button>
          <button className="tf-link" onClick={() => soon("Brand kit")}>Brand kit</button>
          <button className="tf-plans" onClick={() => soon("Plans")}>View plans</button>
          <div className="tf-help-wrap">
            <button className="tf-round" aria-label="Help menu" onClick={() => setHelpOpen(!helpOpen)}>?</button>
            {helpOpen && (<>
              <div className="tf-menu-bg" onClick={() => setHelpOpen(false)} />
              <div className="tf-help-menu">
                {["Help center", "Community", "Give Feedback", "Support"].map((item) =>
                  <button key={item} onClick={() => { setHelpOpen(false); soon(item); }}>{item}</button>)}
              </div>
            </>)}
          </div>
          <div className="tf-account-wrap">
            <button className="tf-avatar" aria-label="Account menu" onClick={() => setProfileOpen(!profileOpen)}>M2</button>
            {profileOpen && (<>
              <div className="tf-menu-bg" onClick={() => setProfileOpen(false)} />
              <div className="tf-account-menu">
                <div className="tf-account-profile">
                  <span className="tf-avatar">M2</span>
                  <div><b>Inquira Creator</b><span>creator@example.com</span></div>
                </div>
                <hr />
                <strong>ACCOUNT</strong>
                <button onClick={() => { setProfileOpen(false); soon("Account settings"); }}>Account settings</button>
                <hr />
                <strong>RESOURCES</strong>
                {["Support", "Help center", "Community", "Apps & Integrations", "What's New"].map((item) =>
                  <button key={item} onClick={() => { setProfileOpen(false); soon(item); }}>{item}</button>)}
                <hr />
                <button onClick={() => { setProfileOpen(false); soon("Referral rewards"); }}>Refer friends, get rewards</button>
                <hr />
                <button onClick={() => { setProfileOpen(false); soon("Homepage"); }}>Homepage</button>
                <button className="logout" onClick={() => { setProfileOpen(false); soon("Sign out"); }}>Log out</button>
              </div>
            </>)}
          </div>
        </div>
      </header>

      <div className="tf-panel">
        <nav className="tf-tabs">
          {TABS.map((t) => (
            <button key={t} className={t === "Forms" ? "on" : ""} onClick={() => t !== "Forms" && soon(t)}>
              <span className="tf-tab-icon" aria-hidden="true">{TAB_ICONS[t]}</span>{t}
              {t === "Insights" && <span className="tf-tab-insights" aria-label="Insights">◇</span>}
              {t === "Pages" && <span className="tf-beta">Beta</span>}</button>))}
        </nav>

        <div className="tf-body">
          <aside className="tf-side">
            <button className="tf-create" onClick={create}>+ Create form</button>
            <button className="tf-search" onClick={() => { setSearchTerm(""); setSearchOpen(true); }}>
              <span>⌕</span><span className="tf-search-placeholder">Search</span>
            </button>
            <div className="tf-ws-head"><span>▦ Workspaces</span>
              <button aria-label="Create workspace" onClick={() => setWorkspaceOpen(true)}>+</button></div>
            <button className="tf-private" onClick={() => setPrivateExpanded(!privateExpanded)}>Private <span>{privateExpanded ? "▲" : "▼"}</span></button>
            {privateExpanded && workspaces.map((w) => (
              <button key={w.id} className={"tf-ws-item" + (w.id === selectedWorkspaceId ? " selected" : "")
                + (w.id === dragTargetId ? " drop-target" : "")}
                onClick={() => setSelectedWorkspaceId(w.id)}
                onDragOver={(event) => acceptFormDrop(event, w)}
                onDragLeave={() => setDragTargetId((current) => current === w.id ? null : current)}
                onDrop={(event) => dropForm(event, w)}
                aria-label={`${w.name}, ${w.form_count} forms. Drop a form here to move it.`}>
                <span>{w.name}</span><span>{w.form_count}</span>
              </button>))}
            <div className="grow" />
            <div className="tf-usage">
              <div>Responses collected</div>
              <div className="tf-bar"><div style={{ width: `${Math.min(100, (total / RESPONSE_LIMIT) * 100)}%` }} /></div>
              <div className="tf-count">{total} <small>/ {RESPONSE_LIMIT}</small></div>
              <button className="tf-chip" onClick={() => soon("Plans")}>Increase response limit</button>
            </div>
            <form className="tf-ai" onSubmit={(event) => { event.preventDefault(); soon("AI assistant"); }}>
              <button type="button" aria-label="Voice input" onClick={() => soon("Voice input")}>♩</button>
              <input aria-label="Ask Inquira AI" placeholder="Ask Inquira AI" />
              <button type="submit" aria-label="Send to Inquira AI">▷</button>
            </form>
          </aside>

          <main className="tf-main">
            <div className="row between center">
              <div className="row center gap"><h1 className="tf-h1">{selectedWorkspace?.name || "My workspace"}</h1>
                <div className="tf-menu-wrap">
                  <button className="tf-dots" aria-label="Workspace options" onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}>···</button>
                  {workspaceMenuOpen && selectedWorkspace && (<>
                    <div className="tf-menu-bg" onClick={() => setWorkspaceMenuOpen(false)} />
                    <div className="tf-workspace-menu">
                      <button onClick={() => { setWorkspaceMenuOpen(false); setWorkspaceToRename(selectedWorkspace); setWorkspaceName(selectedWorkspace.name); }}>Rename</button>
                      <button disabled={selectedWorkspace.is_private} onClick={() => { setWorkspaceMenuOpen(false); setWorkspaceToRemove({ workspace: selectedWorkspace, action: "leave" }); }}>Leave</button>
                      <button className="red" disabled={selectedWorkspace.is_private} onClick={() => { setWorkspaceMenuOpen(false); setWorkspaceToRemove({ workspace: selectedWorkspace, action: "delete" }); }}>Delete</button>
                    </div>
                  </>)}
                </div>
                <button className="tf-link" onClick={() => soon("Invites")}>Invite</button></div>
              <div className="row center gap">
                <select className="tf-select" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                  <option value="created">Date created</option><option value="updated">Last updated</option><option value="name">Alphabetical</option></select>
                <div className="tf-toggle">
                  <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>☰ List</button>
                  <button className={view === "grid" ? "on" : ""} onClick={() => setView("grid")}>▦ Grid</button></div>
              </div>
            </div>
            <hr className="tf-hr" />

            <div className="tf-banners">
              {BANNERS.map((b, i) => banners[i] && (
                <div className="tf-banner" key={i}>
                  <span className="tf-spark">✦</span>
                  <div className="grow"><p>{b}</p><button className="tf-chip" onClick={create}>Create form</button></div>
                  <button className="ghost" onClick={() => setBanners((s) => s.map((v, k) => (k === i ? false : v)))}>✕</button>
                </div>))}
            </div>

            {rows === null && <p className="muted">Loading…</p>}
            {rows && shown.length === 0 && <p className="muted">No forms found.</p>}

            {view === "list" && shown.length > 0 && (<>
              <div className="tf-row head"><span /><span>Contacts</span><span>Responses</span><span>Completed</span><span>Updated</span><span>Integrations</span><span /></div>
              {shown.map((f) => (
                <div className={"tf-row" + (draggingId === f.id ? " is-dragging" : "")} key={f.id}
                  draggable onDragStart={(event) => startFormDrag(event, f)} onDragEnd={() => { setDraggingId(null); setDragTargetId(null); }}
                  onClick={() => router.push(`/builder/${f.id}`)}>
                  <span className="row center gap"><Thumb f={f} /><b>{f.title}</b>
                    <i className={"tf-status " + f.status}>{f.status === "published" ? "Published" : "Draft"}</i></span>
                  <span className="dim">-</span>
                  <span className="dim">{f.reply_count || "-"}</span>
                  <span className="dim">{f.reply_count || "-"}</span>
                  <span>{fmt(f.updated_at)}</span>
                  <span><button className="tf-int" onClick={(e) => { e.stopPropagation(); soon("Integrations"); }}>⊞</button></span>
                  <Menu f={f} />
                </div>))}
            </>)}

            {view === "grid" && (
              <div className="tf-grid">
                {shown.map((f) => (
                  <div className={"tf-tile" + (draggingId === f.id ? " is-dragging" : "")} key={f.id}
                    draggable onDragStart={(event) => startFormDrag(event, f)} onDragEnd={() => { setDraggingId(null); setDragTargetId(null); }}
                    onClick={() => router.push(`/builder/${f.id}`)}>
                    <div className="tf-tile-top">
                      <div className="tf-tile-heading">
                        <b title={f.title}>{f.title}</b>
                        <Menu f={f} />
                      </div>
                      <div className="tf-tile-icon" aria-hidden="true">⊞</div>
                    </div>
                  </div>))}
              </div>)}
          </main>
        </div>
      </div>

      {renaming && (
        <Modal title="Rename form" onClose={() => setRenaming(null)}>
          <input className="box-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          <div className="row end"><button className="primary" onClick={() => { const r = renaming; setRenaming(null); act(() => call(`/api/inquiries/${r.id}/title`, send("PATCH", { title: name })), "Form renamed"); }}>Save</button></div>
        </Modal>)}
      {workspaceOpen && (
        <Modal title="Add workspace" onClose={() => { setWorkspaceOpen(false); setWorkspaceName(""); }}>
          <label className="tf-modal-label" htmlFor="workspace-name">Workspace name</label>
          <input id="workspace-name" className="box-input" autoFocus maxLength={100} placeholder="New workspace"
            value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && workspaceName.trim()) void addWorkspace(); }} />
          <div className="row end gap">
            <button className="btn" onClick={() => { setWorkspaceOpen(false); setWorkspaceName(""); }}>Cancel</button>
            <button className="primary" disabled={!workspaceName.trim()} onClick={() => void addWorkspace()}>Add workspace</button>
          </div>
        </Modal>)}
      {workspaceToRename && (
        <Modal title="Rename workspace" onClose={() => { setWorkspaceToRename(null); setWorkspaceName(""); }}>
          <label className="tf-modal-label" htmlFor="rename-workspace-name">Workspace name</label>
          <input id="rename-workspace-name" className="box-input" autoFocus maxLength={100}
            value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && workspaceName.trim()) void renameWorkspace(); }} />
          <div className="row end gap">
            <button className="btn" onClick={() => { setWorkspaceToRename(null); setWorkspaceName(""); }}>Cancel</button>
            <button className="primary" disabled={!workspaceName.trim()} onClick={() => void renameWorkspace()}>Save</button>
          </div>
        </Modal>)}
      {workspaceToRemove && (
        <Modal title={workspaceToRemove.action === "leave" ? "Leave workspace?" : "Delete workspace?"}
          onClose={() => setWorkspaceToRemove(null)}>
          <p>
            Forms in <b>{workspaceToRemove.workspace.name}</b> will be moved to My workspace and kept.
            {workspaceToRemove.action === "delete" ? " The workspace will then be deleted." : " You will leave this workspace."}
          </p>
          <div className="row end gap">
            <button className="btn" onClick={() => setWorkspaceToRemove(null)}>Cancel</button>
            <button className="primary danger-fill" onClick={() => void removeWorkspace()}>
              {workspaceToRemove.action === "leave" ? "Leave workspace" : "Delete workspace"}
            </button>
          </div>
        </Modal>)}
      {searchOpen && (
        <Modal title="Search" onClose={() => setSearchOpen(false)}>
          <input className="box-input tf-search-modal-input" autoFocus value={searchTerm}
            placeholder={`Search in ${selectedWorkspace?.name || "your workspace"}`}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchResults[0]) {
                setSelectedWorkspaceId(searchResults[0].workspace_id ?? null);
                setSearchOpen(false);
                router.push(`/builder/${searchResults[0].id}`);
              }
            }} />
          {searchTerm.trim() && <div className="tf-search-results">
            {searchResults.length ? searchResults.map((result) => (
              <button key={result.id} onClick={() => {
                setSelectedWorkspaceId(result.workspace_id ?? null);
                setSearchOpen(false);
                router.push(`/builder/${result.id}`);
              }}>
                <span>{result.title}</span>
                <small>{workspaces.find((workspace) => workspace.id === result.workspace_id)?.name || "Workspace"}</small>
              </button>
            )) : <p>No matching forms.</p>}
          </div>}
        </Modal>)}
      {deleting && (
        <Modal title="Delete form?" onClose={() => setDeleting(null)}>
          <p>&ldquo;{deleting.title}&rdquo; and all of its responses will be permanently removed.</p>
          <div className="row end gap"><button className="btn" onClick={() => setDeleting(null)}>Cancel</button>
            <button className="primary danger-fill" onClick={() => { const d = deleting; setDeleting(null); act(() => call(`/api/inquiries/${d.id}`, send("DELETE")), "Form deleted"); }}>Delete</button></div>
        </Modal>)}
    </div>
  );
}