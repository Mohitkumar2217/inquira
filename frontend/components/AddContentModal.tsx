"use client";
import { useState } from "react";
import { useToast } from "@/components/Toasts";
import { nextTempId, toPrompts } from "@/lib/guess";
import { Kind, PromptDTO } from "@/lib/types";

type Item = { name: string; icon: string; kind?: Kind; action?: "contact" | "welcome" | "ending"; pro?: boolean; unavailable?: string };
const SECTIONS: { title: string; tone: string; span?: number; items: Item[] }[] = [
  {
    title: "Recommended",
    tone: "blue",
    items: [
      { name: "Multiple Choice", icon: "☰", kind: "choice" },
      { name: "Short Text", icon: "Aa", kind: "short_text" },
      { name: "Email", icon: "✉", kind: "email" },
      { name: "Number", icon: "#", kind: "number" },
      { name: "Rating", icon: "★", kind: "rating" },
      { name: "Yes/No", icon: "✓", kind: "yes_no" },
    ],
  },
  {
    title: "Contact Info",
    tone: "pink",
    items: [
      { name: "Contact Info", icon: "◉", action: "contact" },
      { name: "Email", icon: "✉", kind: "email" },
      { name: "Phone Number", icon: "☎", kind: "phone" },
      { name: "Address", icon: "⌖", kind: "address" },
      { name: "Website", icon: "↗", kind: "url" },
    ],
  },
  {
    title: "Text & Media",
    tone: "blue",
    items: [
      { name: "Short Text", icon: "Aa", kind: "short_text" },
      { name: "Long Text", icon: "¶", kind: "long_text" },
      { name: "Number", icon: "#", kind: "number" },
      { name: "Statement", icon: "❝", kind: "short_text" },
    ],
  },
  {
    title: "Choice",
    tone: "purple",
    items: [
      { name: "Multiple Choice", icon: "☰", kind: "choice" },
      { name: "Dropdown", icon: "▾", kind: "dropdown" },
      { name: "Checkboxes", icon: "☑", kind: "checkbox" },
      { name: "Picture Choice", icon: "▧", kind: "choice" },
      { name: "Yes/No", icon: "✓", kind: "yes_no" },
      { name: "Legal Consent", icon: "⚖", kind: "legal" },
    ],
  },
  {
    title: "Rating & Ranking",
    tone: "green",
    items: [
      { name: "Rating", icon: "★", kind: "rating" },
      { name: "Opinion Scale", icon: "▂▄", kind: "opinion_scale" },
      { name: "Net Promoter Score (NPS)", icon: "◔", kind: "nps" },
      { name: "Ranking", icon: "①", kind: "ranking" },
      { name: "Matrix", icon: "⣿", kind: "matrix" },
    ],
  },
  {
    title: "Other",
    tone: "yellow",
    span: 2,
    items: [
      { name: "Date / Scheduler", icon: "▦", kind: "date" },
      { name: "Welcome Screen", icon: "◫", action: "welcome" },
      { name: "Endings", icon: "◧", action: "ending" },
      { name: "File Upload", icon: "⇪", kind: "short_text", pro: true },
    ],
  },
];

type PromptTemplate = Pick<PromptDTO, "kind" | "label"> &
  Partial<Pick<PromptDTO, "hint" | "mandatory" | "choices">>;

const LEAD_TEMPLATE = (): PromptDTO[] => {
  const prompts: PromptTemplate[] = [
  { kind: "short_text", label: "What's your name?", mandatory: true },
  { kind: "email", label: "What's your work email?", mandatory: true },
  { kind: "short_text", label: "Which company do you work for?" },
  { kind: "dropdown", label: "How big is your team?", choices: ["1-10", "11-50", "51-200", "200+"] },
  { kind: "choice", label: "When do you plan to decide?", choices: ["This month", "This quarter", "Later this year", "Just exploring"] },
  { kind: "long_text", label: "What problem are you trying to solve?" },
  ];
  return prompts.map((prompt) => ({
    id: nextTempId(),
    hint: "",
    mandatory: false,
    choices: [],
    ...prompt,
  }));
};

interface Props { onClose: () => void; onAdd: (k: Kind) => void; onAddContact: () => void; onImport: (ps: PromptDTO[]) => void; }

export default function AddContentModal({ onClose, onAdd, onAddContact, onImport }: Props) {
  const toast = useToast();
  const [tab, setTab] = useState<"elements" | "import" | "ai">("elements");
  const [q, setQ] = useState("");
  const [text, setText] = useState("");
  const [ai, setAi] = useState("");
  const soon = (w: string) => toast(`${w} is coming soon`);
  const TabBtn = ({ id, label }: { id: typeof tab; label: string }) => (
    <button className={`rounded-xl border-2 bg-transparent px-4 py-3 text-[17px] hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/5 max-[700px]:px-2.5 max-[700px]:py-2 max-[700px]:text-sm ${tab === id ? "border-[#3b2c3f] font-medium text-[#111] dark:border-[var(--tf-purple)] dark:text-[var(--tf-text)]" : "border-transparent text-[#444] dark:text-[var(--tf-text-2)]"}`} onClick={() => setTab(id)}>{label}</button>);

  const runImport = (src: string) => {
    const ps = toPrompts(src);
    if (!ps.length) return;
    onImport(ps); toast(`${ps.length} question${ps.length > 1 ? "s" : ""} added`);
  };

  const pillCls = "mb-2 flex w-full items-center gap-3 rounded-lg border border-[#e4e4e4] bg-white px-3 py-[11px] text-left text-base text-[#555] hover:bg-[#f7f7f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[var(--tf-border)] dark:bg-[#222225] dark:text-[var(--tf-text)] dark:hover:bg-[#36363b]";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-2.5 max-[700px]:p-2" onClick={onClose}>
      <div className="max-h-[92vh] w-[min(1180px,96vw)] animate-pop overflow-auto rounded-[14px] bg-[#f6f6f6] px-5 pb-5 pt-3.5 text-[var(--tf-text)] shadow-[0_20px_70px_rgba(0,0,0,.24)] dark:bg-[#19191c] max-[700px]:p-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 pb-3.5 pt-1 max-[700px]:flex-wrap">
          <TabBtn id="elements" label="Add form elements" /><TabBtn id="import" label="Import questions" /><TabBtn id="ai" label="Create with AI" />
          <button type="button" className="ml-auto rounded border-0 bg-transparent p-2 text-xl hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10" aria-label="Close dialog" onClick={onClose}>✕</button>
        </div>

        {tab === "elements" && (
          <div className="grid min-h-[520px] grid-cols-[260px_minmax(0,1fr)] gap-[50px] rounded-xl bg-white px-10 py-8 dark:bg-[#222225] max-[900px]:grid-cols-1 max-[700px]:p-5">
            <div>
              <div className="mb-[22px] flex items-center gap-2.5 rounded-lg border border-[#ddd] bg-[#f6f6f6] p-3 text-[#666] dark:border-[var(--tf-border)] dark:bg-[#211f25] dark:text-[var(--tf-muted)]"><span>⌕</span><input className="min-w-0 flex-1 border-0 bg-transparent font-[inherit] text-[var(--tf-text)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" autoFocus placeholder="Search form elements" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <h6 className="mb-2.5 ml-2 mt-5 text-base font-medium">Recommended</h6>
              <button className={pillCls} onClick={() => soon("Welcome Screen")}><i className="grid size-[30px] shrink-0 place-items-center rounded-[7px] bg-[#ddd] text-sm not-italic text-[#333]">◫</i>Welcome Screen</button>
              <h6 className="mb-2.5 ml-2 mt-5 text-base font-medium">Connect to apps</h6>
              <button className={pillCls} onClick={() => soon("Hubspot")}><i className="grid size-[30px] shrink-0 place-items-center rounded-[7px] bg-[#ff7a59] text-sm not-italic text-white">✱</i>Hubspot</button>
              <button className={pillCls} onClick={() => soon("Salesforce")}><i className="grid size-[30px] shrink-0 place-items-center rounded-[7px] bg-[#e3f4fb] text-sm not-italic text-[#00a1e0]">♧</i>Salesforce<span className="ml-auto grid size-7 place-items-center rounded-full border border-[#bfe3d6] bg-[#eefaf5] text-xs text-[#1a7a60] dark:border-[#285c4b] dark:bg-[#193a30] dark:text-[#8ce0bd]">◇</span></button>
              <button className={pillCls} onClick={() => soon("Apps")}><i className="grid size-[30px] shrink-0 place-items-center rounded-[7px] text-sm not-italic">⊞</i>Browse all apps</button>
            </div>
            <div className="grid grid-cols-3 content-start gap-x-5 gap-y-[34px] max-[900px]:grid-cols-1">
              {SECTIONS.map((s) => {
                const items = s.items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
                if (!items.length) return null;
                return (
                  <div key={s.title} className={s.span ? "col-span-2 max-[900px]:col-span-1" : ""}>
                    <h5 className="mb-2.5 mt-0 text-[17px] font-medium text-[#333] dark:text-[var(--tf-text)]">{s.title}</h5>
                    <div className={s.span ? "grid grid-cols-2 content-start gap-x-5 max-[500px]:grid-cols-1" : ""}>
                      {items.map((i) => (
                                    <button key={i.name} className={`flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-1.5 py-2 text-left text-[17px] text-[#555] hover:bg-[#f3f3f3] hover:text-[#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:text-[#e4e4e7] dark:hover:bg-[#303035] dark:hover:text-white ${i.kind ? "" : "opacity-[.78]"}`}
                                      disabled={!i.kind && !i.action} title={i.unavailable} onClick={() => {
                                        if (i.action === "contact") onAddContact();
                                        else if (i.action === "welcome") { toast("Welcome Screen element configured"); onClose(); }
                                        else if (i.action === "ending") { toast("Endings configured"); onClose(); }
                                        else if (i.kind) onAdd(i.kind);
                                      }}>
                          <i className={`grid size-[30px] shrink-0 place-items-center rounded-[7px] text-sm not-italic text-[#333] ${i.name.match(/Welcome|Partial|Statement|Group|End|Redirect/) ? "bg-[#ddd]" : s.tone === "pink" ? "bg-[#f8c8d4]" : s.tone === "purple" ? "bg-[#dcd4f7]" : s.tone === "green" ? "bg-[#c4e2bb]" : s.tone === "blue" ? "bg-[#c3dcf7]" : "bg-[#fbe0a0]"} dark:text-[#262627]`}>
                            {i.name === "Dropdown" ? <svg className="size-[18px] stroke-current [stroke-width:1.8] [stroke-linecap:round] [stroke-linejoin:round] align-middle" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg> : i.icon}
                          </i>
                          <span>{i.name}</span>{i.pro && <span className="ml-auto grid size-7 place-items-center rounded-full border border-[#bfe3d6] bg-[#eefaf5] text-xs text-[#1a7a60] dark:border-[#285c4b] dark:bg-[#193a30] dark:text-[#8ce0bd]">◇</span>}
                        </button>))}
                    </div>
                  </div>);
              })}
            </div>
          </div>)}

        {tab === "import" && (
          <>
            <div className="flex min-h-[470px] gap-10 rounded-xl bg-white px-10 py-8 dark:bg-[#222225] max-[900px]:block max-[700px]:min-h-0 max-[700px]:p-5">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-[#777] dark:text-[#a1a1aa]">Form questions</div>
                <p className="mb-3.5 mt-1.5 text-base">Copy and paste or type in your questions, and press enter after each one.</p>
                <textarea className="h-[410px] w-full resize-none rounded-xl border border-[#e6e6e6] bg-[#f6f6f6] p-3.5 font-[inherit] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 max-[700px]:h-[240px] dark:border-[var(--tf-border)] dark:bg-[#19191c] dark:text-[var(--tf-text)]" value={text} onChange={(e) => setText(e.target.value)} />
              </div>
              <div className="w-[300px] shrink-0 pt-[26px] max-[900px]:w-auto">
                <div className="mb-[38px] flex flex-col gap-2 rounded-[10px] border border-[#bcd6f0] bg-[#f8fbff] p-[18px] text-base leading-[1.4] text-[#444] dark:border-[#34445a] dark:bg-[#222225] dark:text-[#e4e4e7]"><span className="text-2xl text-[#2a6aa8] dark:text-[#8bbcff]">ⓘ</span>
                  <ul className="m-0 list-disc pl-[22px]"><li className="mb-2.5">Paste or type your questions in the text field</li>
                    <li>Or try Create with AI to build your form from a description, file upload, or URL</li></ul></div>
                <button className="w-full rounded-lg border border-[#e2e2e2] bg-white p-[13px] text-base text-[#555] hover:bg-[#f7f7f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[var(--tf-border)] dark:bg-[#222225] dark:text-[var(--tf-text)] dark:hover:bg-[#36363b]" onClick={() => setTab("ai")}>Create with AI</button>
              </div>
            </div>
            <div className="mt-[18px] flex justify-end"><button className="rounded-lg border border-[var(--tf-purple)] bg-[var(--tf-purple)] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[var(--tf-purple-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={!text.trim()} onClick={() => runImport(text)}>Import questions</button></div>
          </>)}

        {tab === "ai" && (
          <div className="min-h-[520px] rounded-xl bg-white px-10 py-8 dark:bg-[#222225] max-[700px]:p-5">
            <div className="grid grid-cols-[300px_minmax(0,1fr)] items-start gap-[30px] max-[900px]:block">
              <div><div className="text-[#777] dark:text-[#a1a1aa]">Inquira AI</div><h2 className="my-3 text-[30px] font-normal">What would you like to create?</h2></div>
              <div className="rounded-xl border border-[#dcd5df] bg-white p-[5px] shadow-[0_8px_28px_rgba(48,38,51,.07)] dark:border-[#39393e] dark:bg-[#222225]">
                <textarea className="h-[140px] w-full resize-none rounded-t-lg border-0 bg-white p-3.5 text-[15px] text-[var(--tf-text)] outline-none focus-visible:outline focus-visible:outline-2 dark:bg-[#19191c] dark:text-[#f2eff3] dark:placeholder:text-[#85858e]" value={ai} onChange={(e) => setAi(e.target.value)} placeholder="Make my form sound more friendly." />
                <div className="flex items-center justify-between rounded-b-lg border-0 border-t border-[var(--tf-border)] bg-white px-3 py-2 dark:border-[#39353e] dark:bg-[#222225]">
                  <div className="flex gap-2">
                    <button className="border-0 bg-transparent text-lg text-[#555] hover:text-[#111] dark:text-[#d5cfd8] dark:hover:text-white" aria-label="Voice input" onClick={() => soon("Voice input")}>♩</button>
                    <button className="border-0 bg-transparent text-lg text-[#555] hover:text-[#111] dark:text-[#d5cfd8] dark:hover:text-white" aria-label="Add attachment" onClick={() => soon("Attachments")}>+</button>
                    <button className="border-0 bg-transparent text-lg text-[#555] hover:text-[#111] dark:text-[#d5cfd8] dark:hover:text-white" aria-label="More options" onClick={() => soon("More options")}>···</button>
                  </div>
                  <button className={`rounded-md border border-[#ddd] px-2 py-0.5 text-lg hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[#48434d] ${ai.trim() ? "bg-[#3b2c3f] text-white opacity-100 dark:bg-[var(--tf-purple)]" : "bg-transparent text-[#555] opacity-50 dark:text-[#d5cfd8]"}`} onClick={() => ai.trim() ? runImport(ai) : null}>▷</button>
                </div>
              </div>
            </div>
            <hr className="my-7 border-0 border-t border-[#eee] dark:border-[#39353e]" />
            <button className="mb-4 flex w-full items-center gap-5 rounded-[14px] border border-[#e6e6e6] bg-white p-5 text-left text-[17px] text-[#444] hover:shadow-[0_3px_12px_rgba(0,0,0,.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[var(--tf-border)] dark:bg-[#222225] dark:text-[var(--tf-text)]" onClick={() => { onImport(LEAD_TEMPLATE()); toast("Lead qualification questions added"); }}>
              <i className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#e4effd] text-[22px] not-italic text-[#333] dark:bg-[#39313d] dark:text-[#d9c9df]">▤</i><div><b>Lead qualification form</b><p className="mb-0 mt-1.5 max-w-[420px] text-[15px] text-[#777] dark:text-[#a1a1aa]">Qualify your leads with ready-made questions and scoring rules.</p></div></button>
            <button className="mb-4 flex w-full items-center gap-5 rounded-[14px] border border-[#e6e6e6] bg-white p-5 text-left text-[17px] text-[#444] hover:shadow-[0_3px_12px_rgba(0,0,0,.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none dark:border-[var(--tf-border)] dark:bg-[#222225] dark:text-[var(--tf-text)]" disabled title="Quiz logic is not supported yet">
              <i className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#e4effd] text-[22px] not-italic text-[#333] dark:bg-[#39313d] dark:text-[#d9c9df]">◇</i><div><b>Product recommendation quiz</b><p className="mb-0 mt-1.5 max-w-[420px] text-[15px] text-[#777] dark:text-[#a1a1aa]">Boost sales by recommending products with matching rules.</p></div><span className="ml-0 self-start rounded-[10px] border border-[#9cc3ef] bg-[#eaf3fd] px-2 py-px text-xs text-[#1d5fa8] dark:border-[#3c5874] dark:bg-[#253449] dark:text-[#b8d7ff]">Match quiz</span></button>
            <button className="mb-4 flex w-full items-center gap-5 rounded-[14px] border border-[#e6e6e6] bg-white p-5 text-left text-[17px] text-[#444] hover:shadow-[0_3px_12px_rgba(0,0,0,.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none dark:border-[var(--tf-border)] dark:bg-[#222225] dark:text-[var(--tf-text)]" disabled title="Quiz logic is not supported yet">
              <i className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#e4effd] text-[22px] not-italic text-[#333] dark:bg-[#39313d] dark:text-[#d9c9df]">♧</i><div><b>Personality quiz</b><p className="mb-0 mt-1.5 max-w-[420px] text-[15px] text-[#777] dark:text-[#a1a1aa]">Show different results based on answers with matching rules.</p></div><span className="ml-0 self-start rounded-[10px] border border-[#9cc3ef] bg-[#eaf3fd] px-2 py-px text-xs text-[#1d5fa8] dark:border-[#3c5874] dark:bg-[#253449] dark:text-[#b8d7ff]">Match quiz</span></button>
          </div>)}
      </div>
    </div>
  );
}
