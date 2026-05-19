import { z } from "zod";

export const TextSchema = z.object({
  markdown: z.string(),
});

export const HeaderSchema = z.object({
  level: z.number().int().min(1).max(3),
  text: z.string(),
});

export const ListSchema = z.object({
  ordered: z.boolean(),
  items: z.array(z.string()),
});

export const HeroSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  cta: z.string(),
});

export const CardSchema = z.object({
  title: z.string(),
  desc: z.string(),
});
export const CardGridSchema = z.object({
  columns: z.number().int().min(1).max(4),
  cards: z.array(CardSchema),
});

export const FormFieldSchema = z.object({
  label: z.string(),
  type: z.string(),
  required: z.boolean(),
});
export const FormSchema = z.object({
  fields: z.array(FormFieldSchema),
});

export const NavItemSchema = z.object({
  label: z.string(),
  href: z.string(),
});
export const NavSchema = z.object({
  items: z.array(NavItemSchema),
});

export const LayoutSchema = z.object({
  mode: z.enum(["vstack", "hstack", "grid"]).default("vstack"),
  cols: z.number().int().min(1).max(6).optional(),
  gap: z.enum(["sm", "md", "lg"]).default("md"),
});

export type LayoutValues = z.infer<typeof LayoutSchema>;

export const LAYOUT_DEFAULTS: LayoutValues = { mode: "vstack", gap: "md" };

export const AgentStepSchema = z.object({
  role: z.enum(["input", "tool", "llm", "output"]),
  specJson: z.string(),
});

export type TextValues = z.infer<typeof TextSchema>;
export type HeaderValues = z.infer<typeof HeaderSchema>;
export type ListValues = z.infer<typeof ListSchema>;
export type HeroValues = z.infer<typeof HeroSchema>;
export type CardGridValues = z.infer<typeof CardGridSchema>;
export type FormValues = z.infer<typeof FormSchema>;
export type NavValues = z.infer<typeof NavSchema>;
export type AgentStepValues = z.infer<typeof AgentStepSchema>;

export const TEXT_DEFAULTS: TextValues = { markdown: "" };
export const HEADER_DEFAULTS: HeaderValues = { level: 1, text: "" };
export const LIST_DEFAULTS: ListValues = { ordered: false, items: [] };
export const HERO_DEFAULTS: HeroValues = { title: "", subtitle: "", cta: "" };
export const CARD_GRID_DEFAULTS: CardGridValues = { columns: 3, cards: [] };
export const FORM_DEFAULTS: FormValues = { fields: [] };
export const NAV_DEFAULTS: NavValues = { items: [] };
export const AGENT_STEP_DEFAULTS: AgentStepValues = {
  role: "input",
  specJson: "{}",
};
