"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AddContentModal from "@/components/AddContentModal";
import Runner from "@/components/Runner";
import { ThemeToggleButton } from "@/components/ThemeProvider";
import { useToast } from "@/components/Toasts";
import { call, errorMessage, send } from "@/lib/api";
import { Inquiry, Kind, PromptDTO, kindName } from "@/lib/types";

let tempId = -1;
const Soon = ({ what }: { what: string }) => <div className="soon mt-3.5 flex justify-between rounded-md bg-[#f6f6f6] px-3 py-2.5 text-[13px] dark:bg-[#29292d]"><b>{what}</b><span className="text-[#888] dark:text-[#a1a1aa]">Coming soon</span></div>;
type AccentStyle = React.CSSProperties & { "--accent": string };

export default function Builder() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [inq, setInq] = useState<Inquiry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [tab, setTab] = useState<"create" | "settings" | "connect">("create");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewSession, setPreviewSession] = useState(0);
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

  const idx = inq.prompts.findIndex((p) => p.id === sel);
  const cur = inq.prompts[idx];
  const patch = (c: Partial<PromptDTO>) => mutate((d) => Object.assign(d.prompts[idx], c));

  const addPrompt = (kind: Kind) => {
    const p: PromptDTO = { id: tempId--, kind, label: "", hint: "", mandatory: false,
      choices: ["choice", "dropdown", "checkbox", "ranking", "matrix"].includes(kind)
        ? ["Option 1", "Option 2"] : [] };
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
    <div className="builder h-screen min-h-[560px] flex flex-col bg-[var(--tf-panel-bg)] text-[var(--tf-text)]" style={{ "--accent": inq.accent } as AccentStyle}>
      <header className="builder-header grid h-[46px] flex-[0_0_46px] grid-cols-[minmax(260px,1fr)_auto_minmax(260px,1fr)] items-center gap-[14px] border-b border-[var(--tf-border)] bg-white px-[18px] dark:bg-[#26232a] max-[900px]:h-[78px] max-[900px]:flex-[0_0_78px] max-[900px]:grid-cols-[minmax(180px,1fr)_auto] max-[900px]:gap-2 max-[900px]:px-2.5 max-[600px]:grid-cols-[minmax(0,1fr)_auto]">
        <div className="builder-breadcrumbs flex min-w-0 items-center gap-2.5 text-[13px] text-[#56565e] max-[600px]:gap-1.5">
          <Link href="/" className="logo text-base text-[#262627] dark:text-[#f2eff3]">Inquira</Link>
          <span className="builder-crumb-separator text-[#999]">›</span>
          <Link href="/">Forms</Link>
          <span className="builder-crumb-separator text-[#999]">›</span>
          <input aria-label="Form title" className="title-input min-w-[80px] w-[min(230px,35vw)] rounded px-0.5 py-1 text-[13px] text-[#262627] hover:bg-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7590] dark:text-[#f2eff3] dark:hover:bg-[#303035]" value={inq.title} onChange={(e) => mutate((d) => { d.title = e.target.value; })} />
        </div>
        <nav className="builder-nav flex h-full items-center gap-1 self-stretch max-[900px]:col-span-full max-[900px]:row-start-2 max-[900px]:justify-center max-[900px]:h-9" aria-label="Form sections">
          <button className={`h-full rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 text-[13px] text-[#55555d] hover:text-[#222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] dark:text-[#d5cfd8] ${tab === "create" || tab === "settings" ? "on border-b-[#463449] font-semibold text-[#242126] dark:text-white" : ""}`} onClick={() => setTab("create")}>Content</button>
          <button className="h-full rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 text-[13px] text-[#55555d] hover:text-[#222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] dark:text-[#d5cfd8]" onClick={() => toast("Workflow is coming soon")}>Workflow</button>
          <button className={`h-full rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 text-[13px] text-[#55555d] hover:text-[#222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] dark:text-[#d5cfd8] ${tab === "connect" ? "on border-b-[#463449] font-semibold text-[#242126] dark:text-white" : ""}`} onClick={() => setTab("connect")}>Connect</button>
          <Link className="builder-results-link flex items-center text-[var(--tf-text-2)] hover:bg-[#f4f1f5] hover:text-[var(--tf-text)] dark:text-[#d5cfd8] dark:hover:bg-[#343039] dark:hover:text-white" href={`/results/${inq.id}`}>Results</Link>
        </nav>
        <div className="builder-header-actions flex items-center justify-end gap-2.5 max-[900px]:col-start-2 max-[900px]:row-start-1 max-[600px]:gap-[5px]">
          {inq.status === "published" && <button className="btn builder-share rounded border border-[#ccc] bg-white px-3 py-1.5 text-sm text-[#262627] hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-[#302c34] dark:text-[#f2eff3]" onClick={() => { navigator.clipboard?.writeText(link); toast("Link copied to clipboard"); }}>Share</button>}
          {dirty && <button className="btn builder-share rounded border border-[#ccc] bg-white px-3 py-1.5 text-sm text-[#262627] hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-50 dark:bg-[#302c34] dark:text-[#f2eff3]" disabled={saving || publishing} onClick={() => void save()}>
            {saving ? "Saving…" : "Save changes"}
          </button>}
          <button className="builder-plans rounded-md border-0 bg-[#087663] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#076653] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-50 max-[600px]:hidden" disabled={saving || publishing} onClick={() => void toggleStatus()}>
            {publishing ? "Working…" : inq.status === "published" ? "Unpublish" : "Publish"}
          </button>
          <button className="builder-help size-7 rounded-full border border-[#d5d5da] bg-white text-[13px] text-[#555] hover:bg-[#f3f3f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 max-[600px]:hidden" aria-label="Help" onClick={() => toast("Help is coming soon")}>?</button>
          <ThemeToggleButton />
          <div className="tf-avatar">DC</div>
        </div>
      </header>

      <div className="builder-toolbar grid h-[54px] flex-[0_0_54px] grid-cols-[232px_minmax(0,1fr)_236px] items-center gap-3.5 border-b border-[var(--tf-border)] bg-white px-2 py-1.5 dark:bg-[#26232a] max-[900px]:grid-cols-[190px_minmax(0,1fr)_32px] max-[600px]:grid-cols-[1fr_auto] max-[600px]:p-1.5">
        <button className="builder-mode flex h-10 items-center gap-[9px] rounded-[10px] bg-[#f5f5f6] px-3.5 text-left text-[13px] text-[#53535b] hover:bg-[#efedef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 max-[600px]:hidden" onClick={() => toast("Universal mode is selected")}>
          <span className="builder-mode-icon" aria-hidden="true">☷</span><span>Universal mode</span>
          <svg className="tf-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
        </button>
        <div className="builder-tools flex min-w-0 items-center gap-2 max-[600px]:col-start-1">
          <button className="builder-add-content inline-flex min-w-[132px] shrink-0 items-center gap-[7px] whitespace-nowrap rounded-md border border-[#39313b] bg-[#39313b] px-3.5 text-sm font-semibold text-white hover:bg-[#2f2832] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 max-[600px]:min-w-[30px] max-[600px]:px-[7px]" onClick={() => setAdding(true)}>＋ <span>Add content</span></button>
          <button className={`builder-design-tool h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 max-[600px]:min-w-[30px] max-[600px]:px-[7px] ${tab === "settings" ? "active bg-[#f1eff2] text-[#332b35]" : ""}`} aria-pressed={tab === "settings"} onClick={() => setTab(tab === "settings" ? "create" : "settings")}>◉ <span>Design</span></button>
          <span className="builder-tool-divider mx-0.5 h-6 w-px bg-[#e6e6e8] max-[600px]:hidden" />
          <button className={`h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 max-[600px]:min-w-[30px] max-[600px]:px-[7px] ${previewDevice === "desktop" ? "active bg-[#f1eff2] text-[#332b35]" : ""}`} aria-label="Desktop form view" aria-pressed={previewDevice === "desktop"} onClick={() => setPreviewDevice("desktop")}>▰</button>
          <button className={`h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 max-[600px]:min-w-[30px] max-[600px]:px-[7px] ${previewDevice === "mobile" ? "active bg-[#f1eff2] text-[#332b35]" : ""}`} aria-label="Mobile form view" aria-pressed={previewDevice === "mobile"} onClick={() => setPreviewDevice("mobile")}>▯</button>
          <button className="h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 max-[600px]:min-w-[30px] max-[600px]:px-[7px]" aria-label="Preview form" onClick={() => { setPreviewSession((session) => session + 1); setPreviewOpen(true); }}>▷ <span>Preview</span></button>
          <button className="h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 max-[600px]:min-w-[30px] max-[600px]:px-[7px]" aria-label="Accessibility settings" onClick={() => toast("Accessibility settings are coming soon")}>ⓐ</button>
          <button className="h-9 min-w-9 rounded-[7px] border border-transparent bg-transparent px-2.5 text-sm text-[#62626a] hover:bg-[#f1eff2] hover:text-[#332b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 max-[600px]:min-w-[30px] max-[600px]:px-[7px]" aria-label="More form settings" onClick={() => setTab("settings")}>⚙</button>
        </div>
        <button className="builder-collapse justify-self-end rounded-md border-0 bg-transparent text-[15px] text-[#666] hover:bg-[#f3f3f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 max-[600px]:col-start-2 max-[600px]:row-start-1" aria-label="Collapse settings panel" onClick={() => toast("Panel controls are coming soon")}>◧</button>
      </div>

      {tab === "create" && (
        <div className="panes grid min-h-0 flex-1 grid-cols-[232px_minmax(0,1fr)_236px] max-[900px]:grid-cols-[190px_minmax(0,1fr)] max-[600px]:grid-cols-1">
          <aside className="left builder-pages flex min-w-0 flex-col gap-2.5 overflow-auto border-r-0 bg-[#f7f7f8] px-2.5 py-3 dark:bg-[#252229] max-[600px]:hidden">
            <section className="builder-page-list rounded-[10px] border border-[#ececef] bg-white p-2 dark:border-[#39353e] dark:bg-[#252229]">
              <div className="builder-section-title flex items-center justify-between gap-2 text-[13px] font-semibold text-[#34343b] dark:text-[#f2eff3]">Pages <button className="grid size-7 place-items-center rounded-[7px] border border-[#e6e6e9] bg-white text-base text-[#6b6b73] hover:bg-[#f5f5f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#44444b] dark:bg-[#303035] dark:text-[#e4e4e7]" aria-label="Add page" onClick={() => setAdding(true)}>＋</button></div>
              <ul>
              {inq.prompts.map((p, i) => (
                <li key={p.id} draggable onDragStart={() => (dragFrom.current = i)} onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(i)} className={`min-h-[38px] flex cursor-pointer items-center gap-2 rounded-[7px] px-[7px] py-[5px] text-xs text-[#62626a] hover:bg-[#f0eef1] hover:text-[#322b35] dark:hover:bg-[#333039] dark:hover:text-white ${p.id === sel ? "on bg-[#f0eef1] text-[#322b35] dark:bg-[#333039] dark:text-white" : ""}`} onClick={() => setSel(p.id)}>
                  <span className="builder-question-kind grid h-[22px] w-6 shrink-0 place-items-center rounded-[5px] bg-[#d9eafa] text-[13px] text-[#2a5a86] dark:bg-[#303d4e] dark:text-[#b8d7ff]">≡</span>
                  <span className="ellipsis">{p.label || kindName(p.kind)}</span>
                  <button className="builder-question-menu ml-auto border-0 bg-transparent text-[17px] text-[#777] hover:text-[#333] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={`More options for ${p.label || kindName(p.kind)}`} onClick={(e) => { e.stopPropagation(); toast("Question options are coming soon"); }}>···</button>
                </li>))}
                {inq.prompts.length === 0 && <li className="empty h-auto leading-6 text-[#8a8a91]">Add content to create your first question.</li>}
              </ul>
              <button className="builder-add-welcome mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-[#e2e2e5] bg-white p-2 text-left text-xs text-[#414149] hover:bg-[#faf9fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#39353e] dark:bg-[#252229] dark:text-[#e4e4e7]" onClick={() => toast("Welcome screens are coming soon")}><span className="text-base">✧</span> Add Welcome Screen <b className="ml-auto grid size-6 place-items-center rounded-md border border-[#e7e7e9] text-[15px] font-normal dark:border-[#44444b]">＋</b></button>
            </section>
            <section className="builder-endings min-h-[122px] rounded-[10px] border border-[#ececef] bg-white p-2 dark:border-[#39353e] dark:bg-[#252229]">
              <div className="builder-section-title flex items-center justify-between gap-2 text-[13px] font-semibold text-[#34343b] dark:text-[#f2eff3]">Endings <button className="grid size-7 place-items-center rounded-[7px] border border-[#e6e6e9] bg-white text-base text-[#6b6b73] hover:bg-[#f5f5f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#44444b] dark:bg-[#303035] dark:text-[#e4e4e7]" aria-label="Add ending" onClick={() => toast("Endings are coming soon")}>＋</button></div>
            </section>
            <div className="builder-ai-prompt mt-auto flex items-center gap-2 rounded-[9px] border border-[#e9d8ed] bg-white px-[9px] py-[7px] text-[#75657a] shadow-sm dark:border-[#39353e] dark:bg-[#252229] dark:text-[#eadcf0]">
              <span className="text-[15px]" aria-hidden="true">✧</span>
              <input aria-label="Ask Inquira AI" placeholder="Ask Inquira AI" onKeyDown={(e) => e.key === "Enter" && toast("AI assistant is coming soon")} />
              <button className="size-[25px] rounded bg-[#f4edf6] text-[#76617c] hover:bg-[#ebe1ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-[#38303b] dark:text-[#eadcf0]" aria-label="Send to Inquira AI" onClick={() => toast("AI assistant is coming soon")}>▷</button>
            </div>
          </aside>
          <section className="middle flex min-w-0 flex-col bg-white p-0">
            <div className="preview-label mb-0 flex h-8 flex-[0_0_32px] items-center justify-between px-3 text-[11px] text-[#797981]"><span>Form preview</span><span className="text-[10px] max-[600px]:hidden">Edits are saved when you publish</span></div>
            <div className={`preview-frame relative min-h-0 flex-1 overflow-hidden rounded-none border border-[#eeeeef] bg-[#fafafa] shadow-none dark:border-[#38383e] dark:bg-[#1d1d21] ${previewDevice === "mobile" ? "mobile-view flex justify-center border-x border-[var(--tf-border)] px-3" : ""}`}>
              <Runner key={`${sel}-${idx}-${inq.accent}-${inq.closing_heading}`} inquiry={inq} startAt={Math.max(idx, 0)} preview onSubmit={async () => {}} />
            </div>
          </section>
          <aside className="right flex min-w-0 flex-col gap-2 overflow-auto border-l-0 bg-[#f7f7f8] p-3 dark:bg-[#252229] max-[900px]:hidden">
            <div className="builder-inspector-section rounded-[10px] border border-[#ececef] bg-white p-3 pb-2.5 dark:border-[#39353e] dark:bg-[#252229]">
              <div className="builder-section-title flex items-center justify-between gap-2 text-[13px] font-semibold text-[#34343b] dark:text-[#f2eff3]">Question <button className="grid size-7 place-items-center rounded-[7px] border border-[#e6e6e9] bg-white text-base text-[#6b6b73] hover:bg-[#f5f5f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#44444b] dark:bg-[#303035] dark:text-[#e4e4e7]" aria-label="Question help" onClick={() => toast("Select a question to edit its content")}>ⓘ</button></div>
              <div className="builder-type-toggle mt-2.5 grid grid-cols-2 gap-1 rounded-[7px] bg-[#f1f1f3] p-[3px] dark:bg-[#303035]">
                <button className="active" disabled>≡ <span>{cur ? kindName(cur.kind) : "Text"}</span></button>
                <button disabled title="Video questions are not supported yet">▣ <span>Video</span></button>
              </div>
            </div>
            <div className="builder-inspector-answer rounded-[10px] border border-[#ececef] bg-white p-3 dark:border-[#39353e] dark:bg-[#252229]">
              <div className="builder-section-title flex items-center justify-between gap-2 text-[13px] font-semibold text-[#34343b] dark:text-[#f2eff3]">Answer</div>
              {cur ? (<>
                <label>Question</label>
                <textarea className="box-input" rows={2} value={cur.label} placeholder="Type your question" onChange={(e) => patch({ label: e.target.value })} />
                <label>Description</label>
                <input className="box-input" value={cur.hint} placeholder="Description (optional)" onChange={(e) => patch({ hint: e.target.value })} />
                <label className="check"><input type="checkbox" checked={cur.mandatory} onChange={(e) => patch({ mandatory: e.target.checked })} /> Required</label>
                {["choice", "dropdown", "checkbox", "ranking", "matrix"].includes(cur.kind) && (<>
                  <label>{cur.kind === "matrix" ? "Rows" : "Options"}</label>
                  {cur.choices.map((c, k) => (
                    <div className="row gap" key={k}>
                      <input className="box-input my-1 mb-2.5 w-full rounded border border-[#ccc] px-2.5 py-[9px] text-[13px] focus:border-[#8a6e91] focus:outline focus:outline-2 focus:outline-[#f1e9f2] dark:border-[#44444b] dark:bg-[#1d1d21] dark:text-[#f4f4f5]" value={c} onChange={(e) => { const cs = [...cur.choices]; cs[k] = e.target.value; patch({ choices: cs }); }} />
                      <button className="btn rounded border border-[#ccc] bg-white px-3.5 py-2 text-sm text-[#262627] hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-50 dark:border-[#45454b] dark:bg-[#29292d] dark:text-[#e4e4e7]" aria-label={`Remove ${cur.kind === "matrix" ? "row" : "option"} ${k + 1}`} disabled={cur.choices.length <= 2} onClick={() => patch({ choices: cur.choices.filter((_, j) => j !== k) })}>✕</button>
                    </div>))}
                  <button className="btn rounded border border-[#ccc] bg-white px-3.5 py-2 text-sm text-[#262627] hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#45454b] dark:bg-[#29292d] dark:text-[#e4e4e7]" onClick={() => patch({ choices: [...cur.choices, `${cur.kind === "matrix" ? "Row" : "Option"} ${cur.choices.length + 1}`] })}>
                    ＋ Add {cur.kind === "matrix" ? "row" : "option"}
                  </button>
                </>)}
                <button className="builder-answer-type mt-3.5 flex w-full items-center justify-between border-0 border-t border-[#eeeeef] bg-transparent pt-[9px] text-left text-xs text-[#4b4b53] hover:text-[#28252b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#3a3a40] dark:text-[#e4e4e7]" onClick={() => toast("Answer media is coming soon")}>Image or video <span className="grid size-[25px] place-items-center rounded-md border border-[#e6e6e9] text-base dark:border-[#44444b]">＋</span></button>
              </>) : <p className="muted">Add content to create your first question.</p>}
            </div>
            <div className="builder-inspector-logic rounded-[10px] border border-[#ececef] bg-white p-3 dark:border-[#39353e] dark:bg-[#252229]">
              <div className="builder-section-title flex items-center justify-between gap-2 text-[13px] font-semibold text-[#34343b] dark:text-[#f2eff3]">Logic <button className="grid size-7 place-items-center rounded-[7px] border border-[#e6e6e9] bg-white text-base text-[#6b6b73] hover:bg-[#f5f5f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#44444b] dark:bg-[#303035] dark:text-[#e4e4e7]" aria-label="Add logic" onClick={() => toast("Logic jumps are coming soon")}>＋</button></div>
              {cur && <button className="btn rounded border border-[#ccc] bg-white px-3.5 py-2 text-sm text-[#262627] hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#45454b] dark:bg-[#29292d] dark:text-[#e4e4e7]" onClick={() => toast("Logic jumps are coming soon")}>＋ Add logic jump</button>}
            </div>
            {cur && <div className="builder-delete-question"><button className="btn danger rounded border border-[#e6b8b2] bg-white px-3.5 py-2 text-sm text-[#c0392b] hover:bg-[#fdf3f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-[#29292d]" onClick={() => removePrompt(cur.id)}>Delete question</button></div>}
          </aside>
        </div>)}

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
        </div>)}

      {tab === "connect" && (
        <div className="page-pad mx-auto my-8 max-w-[560px] px-5">
          <h3>Share</h3>
          {inq.status === "published" ? <input className="box-input my-1 mb-2.5 w-full rounded border border-[#ccc] px-2.5 py-[9px] text-[13px] focus:border-[#8a6e91] focus:outline focus:outline-2 focus:outline-[#f1e9f2] dark:border-[#44444b] dark:bg-[#1d1d21] dark:text-[#f4f4f5]" readOnly value={link} onFocus={(e) => e.target.select()} /> : <p className="muted text-[#777] dark:text-[#a1a1aa]">Publish the form to get a public link.</p>}
          <Soon what="Integrations & webhooks" /><Soon what="Team collaboration" />
        </div>)}

      {previewOpen && (
        <div className="builder-preview-overlay fixed inset-0 z-[80] grid place-items-center bg-[rgba(20,18,22,.72)] p-5 max-[620px]:p-0" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPreviewOpen(false);
        }}>
          <section className="builder-preview-dialog flex h-[min(900px,100%)] w-[min(1200px,100%)] flex-col overflow-hidden rounded-xl border border-[var(--tf-border)] bg-[var(--tf-white)] text-[var(--tf-text)] shadow-[0_24px_80px_rgba(0,0,0,.28)] max-[620px]:h-full max-[620px]:w-full max-[620px]:rounded-none" role="dialog" aria-modal="true" aria-label="Form preview">
            <header className="builder-preview-header grid h-[54px] flex-[0_0_54px] grid-cols-[1fr_auto_1fr] items-center border-b border-[var(--tf-border)] px-3.5 text-sm font-semibold">
              <button className="builder-preview-close size-[34px] rounded-md border-0 bg-transparent text-2xl font-light text-[var(--tf-text-2)] hover:bg-[var(--tf-panel-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" aria-label="Close preview" onClick={() => setPreviewOpen(false)}>×</button>
              <span>Preview</span>
              <div className="builder-preview-actions flex items-center justify-end gap-3">
                <div className="builder-preview-devices flex gap-0.5 rounded-lg border border-[var(--tf-border)] p-[3px]" role="group" aria-label="Preview device">
                  <button className={`min-w-9 rounded-md border-0 bg-transparent text-[15px] text-[var(--tf-text-2)] hover:bg-[var(--tf-panel-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${previewDevice === "desktop" ? "active bg-[var(--tf-purple)] text-white dark:bg-[var(--tf-purple-dark)]" : ""}`} aria-label="Desktop preview" aria-pressed={previewDevice === "desktop"} onClick={() => setPreviewDevice("desktop")}>▰</button>
                  <button className={`min-w-9 rounded-md border-0 bg-transparent text-[15px] text-[var(--tf-text-2)] hover:bg-[var(--tf-panel-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${previewDevice === "mobile" ? "active bg-[var(--tf-purple)] text-white dark:bg-[var(--tf-purple-dark)]" : ""}`} aria-label="Mobile preview" aria-pressed={previewDevice === "mobile"} onClick={() => setPreviewDevice("mobile")}>▯</button>
                </div>
                <button className="builder-preview-reset rounded-md border-0 bg-transparent px-2.5 text-[13px] text-[var(--tf-text-2)] hover:bg-[var(--tf-panel-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 max-[620px]:[&_span]:hidden" onClick={() => setPreviewSession((session) => session + 1)}>↻ <span>Restart</span></button>
              </div>
            </header>
            <div className={`builder-preview-stage grid min-h-0 flex-1 place-items-center bg-[#f2f0f3] p-6 dark:bg-[#171619] max-[620px]:p-3 ${previewDevice === "mobile" ? "mobile p-2" : ""}`}>
              <div className={`builder-preview-surface h-[min(740px,100%)] w-[min(1080px,100%)] overflow-hidden rounded-[10px] border border-[var(--tf-border)] bg-white shadow-[0_6px_24px_rgba(0,0,0,.08)] dark:bg-[#1d1b20] ${previewDevice === "mobile" ? "h-[min(780px,100%)] w-[min(390px,100%)] rounded-[24px] shadow-[0_12px_32px_rgba(0,0,0,.16)]" : ""}`}>
                <Runner key={`full-preview-${previewSession}`} inquiry={inq} preview onSubmit={async () => {}} />
              </div>
            </div>
          </section>
        </div>
      )}

      {adding && (
        <AddContentModal onClose={() => setAdding(false)} onAdd={addPrompt}
          onImport={(ps) => { mutate((d) => d.prompts.push(...ps)); setSel(ps[0].id); setAdding(false); }} />)}
    </div>
  );
}