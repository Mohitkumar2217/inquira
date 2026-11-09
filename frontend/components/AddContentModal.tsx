"use client";
import { useState } from "react";
import { useToast } from "@/components/Toasts";
import { nextTempId, toPrompts } from "@/lib/guess";
import { Kind, PromptDTO } from "@/lib/types";

type Item = { name: string; icon: string; kind?: Kind; pro?: boolean };
const SECTIONS: { title: string; tone: string; span?: number; items: Item[] }[] = [
  { title: "Contact info", tone: "pink", items: [
    { name: "Contact Info", icon: "👤" }, { name: "Email", icon: "✉", kind: "email" }, { name: "Phone Number", icon: "☎" },
    { name: "Address", icon: "⌖" }, { name: "Website", icon: "🔗" }] },
  { title: "Choice", tone: "purple", items: [
    { name: "Multiple Choice", icon: "☰", kind: "choice" }, { name: "Dropdown", icon: "⌄", kind: "dropdown" },
    { name: "Picture Choice", icon: "🏞" }, { name: "Yes/No", icon: "⊘", kind: "yes_no" },
    { name: "Legal", icon: "⚖" }, { name: "Checkbox", icon: "☑" }] },
  { title: "Rating & ranking", tone: "green", items: [
    { name: "Net Promoter Score®", icon: "◔" }, { name: "Opinion Scale", icon: "▂▄" }, { name: "Rating", icon: "☆", kind: "rating" },
    { name: "Ranking", icon: "①" }, { name: "Matrix", icon: "⣿" }] },
  { title: "Text & Video", tone: "blue", items: [
    { name: "Long Text", icon: "≡", kind: "long_text" }, { name: "Short Text", icon: "▭", kind: "short_text" },
    { name: "Video and Audio", icon: "▶", pro: true }, { name: "Clarify with AI", icon: "✎", pro: true }, { name: "FAQ with AI", icon: "?", pro: true }] },
  { title: "Other", tone: "yellow", span: 2, items: [
    { name: "Number", icon: "#", kind: "number" }, { name: "Date", icon: "▦" }, { name: "Signature", icon: "✍", pro: true },
    { name: "Payment", icon: "▭", pro: true }, { name: "File Upload", icon: "⇪", pro: true }, { name: "Scheduler", icon: "▤" },
    { name: "Welcome Screen", icon: "◫" }, { name: "Partial Submit Point", icon: "▽", pro: true }, { name: "Statement", icon: "❝" },
    { name: "Question Group", icon: "▥" }, { name: "End Screen", icon: "◧" }, { name: "Redirect to URL", icon: "↪", pro: true }] },
];

const LEAD_TEMPLATE = (): PromptDTO[] => [
  { kind: "short_text", label: "What's your name?", mandatory: true },
  { kind: "email", label: "What's your work email?", mandatory: true },
  { kind: "short_text", label: "Which company do you work for?" },
  { kind: "dropdown", label: "How big is your team?", choices: ["1-10", "11-50", "51-200", "200+"] },
  { kind: "choice", label: "When do you plan to decide?", choices: ["This month", "This quarter", "Later this year", "Just exploring"] },
  { kind: "long_text", label: "What problem are you trying to solve?" },
].map((p: any) => ({ id: nextTempId(), hint: "", mandatory: false, choices: [], ...p }));

interface Props { onClose: () => void; onAdd: (k: Kind) => void; onImport: (ps: PromptDTO[]) => void; }

export default function AddContentModal({ onClose, onAdd, onImport }: Props) {
  const toast = useToast();
  const [tab, setTab] = useState<"elements" | "import" | "ai">("elements");
  const [q, setQ] = useState("");
  const [text, setText] = useState("");
  const [ai, setAi] = useState("");
  const soon = (w: string) => toast(`${w} is coming soon`);
  const TabBtn = ({ id, label }: { id: typeof tab; label: string }) => (
    <button className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>);

  const runImport = (src: string) => {
    const ps = toPrompts(src);
    if (!ps.length) return;
    onImport(ps); toast(`${ps.length} question${ps.length > 1 ? "s" : ""} added`);
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="am" onClick={(e) => e.stopPropagation()}>
        <div className="am-tabs">
          <TabBtn id="elements" label="Add form elements" /><TabBtn id="import" label="Import questions" /><TabBtn id="ai" label="Create with AI" />
          <button className="ghost am-x" onClick={onClose}>✕</button>
        </div>

        {tab === "elements" && (
          <div className="am-card am-elements">
            <div className="am-left">
              <div className="am-search"><span>⌕</span><input autoFocus placeholder="Search form elements" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <h6>Recommended</h6>
              <button className="am-pill" onClick={() => soon("Welcome Screen")}><i className="am-ico gray">◫</i>Welcome Screen</button>
              <h6>Connect to apps</h6>
              <button className="am-pill" onClick={() => soon("Hubspot")}><i className="am-ico orange">✱</i>Hubspot</button>
              <button className="am-pill" onClick={() => soon("Salesforce")}><i className="am-ico sky">☁</i>Salesforce<span className="am-gem">◇</span></button>
              <button className="am-pill" onClick={() => soon("Apps")}><i className="am-ico plain">⊞</i>Browse all apps</button>
            </div>
            <div className="am-grid">
              {SECTIONS.map((s) => {
                const items = s.items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
                if (!items.length) return null;
                return (
                  <div key={s.title} className={"am-sec" + (s.span ? " span" : "")}>
                    <h5>{s.title}</h5>
                    <div className={s.span ? "am-two" : ""}>
                      {items.map((i) => (
                        <button key={i.name} className={"am-item" + (i.kind ? "" : " off")}
                          onClick={() => (i.kind ? onAdd(i.kind) : soon(i.name))}>
                          <i className={"am-ico " + (i.name.match(/Welcome|Partial|Statement|Group|End|Redirect/) ? "gray" : s.tone)}>{i.icon}</i>
                          <span>{i.name}</span>{i.pro && <span className="am-gem">◇</span>}
                        </button>))}
                    </div>
                  </div>);
              })}
            </div>
          </div>)}

        {tab === "import" && (
          <>
            <div className="am-card am-import">
              <div className="grow">
                <div className="muted small">Form questions</div>
                <p>Copy and paste or type in your questions, and press enter after each one.</p>
                <textarea value={text} onChange={(e) => setText(e.target.value)} />
              </div>
              <div className="am-side">
                <div className="am-info"><span>ⓘ</span>
                  <ul><li>Paste or type your questions in the text field</li>
                    <li>Or try Create with AI to build your form from a description, file upload, or URL</li></ul></div>
                <button className="am-wide" onClick={() => setTab("ai")}>Create with AI</button>
              </div>
            </div>
            <div className="row end"><button className="primary" disabled={!text.trim()} onClick={() => runImport(text)}>Import questions</button></div>
          </>)}

        {tab === "ai" && (
          <div className="am-card am-ai">
            <div className="am-ai-top">
              <div><div className="muted">Inquira AI</div><h2>What would you like to create?</h2></div>
              <div className="tf-compose">
                <textarea value={ai} onChange={(e) => setAi(e.target.value)} placeholder="Make my form sound more friendly." />
                <div className="tf-compose-bar">
                  <div className="row gap"><button onClick={() => soon("Voice input")}>🎙</button><button onClick={() => soon("Attachments")}>+</button><button onClick={() => soon("More options")}>···</button></div>
                  <button className={"tf-send" + (ai.trim() ? " on" : "")} onClick={() => ai.trim() ? runImport(ai) : null}>▷</button>
                </div>
              </div>
            </div>
            <hr className="am-hr" />
            <button className="am-tpl" onClick={() => { onImport(LEAD_TEMPLATE()); toast("Lead qualification questions added"); }}>
              <i className="am-ico blue big">▤</i><div><b>Lead qualification form</b><p>Qualify your leads with ready-made questions and scoring rules.</p></div></button>
            <button className="am-tpl" onClick={() => soon("Product recommendation quiz")}>
              <i className="am-ico blue big">🏷</i><div><b>Product recommendation quiz</b><p>Boost sales by recommending products with matching rules.</p></div><span className="tf-beta">Match quiz</span></button>
            <button className="am-tpl" onClick={() => soon("Personality quiz")}>
              <i className="am-ico blue big">👥</i><div><b>Personality quiz</b><p>Show different results based on answers with matching rules.</p></div><span className="tf-beta">Match quiz</span></button>
          </div>)}
      </div>
    </div>
  );
}
