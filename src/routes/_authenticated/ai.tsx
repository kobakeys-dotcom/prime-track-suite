import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAi } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({ meta: [{ title: "AI Assistant — ProjectCore" }] }),
  component: AIPage,
});

const PROMPTS = [
  "Summarize this week's progress across active projects",
  "Predict delay risk for projects falling behind schedule",
  "Draft an RFI for an unclear specification",
  "Generate meeting minutes from these notes:",
  "Summarize this contract clause:",
  "Analyze cash flow vs forecast",
  "Write a daily report from these voice notes:",
  "List the top 5 safety risks on a high-rise concrete frame",
];

function AIPage() {
  const [prompt, setPrompt] = useState("");
  const ask = useServerFn(askAi);
  const mut = useMutation({
    mutationFn: () => ask({ data: { prompt } }),
    onError: (e: any) => toast.error(e?.message ?? "AI request failed"),
  });

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Sparkles className="size-6 text-accent" /> AI Assistant</h1>
        <p className="text-sm text-muted-foreground mt-1">Powered by Lovable AI. Summaries, drafting, risk analysis and document understanding.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {PROMPTS.map((p) => (
          <button key={p} onClick={() => setPrompt(p)} className="text-xs text-left p-3 bg-card border border-border rounded-sm hover:border-accent hover:text-accent transition">{p}</button>
        ))}
      </div>
      <div className="bg-card border border-border rounded-sm p-4 space-y-3">
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask the AI assistant…" rows={5} />
        <Button onClick={() => prompt.trim() && mut.mutate()} disabled={mut.isPending || !prompt.trim()} className="bg-accent text-white hover:bg-accent/90">
          {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} {mut.isPending ? "Thinking…" : "Send"}
        </Button>
      </div>
      {mut.data && (
        <div className="bg-card border border-border rounded-sm p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Response</div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{mut.data.text}</p>
        </div>
      )}
    </div>
  );
}
