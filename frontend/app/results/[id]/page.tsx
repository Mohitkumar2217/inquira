"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import { ThemeToggleButton } from "@/components/ThemeProvider";
import { API, call } from "@/lib/api";
import { Inquiry } from "@/lib/types";

interface Bundle {
  inquiry: Inquiry;
  replies: { id: number; submitted_at: string; answers: Record<string, string> }[];
  summary: { prompt_id: number; label: string; kind: string; answered: number; counts?: Record<string, number>; average?: number | null }[];
}

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Bundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<"summary" | "replies">("summary");
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    setData(null);
    setLoadError(null);
    call<Bundle>(`/api/inquiries/${id}/replies`)
      .then((result) => { if (active) setData(result); })
      .catch((error: Error) => { if (active) setLoadError(error.message); });
    return () => { active = false; };
  }, [id]);
  if (loadError) return <div className="grid min-h-screen place-content-center bg-[var(--tf-panel-bg)] text-center text-[var(--tf-text)]"><p role="alert">{loadError}</p><Link className="inline-block rounded-lg border border-[var(--tf-border-mid)] bg-white px-3.5 py-2 text-sm hover:bg-[#f4f4f4] dark:bg-[#302c34] dark:text-[#f2eff3]" href="/">Back to forms</Link></div>;
  if (!data) return <div className="grid min-h-screen place-content-center bg-[var(--tf-panel-bg)] text-center text-[var(--tf-muted)]">Loading…</div>;

  const { inquiry, replies, summary } = data;
  const when = (s: string) => new Date(s + "Z").toLocaleString();
  const shown = replies.find((r) => r.id === open);

  return (
    <div className="min-h-screen bg-[var(--tf-panel-bg)] text-[var(--tf-text)]">
      <header className="sticky top-0 z-[5] flex h-[60px] items-center justify-between gap-3 border-b border-[var(--tf-border)] bg-white px-6 dark:border-[#39353e] dark:bg-[#26232a] max-[620px]:px-3">
        <Link href="/" className="text-xl font-bold tracking-[-.5px] text-[var(--tf-text)]">Inquira</Link>
        <nav className="flex h-full items-center gap-1">
          <Link href={`/builder/${inquiry.id}`} className="inline-flex h-full items-center border-b-2 border-transparent px-4 text-sm text-[var(--tf-text-2)] hover:bg-[#f6f4f6] dark:hover:bg-[#343039]">Create</Link>
          <button className="inline-flex h-full items-center border-0 border-b-2 border-[var(--tf-purple)] bg-transparent px-4 text-sm font-semibold text-[var(--tf-text)] dark:border-[#b7a3bf] dark:text-white dark:hover:bg-[#343039]" aria-current="page">Results</button>
        </nav>
        <div className="flex items-center justify-center gap-2">
          <ThemeToggleButton />
          <Link className="inline-flex min-h-9 items-center rounded-lg border border-[var(--tf-border-mid)] bg-white px-3.5 py-2 text-sm hover:bg-[#f4f4f4] dark:border-[#4b4550] dark:bg-[#302c34] dark:text-[#f2eff3] max-[620px]:hidden" href={`/builder/${inquiry.id}`}>Back to form</Link>
        </div>
      </header>
      <main className="mx-auto my-9 w-[min(1120px,100%)] max-w-[1120px] px-6 pb-12 max-[620px]:my-6 max-[620px]:px-[14px] max-[620px]:pb-10">
        <div className="flex items-center justify-between gap-4 max-[620px]:items-start">
          <div>
            <h1 className="mb-1 text-[28px] font-medium tracking-[-.02em] text-[var(--tf-text)]">{inquiry.title}</h1>
            <p className="text-[var(--tf-muted)]">{replies.length} responses</p>
          </div>
          <a className="inline-flex items-center gap-2 rounded-lg border border-[var(--tf-border-mid)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--tf-text)] hover:bg-[#f4f4f4] dark:border-[#4b4550] dark:bg-[#302c34] dark:text-[#f2eff3]" href={`${API}/api/inquiries/${inquiry.id}/export.csv`}>
            <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none"><path className="stroke-current [stroke-width:1.6] [stroke-linecap:round] [stroke-linejoin:round]" d="M10 2.5v9m0 0 3.5-3.5M10 11.5 6.5 8M3.5 13v3.5h13V13" /></svg>
            Export CSV
          </a>
        </div>
        <div className="my-5 inline-flex overflow-hidden rounded-lg border border-[var(--tf-border-mid)] dark:border-[#4b4550]">
          <button className={`min-h-[38px] border-0 px-[18px] py-2 ${tab === "summary" ? "bg-[var(--tf-purple)] text-white dark:bg-[#49424e]" : "bg-white text-[var(--tf-text-2)] dark:bg-[#26232a] dark:text-[#ddd5e0]"}`} onClick={() => setTab("summary")}>Summary</button>
          <button className={`min-h-[38px] border-0 px-[18px] py-2 ${tab === "replies" ? "bg-[var(--tf-purple)] text-white dark:bg-[#49424e]" : "bg-white text-[var(--tf-text-2)] dark:bg-[#26232a] dark:text-[#ddd5e0]"}`} onClick={() => setTab("replies")}>Responses</button>
        </div>

        {tab === "summary" && summary.map((s, k) => {
          const max = Math.max(1, ...Object.values(s.counts || {}));
          return (
            <div className="mb-[14px] flex flex-col flex-wrap items-start gap-[10px] rounded-lg border border-[var(--tf-border)] bg-white p-[14px_16px] dark:border-[#39353e] dark:bg-[#26232a] dark:text-[#f2eff3]" key={s.prompt_id}>
              <b>{k + 1}. {s.label || "Untitled question"}</b>
              <span className="text-[13px] text-[var(--tf-muted)]">{s.answered} answered{s.average != null ? ` · average ${s.average}` : ""}</span>
              {s.counts && Object.entries(s.counts).map(([label, c]) => (
                <div className="flex w-full min-w-0 items-center gap-[10px]" key={label}>
                  <span className="w-[150px] overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[var(--tf-text-2)] max-[620px]:w-[90px]">{label}</span>
                  <div className="h-[14px] flex-1 overflow-hidden rounded-[7px] bg-[#e8e5e9] dark:bg-[#39353e]"><div className="h-full rounded-[7px]" style={{ width: `${(c / max) * 100}%`, background: inquiry.accent }} /></div>
                  <span>{c}</span>
                </div>))}
            </div>);
        })}

        {tab === "replies" && (replies.length === 0 ? <p className="text-[var(--tf-muted)]">No responses yet.</p> : (
          <div className="overflow-auto rounded-lg border border-[var(--tf-border)] bg-white dark:border-[#39353e] dark:bg-[#26232a]">
            <table className="w-full border-collapse text-sm text-[var(--tf-text)]">
              <thead className="bg-[#f6f5f6] dark:bg-[#302c34]"><tr><th className="whitespace-nowrap border-b border-[var(--tf-border)] px-3 py-2 text-left">Submitted</th>{inquiry.prompts.map((p) => <th className="whitespace-nowrap border-b border-[var(--tf-border)] px-3 py-2 text-left" key={p.id}>{p.label}</th>)}</tr></thead>
              <tbody>{replies.map((r) => (
                <tr className="cursor-pointer hover:bg-[#f5f2f6] dark:hover:bg-[#343039]" key={r.id} onClick={() => setOpen(r.id)}><td className="whitespace-nowrap border-b border-[var(--tf-border)] px-3 py-2">{when(r.submitted_at)}</td>
                  {inquiry.prompts.map((p) => <td className="max-w-[200px] overflow-hidden text-ellipsis border-b border-[var(--tf-border)] px-3 py-2" key={p.id}>{r.answers[p.id] || "—"}</td>)}</tr>))}</tbody>
            </table>
          </div>))}
      </main>
      {shown && (
        <Modal title={`Response #${shown.id}`} onClose={() => setOpen(null)}>
          <p className="text-[13px] text-[var(--tf-muted)]">{when(shown.submitted_at)}</p>
          {inquiry.prompts.map((p) => (<div key={p.id} className="border-b border-[#eee] py-[10px] dark:border-[#39353e]"><div className="text-[13px] text-[var(--tf-muted)]">{p.label}</div><div>{shown.answers[p.id] || "—"}</div></div>))}
        </Modal>)}
    </div>
  );
}
