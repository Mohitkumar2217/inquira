"use client";
import { useState } from "react";
import { LINE, LINE_CC } from "@/lib/styles";

const COUNTRIES = [
  { n: "US", f: "🇺🇸", d: "+1" }, { n: "IN", f: "🇮🇳", d: "+91" }, { n: "GB", f: "🇬🇧", d: "+44" },
  { n: "CA", f: "🇨🇦", d: "+1" }, { n: "AU", f: "🇦🇺", d: "+61" }, { n: "DE", f: "🇩🇪", d: "+49" },
  { n: "FR", f: "🇫🇷", d: "+33" }, { n: "AE", f: "🇦🇪", d: "+971" },
];

interface Props { value: string; onChange: (v: string) => void; inputRef?: React.Ref<HTMLInputElement> }

/** Country picker + number. The stored value is "+<code> <number>", or "" when the number is empty. */
export default function PhoneField({ value, onChange, inputRef }: Props) {
  const m = value.match(/^(\+\d+) (.*)$/);
  const [cc, setCc] = useState(() => COUNTRIES.find((c) => m && c.d === m[1])?.n ?? "US");
  const dial = COUNTRIES.find((c) => c.n === cc)?.d ?? "+1";
  const num = m ? m[2] : value;
  const emit = (d: string, n: string) => onChange(n.trim() ? `${d} ${n}` : "");
  return (
    <div className="phone flex items-end gap-2.5">
      <select className={LINE_CC} aria-label="Country code" value={cc}
        onChange={(e) => { setCc(e.target.value); emit(COUNTRIES.find((c) => c.n === e.target.value)?.d ?? "+1", num); }}>
        {COUNTRIES.map((c) => <option key={c.n} value={c.n}>{c.f} {c.d}</option>)}
      </select>
      <input ref={inputRef} className={LINE} type="tel" inputMode="tel" autoComplete="tel-national" aria-label="Phone number"
        value={num} placeholder="(201) 555-0123" onChange={(e) => emit(dial, e.target.value)} />
    </div>
  );
}
