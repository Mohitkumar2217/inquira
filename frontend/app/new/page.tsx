"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toasts";
import { call, send } from "@/lib/api";
import { toPrompts } from "@/lib/guess";
import { Inquiry, PromptDTO } from "@/lib/types";

export default function NewForm() {
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const make = async (prompts: PromptDTO[]) => {
    if (busy) return;
    setBusy(true);
    try {
      const d = await call<Inquiry>("/api/inquiries", send("POST", { title: "Untitled form", prompts }));
      router.push(`/builder/${d.id}`);
    } catch (e: any) { toast(e.message); setBusy(false); }
  };
  const generate = () => {
    const ps = toPrompts(text);
    if (!ps.length) { toast("Type or paste at least one question"); return; }
    make(ps);
  };

  return (
    <div className="tf-page">
      <header className="tf-top">
        <div className="row center gap tf-crumb"><Link href="/">▤ Forms</Link><span>›</span><span>New form</span></div>
        <div className="row center gap"><button className="tf-round" onClick={() => toast("Help is coming soon")}>?</button><div className="tf-avatar">DC</div></div>
      </header>
      <div className="tf-panel tf-new">
        <div className="tf-new-inner">
          <div className="muted">Inquira AI</div>
          <h1 className="tf-new-h">What would you like to create?</h1>
          <div className="tf-compose">
            <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste your form questions."
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }} />
            <div className="tf-compose-bar">
              <div className="row gap">
                <button onClick={() => toast("Voice input is coming soon")}>🎙</button>
                <button onClick={() => toast("Attachments are coming soon")}>+</button>
                <button onClick={() => toast("More options are coming soon")}>···</button>
              </div>
              <button className={"tf-send" + (text.trim() ? " on" : "")} onClick={generate} aria-label="Create from text">▷</button>
            </div>
          </div>
          <hr className="tf-new-hr" />
          <div className="row gap tf-new-actions">
            <button onClick={() => make([])}>Start from scratch</button>
            <button onClick={() => toast("CRM sync is coming soon")}>Sync to CRM <span className="tf-crm hub">h</span><span className="tf-crm sf">☁</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}
