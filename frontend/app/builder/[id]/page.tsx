"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AddContentModal from "@/components/AddContentModal";
import Runner from "@/components/Runner";
import { useToast } from "@/components/Toasts";
import { call, send } from "@/lib/api";
import { Inquiry, Kind, PromptDTO, kindName } from "@/lib/types";

let tempId = -1;
const Soon = ({ what }: { what: string }) => <div className="soon"><b>{what}</b><span>Coming soon</span></div>;

export default function Builder() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [inq, setInq] = useState<Inquiry | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [tab, setTab] = useState<"create" | "settings" | "connect">("create");
  const [dirty, setDirty] = useState(false);
  const [adding, setAdding] = useState(false);
  const dragFrom = useRef<number | null>(null);

  useEffect(() => {
    call<Inquiry>(`/api/inquiries/${id}`).then((d) => { setInq(d); setSel(d.prompts[0]?.id ?? null); if (d.prompts.length === 0) setAdding(true); }).catch((e) => toast(e.message));
  }, [id]);

  const mutate = (fn: (d: Inquiry) => void) => {
    setInq((prev) => { if (!prev) return prev; const c = structuredClone(prev); fn(c); return c; });
    setDirty(true);
  };
  if (!inq) return <div className="center-page muted">Loading…</div>;

  const idx = inq.prompts.findIndex((p) => p.id === sel);
  const cur = inq.prompts[idx];
  const patch = (c: Partial<PromptDTO>) => mutate((d) => Object.assign(d.prompts[idx], c));

  const addPrompt = (kind: Kind) => {
    const p: PromptDTO = { id: tempId--, kind, label: "", hint: "", mandatory: false,
      choices: kind === "choice" || kind === "dropdown" ? ["Option 1", "Option 2"] : [] };
    mutate((d) => d.prompts.push(p));
    setSel(p.id); setAdding(false);
  };
  const removePrompt = (pid: number) => {
    const i = inq.prompts.findIndex((p) => p.id === pid);
    mutate((d) => d.prompts.splice(i, 1));
    setSel(inq.prompts[i + 1]?.id ?? inq.prompts[i - 1]?.id ?? null);
  };
  const dropOn = (to: number) => {
    const from = dragFrom.current; dragFrom.current = null;
    if (from === null || from === to) return;
    mutate((d) => { const [m] = d.prompts.splice(from, 1); d.prompts.splice(to, 0, m); });
  };

  const save = async (quiet = false) => {
    try {
      const keep = idx;
      const d = await call<Inquiry>(`/api/inquiries/${inq.id}`, send("PUT", inq));
      setInq(d); setSel(d.prompts[keep]?.id ?? d.prompts[0]?.id ?? null); setDirty(false);
      if (!quiet) toast("Changes saved");
      return true;
    } catch (e: any) { toast(e.message); return false; }
  };
  const toggleStatus = async () => {
    if (dirty && !(await save(true))) return;
    try {
      const path = inq.status === "published" ? "unpublish" : "publish";
      const r = await call<Inquiry>(`/api/inquiries/${inq.id}/${path}`, send("POST"));
      setInq((s) => ({ ...s!, status: r.status }));
      toast(r.status === "published" ? "Published! Your link is ready" : "Form unpublished");
    } catch (e: any) { toast(e.message); }
  };
  const link = `${typeof location !== "undefined" ? location.origin : ""}/f/${inq.slug}`;

  return (
    <div className="builder" style={{ ["--accent" as any]: inq.accent }}>
      <header className="topbar">
        <div className="row gap center">
          <Link href="/" className="logo">Inquira</Link>
          <input className="title-input" value={inq.title} onChange={(e) => mutate((d) => { d.title = e.target.value; })} />
        </div>
        <nav className="tabs">
          {(["create", "settings", "connect"] as const).map((t) => (
            <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>))}
          <Link href={`/results/${inq.id}`}>Results</Link>
        </nav>
        <div className="row gap center">
          {inq.status === "published" && <button className="btn" onClick={() => { navigator.clipboard?.writeText(link); toast("Link copied to clipboard"); }}>Copy link</button>}
          <button className="btn" disabled={!dirty} onClick={() => save()}>{dirty ? "Save" : "Saved"}</button>
          <button className="primary" onClick={toggleStatus}>{inq.status === "published" ? "Unpublish" : "Publish"}</button>
        </div>
      </header>

      {tab === "create" && (
        <div className="panes">
          <aside className="left">
            <button className="primary wide" onClick={() => setAdding(true)}>+ Add question</button>
            <ul>
              {inq.prompts.map((p, i) => (
                <li key={p.id} draggable onDragStart={() => (dragFrom.current = i)} onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(i)} className={p.id === sel ? "on" : ""} onClick={() => setSel(p.id)}>
                  <span className="grip">⋮⋮</span><span className="badge">{i + 1}</span>
                  <span className="ellipsis">{p.label || "Untitled question"}</span>
                </li>))}
              {inq.prompts.length === 0 && <li className="empty">No questions yet</li>}
            </ul>
          </aside>
          <section className="middle">
            <div className="preview-label">Live preview</div>
            <div className="preview-frame">
              <Runner key={`${sel}-${inq.accent}-${inq.closing_heading}`} inquiry={inq} startAt={Math.max(idx, 0)} preview onSubmit={async () => {}} />
            </div>
          </section>
          <aside className="right">
            {cur ? (<>
              <div className="row between"><h4>{kindName(cur.kind)}</h4><button className="btn danger" onClick={() => removePrompt(cur.id)}>Delete</button></div>
              <label>Question</label>
              <textarea className="box-input" rows={2} value={cur.label} placeholder="Type your question" onChange={(e) => patch({ label: e.target.value })} />
              <label>Description</label>
              <input className="box-input" value={cur.hint} placeholder="Optional help text" onChange={(e) => patch({ hint: e.target.value })} />
              <label className="check"><input type="checkbox" checked={cur.mandatory} onChange={(e) => patch({ mandatory: e.target.checked })} /> Required</label>
              {(cur.kind === "choice" || cur.kind === "dropdown") && (<>
                <label>Options</label>
                {cur.choices.map((c, k) => (
                  <div className="row gap" key={k}>
                    <input className="box-input" value={c} onChange={(e) => { const cs = [...cur.choices]; cs[k] = e.target.value; patch({ choices: cs }); }} />
                    <button className="btn" disabled={cur.choices.length <= 2} onClick={() => patch({ choices: cur.choices.filter((_, j) => j !== k) })}>✕</button>
                  </div>))}
                <button className="btn" onClick={() => patch({ choices: [...cur.choices, `Option ${cur.choices.length + 1}`] })}>+ Add option</button>
              </>)}
              <Soon what="Logic jumps" />
            </>) : <p className="muted">Select or add a question to edit it.</p>}
          </aside>
        </div>)}

      {tab === "settings" && (
        <div className="page-pad">
          <h3>Design</h3>
          <label>Accent colour</label>
          <input type="color" value={inq.accent} onChange={(e) => mutate((d) => { d.accent = e.target.value; })} />
          <h3>Thank-you screen</h3>
          <label>Heading</label>
          <input className="box-input" value={inq.closing_heading} onChange={(e) => mutate((d) => { d.closing_heading = e.target.value; })} />
          <label>Message</label>
          <textarea className="box-input" rows={3} value={inq.closing_text} onChange={(e) => mutate((d) => { d.closing_text = e.target.value; })} />
          <Soon what="Custom fonts & backgrounds" />
        </div>)}

      {tab === "connect" && (
        <div className="page-pad">
          <h3>Share</h3>
          {inq.status === "published" ? <input className="box-input" readOnly value={link} onFocus={(e) => e.target.select()} /> : <p className="muted">Publish the form to get a public link.</p>}
          <Soon what="Integrations & webhooks" /><Soon what="Team collaboration" />
        </div>)}

      {adding && (
        <AddContentModal onClose={() => setAdding(false)} onAdd={addPrompt}
          onImport={(ps) => { mutate((d) => d.prompts.push(...ps)); setSel(ps[0].id); setAdding(false); }} />)}
    </div>
  );
}
