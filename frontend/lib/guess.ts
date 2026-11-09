import { Kind, PromptDTO } from "@/lib/types";

let counter = -1000;
export const nextTempId = () => counter--;

// Tiny rule-based helper: one prompt per pasted line, kind guessed from keywords.
export function guessKind(line: string): Kind {
  const t = line.toLowerCase();
  if (/e-?mail/.test(t)) return "email";
  if (/\b(rate|rating|satisf)/.test(t)) return "rating";
  if (/\b(how many|age|number of|phone|quantity)\b/.test(t)) return "number";
  if (/^(do|did|are|is|would|will|can|have|has)\b/.test(t) && t.endsWith("?")) return "yes_no";
  if (/\b(comments?|feedback|describe|explain|tell us|anything else)\b/.test(t)) return "long_text";
  return "short_text";
}
export function toPrompts(text: string): PromptDTO[] {
  return text.split("\n").map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").trim()).filter(Boolean)
    .map((label) => ({ id: nextTempId(), kind: guessKind(label), label, hint: "", mandatory: false, choices: [] }));
}
