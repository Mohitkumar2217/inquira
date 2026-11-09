import { nextTempId } from "@/lib/guess";
import { Kind, PromptDTO } from "@/lib/types";

/** Group consecutive prompts that share a page key into one "step" (one screen). */
export function buildSteps(ps: PromptDTO[]): PromptDTO[][] {
  const out: PromptDTO[][] = [];
  ps.forEach((p) => {
    const last = out[out.length - 1];
    if (p.page && last && last[0].page?.key === p.page.key) last.push(p);
    else out.push([p]);
  });
  return out;
}

export const newPageKey = () => "pg" + Math.random().toString(36).slice(2, 10);

const HOLD_LABEL: Record<string, string> = { "first name": "Jane", "last name": "Smith" };
const HOLD_KIND: Partial<Record<Kind, string>> = { email: "name@example.com", number: "123", url: "https://example.com" };
export const holdFor = (p: PromptDTO) =>
  HOLD_LABEL[p.label.trim().toLowerCase()] ?? HOLD_KIND[p.kind] ?? "Type your answer here…";

/** The "Contact Info" page: first name, last name, phone and email on one screen. */
export function contactInfoPrompts(): PromptDTO[] {
  const page = { key: newPageKey(), title: "Contact Info", hint: "" };
  const rows: [Kind, string][] = [["short_text", "First name"], ["short_text", "Last name"], ["phone", "Phone number"], ["email", "Email"]];
  return rows.map(([kind, label]) => ({ id: nextTempId(), kind, label, hint: "", mandatory: false, choices: [], page: { ...page } }));
}
