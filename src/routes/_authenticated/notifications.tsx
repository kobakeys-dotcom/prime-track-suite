import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Check, CheckCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { listNotifications, markNotificationRead } from "@/lib/notifications.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — ProjectCore" }] }),
  component: NotificationsPage,
});

const SEV_STYLES: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-rose-100 text-rose-700",
};

function NotificationsPage() {
  const fetcher = useServerFn(listNotifications);
  const markFn = useServerFn(markNotificationRead);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: () => fetcher() });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const mut = useMutation({
    mutationFn: (v: { id?: string; all?: boolean }) => markFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const items = (data?.items ?? []) as any[];
  const filtered = useMemo(() => {
    let out = items;
    if (filter === "unread") out = out.filter((n) => !n.read_at);
    if (filter === "read") out = out.filter((n) => n.read_at);
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((n) => `${n.title} ${n.body ?? ""}`.toLowerCase().includes(q));
    }
    return out;
  }, [items, filter, search]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">{data?.unread ?? 0} unread of {items.length}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9 w-56" />
          </div>
          <Button variant="outline" size="sm" onClick={() => mut.mutate({ all: true })} disabled={!data?.unread}>
            <CheckCheck className="size-4 mr-1" /> Mark all read
          </Button>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-sm p-12 text-center">
            <Bell className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Nothing to show</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-sm divide-y divide-border">
            {filtered.map((n) => (
              <div key={n.id} className={cn("p-4 flex items-start gap-3", !n.read_at && "bg-accent/5")}>
                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-0.5", SEV_STYLES[n.severity] ?? "bg-zinc-100 text-zinc-700")}>
                  {n.severity ?? "info"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{n.body}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                {!n.read_at && (
                  <button onClick={() => mut.mutate({ id: n.id })} className="p-1.5 hover:bg-muted rounded text-emerald-700" title="Mark read">
                    <Check className="size-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
