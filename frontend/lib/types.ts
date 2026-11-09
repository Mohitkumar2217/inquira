export type Kind = "short_text" | "long_text" | "choice" | "dropdown" | "email" | "number" | "yes_no" | "rating" |
  "contact_info" | "phone" | "address" | "url" | "checkbox" | "legal" | "nps" | "opinion_scale" | "ranking" | "matrix" | "date";

export interface PromptDTO {
  id: number; position?: number; kind: Kind; label: string; hint: string; mandatory: boolean; choices: string[];
}
export interface Inquiry {
  id: number; slug: string; title: string; status: "draft" | "published"; accent: string;
  workspace_id?: number | null;
  closing_heading: string; closing_text: string; prompts: PromptDTO[];
  reply_count?: number; prompt_count?: number; updated_at?: string; created_at?: string;
}
export interface Workspace {
  id: number; name: string; is_private: boolean; form_count: number;
}
export const KIND_META: { kind: Kind; name: string; icon: string }[] = [
  { kind: "short_text", name: "Short text", icon: "Aa" },
  { kind: "long_text", name: "Long text", icon: "¶" },
  { kind: "choice", name: "Multiple choice", icon: "☰" },
  { kind: "dropdown", name: "Dropdown", icon: "▾" },
  { kind: "email", name: "Email", icon: "@" },
  { kind: "number", name: "Number", icon: "#" },
  { kind: "yes_no", name: "Yes / No", icon: "✓" },
  { kind: "rating", name: "Rating", icon: "★" },
  { kind: "contact_info", name: "Contact info", icon: "◉" },
  { kind: "phone", name: "Phone number", icon: "☎" },
  { kind: "address", name: "Address", icon: "⌖" },
  { kind: "url", name: "Website", icon: "↗" },
  { kind: "checkbox", name: "Checkboxes", icon: "☑" },
  { kind: "legal", name: "Consent", icon: "⚖" },
  { kind: "nps", name: "Net Promoter Score", icon: "◔" },
  { kind: "opinion_scale", name: "Opinion scale", icon: "▂▄" },
  { kind: "ranking", name: "Ranking", icon: "①" },
  { kind: "matrix", name: "Matrix", icon: "⣿" },
  { kind: "date", name: "Date", icon: "▦" },
];
export const kindName = (k: Kind) => KIND_META.find((m) => m.kind === k)?.name ?? k;
