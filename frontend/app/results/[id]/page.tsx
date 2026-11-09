"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
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
  const [tab, setTab] = useState<"summary" | "replies">("summary");
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => { call<Bundle>(`/api/inquiries/${id}/replies`).then(setData); }, [id]);
  if (!data) return <div className="center-page muted">Loading…</div>;

  const { inquiry, replies, summary } = data;
  const when = (s: string) => new Date(s + "Z").toLocaleString();
  const shown = replies.find((r) => r.id === open);

  return (
    <div className="shell">
      <header className="topbar"><Link href="/" className="logo">Inquira</Link>
        <nav className="tabs"><Link href={`/builder/${inquiry.id}`}>Create</Link>
          <button className="on">Results</button></nav><div /></header>
      <main className="container">
        <div className="row between"><div><h1>{inquiry.title}</h1><p className="muted">{replies.length} responses</p></div>
          <a className="btn" href={`${API}/api/inquiries/${inquiry.id}/export.csv`}>Export CSV</a></div>
        <div className="seg"><button className={tab === "summary" ? "on" : ""} onClick={() => setTab("summary")}>Summary</button>
          <button className={tab === "replies" ? "on" : ""} onClick={() => setTab("replies")}>Responses</button></div>

        {tab === "summary" && summary.map((s, k) => {
          const max = Math.max(1, ...Object.values(s.counts || {}));
          return (
            <div className="card col" key={s.prompt_id}>
              <b>{k + 1}. {s.label || "Untitled question"}</b>
              <span className="muted small">{s.answered} answered{s.average != null ? ` · average ${s.average}` : ""}</span>
              {s.counts && Object.entries(s.counts).map(([label, c]) => (
                <div className="bar-row" key={label}><span className="bar-label">{label}</span>
                  <div className="bar"><div style={{ width: `${(c / max) * 100}%`, background: inquiry.accent }} /></div><span>{c}</span></div>))}
            </div>);
        })}

        {tab === "replies" && (replies.length === 0 ? <p className="muted">No responses yet.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Submitted</th>{inquiry.prompts.map((p) => <th key={p.id}>{p.label}</th>)}</tr></thead>
            <tbody>{replies.map((r) => (
              <tr key={r.id} onClick={() => setOpen(r.id)}><td>{when(r.submitted_at)}</td>
                {inquiry.prompts.map((p) => <td key={p.id} className="ellipsis-cell">{r.answers[p.id] || "—"}</td>)}</tr>))}</tbody>
          </table></div>))}
      </main>
      {shown && (
        <Modal title={`Response #${shown.id}`} onClose={() => setOpen(null)}>
          <p className="muted small">{when(shown.submitted_at)}</p>
          {inquiry.prompts.map((p) => (<div key={p.id} className="qa"><div className="muted small">{p.label}</div><div>{shown.answers[p.id] || "—"}</div></div>))}
        </Modal>)}
    </div>
  );
}
