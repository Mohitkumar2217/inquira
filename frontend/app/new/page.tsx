"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toasts";
import { ThemeToggleButton } from "@/components/ThemeProvider";
import AccountMenu from "@/components/AccountMenu";
import { call, errorMessage, send } from "@/lib/api";
import { toPrompts } from "@/lib/guess";
import { Inquiry, PromptDTO } from "@/lib/types";
import { USER } from "@/lib/user";

export default function NewForm() {
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [isZoomingOut, setIsZoomingOut] = useState(false);

  const make = async (prompts: PromptDTO[]) => {
    if (busy) return;
    setBusy(true);
    setIsZoomingOut(true);
    try {
      const workspaceId = sessionStorage.getItem("inquira.workspace");
      const d = await call<Inquiry>("/api/inquiries", send("POST", {
        title: "Untitled form", prompts, workspace_id: workspaceId ? Number(workspaceId) : undefined,
      }));
      sessionStorage.removeItem("inquira.workspace");
      setTimeout(() => {
        router.push(`/builder/${d.id}`);
      }, 180);
    } catch (error: unknown) { toast(errorMessage(error)); setBusy(false); setIsZoomingOut(false); }
  };
  const generate = () => {
    const ps = toPrompts(text);
    if (!ps.length) { toast("Type or paste at least one question"); return; }
    make(ps);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--tf-panel-bg)] px-[18px] pb-[18px] text-[var(--tf-text)] max-[900px]:px-3 max-[900px]:pb-3 max-[620px]:px-2 max-[620px]:pb-2 dark:bg-[#1d1b20] dark:text-[#f2eff3]">
      <header className="flex h-[60px] items-center justify-between border-b border-[var(--tf-border)] bg-white px-5 max-[700px]:h-auto max-[700px]:min-h-[60px] max-[700px]:gap-2 max-[620px]:px-[10px] dark:border-[#39353e] dark:bg-[#26232a]">
        <div className="flex items-center gap-2 text-base text-[#444] dark:text-[#e4e4e7]"><Link className="inline-block" href="/">▤ Forms</Link><span>›</span><span>New form</span></div>
        <div className="flex items-center gap-2 max-[700px]:gap-1">
          <button className="h-8 w-8 rounded-full border-[1.5px] border-[var(--tf-border-mid)] bg-white text-[14px] text-[var(--tf-text)] dark:border-[#4b4550] dark:text-[#e4e4e7]" onClick={() => toast("Help is coming soon")}>?</button>
          <ThemeToggleButton />
          <AccountMenu />
        </div>
      </header>
      <div className="grid flex-1 place-items-center overflow-hidden rounded-xl border border-[var(--tf-border)] bg-[var(--tf-panel-bg)] p-5 dark:bg-[#1d1b20]">
        <div className={`w-full max-w-[640px] text-center motion-reduce:animate-none ${isZoomingOut ? "animate-zoom-out-exit" : "animate-zoom-out-enter"}`}>
          <div className="text-[#767676] dark:text-[#b4acb9]">Inquira AI</div>
          <h1 className="mb-[26px] text-[clamp(26px,4vw,36px)] font-medium tracking-[-.03em] text-[var(--tf-text)] dark:text-[#f2eff3]">What would you like to create?</h1>
          <div className="rounded-lg border-[3px] border-[#f1def6] bg-white p-[3px] text-left dark:bg-[#222225] dark:text-[#f4f4f5]">
            <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste your form questions."
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }}
              className="h-[130px] w-full resize-none rounded-t-lg rounded-b-none border border-b-0 border-[#444] bg-white p-[14px] font-[inherit] text-base text-[var(--tf-text)] outline-none dark:border-[#39393e] dark:bg-[#19191c] dark:text-[#f4f4f5] dark:placeholder:text-[#85858e]" />
            <div className="flex items-center justify-between rounded-b-lg border border-t-0 border-[#444] px-3 py-2 dark:border-[#39393e] dark:bg-[#19191c] dark:text-[#f4f4f5]">
              <div className="flex gap-2">
                <button className="border-0 bg-transparent text-lg text-[#555] dark:text-[#e4e4e7]" aria-label="Voice input" onClick={() => toast("Voice input is coming soon")}>♩</button>
                <button className="border-0 bg-transparent text-lg text-[#555] dark:text-[#e4e4e7]" aria-label="Add attachment" onClick={() => toast("Attachments are coming soon")}>+</button>
                <button className="border-0 bg-transparent text-lg text-[#555] dark:text-[#e4e4e7]" aria-label="More options" onClick={() => toast("More options are coming soon")}>···</button>
              </div>
              <button className={`rounded-md border border-[#ddd] px-2 py-[2px] text-lg active:scale-95 transition-transform duration-150 ${text.trim() ? "bg-[#3b2c3f] text-white opacity-100" : "text-[#555] opacity-50 dark:text-[#e4e4e7]"}`} onClick={generate} aria-label="Create from text">▷</button>
            </div>
          </div>
          <hr className="my-[30px] border-0 border-t border-[var(--tf-border)]" />
          <div className="grid grid-cols-2 gap-[10px] max-[620px]:grid-cols-1">
            <button className="flex min-h-[58px] items-center justify-start gap-[10px] rounded-lg border border-[var(--tf-border)] bg-white px-[14px] py-3 text-left text-[13px] text-[var(--tf-text-2)] hover:border-[var(--tf-border-mid)] hover:bg-[#faf9fa] active:scale-95 transition-transform duration-150 dark:border-[#39353e] dark:bg-[#26232a] dark:text-[#f2eff3] dark:hover:bg-[#343039]" onClick={() => make([])}>Start from scratch</button>
            <button className="flex min-h-[58px] items-center justify-start gap-[10px] rounded-lg border border-[var(--tf-border)] bg-white px-[14px] py-3 text-left text-[13px] text-[var(--tf-text-2)] hover:border-[var(--tf-border-mid)] hover:bg-[#faf9fa] active:scale-95 transition-transform duration-150 dark:border-[#39353e] dark:bg-[#26232a] dark:text-[#f2eff3] dark:hover:bg-[#343039]" onClick={() => toast("CRM sync is coming soon")}>Sync to CRM <span className="grid h-[25px] w-[25px] place-items-center rounded-md bg-white font-bold text-[#ff7a59] dark:bg-[#26232a]">h</span><span className="grid h-[25px] w-[25px] place-items-center rounded-md bg-white font-bold text-[#00a1e0] dark:bg-[#26232a]">☁</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}