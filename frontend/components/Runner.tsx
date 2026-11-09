"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Inquiry, PromptDTO } from "@/lib/types";
import { errorMessage, isApiError } from "@/lib/api";
import Dropdown from "@/components/Dropdown";
import PhoneField from "@/components/PhoneField";
import { buildSteps, holdFor } from "@/lib/steps";
import { ERR, LINE } from "@/lib/styles";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+()\d.\-\s]{7,25}$/;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
type AccentStyle = React.CSSProperties & { "--accent": string };

function parseAnswer(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item): item is string => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringArrayAnswer(value: string): string[] {
  const parsed = parseAnswer(value);
  return isStringArray(parsed) ? parsed : [];
}

function stringRecordAnswer(value: string): Record<string, string> {
  const parsed = parseAnswer(value);
  if (!isRecord(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

export function checkValue(p: PromptDTO, raw?: string): string | null {
  const v = (raw ?? "").trim();
  if (!v) return p.mandatory ? "This question is required" : null;
  if (p.kind === "email" && !EMAIL.test(v)) return "That email address doesn't look right";
  if (p.kind === "number" && (!Number.isFinite(Number(v)) || v.length > 255)) return "Please enter a valid number";
  if (p.kind === "phone" && !PHONE.test(v)) return "Enter a valid phone number";
  if (p.kind === "url") {
    try {
      const url = new URL(v);
      if (!["http:", "https:"].includes(url.protocol)) return "Enter a website URL beginning with http:// or https://";
    } catch { return "Enter a valid website URL"; }
  }
  if (p.kind === "date") {
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null;
    if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== v) return "Enter a valid date";
  }
  if (p.kind === "nps" && (!/^(10|[0-9])$/.test(v))) return "Pick a score from 0 to 10";
  if (p.kind === "opinion_scale" && (!/^(10|[1-9])$/.test(v))) return "Pick a score from 1 to 10";
  if (p.kind === "legal" && v !== "yes") return "Consent is required";
  if (p.kind === "checkbox" || p.kind === "ranking") {
    const values = parseAnswer(v);
    if (!isStringArray(values) ||
      new Set(values).size !== values.length || values.some((item) => !p.choices.includes(item))) {
      return "Choose valid options";
    }
    if (p.kind === "checkbox" && p.mandatory && values.length === 0) return "Choose at least one option";
    if (p.kind === "ranking" && p.mandatory && values.length !== p.choices.length) return "Rank every option";
  }
  if (p.kind === "matrix") {
    const values = parseAnswer(v);
    if (!isRecord(values) ||
      Object.entries(values).some(([row, value]) => !p.choices.includes(row) || !["1", "2", "3", "4", "5"].includes(String(value)))) {
      return "Enter a valid response for each row";
    }
    if (p.mandatory && p.choices.some((row) => !values[row])) return "Answer every row";
  }
  if (p.kind === "contact_info") {
    const values = parseAnswer(v);
    if (!isRecord(values) || ["name", "email", "phone"].some((key) => values[key] !== undefined && typeof values[key] !== "string")) {
      return "Enter valid contact information";
    }
    if (typeof values.email === "string" && values.email && !EMAIL.test(values.email)) return "That email address doesn't look right";
    if (typeof values.phone === "string" && values.phone && !PHONE.test(values.phone)) return "Enter a valid phone number";
    if (p.mandatory && !["name", "email", "phone"].every((key) => typeof values[key] === "string" && values[key].trim())) return "Complete all contact fields";
  }
  if (["short_text", "phone", "url"].includes(p.kind) && v.length > 255) return "Keep it under 255 characters";
  if (["long_text", "address"].includes(p.kind) && v.length > 5000) return "Keep it under 5000 characters";
  return null;
}

interface Props {
  inquiry: Inquiry;
  onSubmit: (answers: Record<number, string>) => Promise<void>;
  startAt?: number;
  preview?: boolean;
}

export default function Runner({ inquiry, onSubmit, startAt = 0, preview }: Props) {
  // A "step" is one screen: a single question, or all fields of one multi-field page.
  const steps = useMemo(() => buildSteps(inquiry.prompts), [inquiry.prompts]);
  const n = steps.length;
  const [i, setI] = useState(Math.min(startAt, n));
  const [dir, setDir] = useState(1);
  const [ans, setAns] = useState<Record<number, string>>({});
  const [errs, setErrs] = useState<Record<number, string>>({});
  const [gerr, setGerr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectRef = useRef<HTMLButtonElement>(null);
  const step = steps[i] as PromptDTO[] | undefined;
  const page = step?.[0].page ?? null;
  const p = step && !page ? step[0] : null; // set only for a single-question screen

  useEffect(() => {
    const t = setTimeout(() => {
      (inputRef.current || textareaRef.current || selectRef.current)?.focus();
    }, 350);
    return () => clearTimeout(t);
  }, [i]);

  const advance = async (ov?: string) => {
    if (busy || !step) return;
    const a = ov !== undefined && p ? { ...ans, [p.id]: ov } : ans;
    const bad: Record<number, string> = {};
    step.forEach((q) => { const e = checkValue(q, a[q.id]); if (e) bad[q.id] = e; });
    if (Object.keys(bad).length) { setErrs(bad); return; }
    setErrs({}); setGerr(null);
    if (i === n - 1) {
      setBusy(true);
      try { await onSubmit(a); setDir(1); setI(n); }
      catch (error: unknown) {
        const fieldErrors = isApiError(error) ? error.fieldErrors : undefined;
        if (fieldErrors) {
          const bi = steps.findIndex((s) => s.some((q) => fieldErrors[q.id]));
          if (bi >= 0) {
            const m: Record<number, string> = {};
            steps[bi].forEach((q) => { if (fieldErrors[q.id]) m[q.id] = fieldErrors[q.id]; });
            setDir(-1); setI(bi); setErrs(m);
          }
        } else setGerr(errorMessage(error));
      } finally { setBusy(false); }
      return;
    }
    setDir(1); setI(i + 1);
  };
  const back = () => { if (i > 0 && i <= n) { setErrs({}); setGerr(null); setDir(-1); setI(i - 1); } };
  const setValue = (q: PromptDTO, v: string) => {
    setAns((s) => ({ ...s, [q.id]: v }));
    setErrs((e) => { const { [q.id]: _removed, ...rest } = e; return rest; });
  };
  // Choice-style answers advance on their own, but only when they are the sole question on the screen.
  const choose = (q: PromptDTO, v: string) => { setValue(q, v); if (!page) setTimeout(() => advance(v), 380); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!step) return;
      const tag = (e.target as HTMLElement).tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "Enter") {
        if (tag === "TEXTAREA" && !(e.metaKey || e.ctrlKey)) return;
        if (preview && (tag === "INPUT" || tag === "TEXTAREA") && !(e.target as HTMLElement).closest(".runner")) return;
        if (!(e.target as HTMLElement).closest(".runner") && typing) return;
        e.preventDefault(); advance();
      } else if (e.key === "ArrowDown" && !typing) { e.preventDefault(); advance(); }
      else if (e.key === "ArrowUp" && !typing) { e.preventDefault(); back(); }
      else if (p && !typing && (p.kind === "choice" || p.kind === "yes_no") && /^[a-z]$/i.test(e.key)) {
        const opts = p.kind === "yes_no" ? ["yes", "no"] : p.choices;
        const idx = LETTERS.indexOf(e.key.toUpperCase());
        if (opts[idx]) choose(p, opts[idx]);
      } else if (p && !typing && p.kind === "rating" && /^[1-5]$/.test(e.key)) choose(p, e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const field = (q: PromptDTO, first: boolean) => {
    const val = ans[q.id] ?? "";
    const set = (v: string) => setValue(q, v);
    const toggleOption = (option: string) => {
      const selected = stringArrayAnswer(val);
      set(JSON.stringify(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]));
    };
    const updateContact = (field: "name" | "email" | "phone", value: string) => {
      set(JSON.stringify({ ...stringRecordAnswer(val), [field]: value }));
    };
    const updateMatrix = (row: string, value: string) => {
      const answers = stringRecordAnswer(val);
      if (value) answers[row] = value;
      else delete answers[row];
      set(JSON.stringify(answers));
    };
    const inRef = first ? inputRef : undefined;
    const taRef = first ? textareaRef : undefined;
    const selRef = first ? selectRef : undefined;
    switch (q.kind) {
      case "short_text": case "email": case "number":
        return <input ref={inRef} className={LINE} value={val} onChange={(e) => set(e.target.value)}
          placeholder={holdFor(q)} type={q.kind === "number" ? "number" : q.kind === "email" ? "email" : "text"} />;
      case "long_text":
        return <textarea ref={taRef} className={LINE} rows={3} value={val} onChange={(e) => set(e.target.value)}
          placeholder="Type your answer here…" />;
      case "address":
        return <textarea ref={taRef} className={LINE} rows={3} value={val} onChange={(e) => set(e.target.value)}
          placeholder="Enter your address…" />;
      case "phone":
        return <PhoneField inputRef={inRef} value={val} onChange={set} />;
      case "url": case "date":
        return <input ref={inRef} className={LINE} value={val} onChange={(e) => set(e.target.value)}
          placeholder={q.kind === "url" ? "https://example.com" : undefined}
          type={q.kind === "url" ? "url" : "date"} />;
      case "contact_info": {
        const contact = stringRecordAnswer(val);
        return <div className="contact-fields mt-[18px] grid max-w-[480px] gap-3">
          <label className="grid gap-1.5 text-sm text-[var(--tf-text-2)] dark:text-[#d5cfd8]">Name<input className="min-w-0 rounded-md border border-[var(--tf-border-mid)] bg-[var(--tf-white)] p-2.5 text-[var(--tf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" ref={inRef} autoComplete="name" value={contact.name || ""} onChange={(e) => updateContact("name", e.target.value)} /></label>
          <label className="grid gap-1.5 text-sm text-[var(--tf-text-2)] dark:text-[#d5cfd8]">Email<input className="min-w-0 rounded-md border border-[var(--tf-border-mid)] bg-[var(--tf-white)] p-2.5 text-[var(--tf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" type="email" autoComplete="email" value={contact.email || ""} onChange={(e) => updateContact("email", e.target.value)} /></label>
          <label className="grid gap-1.5 text-sm text-[var(--tf-text-2)] dark:text-[#d5cfd8]">Phone<input className="min-w-0 rounded-md border border-[var(--tf-border-mid)] bg-[var(--tf-white)] p-2.5 text-[var(--tf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" type="tel" autoComplete="tel" value={contact.phone || ""} onChange={(e) => updateContact("phone", e.target.value)} /></label>
        </div>;
      }
      case "dropdown":
        return <Dropdown
          ariaLabel={q.label || "Select an answer"}
          buttonRef={selRef}
          variant="answer"
          value={val}
          onChange={set}
          options={[{ value: "", label: "Select an option…" }, ...q.choices.map((choice) => ({ value: choice, label: choice }))]}
        />;
      case "choice": case "yes_no": {
        const opts = q.kind === "yes_no" ? ["yes", "no"] : q.choices;
        return <div className="choices mt-[18px] flex max-w-[420px] flex-col gap-2">{opts.map((o, k) => (
          <button key={o} className={`choice flex items-center gap-2.5 rounded border border-[var(--accent)] px-3 py-2 text-left text-lg text-[var(--accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_18%,white)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-[color-mix(in_srgb,var(--accent)_22%,#202024)] ${val === o ? "on bg-[var(--accent)] text-white dark:text-[#171719]" : "bg-[color-mix(in_srgb,var(--accent)_8%,white)] dark:bg-[color-mix(in_srgb,var(--accent)_12%,#202024)]"}`} onClick={() => choose(q, o)}>
            <span className="key grid size-6 shrink-0 place-items-center rounded border border-current text-xs">{LETTERS[k]}</span><span>{q.kind === "yes_no" ? o[0].toUpperCase() + o.slice(1) : o}</span>
          </button>))}</div>;
      }
      case "checkbox": {
        const selected = stringArrayAnswer(val);
        return <div className="multi-choices mt-4 flex max-w-[460px] flex-col gap-2">{q.choices.map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-2.5 rounded-[7px] border border-[var(--tf-border-mid)] px-3 py-2.5 text-[var(--tf-text)] dark:border-[var(--tf-border)] dark:bg-[#26232a]"><input className="size-4 accent-[var(--accent)]" type="checkbox" checked={selected.includes(option)} onChange={() => toggleOption(option)} />{option}</label>
        ))}</div>;
      }
      case "legal":
        return <label className="legal-consent flex cursor-pointer items-center gap-2.5 rounded-[7px] border border-[var(--tf-border-mid)] px-3 py-2.5 text-[var(--tf-text)] dark:border-[var(--tf-border)] dark:bg-[#26232a]"><input className="size-4 accent-[var(--accent)]" ref={inRef} type="checkbox" checked={val === "yes"} onChange={(e) => set(e.target.checked ? "yes" : "")} />
          I agree to the terms and conditions.</label>;
      case "nps": case "opinion_scale": {
        const start = q.kind === "nps" ? 0 : 1;
        return <div className="scale-choices mt-[18px] flex flex-wrap gap-2" role="group" aria-label={q.kind === "nps" ? "Score from 0 to 10" : "Score from 1 to 10"}>
          {Array.from({ length: 11 - start }, (_, i) => String(i + start)).map((score) => (
            <button key={score} className={`h-10 min-w-10 rounded-[7px] border border-[var(--tf-border-mid)] bg-[var(--tf-white)] font-semibold text-[var(--tf-text)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-[var(--tf-border)] dark:bg-[#211f25] dark:text-[var(--tf-text)] ${val === score ? "on border-[var(--accent)] bg-[var(--accent)] text-white" : ""}`} onClick={() => choose(q, score)}>{score}</button>
          ))}
        </div>;
      }
      case "ranking": {
        const ranked = stringArrayAnswer(val);
        const move = (index: number, offset: number) => {
          const next = [...ranked];
          [next[index], next[index + offset]] = [next[index + offset], next[index]];
          set(JSON.stringify(next));
        };
        return <div className="ranking-field">
          <div className="multi-choices mt-4 flex max-w-[460px] flex-col gap-2">{q.choices.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-2.5 rounded-[7px] border border-[var(--tf-border-mid)] px-3 py-2.5 text-[var(--tf-text)] dark:border-[var(--tf-border)] dark:bg-[#26232a]"><input className="size-4 accent-[var(--accent)]" type="checkbox" checked={ranked.includes(option)} onChange={() => toggleOption(option)} />{option}</label>
          ))}</div>
          {ranked.length > 0 && <ol>{ranked.map((option, index) => (
            <li key={option} className="flex items-center gap-1.5 py-1 text-[var(--tf-text)] dark:text-[var(--tf-text)]"><span className="flex-1">{option}</span>
              <button className="size-8 rounded-md border border-[var(--tf-border-mid)] bg-[var(--tf-white)] text-[var(--tf-text)] hover:bg-[var(--tf-panel-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[var(--tf-border)] dark:bg-[#211f25]" aria-label={`Move ${option} up`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
              <button className="size-8 rounded-md border border-[var(--tf-border-mid)] bg-[var(--tf-white)] text-[var(--tf-text)] hover:bg-[var(--tf-panel-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[var(--tf-border)] dark:bg-[#211f25]" aria-label={`Move ${option} down`} disabled={index === ranked.length - 1} onClick={() => move(index, 1)}>↓</button>
            </li>
          ))}</ol>}
        </div>;
      }
      case "matrix": {
        const answers = stringRecordAnswer(val);
        return <div className="matrix-field mt-[18px] grid gap-2">{q.choices.map((row) => (
          <label key={row} className="grid grid-cols-[minmax(100px,1fr)_minmax(100px,160px)] items-center gap-3 text-[var(--tf-text)] max-[480px]:grid-cols-1">
            <span>{row}</span><Dropdown
              ariaLabel={`${row} response`}
              buttonRef={first && row === q.choices[0] ? selectRef : undefined}
              variant="matrix"
              value={answers[row] || ""}
              onChange={(answer) => updateMatrix(row, answer)}
              options={[{ value: "", label: "Select…" }, ...["1", "2", "3", "4", "5"].map((score) => ({ value: score, label: score }))]}
            />
          </label>
        ))}</div>;
      }
      case "rating":
        return <div className="stars mt-[18px] flex gap-2">{[1, 2, 3, 4, 5].map((s) => (
          <button key={s} className={`star border-0 bg-transparent text-[38px] text-[#ccc] transition hover:scale-110 hover:text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${Number(val) >= s ? "on scale-110 text-[var(--accent)]" : ""}`} onClick={() => choose(q, String(s))}>★</button>))}</div>;
    }
  };

  return (
    <div className="runner relative h-full w-full overflow-hidden bg-white text-[#262627] dark:bg-[#202024] dark:text-[#f4f4f5]" style={{ "--accent": inquiry.accent } as AccentStyle}>
      <div className="progress absolute inset-x-0 top-0 z-[2] h-[5px] bg-[#eee] dark:bg-[#39393e]"><div className="h-full bg-[var(--accent)] transition-[width] duration-[400ms] ease-in-out" style={{ width: `${n ? (Math.min(i, n) / n) * 100 : 0}%` }} /></div>
      <div className="stage flex h-full items-center justify-center px-6 py-10 max-[600px]:px-5 max-[600px]:py-7">
        {n === 0 && <div className="slide w-full"><h2 className="q m-0 mb-2 text-[clamp(22px,3.2vw,30px)] font-normal leading-tight text-[var(--tf-text)]">Add your first question to see it here</h2></div>}
        {n > 0 && step && (
          <div key={i} className={`slide w-full ${dir > 0 ? "from-below" : "from-above"}`}>
            <h2 className="q m-0 mb-2 text-[clamp(22px,3.2vw,30px)] font-normal leading-[1.25] text-[var(--tf-text)]"><span className="num mr-1.5 text-[.8em] text-[var(--accent)]">{i + 1}→</span> {page ? page.title || "Page" : p?.label || "Your question here"}{p?.mandatory && <span className="req text-[var(--accent)]"> *</span>}</h2>
            {(page ? page.hint : p?.hint) && <p className="hint mb-[22px] mt-0 text-lg text-[#777] dark:text-[#b4acb9]">{page ? page.hint : p?.hint}</p>}
            {page ? (
              <div className="page-fields mt-5 flex flex-col gap-[22px]">{step.map((q, k) => (
                <div className="page-field" key={q.id}>
                  <label className="block text-lg text-[var(--tf-text-2)]">{q.label || "Untitled"}{q.mandatory && <span className="req text-[var(--accent)]"> *</span>}</label>
                  {q.hint && <div className="mt-0.5 text-sm text-[#777] dark:text-[#b4acb9]">{q.hint}</div>}
                  {field(q, k === 0)}
                  {errs[q.id] && <div className={ERR}>⚠ {errs[q.id]}</div>}
                </div>))}</div>
            ) : p && (<>{field(p, true)}{errs[p.id] && <div className={ERR}>⚠ {errs[p.id]}</div>}</>)}
            {gerr && <div className={ERR}>⚠ {gerr}</div>}
            <div className="actions mt-6 flex items-center gap-3.5">
              <button className="primary rounded border border-[var(--accent)] bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-50 dark:text-white" disabled={busy} onClick={() => advance()}>{i === n - 1 ? "Submit" : "OK ✓"}</button>
              <span className="tip text-[13px] text-[#888] dark:text-[#b4acb9]">press <b>Enter ↵</b></span>
            </div>
          </div>)}
        {n > 0 && i >= n && (
          <div className="slide from-below w-full">
            <h2 className="q m-0 mb-2 text-[clamp(22px,3.2vw,30px)] font-normal leading-[1.25] text-[var(--tf-text)]">{inquiry.closing_heading}</h2>
            <p className="hint mb-[22px] mt-0 text-lg text-[#777] dark:text-[#b4acb9]">{inquiry.closing_text}</p>
            {preview && <button className="primary rounded border border-[var(--accent)] bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => { setAns({}); setDir(-1); setI(0); }}>Restart preview</button>}
          </div>)}
      </div>
      {n > 0 && i < n && (
        <div className="nav absolute bottom-5 right-5 flex">
          <button className="size-9 border-0 border-r border-r-white/30 bg-[var(--accent)] text-base text-white first:rounded-l last:rounded-r disabled:opacity-40" disabled={i === 0} onClick={back}>↑</button>
          <button className="size-9 border-0 bg-[var(--accent)] text-base text-white first:rounded-l last:rounded-r" onClick={() => advance()}>↓</button>
        </div>)}
    </div>
  );
}