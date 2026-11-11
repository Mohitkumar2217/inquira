"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Inquiry, PromptDTO } from "@/lib/types";
import { errorMessage, isApiError } from "@/lib/api";
import Dropdown from "@/components/Dropdown";
import PhoneField from "@/components/PhoneField";
import { buildSteps, holdFor } from "@/lib/steps";
import { ERR, LINE, LINE_MOBILE } from "@/lib/styles";

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
  isMobileView?: boolean;
}

export default function Runner({ inquiry, onSubmit, startAt = 0, preview, isMobileView }: Props) {
  // A "step" is one screen: a single question, or all fields of one multi-field page.
  const steps = useMemo(() => buildSteps(inquiry.prompts), [inquiry.prompts]);
  const n = steps.length;
  const [i, setI] = useState(Math.min(startAt, n));
  const [dir, setDir] = useState(1);
  const [ans, setAns] = useState<Record<number, string>>({});
  const [errs, setErrs] = useState<Record<number, string>>({});
  const [gerr, setGerr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
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
        const insideRunner = containerRef.current?.contains(e.target as Node) ?? false;
        if (preview && (tag === "INPUT" || tag === "TEXTAREA") && !insideRunner) return;
        if (!insideRunner && typing) return;
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
    const lineClass = isMobileView ? LINE_MOBILE : LINE;
    switch (q.kind) {
      case "short_text": case "email": case "number":
        return <input ref={inRef} className={lineClass} value={val} onChange={(e) => set(e.target.value)}
          placeholder={holdFor(q)} type={q.kind === "number" ? "number" : q.kind === "email" ? "email" : "text"} />;
      case "long_text":
        return <textarea ref={taRef} className={lineClass} rows={3} value={val} onChange={(e) => set(e.target.value)}
          placeholder="Type your answer here…" />;
      case "address":
        return <textarea ref={taRef} className={lineClass} rows={3} value={val} onChange={(e) => set(e.target.value)}
          placeholder="Enter your address…" />;
      case "phone":
        return <PhoneField inputRef={inRef} value={val} onChange={set} mobile={isMobileView} />;
      case "url": case "date":
        return <input ref={inRef} className={lineClass} value={val} onChange={(e) => set(e.target.value)}
          placeholder={q.kind === "url" ? "https://example.com" : undefined}
          type={q.kind === "url" ? "url" : "date"} />;
      case "contact_info": {
        const contact = stringRecordAnswer(val);
        return <div className="mt-[18px] grid max-w-[480px] gap-3">
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
        return <div className="mt-[18px] flex max-w-[420px] flex-col gap-2">{opts.map((o, k) => (
          <button key={o} className={`flex items-center gap-2.5 rounded-lg border border-[var(--accent)] px-3 py-2 text-left text-lg transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_18%,white)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-[color-mix(in_srgb,var(--accent)_22%,#202024)] ${val === o ? "bg-[var(--accent)] text-white dark:text-[#171719]" : "bg-[color-mix(in_srgb,var(--accent)_8%,white)] text-[var(--accent)] dark:bg-[color-mix(in_srgb,var(--accent)_12%,#202024)]"}`} onClick={() => choose(q, o)}>
            <span className="grid size-6 shrink-0 place-items-center rounded border border-current text-xs">{LETTERS[k]}</span><span>{q.kind === "yes_no" ? o[0].toUpperCase() + o.slice(1) : o}</span>
          </button>))}</div>;
      }
      case "checkbox": {
        const selected = stringArrayAnswer(val);
        return <div className="mt-4 flex max-w-[460px] flex-col gap-2">{q.choices.map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-2.5 rounded-[7px] border border-[var(--tf-border-mid)] px-3 py-2.5 text-[var(--tf-text)] dark:border-[var(--tf-border)] dark:bg-[#26232a]"><input className="size-4 accent-[var(--accent)]" type="checkbox" checked={selected.includes(option)} onChange={() => toggleOption(option)} />{option}</label>
        ))}</div>;
      }
      case "legal":
        return <label className="flex cursor-pointer items-center gap-2.5 rounded-[7px] border border-[var(--tf-border-mid)] px-3 py-2.5 text-[var(--tf-text)] dark:border-[var(--tf-border)] dark:bg-[#26232a]"><input className="size-4 accent-[var(--accent)]" ref={inRef} type="checkbox" checked={val === "yes"} onChange={(e) => set(e.target.checked ? "yes" : "")} />
          I agree to the terms and conditions.</label>;
      case "nps": case "opinion_scale": {
        const start = q.kind === "nps" ? 0 : 1;
        return <div className="mt-[18px] flex flex-wrap gap-2" role="group" aria-label={q.kind === "nps" ? "Score from 0 to 10" : "Score from 1 to 10"}>
          {Array.from({ length: 11 - start }, (_, i) => String(i + start)).map((score) => (
            <button key={score} className={`h-10 min-w-10 rounded-[7px] border font-semibold hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${val === score ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--tf-border-mid)] bg-[var(--tf-white)] text-[var(--tf-text)] dark:border-[var(--tf-border)] dark:bg-[#211f25] dark:text-[var(--tf-text)]"}`} onClick={() => choose(q, score)}>{score}</button>
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
        return <div>
          <div className="mt-4 flex max-w-[460px] flex-col gap-2">{q.choices.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-2.5 rounded-[7px] border border-[var(--tf-border-mid)] px-3 py-2.5 text-[var(--tf-text)] dark:border-[var(--tf-border)] dark:bg-[#26232a]"><input className="size-4 accent-[var(--accent)]" type="checkbox" checked={ranked.includes(option)} onChange={() => toggleOption(option)} />{option}</label>
          ))}</div>
          {ranked.length > 0 && <ol className="mt-3 max-w-[460px] list-decimal pl-7">{ranked.map((option, index) => (
            <li key={option} className="flex items-center gap-1.5 py-1 text-[var(--tf-text)] dark:text-[var(--tf-text)]"><span className="flex-1">{option}</span>
              <button className="size-8 rounded-md border border-[var(--tf-border-mid)] bg-[var(--tf-white)] text-[var(--tf-text)] hover:bg-[var(--tf-panel-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[var(--tf-border)] dark:bg-[#211f25]" aria-label={`Move ${option} up`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
              <button className="size-8 rounded-md border border-[var(--tf-border-mid)] bg-[var(--tf-white)] text-[var(--tf-text)] hover:bg-[var(--tf-panel-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[var(--tf-border)] dark:bg-[#211f25]" aria-label={`Move ${option} down`} disabled={index === ranked.length - 1} onClick={() => move(index, 1)}>↓</button>
            </li>
          ))}</ol>}
        </div>;
      }
      case "matrix": {
        const answers = stringRecordAnswer(val);
        return <div className="mt-[18px] grid gap-2">{q.choices.map((row) => (
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
        return <div className="mt-[18px] flex gap-2">{[1, 2, 3, 4, 5].map((s) => (
          <button key={s} className={`border-0 bg-transparent text-[38px] transition hover:scale-110 hover:text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${Number(val) >= s ? "scale-110 text-[var(--accent)]" : "text-[#ccc]"}`} onClick={() => choose(q, String(s))}>★</button>))}</div>;
    }
  };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-white text-[#262627] dark:bg-[#202024] dark:text-[#f4f4f5]" style={{ "--accent": inquiry.accent } as AccentStyle}>
      <div className="sticky top-0 z-[2] h-1 w-full bg-[#ebebeb] dark:bg-[#39393e]">
        <div className="h-full bg-[var(--accent)] transition-[width] duration-[400ms] ease-in-out" style={{ width: `${n ? (Math.min(i, n) / n) * 100 : 0}%` }} />
      </div>
      <div className={`flex min-h-full ${isMobileView ? "flex-col justify-between px-5 pt-7 pb-6" : "items-center justify-center px-6 py-10 max-[600px]:px-5 max-[600px]:py-7"}`}>
        {n === 0 && <div className="w-full max-w-[680px]"><h2 className="m-0 mb-2 text-[clamp(22px,3.2vw,30px)] font-normal leading-tight text-[var(--tf-text)]">Add your first question to see it here</h2></div>}
        {n > 0 && step && (
          <div key={i} className={`animate-from-above w-full max-w-[680px] ${isMobileView ? "flex flex-col flex-1 justify-between" : ""}`}>
            <div className={isMobileView ? "my-auto w-full min-w-0" : "min-w-0"}>
              <h2 className={`animate-text-cascade-1 m-0 mb-1 flex items-start gap-2.5 font-normal leading-[1.3] text-[#262627] dark:text-[#f2eff3] ${isMobileView ? "text-xl" : "text-[clamp(22px,3.2vw,28px)]"}`}>
                <span className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-[4px] bg-[#262627] px-1.5 text-[12px] font-bold leading-none text-white shadow-sm dark:bg-[#39343d] dark:text-[#f2eff3]">{i + 1}</span>
                <span className="min-w-0 flex-1 break-words">
                  {page ? page.title || "Page" : p?.label || "..."}
                  {p?.mandatory && <span className="text-[#e04f4f]"> *</span>}
                </span>
              </h2>
              {((page ? page.hint : p?.hint) || preview) && (
                <p className={`animate-text-cascade-2 mt-1 italic text-[#737373] dark:text-[#a1a1aa] ${isMobileView ? "mb-4 text-sm" : "mb-5 text-[15px]"}`}>
                  {(page ? page.hint : p?.hint) || (preview ? "Description (optional)" : "")}
                </p>
              )}
              {page ? (
                <div className={`flex flex-col ${isMobileView ? "mt-3.5 gap-4" : "mt-5 gap-[22px]"}`}>{step.map((q, k) => (
                  <div className="min-w-0 animate-text-cascade-3" key={q.id}>
                    <label className={`block font-normal text-[#262627] dark:text-[#f2eff3] ${isMobileView ? "text-[15px]" : "text-lg"}`}>{q.label || "Untitled"}{q.mandatory && <span className="text-[#e04f4f]"> *</span>}</label>
                    {q.hint && <div className="mt-0.5 text-sm italic text-[#737373] dark:text-[#a1a1aa]">{q.hint}</div>}
                    {field(q, k === 0)}
                    {errs[q.id] && <div className={ERR}>⚠ {errs[q.id]}</div>}
                  </div>))}</div>
              ) : p && (<div className="min-w-0 animate-text-cascade-3">{field(p, true)}{errs[p.id] && <div className={ERR}>⚠ {errs[p.id]}</div>}</div>)}
              {gerr && <div className={ERR}>⚠ {gerr}</div>}
            </div>

            <div className={`animate-text-cascade-4 ${isMobileView ? "mt-6 pt-2 pb-1 w-full shrink-0" : "mt-6 flex items-center gap-3.5"}`}>
              <button
                className={`rounded-md border-0 bg-[#262627] font-semibold text-white shadow-sm transition hover:bg-[#181819] active:scale-[0.99] disabled:cursor-default disabled:opacity-50 dark:bg-[#39343d] dark:text-white dark:hover:bg-[#48434f] ${
                  isMobileView ? "w-full py-3 text-sm" : "px-5 py-2.5 text-sm active:scale-95"
                }`}
                disabled={busy}
                onClick={() => advance()}
              >
                {i === n - 1 ? "Submit" : "OK ✓"}
              </button>
              {!isMobileView && (
                <span className="text-xs text-[#767676] dark:text-[#a1a1aa]">
                  {i === n - 1 ? <>press <b>Ctrl + Enter ↵</b></> : <>press <b>Enter ↵</b></>}
                </span>
              )}
            </div>
          </div>)}
        {n > 0 && i >= n && (
          <div className="animate-from-above flex w-full max-w-[680px] flex-col items-center justify-center py-8 text-center">
            <div className="mb-5 grid size-16 place-items-center rounded-full border-2 border-[#262627] text-2xl font-bold dark:border-white">
              ✓
            </div>
            <h2 className="animate-text-cascade-1 m-0 mb-2 text-[clamp(22px,3.2vw,30px)] font-normal leading-[1.25] text-[#262627] dark:text-[#f2eff3]">{inquiry.closing_heading || "Thanks for completing this form"}</h2>
            <p className="animate-text-cascade-2 mb-[22px] mt-0 text-base text-[#737373] dark:text-[#b4acb9]">{inquiry.closing_text || "Now create your own — it's free, easy & beautiful"}</p>
            {preview && <button className="rounded-md border-0 bg-[#262627] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#181819] active:scale-95 dark:bg-[#39343d] dark:text-white dark:hover:bg-[#48434f]" onClick={() => { setAns({}); setDir(-1); setI(0); }}>Restart preview</button>}
          </div>)}
      </div>
      {n > 0 && i < n && !isMobileView && (
        <div className="absolute bottom-5 right-5 flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md shadow-sm">
            <button className="flex h-8 w-8 items-center justify-center border-0 bg-[#d4d4d8] text-[#444] transition-colors hover:bg-[#c4c4c8] disabled:opacity-40 disabled:hover:bg-[#d4d4d8] dark:bg-[#38383e] dark:text-[#d5cfd8] dark:hover:bg-[#484852]" disabled={i === 0} onClick={back} aria-label="Previous question">
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
            </button>
            <button className="flex h-8 w-8 items-center justify-center border-0 border-l border-white/40 bg-[#d4d4d8] text-[#444] transition-colors hover:bg-[#c4c4c8] dark:bg-[#38383e] dark:text-[#d5cfd8] dark:hover:bg-[#484852]" onClick={() => advance()} aria-label="Next question">
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
          </div>
          <div className="flex h-8 items-center gap-1.5 rounded-md bg-[#262627] px-3 text-xs font-medium text-white shadow-sm dark:bg-[#302c34] dark:text-[#f2eff3]">
            <span className="font-semibold text-white/90">Powered by</span>
            <span className="font-bold tracking-tight">Inquira</span>
          </div>
        </div>)}
    </div>
  );
}