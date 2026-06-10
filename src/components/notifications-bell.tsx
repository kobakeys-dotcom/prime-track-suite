import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Check } from "lucide-react";
import { listNotifications, markNotificationRead } from "@/lib/notifications.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const fetcher = useServerFn(listNotifications);
  const markFn = useServerFn(markNotificationRead);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetcher(),
    refetchInterval: 60_000,
  });
  const mark = useMutation({
    mutationFn: (v: { id?: string; all?: boolean }) => markFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

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
      <PopoverContent align="end" className="w-96 p-0 max-h-[480px] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="font-display font-bold text-sm uppercase tracking-tight">Notifications</div>
          {unread > 0 && (
            <button onClick={() => mark.mutate({ all: true })} className="text-xs text-accent hover:underline inline-flex items-center gap-1">
              <Check className="size-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-8 text-center">No notifications.</p>
          ) : items.map((n: any) => (
            <button
              key={n.id}
              onClick={() => { if (!n.read_at) mark.mutate({ id: n.id }); if (n.link) window.location.assign(n.link); setOpen(false); }}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 block",
                !n.read_at && "bg-accent/5",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium">{n.title}</div>
                <div className="text-[10px] text-muted-foreground shrink-0">{new Date(n.created_at).toLocaleDateString()}</div>
              </div>
              {n.body && <div className="text-xs text-muted-foreground mt-1">{n.body}</div>}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
