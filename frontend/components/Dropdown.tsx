"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Ref } from "react";

export interface DropdownOption {
  label: string;
  value: string;
}

interface Props {
  ariaLabel: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  buttonRef?: Ref<HTMLButtonElement>;
  variant?: "compact" | "answer" | "matrix";
}

const triggerStyles = {
  compact: "min-h-10 rounded-lg border border-[#d5d0d7] bg-white px-3 py-2 text-sm text-[#29252b] shadow-sm hover:border-[#a99eac] dark:border-[#4b4550] dark:bg-[#211f25] dark:text-[#f2eff3] dark:hover:border-[#716879]",
  answer: "min-h-0 rounded-none border-0 border-b border-[#b9b9b9] bg-transparent px-0 py-1 text-[clamp(20px,3vw,28px)] text-[var(--accent)] shadow-none hover:border-[#a99eac] focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-[#625968]",
  matrix: "min-h-10 rounded-md border border-[var(--tf-border-mid)] bg-[var(--tf-white)] px-2.5 py-2 text-sm text-[var(--tf-text)] shadow-none hover:border-[#a99eac] dark:border-[var(--tf-border)] dark:bg-[#211f25] dark:text-[var(--tf-text)]",
};

export default function Dropdown({
  ariaLabel,
  options,
  value,
  onChange,
  className = "",
  buttonRef,
  variant = "compact",
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const select = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setActiveIndex(index);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!options.length) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const next = open
        ? (activeIndex + direction + options.length) % options.length
        : Math.max(0, Math.min(options.length - 1, selectedIndex < 0 ? 0 : selectedIndex));
      setActiveIndex(next);
      setOpen(true);
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      select(activeIndex);
    }
  };

  return (
    <div ref={rootRef} className={`relative inline-block text-left ${variant === "compact" ? "min-w-[148px]" : "w-full"} ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-option-${activeIndex}` : undefined}
        onClick={() => {
          setActiveIndex(selectedIndex < 0 ? 0 : selectedIndex);
          setOpen((current) => !current);
        }}
        onKeyDown={handleKeyDown}
        className={`inline-flex w-full items-center justify-between gap-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a7590] focus-visible:ring-offset-1 dark:focus-visible:ring-[#9c85a5] ${triggerStyles[variant]}`}
      >
        <span className="truncate">{selected?.label ?? "Select an option"}</span>
        <svg className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-[calc(100%+6px)] z-50 max-h-60 min-w-full overflow-auto rounded-lg border border-[#e7e4e7] bg-white p-1 shadow-xl dark:border-[#45404a] dark:bg-[#26232a]"
        >
          {options.map((option, index) => (
            <li
              id={`${listId}-option-${index}`}
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(index)}
              className={`flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm transition-colors ${
                index === activeIndex
                  ? "bg-[#f1eef2] text-[#453747] dark:bg-[#39313d] dark:text-[#f2eff3]"
                  : "text-[#514a54] hover:bg-[#f5f3f5] dark:text-[#d5cfd8] dark:hover:bg-[#37313b]"
              }`}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <span aria-hidden="true" className="text-[#453747] dark:text-[#c8b7d0]">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
