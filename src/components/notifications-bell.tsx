import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { listNotifications, markNotificationRead, MODULE_ROUTES } from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PRIO_STYLE: Record<string, string> = {
  Critical: "bg-rose-600 text-white",
  Urgent: "bg-rose-500 text-white",
  High: "bg-amber-500 text-white",
  Medium: "bg-blue-500 text-white",
  Low: "bg-zinc-400 text-white",
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function resolveNotificationLink(n: any): string | null {
  if (n.action_url) return n.action_url;
  if (n.link) return n.link;
  if (n.module_name && MODULE_ROUTES[n.module_name]) return MODULE_ROUTES[n.module_name];
  return null;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const fetcher = useServerFn(listNotifications);
  const markFn = useServerFn(markNotificationRead);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications", "bell"],
    queryFn: () => fetcher({ data: { limit: 15 } }),
    refetchInterval: 60_000,
  });
  const mark = useMutation({
    mutationFn: (v: { id?: string; all?: boolean }) => markFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["notification-summary"] }); },
  });

  // Realtime
  useEffect(() => {
    let uid: string | null = null;
    supabase.auth.getUser().then(({ data }) => {
      uid = data.user?.id ?? null;
      if (!uid) return;
      const channel = supabase
        .channel("notif-bell")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, (payload: any) => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
          qc.invalidateQueries({ queryKey: ["notification-summary"] });
          const p = payload.new;
          toast(p?.title ?? "New notification", { description: p?.message ?? p?.body ?? undefined });
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    });
    return () => { /* cleanup handled inside */ };
  }, [qc]);

  const items = (data?.items ?? []) as any[];
  const unread = items.filter((n) => !n.read_at).length;

  function openItem(n: any) {
    if (!n.read_at) mark.mutate({ id: n.id });
    const url = resolveNotificationLink(n);
    setOpen(false);
    if (url) navigate({ to: url as any }).catch(() => toast.info("Linked page is not available yet."));
    else toast.info("Linked page is not available yet.");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" aria-label="Notifications">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 size-4 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 max-h-[520px] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="font-display font-bold text-sm uppercase tracking-tight">Notifications</div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button onClick={() => mark.mutate({ all: true })} className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                <Check className="size-3" /> Mark all read
              </button>
            )}
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-8 text-center">No notifications.</p>
          ) : items.map((n) => (
            <button
              key={n.id}
              onClick={() => openItem(n)}
              className={cn("w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 block", !n.read_at && "bg-accent/5")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {!n.read_at && <span className="size-2 rounded-full bg-accent shrink-0" />}
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0", PRIO_STYLE[n.priority] ?? "bg-zinc-200 text-zinc-700")}>{n.priority ?? "Medium"}</span>
                  <span className="text-sm font-medium truncate">{n.title}</span>
                </div>
                <div className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.created_at)}</div>
              </div>
              {(n.message || n.body) && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message ?? n.body}</div>}
              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                {n.module_name && <span className="px-1.5 py-0.5 bg-muted rounded">{n.module_name}</span>}
                {n.record_number && <span>#{n.record_number}</span>}
                {resolveNotificationLink(n) && <ExternalLink className="size-3 ml-auto" />}
              </div>
            </button>
          ))}
        </div>
        <div className="border-t border-border p-2">
          <button onClick={() => { setOpen(false); navigate({ to: "/notifications" }); }} className="w-full text-center text-xs py-2 hover:bg-muted rounded">View all notifications</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
