"use client";
import { useEffect, useId } from "react";

/** Accessible dialog popup styled consistently with Inquira's light and dark UI. */
export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-3 backdrop-blur-[2px] sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[88dvh] w-[min(520px,calc(100vw-24px))] animate-pop overflow-y-auto rounded-2xl border border-[var(--tf-border)] bg-white p-5 text-[var(--tf-text)] shadow-[0_20px_60px_rgba(39,31,42,0.18)] sm:p-6 dark:border-[#39353e] dark:bg-[#26232a] dark:text-[#f2eff3] dark:shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--tf-border)] pb-3 dark:border-[#39353e]">
          <h3 id={titleId} className="m-0 min-w-0 truncate text-base font-semibold text-[var(--tf-text)] dark:text-[#f2eff3]">
            {title}
          </h3>
          <button
            type="button"
            className="grid size-8 shrink-0 place-items-center rounded-lg border-0 bg-transparent text-[var(--tf-muted)] transition-colors hover:bg-[#f3f1f4] hover:text-[var(--tf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-[#343039] dark:hover:text-white"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
