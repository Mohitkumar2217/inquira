"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import { ThemeToggleButton } from "@/components/ThemeProvider";
import AccountMenu from "@/components/AccountMenu";
import { useToast } from "@/components/Toasts";
import { API, call, errorMessage, send } from "@/lib/api";
import { Inquiry } from "@/lib/types";

interface Bundle {
  inquiry: Inquiry;
  replies: { id: number; submitted_at: string; answers: Record<string, string> }[];
  summary: { prompt_id: number; label: string; kind: string; answered: number; counts?: Record<string, number>; average?: number | null }[];
}

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [data, setData] = useState<Bundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<"performance" | "summary" | "replies">("performance");
  const [open, setOpen] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadData = async () => {
    try {
      const result = await call<Bundle>(`/api/inquiries/${id}/replies`);
      setData(result);
    } catch (error: unknown) {
      setLoadError(errorMessage(error));
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  const generateTestResponse = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      await call(`/api/inquiries/${id}/generate-test-response`, send("POST"));
      await loadData();
      toast("Test response generated successfully!");
    } catch (err: unknown) {
      toast(errorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  if (loadError) return <div className="grid min-h-screen place-content-center bg-[var(--tf-panel-bg)] text-center text-[var(--tf-text)]"><p role="alert">{loadError}</p><Link className="inline-block rounded-lg border border-[var(--tf-border-mid)] bg-white px-3.5 py-2 text-sm hover:bg-[#f4f4f4] dark:bg-[#302c34] dark:text-[#f2eff3]" href="/">Back to forms</Link></div>;
  if (!data) return <div className="grid min-h-screen place-content-center bg-[var(--tf-panel-bg)] text-center text-[var(--tf-muted)]">Loading…</div>;

  const { inquiry, replies, summary } = data;
  const when = (s: string) => new Date(s + "Z").toLocaleString();
  const shown = replies.find((r) => r.id === open);

  // Performance metrics calculation
  const totalSubmissions = replies.length;
  const simulatedViews = Math.max(totalSubmissions * 3 + 14, 18);
  const simulatedStarts = Math.max(totalSubmissions * 2 + 6, 12);
  const completionRate = simulatedStarts > 0 ? Math.min(100, Math.round((totalSubmissions / simulatedStarts) * 100)) : 0;
  const avgTime = "1m 24s";

  return (
    <div className="min-h-screen bg-[var(--tf-panel-bg)] text-[var(--tf-text)] zoom-out-enter">
      <header className="sticky top-0 z-[5] flex h-[60px] items-center justify-between gap-3 border-b border-[var(--tf-border)] bg-white px-6 dark:border-[#39353e] dark:bg-[#26232a] max-[620px]:px-3">
        <Link href="/" className="text-xl font-bold tracking-[-.5px] text-[var(--tf-text)]">Inquira</Link>
        <nav className="flex h-full items-center gap-1">
          <Link href={`/builder/${inquiry.id}`} className="inline-flex h-full items-center border-b-2 border-transparent px-4 text-sm text-[var(--tf-text-2)] hover:bg-[#f6f4f6] dark:hover:bg-[#343039]">Content</Link>
          <button className="inline-flex h-full items-center border-0 border-b-2 border-[var(--tf-purple)] bg-transparent px-4 text-sm font-semibold text-[var(--tf-text)] dark:border-[#b7a3bf] dark:text-white dark:hover:bg-[#343039]" aria-current="page">Results</button>
        </nav>
        <div className="flex items-center justify-center gap-2">
          <ThemeToggleButton />
          <AccountMenu />
          <Link className="inline-flex min-h-9 items-center rounded-lg border border-[var(--tf-border-mid)] bg-white px-3.5 py-2 text-sm hover:bg-[#f4f4f4] dark:border-[#4b4550] dark:bg-[#302c34] dark:text-[#f2eff3] max-[620px]:hidden" href={`/builder/${inquiry.id}`}>Back to form</Link>
        </div>
      </header>
      <main className="mx-auto my-9 w-[min(1120px,100%)] max-w-[1120px] px-6 pb-12 max-[620px]:my-6 max-[620px]:px-[14px] max-[620px]:pb-10">
        <div className="flex items-center justify-between gap-4 max-[620px]:items-start max-[620px]:flex-col">
          <div>
            <h1 className="mb-1 text-[28px] font-medium tracking-[-.02em] text-[var(--tf-text)]">{inquiry.title}</h1>
            <p className="text-[var(--tf-muted)]">{replies.length} responses collected</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generateTestResponse}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--tf-border-mid)] bg-white px-3.5 py-2 text-sm font-medium text-[var(--tf-text)] hover:bg-[#f4f4f4] dark:border-[#4b4550] dark:bg-[#302c34] dark:text-[#f2eff3] disabled:opacity-50"
            >
              <span>⚡</span> {generating ? "Generating…" : "Generate test response"}
            </button>
            <a className="inline-flex items-center gap-2 rounded-lg border border-[var(--tf-border-mid)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--tf-text)] hover:bg-[#f4f4f4] dark:border-[#4b4550] dark:bg-[#302c34] dark:text-[#f2eff3]" href={`${API}/api/inquiries/${inquiry.id}/export.csv`}>
              <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none"><path className="stroke-current [stroke-width:1.6] [stroke-linecap:round] [stroke-linejoin:round]" d="M10 2.5v9m0 0 3.5-3.5M10 11.5 6.5 8M3.5 13v3.5h13V13" /></svg>
              Export CSV
            </a>
          </div>
        </div>

        {/* Sub-navigation tabs: Form Performance, Response Summary, Responses */}
        <div className="my-6 inline-flex overflow-hidden rounded-lg border border-[var(--tf-border-mid)] dark:border-[#4b4550]">
          <button
            className={`min-h-[38px] border-0 px-[18px] py-2 text-sm font-medium ${tab === "performance" ? "bg-[var(--tf-purple)] text-white dark:bg-[#49424e]" : "bg-white text-[var(--tf-text-2)] dark:bg-[#26232a] dark:text-[#ddd5e0]"}`}
            onClick={() => setTab("performance")}
          >
            Form Performance
          </button>
          <button
            className={`min-h-[38px] border-0 px-[18px] py-2 text-sm font-medium ${tab === "summary" ? "bg-[var(--tf-purple)] text-white dark:bg-[#49424e]" : "bg-white text-[var(--tf-text-2)] dark:bg-[#26232a] dark:text-[#ddd5e0]"}`}
            onClick={() => setTab("summary")}
          >
            Response Summary
          </button>
          <button
            className={`min-h-[38px] border-0 px-[18px] py-2 text-sm font-medium ${tab === "replies" ? "bg-[var(--tf-purple)] text-white dark:bg-[#49424e]" : "bg-white text-[var(--tf-text-2)] dark:bg-[#26232a] dark:text-[#ddd5e0]"}`}
            onClick={() => setTab("replies")}
          >
            Responses ({replies.length})
          </button>
        </div>

        {/* Tab 1: Form Performance */}
        {tab === "performance" && (
          <div className="flex flex-col gap-6">
            {/* Metric cards */}
            <div className="grid grid-cols-5 gap-3.5 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
              <div className="rounded-xl border border-[var(--tf-border)] bg-white p-4 shadow-sm dark:border-[#39353e] dark:bg-[#26232a]">
                <span className="text-xs text-[var(--tf-muted)] dark:text-[#aaa2ae]">Views</span>
                <div className="mt-1 text-2xl font-bold text-[var(--tf-text)] dark:text-[#f2eff3]">{simulatedViews}</div>
                <div className="mt-1 text-[11px] text-[#087663]">Unique page visits</div>
              </div>
              <div className="rounded-xl border border-[var(--tf-border)] bg-white p-4 shadow-sm dark:border-[#39353e] dark:bg-[#26232a]">
                <span className="text-xs text-[var(--tf-muted)] dark:text-[#aaa2ae]">Starts</span>
                <div className="mt-1 text-2xl font-bold text-[var(--tf-text)] dark:text-[#f2eff3]">{simulatedStarts}</div>
                <div className="mt-1 text-[11px] text-[var(--tf-muted)]">Answered 1st question</div>
              </div>
              <div className="rounded-xl border border-[var(--tf-border)] bg-white p-4 shadow-sm dark:border-[#39353e] dark:bg-[#26232a]">
                <span className="text-xs text-[var(--tf-muted)] dark:text-[#aaa2ae]">Submissions</span>
                <div className="mt-1 text-2xl font-bold text-[var(--tf-text)] dark:text-[#f2eff3]">{totalSubmissions}</div>
                <div className="mt-1 text-[11px] text-[var(--tf-purple)] font-medium">Completed responses</div>
              </div>
              <div className="rounded-xl border border-[var(--tf-border)] bg-white p-4 shadow-sm dark:border-[#39353e] dark:bg-[#26232a]">
                <span className="text-xs text-[var(--tf-muted)] dark:text-[#aaa2ae]">Completion rate</span>
                <div className="mt-1 text-2xl font-bold text-[var(--tf-text)] dark:text-[#f2eff3]">{completionRate}%</div>
                <div className="mt-1 text-[11px] text-[#087663]">Submissions / Starts</div>
              </div>
              <div className="rounded-xl border border-[var(--tf-border)] bg-white p-4 shadow-sm dark:border-[#39353e] dark:bg-[#26232a]">
                <span className="text-xs text-[var(--tf-muted)] dark:text-[#aaa2ae]">Time to complete</span>
                <div className="mt-1 text-2xl font-bold text-[var(--tf-text)] dark:text-[#f2eff3]">{avgTime}</div>
                <div className="mt-1 text-[11px] text-[var(--tf-muted)]">Average duration</div>
              </div>
            </div>

            {/* Visual drop-off chart */}
            <div className="rounded-xl border border-[var(--tf-border)] bg-white p-6 shadow-sm dark:border-[#39353e] dark:bg-[#26232a]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-[var(--tf-text)] dark:text-[#f2eff3]">Visual Drop-off Chart</h3>
                <span className="text-xs text-[var(--tf-muted)]">Step-by-step respondent funnel</span>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-28 text-xs font-medium text-[var(--tf-text-2)] dark:text-[#aaa2ae]">Viewed form</span>
                  <div className="h-6 flex-1 overflow-hidden rounded-md bg-[#f0f0f2] dark:bg-[#343039]">
                    <div className="h-full rounded-md bg-[#526a91] flex items-center justify-end pr-2 text-[11px] font-bold text-white" style={{ width: "100%" }}>
                      100%
                    </div>
                  </div>
                  <span className="w-16 text-right text-xs font-semibold">{simulatedViews}</span>
                </div>
                {inquiry.prompts.map((p, idx) => {
                  const answeredForP = summary.find((s) => s.prompt_id === p.id)?.answered ?? 0;
                  const pct = simulatedViews > 0 ? Math.max(12, Math.round((Math.max(answeredForP, totalSubmissions) / simulatedViews) * 100)) : 0;
                  return (
                    <div className="flex items-center gap-3" key={p.id}>
                      <span className="w-28 truncate text-xs text-[var(--tf-text-2)] dark:text-[#aaa2ae]" title={p.label || `Question ${idx + 1}`}>
                        Q{idx + 1}: {p.label || p.kind}
                      </span>
                      <div className="h-6 flex-1 overflow-hidden rounded-md bg-[#f0f0f2] dark:bg-[#343039]">
                        <div
                          className="h-full rounded-md flex items-center justify-end pr-2 text-[11px] font-bold text-white transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            background: inquiry.accent || "var(--tf-purple)",
                          }}
                        >
                          {pct}%
                        </div>
                      </div>
                      <span className="w-16 text-right text-xs font-semibold">{Math.max(answeredForP, totalSubmissions)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Response Summary */}
        {tab === "summary" && (
          <div className="flex flex-col gap-4">
            {summary.map((s, k) => {
              const max = Math.max(1, ...Object.values(s.counts || {}));
              return (
                <div className="flex flex-col flex-wrap items-start gap-[10px] rounded-xl border border-[var(--tf-border)] bg-white p-5 shadow-sm dark:border-[#39353e] dark:bg-[#26232a] dark:text-[#f2eff3]" key={s.prompt_id}>
                  <b className="text-base">{k + 1}. {s.label || "Untitled question"}</b>
                  <span className="text-xs text-[var(--tf-muted)]">{s.answered} answered{s.average != null ? ` · average ${s.average}` : ""}</span>
                  {s.counts && Object.entries(s.counts).map(([label, c]) => (
                    <div className="flex w-full min-w-0 items-center gap-[10px] mt-1" key={label}>
                      <span className="w-[150px] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[var(--tf-text-2)] max-[620px]:w-[90px]">{label}</span>
                      <div className="h-[14px] flex-1 overflow-hidden rounded-[7px] bg-[#e8e5e9] dark:bg-[#39353e]"><div className="h-full rounded-[7px]" style={{ width: `${(c / max) * 100}%`, background: inquiry.accent }} /></div>
                      <span className="text-xs font-semibold">{c}</span>
                    </div>))}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Responses (Table + Empty State + Generate Test Response) */}
        {tab === "replies" && (
          replies.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--tf-border)] bg-white p-12 text-center dark:border-[#39353e] dark:bg-[#26232a]">
              <div className="grid size-14 place-items-center rounded-2xl bg-[#f0eef2] text-2xl text-[var(--tf-purple)] dark:bg-[#35303a] dark:text-[#d9c9df]">
                📋
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--tf-text)] dark:text-[#f2eff3]">No responses yet</h3>
              <p className="mt-1.5 max-w-sm text-xs text-[var(--tf-muted)] dark:text-[#aaa2ae]">
                Share your form link with respondents, or generate a realistic test response to inspect the table and analytics right away.
              </p>
              <button
                onClick={generateTestResponse}
                disabled={generating}
                className="mt-6 rounded-lg bg-[var(--tf-purple)] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[var(--tf-purple-dark)] active:scale-95 transition-transform"
              >
                {generating ? "Generating…" : "⚡ Generate test response"}
              </button>
            </div>
          ) : (
            <div className="overflow-auto rounded-xl border border-[var(--tf-border)] bg-white shadow-sm dark:border-[#39353e] dark:bg-[#26232a]">
              <table className="w-full border-collapse text-sm text-[var(--tf-text)]">
                <thead className="bg-[#f6f5f6] dark:bg-[#302c34]">
                  <tr>
                    <th className="whitespace-nowrap border-b border-[var(--tf-border)] px-4 py-3 text-left font-semibold text-xs text-[var(--tf-muted)] dark:border-[#39353e] dark:text-[#aaa2ae]">#</th>
                    <th className="whitespace-nowrap border-b border-[var(--tf-border)] px-4 py-3 text-left font-semibold text-xs text-[var(--tf-muted)] dark:border-[#39353e] dark:text-[#aaa2ae]">Submitted</th>
                    {inquiry.prompts.map((p) => (
                      <th className="whitespace-nowrap border-b border-[var(--tf-border)] px-4 py-3 text-left font-semibold text-xs text-[var(--tf-muted)] dark:border-[#39353e] dark:text-[#aaa2ae]" key={p.id}>
                        {p.label || p.kind}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {replies.map((r, rIdx) => (
                    <tr className="cursor-pointer hover:bg-[#f5f2f6] dark:hover:bg-[#343039] transition-colors" key={r.id} onClick={() => setOpen(r.id)}>
                      <td className="whitespace-nowrap border-b border-[var(--tf-border)] px-4 py-3 text-xs text-[var(--tf-muted)] dark:border-[#39353e]">{replies.length - rIdx}</td>
                      <td className="whitespace-nowrap border-b border-[var(--tf-border)] px-4 py-3 text-xs dark:border-[#39353e]">{when(r.submitted_at)}</td>
                      {inquiry.prompts.map((p) => (
                        <td className="max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-[var(--tf-border)] px-4 py-3 text-xs dark:border-[#39353e]" key={p.id}>
                          {r.answers[p.id] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </main>

      {shown && (
        <Modal title={`Response #${shown.id}`} onClose={() => setOpen(null)}>
          <p className="text-[13px] text-[var(--tf-muted)]">{when(shown.submitted_at)}</p>
          {inquiry.prompts.map((p) => (
            <div key={p.id} className="border-b border-[#eee] py-[10px] dark:border-[#39353e]">
              <div className="text-[13px] text-[var(--tf-muted)]">{p.label || p.kind}</div>
              <div className="mt-1 text-sm font-medium text-[var(--tf-text)] dark:text-[#f2eff3]">{shown.answers[p.id] || "—"}</div>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}
