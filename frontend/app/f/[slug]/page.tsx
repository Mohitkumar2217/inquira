"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Runner from "@/components/Runner";
import { call, send } from "@/lib/api";
import { Inquiry } from "@/lib/types";

export default function PublicForm() {
  const { slug } = useParams<{ slug: string }>();
  const [inq, setInq] = useState<Inquiry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setInq(null);
    setLoadError(null);
    call<Inquiry>(`/api/public/${slug}`)
      .then((data) => { if (active) setInq(data); })
      .catch((error: Error) => { if (active) setLoadError(error.message); });
    return () => { active = false; };
  }, [slug]);

  if (loadError) return <div className="grid min-h-screen place-content-center text-center"><h2>This form isn&apos;t available</h2><p className="text-[#767676] dark:text-[#b4acb9]" role="alert">{loadError}</p></div>;
  if (!inq) return <div className="grid min-h-screen place-content-center text-center text-[#767676] dark:text-[#b4acb9]">Loading…</div>;
  return (
    <div className="h-screen bg-white dark:bg-[#1d1b20]">
      <Runner inquiry={inq} onSubmit={async (answers) => { await call(`/api/public/${slug}/replies`, send("POST", { answers })); }} />
    </div>
  );
}
