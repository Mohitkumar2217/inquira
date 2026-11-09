"use client";
import { useEffect, useRef, useState } from "react";
import { Inquiry, PromptDTO } from "@/lib/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function checkValue(p: PromptDTO, raw?: string): string | null {
  const v = (raw ?? "").trim();
  if (!v) return p.mandatory ? "This question is required" : null;
  if (p.kind === "email" && !EMAIL.test(v)) return "That email address doesn't look right";
  if (p.kind === "number" && isNaN(Number(v))) return "Please enter a number";
  return null;
}

interface Props {
  inquiry: Inquiry;
  onSubmit: (answers: Record<number, string>) => Promise<void>;
  startAt?: number;
  preview?: boolean;
}

export default function Runner({ inquiry, onSubmit, startAt = 0, preview }: Props) {
  const ps = inquiry.prompts;
  const n = ps.length;
  const [i, setI] = useState(Math.min(startAt, n));
  const [dir, setDir] = useState(1);
  const [ans, setAns] = useState<Record<number, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<any>(null);
  const p = ps[i];

  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus?.(), 350); return () => clearTimeout(t); }, [i]);

  const advance = async (ov?: string) => {
    if (busy || !p) return;
    const a = ov !== undefined ? { ...ans, [p.id]: ov } : ans;
    const e = checkValue(p, a[p.id]);
    if (e) { setErr(e); return; }
    setErr(null);
    if (i === n - 1) {
      setBusy(true);
      try { await onSubmit(a); setDir(1); setI(n); }
      catch (x: any) {
        if (x.fieldErrors) {
          const bad = ps.findIndex((q) => x.fieldErrors[q.id]);
          if (bad >= 0) { setDir(-1); setI(bad); setErr(x.fieldErrors[ps[bad].id]); }
        } else setErr(x.message);
      } finally { setBusy(false); }
      return;
    }
    setDir(1); setI(i + 1);
  };
  const back = () => { if (i > 0 && i <= n) { setErr(null); setDir(-1); setI(i - 1); } };
  const pick = (v: string) => { setAns((s) => ({ ...s, [p.id]: v })); setErr(null); setTimeout(() => advance(v), 380); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!p) return;
      const tag = (e.target as HTMLElement).tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "Enter") {
        if (tag === "TEXTAREA" && !(e.metaKey || e.ctrlKey)) return;
        if (preview && (tag === "INPUT" || tag === "TEXTAREA") && !(e.target as HTMLElement).closest(".runner")) return;
        if (!(e.target as HTMLElement).closest(".runner") && typing) return;
        e.preventDefault(); advance();
      } else if (e.key === "ArrowDown" && !typing) { e.preventDefault(); advance(); }
      else if (e.key === "ArrowUp" && !typing) { e.preventDefault(); back(); }
      else if (!typing && (p.kind === "choice" || p.kind === "yes_no") && /^[a-z]$/i.test(e.key)) {
        const opts = p.kind === "yes_no" ? ["yes", "no"] : p.choices;
        const idx = LETTERS.indexOf(e.key.toUpperCase());
        if (opts[idx]) pick(opts[idx]);
      } else if (!typing && p.kind === "rating" && /^[1-5]$/.test(e.key)) pick(e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const val = p ? ans[p.id] ?? "" : "";
  const set = (v: string) => { setAns((s) => ({ ...s, [p.id]: v })); setErr(null); };

  const field = () => {
    switch (p.kind) {
      case "short_text": case "email": case "number":
        return <input ref={inputRef} className="line-input" value={val} onChange={(e) => set(e.target.value)}
          placeholder="Type your answer here…" type={p.kind === "number" ? "number" : p.kind === "email" ? "email" : "text"} />;
      case "long_text":
        return <textarea ref={inputRef} className="line-input" rows={3} value={val} onChange={(e) => set(e.target.value)}
          placeholder="Type your answer here…" />;
      case "dropdown":
        return <select ref={inputRef} className="line-input" value={val} onChange={(e) => set(e.target.value)}>
          <option value="">Select an option…</option>{p.choices.map((c) => <option key={c}>{c}</option>)}</select>;
      case "choice": case "yes_no": {
        const opts = p.kind === "yes_no" ? ["yes", "no"] : p.choices;
        return <div className="choices">{opts.map((o, k) => (
          <button key={o} className={"choice" + (val === o ? " on" : "")} onClick={() => pick(o)}>
            <span className="key">{LETTERS[k]}</span><span>{p.kind === "yes_no" ? o[0].toUpperCase() + o.slice(1) : o}</span>
          </button>))}</div>;
      }
      case "rating":
        return <div className="stars">{[1, 2, 3, 4, 5].map((s) => (
          <button key={s} className={"star" + (Number(val) >= s ? " on" : "")} onClick={() => pick(String(s))}>★</button>))}</div>;
    }
  };

  return (
    <div className="runner" style={{ ["--accent" as any]: inquiry.accent }}>
      <div className="progress"><div style={{ width: `${n ? (Math.min(i, n) / n) * 100 : 0}%` }} /></div>
      <div className="stage">
        {n === 0 && <div className="slide"><h2 className="q">Add your first question to see it here</h2></div>}
        {n > 0 && i < n && (
          <div key={i} className={"slide " + (dir > 0 ? "from-below" : "from-above")}>
            <h2 className="q"><span className="num">{i + 1}→</span> {p.label || "Your question here"}{p.mandatory && <span className="req"> *</span>}</h2>
            {p.hint && <p className="hint">{p.hint}</p>}
            {field()}
            {err && <div className="err">⚠ {err}</div>}
            <div className="actions">
              <button className="primary" disabled={busy} onClick={() => advance()}>{i === n - 1 ? "Submit" : "OK ✓"}</button>
              <span className="tip">press <b>Enter ↵</b></span>
            </div>
          </div>)}
        {n > 0 && i >= n && (
          <div className="slide from-below">
            <h2 className="q">{inquiry.closing_heading}</h2>
            <p className="hint">{inquiry.closing_text}</p>
            {preview && <button className="primary" onClick={() => { setAns({}); setDir(-1); setI(0); }}>Restart preview</button>}
          </div>)}
      </div>
      {n > 0 && i < n && (
        <div className="nav">
          <button disabled={i === 0} onClick={back}>↑</button>
          <button onClick={() => advance()}>↓</button>
        </div>)}
    </div>
  );
}
