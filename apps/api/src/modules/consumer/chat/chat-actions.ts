import { randomUUID } from "node:crypto";

export type ChatActionKind = "confirm" | "cancel" | "continue" | "reply";
export type ChatAction = {
  id: string;
  kind: ChatActionKind;
  label: string;
  prompt: string;
  appearance: "primary" | "secondary";
  expiresAt: string;
};

// The model writes the copy; the server owns the operations it may offer.
export function normalizeChatActions(
  value: unknown,
  allowed: ChatActionKind[],
  expiresAt: string,
): ChatAction[] {
  if (!Array.isArray(value)) return [];
  const actions: ChatAction[] = [];
  for (const candidate of value) {
    if (!candidate || !allowed.includes(candidate.kind)) continue;
    const { kind } = candidate;
    const label =
      typeof candidate.label === "string" ? candidate.label.trim() : "";
    const prompt =
      typeof candidate.prompt === "string" ? candidate.prompt.trim() : "";
    if (!label || label.length > 42 || !prompt || prompt.length > 240) continue;
    if (/[\r\n<>]/.test(label) || /https?:\/\/|[<>]/i.test(prompt)) continue;
    // A vague “continue” label must never silently place an order.
    if (
      kind === "confirm" &&
      !/tasdiq|buyurtma.*yubor|confirm|подтверд/i.test(label)
    )
      continue;
    if (kind === "cancel" && !/bekor|cancel|отмен/i.test(label)) continue;
    if (
      actions.some(
        (item) =>
          item.label === label || (kind !== "reply" && item.kind === kind),
      )
    )
      continue;
    actions.push({
      id: randomUUID(),
      kind,
      label,
      prompt,
      appearance:
        kind === "cancel" || actions.some((a) => a.appearance === "primary")
          ? "secondary"
          : "primary",
      expiresAt,
    });
    if (actions.length === 3) break;
  }
  return actions.sort(
    (a, b) => Number(a.kind === "cancel") - Number(b.kind === "cancel"),
  );
}
