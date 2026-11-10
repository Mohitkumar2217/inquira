"use client";
import React from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export default function ToggleSwitch({
  checked,
  onChange,
  id,
  ariaLabel,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-label={ariaLabel}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked
          ? "bg-[#262627] dark:bg-[#f2eff3]"
          : "bg-[#e4e4e7] dark:bg-[#3f3f46]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out dark:bg-[#18181b] ${
          checked ? "translate-x-4 dark:bg-[#18181b]" : "translate-x-0 dark:bg-white"
        }`}
      />
    </button>
  );
}
