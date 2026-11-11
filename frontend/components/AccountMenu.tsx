"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toasts";
import { USER } from "@/lib/user";

interface Props {
  size?: "sm" | "md";
}

export default function AccountMenu({ size = "md" }: Props) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const soon = (feature: string) => toast(`${feature} is coming soon`);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const buttonClass = size === "sm"
    ? "grid size-[30px] shrink-0 place-items-center rounded-full border-0 bg-[#f9d3da] text-xs font-semibold text-[#58444d] hover:opacity-90 active:scale-95 transition-transform duration-150 cursor-pointer"
    : "grid h-10 w-10 shrink-0 place-items-center rounded-full border-0 bg-[#f9d3da] text-sm font-semibold text-[#58444d] hover:opacity-90 active:scale-95 transition-transform duration-150 cursor-pointer";

  const menuTopClass = size === "sm" ? "top-[38px]" : "top-12";

  return (
    <div className="relative">
      <button
        type="button"
        className={buttonClass}
        aria-label="Account menu"
        aria-expanded={open}
        title={USER.name}
        onClick={() => setOpen(!open)}
      >
        {USER.initials}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20 bg-transparent" onClick={() => setOpen(false)} />
          <div className={`absolute right-0 ${menuTopClass} z-[22] w-[min(344px,calc(100vw-24px))] origin-top-right animate-dropdown-slide rounded-[18px] border border-[var(--tf-border)] bg-white px-[18px] py-5 text-[var(--tf-text)] shadow-[0_12px_36px_rgba(39,31,42,.16)] dark:border-[#39353e] dark:bg-[#26232a] max-[620px]:fixed max-[620px]:right-3 max-[620px]:top-14`}>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f9d3da] text-sm font-semibold text-[#58444d]">{USER.initials}</span>
              <div className="flex flex-col gap-0.5 text-left">
                <b className="text-sm font-semibold text-[var(--tf-text)] dark:text-[#f2eff3]">{USER.name}</b>
                <span className="text-xs text-[var(--tf-muted)] dark:text-[#aaa2ae]">{USER.email}</span>
              </div>
            </div>
            <hr className="my-2.5 w-full border-0 border-t border-[var(--tf-border)] dark:border-[#39353e]" />
            <strong className="mb-1 mt-1 block px-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--tf-muted)] dark:text-[#a1a1aa]">ACCOUNT</strong>
            <button
              type="button"
              className="flex w-full items-center rounded-md border-0 bg-transparent px-2 py-2 text-left text-sm text-[var(--tf-text)] hover:bg-[#f5f3f5] dark:text-[#e4e4e7] dark:hover:bg-[#37313b] transition-colors"
              onClick={() => { setOpen(false); soon("Account settings"); }}
            >
              Account settings
            </button>
            <hr className="my-2 w-full border-0 border-t border-[var(--tf-border)] dark:border-[#39353e]" />
            <strong className="mb-1 mt-1 block px-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--tf-muted)] dark:text-[#a1a1aa]">RESOURCES</strong>
            {["Support", "Help center", "Community", "Apps & Integrations", "What's New"].map((item) => (
              <button
                type="button"
                className="flex w-full items-center rounded-md border-0 bg-transparent px-2 py-2 text-left text-sm text-[var(--tf-text)] hover:bg-[#f5f3f5] dark:text-[#e4e4e7] dark:hover:bg-[#37313b] transition-colors"
                key={item}
                onClick={() => { setOpen(false); soon(item); }}
              >
                {item}
              </button>
            ))}
            <hr className="my-2 w-full border-0 border-t border-[var(--tf-border)] dark:border-[#39353e]" />
            <button
              type="button"
              className="flex w-full items-center rounded-md border-0 bg-transparent px-2 py-2 text-left text-sm text-[var(--tf-text)] hover:bg-[#f5f3f5] dark:text-[#e4e4e7] dark:hover:bg-[#37313b] transition-colors"
              onClick={() => { setOpen(false); soon("Referral rewards"); }}
            >
              Refer friends, get rewards
            </button>
            <hr className="my-2 w-full border-0 border-t border-[var(--tf-border)] dark:border-[#39353e]" />
            <Link
              className="flex w-full items-center rounded-md border-0 bg-transparent px-2 py-2 text-left text-sm text-[var(--tf-text)] hover:bg-[#f5f3f5] dark:text-[#e4e4e7] dark:hover:bg-[#37313b] transition-colors"
              href="/"
              onClick={() => setOpen(false)}
            >
              Homepage
            </Link>
            <button
              type="button"
              className="flex w-full items-center rounded-md border-0 bg-transparent px-2 py-2 text-left text-sm font-medium text-[#b43e32] hover:bg-[#fdf3f2] dark:hover:bg-[#3c2527] transition-colors"
              onClick={() => { setOpen(false); soon("Sign out"); }}
            >
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
