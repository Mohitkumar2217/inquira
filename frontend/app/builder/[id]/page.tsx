"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AddContentModal from "@/components/AddContentModal";
import Runner from "@/components/Runner";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/Toasts";
import { call, send } from "@/lib/api";
import { Inquiry, Kind, PromptDTO, kindName } from "@/lib/types";

let tempId = -1;
const Soon = ({ what }: { what: string }) => <div className="soon"><b>{what}</b><span>Coming soon</span></div>;

export default function Builder() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
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
      <header className="builder-header">
        <div className="builder-breadcrumbs">
          <Link href="/" className="logo">Inquira</Link>
          <span className="builder-crumb-separator">›</span>
          <Link href="/">Forms</Link>
          <span className="builder-crumb-separator">›</span>
          <input aria-label="Form title" className="title-input" value={inq.title} onChange={(e) => mutate((d) => { d.title = e.target.value; })} />
        </div>
        <nav className="builder-nav" aria-label="Form sections">
          <button className={tab === "create" || tab === "settings" ? "on" : ""} onClick={() => setTab("create")}>Content</button>
          <button onClick={() => toast("Workflow is coming soon")}>Workflow</button>
          <button className={tab === "connect" ? "on" : ""} onClick={() => setTab("connect")}>Connect</button>
          <Link href={`/results/${inq.id}`}>Results</Link>
        </nav>
        <div className="builder-header-actions">
          {inq.status === "published" && <button className="btn builder-share" onClick={() => { navigator.clipboard?.writeText(link); toast("Link copied to clipboard"); }}>Share</button>}
          <button className="builder-plans" onClick={() => toast("Plans are coming soon")}>View plans</button>
          <button className="builder-help" aria-label="Help" onClick={() => toast("Help is coming soon")}>?</button>
          <button className="builder-theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={toggleTheme}>{theme === "dark" ? "☀" : "☾"}</button>
          <div className="tf-avatar">DC</div>
        </div>
      </header>

      <div className="builder-toolbar">
        <button className="builder-mode" onClick={() => toast("Universal mode is selected")}>☷ <span>Universal mode</span>⌄</button>
        <div className="builder-tools">
          <button className="builder-add-content" onClick={() => setAdding(true)}>＋ <span>Add content</span></button>
          <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>◉ <span>Design</span></button>
          <span className="builder-tool-divider" />
          <button aria-label="Desktop preview" onClick={() => toast("Desktop preview is selected")}>▯</button>
          <button aria-label="Preview form" onClick={() => toast("Preview is coming soon")}>▷</button>
          <button aria-label="Accessibility settings" onClick={() => toast("Accessibility settings are coming soon")}>ⓐ</button>
          <button aria-label="More form settings" onClick={() => setTab("settings")}>⚙</button>
        </div>
        <button className="builder-collapse" aria-label="Collapse settings panel" onClick={() => toast("Panel controls are coming soon")}>◧</button>
      </div>

      {tab === "create" && (
        <div className="panes">
          <aside className="left builder-pages">
            <section className="builder-page-list">
              <div className="builder-section-title">Pages <button aria-label="Add page" onClick={() => setAdding(true)}>＋</button></div>
              <ul>
              {inq.prompts.map((p, i) => (
                <li key={p.id} draggable onDragStart={() => (dragFrom.current = i)} onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(i)} className={p.id === sel ? "on" : ""} onClick={() => setSel(p.id)}>
                  <span className="builder-question-kind">≡</span>
                  <span className="ellipsis">{p.label || kindName(p.kind)}</span>
                  <button className="builder-question-menu" aria-label={`More options for ${p.label || kindName(p.kind)}`} onClick={(e) => { e.stopPropagation(); toast("Question options are coming soon"); }}>···</button>
                </li>))}
                {inq.prompts.length === 0 && <li className="empty">Add content to create your first question.</li>}
              </ul>
              <button className="builder-add-welcome" onClick={() => toast("Welcome screens are coming soon")}><span>✧</span> Add Welcome Screen <b>＋</b></button>
            </section>
            <section className="builder-endings">
              <div className="builder-section-title">Endings <button aria-label="Add ending" onClick={() => toast("Endings are coming soon")}>＋</button></div>
            </section>
            <div className="builder-ai-prompt">
              <span aria-hidden="true">✧</span>
              <input aria-label="Ask Inquira AI" placeholder="Ask Inquira AI" onKeyDown={(e) => e.key === "Enter" && toast("AI assistant is coming soon")} />
              <button aria-label="Send to Inquira AI" onClick={() => toast("AI assistant is coming soon")}>▷</button>
            </div>
          </aside>
          <section className="middle">
            <div className="preview-label"><span>Form preview</span><span>Edits are saved when you publish</span></div>
            <div className="preview-frame">
              <Runner key={`${sel}-${inq.accent}-${inq.closing_heading}`} inquiry={inq} startAt={Math.max(idx, 0)} preview onSubmit={async () => {}} />
            </div>
          </section>
          <aside className="right">
            <div className="builder-inspector-section">
              <div className="builder-section-title">Question <button aria-label="Question help" onClick={() => toast("Select a question to edit its content")}>ⓘ</button></div>
              <div className="builder-type-toggle">
                <button className="active">≡ <span>Text</span></button>
                <button onClick={() => toast("Video questions are coming soon")}>▣ <span>Video</span></button>
              </div>
            </div>
            <div className="builder-inspector-answer">
              <div className="builder-section-title">Answer</div>
              {cur ? (<>
                <label>Question</label>
                <textarea className="box-input" rows={2} value={cur.label} placeholder="Type your question" onChange={(e) => patch({ label: e.target.value })} />
                <label>Description</label>
                <input className="box-input" value={cur.hint} placeholder="Description (optional)" onChange={(e) => patch({ hint: e.target.value })} />
                <label className="check"><input type="checkbox" checked={cur.mandatory} onChange={(e) => patch({ mandatory: e.target.checked })} /> Required</label>
                {(cur.kind === "choice" || cur.kind === "dropdown") && (<>
                  <label>Options</label>
                  {cur.choices.map((c, k) => (
                    <div className="row gap" key={k}>
                      <input className="box-input" value={c} onChange={(e) => { const cs = [...cur.choices]; cs[k] = e.target.value; patch({ choices: cs }); }} />
                      <button className="btn" disabled={cur.choices.length <= 2} onClick={() => patch({ choices: cur.choices.filter((_, j) => j !== k) })}>✕</button>
                    </div>))}
                  <button className="btn" onClick={() => patch({ choices: [...cur.choices, `Option ${cur.choices.length + 1}`] })}>＋ Add option</button>
                </>)}
                <button className="builder-answer-type" onClick={() => toast("Answer media is coming soon")}>Image or video <span>＋</span></button>
              </>) : <p className="muted">Add content to create your first question.</p>}
            </div>
            <div className="builder-inspector-logic">
              <div className="builder-section-title">Logic <button aria-label="Add logic" onClick={() => toast("Logic jumps are coming soon")}>＋</button></div>
              {cur && <button className="btn" onClick={() => toast("Logic jumps are coming soon")}>＋ Add logic jump</button>}
            </div>
            {cur && <div className="builder-delete-question"><button className="btn danger" onClick={() => removePrompt(cur.id)}>Delete question</button></div>}
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