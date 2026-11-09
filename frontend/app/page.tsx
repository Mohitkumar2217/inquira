"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toasts";
import { call, send } from "@/lib/api";
import { Inquiry } from "@/lib/types";

const TABS = ["Forms", "Contacts", "Automations", "Insights", "Pages", "Research Flow"];
const BANNERS = [
  "Track incoming requests with their urgency, needs and target dates so your team can sort work faster.",
  "Collect goals, people involved, schedules and success criteria before a project kicks off.",
];
const RESPONSE_LIMIT = 1000;
const fmt = (s?: string) => (s ? new Date(s + "Z").toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "-");

export default function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<Inquiry[] | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"created" | "updated" | "name">("created");
  const [view, setView] = useState<"list" | "grid">("list");
  const [menu, setMenu] = useState<number | null>(null);
  const [org, setOrg] = useState(false);
  const [banners, setBanners] = useState([true, true]);
  const [renaming, setRenaming] = useState<Inquiry | null>(null);
  const [deleting, setDeleting] = useState<Inquiry | null>(null);
  const [name, setName] = useState("");

  const load = () => call<Inquiry[]>("/api/inquiries").then(setRows).catch((e) => toast(e.message));
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const list = (rows || []).filter((r) => r.title.toLowerCase().includes(q.toLowerCase()));
    return list.sort((a, b) =>
      sort === "name" ? a.title.localeCompare(b.title)
        : (sort === "created" ? b.created_at! : b.updated_at!).localeCompare(sort === "created" ? a.created_at! : a.updated_at!));
  }, [rows, q, sort]);
  const total = (rows || []).reduce((n, r) => n + (r.reply_count || 0), 0);

  const create = () => router.push("/new");
  const act = async (fn: () => Promise<any>, msg: string) => {
    setMenu(null);
    try { await fn(); toast(msg); load(); } catch (e: any) { toast(e.message); }
  };
  const soon = (w: string) => toast(`${w} is coming soon`);
  const copyLink = (s: string) => { setMenu(null); navigator.clipboard?.writeText(`${location.origin}/f/${s}`); toast("Link copied to clipboard"); };

  const Menu = ({ f }: { f: Inquiry }) => (
    <div className="tf-menu-wrap" onClick={(e) => e.stopPropagation()}>
      <button className="tf-dots" onClick={() => setMenu(menu === f.id ? null : f.id)}>···</button>
      {menu === f.id && (<>
        <div className="tf-menu-bg" onClick={() => setMenu(null)} />
        <div className="tf-menu">
          <Link href={`/builder/${f.id}`}>Edit</Link>
          <Link href={`/results/${f.id}`}>Results</Link>
          {f.status === "published" && <button onClick={() => copyLink(f.slug)}>Copy link</button>}
          <button onClick={() => act(() => call(`/api/inquiries/${f.id}/${f.status === "published" ? "unpublish" : "publish"}`, send("POST")), f.status === "published" ? "Form unpublished" : "Form published")}>
            {f.status === "published" ? "Unpublish" : "Publish"}</button>
          <button onClick={() => { setMenu(null); setRenaming(f); setName(f.title); }}>Rename</button>
          <button onClick={() => act(() => call(`/api/inquiries/${f.id}/duplicate`, send("POST")), "Form duplicated")}>Duplicate</button>
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
          <button className="tf-round" onClick={() => soon("Help")}>?</button>
          <div className="tf-avatar">DC</div>
        </div>
      </header>

      <div className="tf-panel">
        <nav className="tf-tabs">
          {TABS.map((t) => (
            <button key={t} className={t === "Forms" ? "on" : ""} onClick={() => t !== "Forms" && soon(t)}>
              {t}{t === "Pages" && <span className="tf-beta">Beta</span>}</button>))}
        </nav>

        <div className="tf-body">
          <aside className="tf-side">
            <button className="tf-create" onClick={create}>+ Create form</button>
            <div className="tf-search"><span>⌕</span><input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="tf-ws-head"><span>▦ Workspaces</span><button onClick={() => soon("Workspaces")}>+</button></div>
            <div className="tf-private">Private <span>▲</span></div>
            <div className="tf-ws-item"><span>My workspace</span><span>{rows?.length ?? 0}</span></div>
            <div className="grow" />
            <div className="tf-usage">
              <div>Responses collected</div>
              <div className="tf-bar"><div style={{ width: `${Math.min(100, (total / RESPONSE_LIMIT) * 100)}%` }} /></div>
              <div className="tf-count">{total} <small>/ {RESPONSE_LIMIT}</small></div>
              <button className="tf-chip" onClick={() => soon("Plans")}>Increase response limit</button>
            </div>
            <div className="tf-ai"><input placeholder="Ask Inquira AI" onKeyDown={(e) => e.key === "Enter" && soon("AI assistant")} /></div>
          </aside>

          <main className="tf-main">
            <div className="row between center">
              <div className="row center gap"><h1 className="tf-h1">My workspace</h1>
                <button className="tf-dots" onClick={() => soon("Workspace options")}>···</button>
                <button className="tf-link" onClick={() => soon("Invites")}>Invite</button></div>
              <div className="row center gap">
                <select className="tf-select" value={sort} onChange={(e) => setSort(e.target.value as any)}>
                  <option value="created">Date created</option><option value="updated">Date updated</option><option value="name">Name</option></select>
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
                <div className="tf-row" key={f.id} onClick={() => router.push(`/builder/${f.id}`)}>
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
                  <div className="tf-tile" key={f.id} onClick={() => router.push(`/builder/${f.id}`)}>
                    <div className="tf-tile-top" style={{ background: f.accent }}><Menu f={f} /></div>
                    <div className="tf-tile-body"><b>{f.title}</b>
                      <span className="muted small">{f.reply_count || 0} responses · {fmt(f.updated_at)}</span>
                      <i className={"tf-status " + f.status}>{f.status === "published" ? "Published" : "Draft"}</i></div>
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
      {deleting && (
        <Modal title="Delete form?" onClose={() => setDeleting(null)}>
          <p>&ldquo;{deleting.title}&rdquo; and all of its responses will be permanently removed.</p>
          <div className="row end gap"><button className="btn" onClick={() => setDeleting(null)}>Cancel</button>
            <button className="primary danger-fill" onClick={() => { const d = deleting; setDeleting(null); act(() => call(`/api/inquiries/${d.id}`, send("DELETE")), "Form deleted"); }}>Delete</button></div>
        </Modal>)}
    </div>
  );
}
