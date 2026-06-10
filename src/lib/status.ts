export const APPROVAL_STATUSES = ["draft", "submitted", "under_review", "approved", "rejected", "revise_resubmit", "closed"] as const;

export const APPROVAL_STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  revise_resubmit: "bg-orange-100 text-orange-700",
  closed: "bg-zinc-200 text-zinc-600",
};

export function statusLabel(s: string) {
  return s.replace(/_/g, " ");
}
