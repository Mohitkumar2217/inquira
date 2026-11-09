"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Runner from "@/components/Runner";
import { call, send } from "@/lib/api";
import { Inquiry } from "@/lib/types";

export default function PublicForm() {
  const { slug } = useParams<{ slug: string }>();
  const [inq, setInq] = useState<Inquiry | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => { call<Inquiry>(`/api/public/${slug}`).then(setInq).catch(() => setMissing(true)); }, [slug]);

  if (missing) return <div className="center-page"><h2>This form isn&apos;t available</h2><p className="muted">It may be unpublished or the link is wrong.</p></div>;
  if (!inq) return <div className="center-page muted">Loading…</div>;
  return (
    <div className="fullscreen">
      <Runner inquiry={inq} onSubmit={async (answers) => { await call(`/api/public/${slug}/replies`, send("POST", { answers })); }} />
    </div>
  );
}
