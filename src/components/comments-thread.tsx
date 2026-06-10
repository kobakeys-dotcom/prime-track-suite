import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { listComments, addComment } from "@/lib/comments.functions";

export function CommentsThread({ entityType, entityId }: { entityType: string; entityId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listComments);
  const add = useServerFn(addComment);
  const [body, setBody] = useState("");

  const queryKey = ["comments", entityType, entityId];
  const { data: comments = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => list({ data: { entity_type: entityType, entity_id: entityId } }) as any,
  });

  const mut = useMutation({
    mutationFn: () => add({ data: { entity_type: entityType, entity_id: entityId, body } }),
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        <MessageCircle className="size-3" /> Comments ({(comments as any[]).length})
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!isLoading && (comments as any[]).length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
        {(comments as any[]).map((c) => (
          <div key={c.id} className="text-sm bg-muted/40 rounded-sm px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{c.author_name}</span>
              <span className="text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
      </div>
      <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (body.trim()) mut.mutate(); }}>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment…" rows={2} className="text-sm" />
        <Button type="submit" size="sm" disabled={mut.isPending || !body.trim()} className="bg-accent text-white hover:bg-accent/90">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
