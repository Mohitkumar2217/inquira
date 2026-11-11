"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";

const Ctx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

type ToastTone = "success" | "error" | "soon" | "info";

interface ToastItem {
  id: number;
  msg: string;
  tone: ToastTone;
}

function detectTone(msg: string): ToastTone {
  if (/error|fail|invalid|unable|cannot|couldn't|not found|required|denied|must/i.test(msg)) {
    return "error";
  }
  if (/coming soon|pro feature/i.test(msg)) {
    return "soon";
  }
  if (/saved|copied|published|duplicated|created|renamed|moved|generated|applied|added|configured|selected|unpublished|deleted|left/i.test(msg)) {
    return "success";
  }
  return "info";
}

function ToastBadge({ tone }: { tone: ToastTone }) {
  if (tone === "success") {
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#e7f3ef] text-[#147a68] dark:bg-[#263c36] dark:text-[#62b6a0]" aria-hidden="true">
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    );
  }
  if (tone === "error") {
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#faecea] text-[#bd4949] dark:bg-[#472524] dark:text-[#ffb4aa]" aria-hidden="true">
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>
    );
  }
  if (tone === "soon") {
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#eee9ef] text-[13px] text-[var(--tf-purple)] dark:bg-[#39313d] dark:text-[#d9c9df]" aria-hidden="true">
        ✦
      </span>
    );
  }
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#f1eff2] text-[var(--tf-text-2)] dark:bg-[#343039] dark:text-[#d5cfd8]" aria-hidden="true">
      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </span>
  );
}

/** Provides application-wide toast notifications styled to match Inquira's light and dark UI. */
export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setItems((s) => s.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    const tone = detectTone(msg);
    setItems((s) => [...s.slice(-2), { id, msg, tone }]);
    const timer = setTimeout(() => {
      timers.current.delete(id);
      setItems((s) => s.filter((t) => t.id !== id));
    }, 3200);
    timers.current.set(id, timer);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 left-1/2 z-[120] flex w-[min(440px,calc(100vw-24px))] -translate-x-1/2 flex-col items-center gap-2 sm:bottom-5"
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-fit max-w-full animate-rise items-center gap-2.5 rounded-2xl border border-[var(--tf-border)] bg-white/95 py-2 pl-2.5 pr-3 text-[13px] font-medium text-[var(--tf-text)] shadow-[0_10px_30px_rgba(39,31,42,0.12)] backdrop-blur-md dark:border-[#39353e] dark:bg-[#26232a]/95 dark:text-[#f2eff3] dark:shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
          >
            <ToastBadge tone={t.tone} />
            <span className="min-w-0 flex-1 break-words leading-snug">{t.msg}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="ml-0.5 grid size-6 shrink-0 place-items-center rounded-lg text-[var(--tf-muted)] transition-colors hover:bg-[#f3f1f4] hover:text-[var(--tf-text)] dark:hover:bg-[#343039] dark:hover:text-white"
              aria-label="Dismiss notification"
            >
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
