import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({ meta: [{ title: "AI Assistant — ProjectCore" }] }),
  component: AIPage,
});

const PROMPTS = [
  "Summarize this week's progress across active projects",
  "Predict delay risk for projects falling behind schedule",
  "Draft an RFI for unclear specification",
  "Generate meeting minutes from notes",
  "Summarize this contract clause",
  "Analyze cash flow vs forecast",
  "Write a daily report from voice notes",
  "Analyze site photos for safety issues",
];

function AIPage() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);

  function run() {
    if (!prompt.trim()) return;
    setResponse("AI integration coming soon. Your prompt has been queued for the AI assistant. Connect a Lovable AI key in Settings → Integrations to enable live responses.");
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Sparkles className="size-6 text-accent" /> AI Assistant</h1>
        <p className="text-sm text-muted-foreground mt-1">Project AI capabilities: summaries, risk prediction, report writing, document analysis.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {PROMPTS.map((p) => (
          <button key={p} onClick={() => setPrompt(p)} className="text-xs text-left p-3 bg-card border border-border rounded-sm hover:border-accent hover:text-accent transition">{p}</button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-sm p-4 space-y-3">
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask the AI assistant…" rows={4} />
        <Button onClick={run} className="bg-accent text-white hover:bg-accent/90"><Send className="size-4" /> Send</Button>
      </div>

      {response && (
        <div className="bg-card border border-border rounded-sm p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Response</div>
          <p className="text-sm whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
}
