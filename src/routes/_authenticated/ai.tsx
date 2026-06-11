import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Send, Loader2, Plus, Archive, Copy, Save, ThumbsUp, ThumbsDown, FileText, MessageSquare, BookOpen, History, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  listConversations, getConversation, createConversation, archiveConversation,
  sendAIMessage, listPromptTemplates, listSavedOutputs, saveAIOutput, deleteSavedOutput,
  submitAIFeedback, listProjectsForAI,
} from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({ meta: [{ title: "AI Assistant — ProjectCore" }] }),
  component: AIPage,
});

const AI_MODES = [
  "General Project Assistant", "Executive Summary", "Client-Friendly Summary",
  "Delay Analysis", "Cost Analysis", "Procurement Assistant", "Quality Assistant",
  "Safety Assistant", "Risk Assistant", "Meeting Assistant", "RFI Assistant",
  "Variation Assistant", "Payment Claim Assistant", "Document Assistant",
  "Drawing Assistant", "Report Assistant", "Action Plan Assistant",
];

const SUGGESTED_PROMPTS = [
  "Summarize this project for management.",
  "What are the biggest delays in this project?",
  "Which tasks are overdue and who is responsible?",
  "Summarize open RFIs and submittals.",
  "Summarize open NCRs and corrective actions.",
  "What are the critical safety risks?",
  "Summarize high and critical project risks.",
  "Create an action plan for this week.",
  "Draft a follow-up email to the client.",
  "Summarize the latest meeting and action items.",
];

function AIPage() {
  const qc = useQueryClient();
  const listConv = useServerFn(listConversations);
  const getConv = useServerFn(getConversation);
  const createConv = useServerFn(createConversation);
  const archiveConv = useServerFn(archiveConversation);
  const sendMsg = useServerFn(sendAIMessage);
  const listTpls = useServerFn(listPromptTemplates);
  const listOuts = useServerFn(listSavedOutputs);
  const saveOut = useServerFn(saveAIOutput);
  const delOut = useServerFn(deleteSavedOutput);
  const submitFb = useServerFn(submitAIFeedback);
  const listProjs = useServerFn(listProjectsForAI);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [mode, setMode] = useState<string>(AI_MODES[0]);
  const [prompt, setPrompt] = useState("");
  const [saveDialog, setSaveDialog] = useState<{ open: boolean; messageId?: string; text?: string }>({ open: false });
  const [saveTitle, setSaveTitle] = useState("");
  const [saveClient, setSaveClient] = useState(false);
  const [tab, setTab] = useState("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  const projectsQ = useQuery({ queryKey: ["ai", "projects"], queryFn: () => listProjs() });
  const convQ = useQuery({ queryKey: ["ai", "conversations"], queryFn: () => listConv() });
  const tplQ = useQuery({ queryKey: ["ai", "templates"], queryFn: () => listTpls() });
  const outsQ = useQuery({ queryKey: ["ai", "outputs", projectId], queryFn: () => listOuts({ data: { project_id: projectId || null } }) });
  const activeConvQ = useQuery({
    queryKey: ["ai", "conv", activeId],
    queryFn: () => getConv({ data: { id: activeId! } }),
    enabled: !!activeId,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeConvQ.data?.messages?.length]);

  const newConvMut = useMutation({
    mutationFn: async () => createConv({ data: { project_id: projectId || null, conversation_type: mode, title: `${mode} — ${new Date().toLocaleString()}` } }),
    onSuccess: (row: any) => { setActiveId(row.id); qc.invalidateQueries({ queryKey: ["ai", "conversations"] }); },
  });

  const sendMut = useMutation({
    mutationFn: async (text: string) => {
      let convId = activeId;
      if (!convId) {
        const r: any = await createConv({ data: { project_id: projectId || null, conversation_type: mode, title: text.slice(0, 60) } });
        convId = r.id;
        setActiveId(convId);
      }
      return sendMsg({ data: { conversation_id: convId!, prompt: text, mode, project_id: projectId || null } });
    },
    onSuccess: (res: any) => {
      setPrompt("");
      qc.invalidateQueries({ queryKey: ["ai", "conv", activeId] });
      qc.invalidateQueries({ queryKey: ["ai", "conversations"] });
      if (res?.configured === false) toast.warning("AI is not configured. Showing manual templates only.");
      if (res?.error) toast.error(res.error);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to send"),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveConv({ data: { id } }),
    onSuccess: () => { setActiveId(null); qc.invalidateQueries({ queryKey: ["ai", "conversations"] }); toast.success("Archived"); },
  });

  const saveMut = useMutation({
    mutationFn: () => saveOut({
      data: {
        title: saveTitle || "Untitled",
        output_text: saveDialog.text!,
        output_type: mode,
        project_id: projectId || null,
        conversation_id: activeId,
        message_id: saveDialog.messageId,
        context_module: mode,
        is_client_visible: saveClient,
      }
    }),
    onSuccess: () => {
      toast.success("Output saved");
      setSaveDialog({ open: false }); setSaveTitle(""); setSaveClient(false);
      qc.invalidateQueries({ queryKey: ["ai", "outputs"] });
    },
  });

  const delOutMut = useMutation({
    mutationFn: (id: string) => delOut({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["ai", "outputs"] }); },
  });

  const fbMut = useMutation({
    mutationFn: (v: { message_id: string; rating: "up" | "down" }) =>
      submitFb({ data: { message_id: v.message_id, conversation_id: activeId!, rating: v.rating } }),
    onSuccess: () => toast.success("Thanks for the feedback"),
  });

  const conversations: any[] = convQ.data ?? [];
  const messages: any[] = activeConvQ.data?.messages ?? [];
  const templates: any[] = tplQ.data ?? [];
  const outputs: any[] = outsQ.data ?? [];
  const projects: any[] = projectsQ.data ?? [];

  const groupedTemplates = useMemo(() => {
    const g: Record<string, any[]> = {};
    for (const t of templates) (g[t.template_category] ??= []).push(t);
    return g;
  }, [templates]);

  function handleSend() {
    const text = prompt.trim();
    if (!text) return;
    if (text.length > 8000) return toast.error("Prompt too long");
    sendMut.mutate(text);
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Sparkles className="size-6 text-accent" /> AI Assistant</h1>
          <p className="text-sm text-muted-foreground">Project intelligence, summaries, drafting & analysis — grounded in your live data.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={projectId || "_all"} onValueChange={(v) => setProjectId(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-56"><SelectValue placeholder="No project context" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">No project context</SelectItem>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{AI_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => newConvMut.mutate()} variant="outline"><Plus className="size-4 mr-1" /> New chat</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="chat"><MessageSquare className="size-4 mr-1" /> Chat</TabsTrigger>
          <TabsTrigger value="templates"><BookOpen className="size-4 mr-1" /> Prompt Templates</TabsTrigger>
          <TabsTrigger value="outputs"><FileText className="size-4 mr-1" /> Saved Outputs</TabsTrigger>
          <TabsTrigger value="history"><History className="size-4 mr-1" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-4 h-[calc(100vh-280px)] min-h-[500px]">
            {/* Conversation list */}
            <div className="bg-card border border-border rounded-sm flex flex-col overflow-hidden">
              <div className="p-3 border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground">Conversations</div>
              <div className="flex-1 overflow-y-auto">
                {convQ.isLoading && <div className="p-3 text-xs text-muted-foreground">Loading…</div>}
                {!convQ.isLoading && conversations.length === 0 && <div className="p-3 text-xs text-muted-foreground">No chats yet.</div>}
                {conversations.map((c) => (
                  <div key={c.id} className={`group p-3 border-b border-border cursor-pointer hover:bg-accent/5 ${activeId === c.id ? "bg-accent/10" : ""}`} onClick={() => setActiveId(c.id)}>
                    <div className="text-sm font-medium line-clamp-1">{c.conversation_title || "Untitled"}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center justify-between mt-1">
                      <span>{c.projects?.name || c.conversation_type}</span>
                      <button onClick={(e) => { e.stopPropagation(); archiveMut.mutate(c.id); }} className="opacity-0 group-hover:opacity-100"><Archive className="size-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat panel */}
            <div className="bg-card border border-border rounded-sm flex flex-col overflow-hidden">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {!activeId && (
                  <div className="text-center text-muted-foreground py-12">
                    <Sparkles className="size-12 mx-auto mb-3 text-accent" />
                    <p className="text-sm">Start a new conversation or pick a suggested prompt below.</p>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                      {SUGGESTED_PROMPTS.slice(0, 6).map((p) => (
                        <button key={p} onClick={() => setPrompt(p)} className="text-xs text-left p-3 bg-background border border-border rounded-sm hover:border-accent">{p}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-sm px-4 py-3 ${m.role === "user" ? "bg-accent text-accent-foreground" : "bg-background border border-border"}`}>
                      {m.status === "Failed" && <div className="flex items-center gap-1 text-xs text-destructive mb-1"><AlertTriangle className="size-3" /> {m.role === "assistant" ? "AI" : ""} Error</div>}
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.message_text}</div>
                      {m.role === "assistant" && m.status !== "Failed" && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                          <button onClick={() => { navigator.clipboard.writeText(m.message_text); toast.success("Copied"); }} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"><Copy className="size-3" /> Copy</button>
                          <button onClick={() => { setSaveDialog({ open: true, messageId: m.id, text: m.message_text }); setSaveTitle(`${mode} — ${new Date().toLocaleDateString()}`); }} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"><Save className="size-3" /> Save</button>
                          <button onClick={() => fbMut.mutate({ message_id: m.id, rating: "up" })} className="text-[10px] text-muted-foreground hover:text-foreground"><ThumbsUp className="size-3" /></button>
                          <button onClick={() => fbMut.mutate({ message_id: m.id, rating: "down" })} className="text-[10px] text-muted-foreground hover:text-foreground"><ThumbsDown className="size-3" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sendMut.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-background border border-border rounded-sm px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Thinking…
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-border p-3 space-y-2">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }}
                  placeholder={`Ask the AI (${mode})…  ⌘/Ctrl+Enter to send`}
                  rows={3}
                  maxLength={8000}
                />
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground">{prompt.length}/8000 chars</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPrompt("")}>Clear</Button>
                    <Button onClick={handleSend} disabled={sendMut.isPending || !prompt.trim()} className="bg-accent text-accent-foreground hover:bg-accent/90" size="sm">
                      {sendMut.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : <Send className="size-4 mr-1" />} Send
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Context panel */}
            <div className="bg-card border border-border rounded-sm flex flex-col overflow-hidden">
              <div className="p-3 border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground">Suggested prompts</div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button key={p} onClick={() => setPrompt(p)} className="text-xs text-left w-full p-2 bg-background border border-border rounded-sm hover:border-accent">{p}</button>
                ))}
                <div className="pt-3 mt-3 border-t border-border text-[10px] text-muted-foreground">
                  {projectId ? "Project context will be attached." : "Select a project for grounded answers."}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <div className="space-y-6">
            {Object.entries(groupedTemplates).map(([cat, items]) => (
              <div key={cat}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">{cat}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((t) => (
                    <div key={t.id} className="bg-card border border-border rounded-sm p-4">
                      <div className="font-medium text-sm">{t.template_name}</div>
                      {t.template_description && <div className="text-xs text-muted-foreground mt-1">{t.template_description}</div>}
                      <p className="text-xs mt-2 line-clamp-3 text-foreground/80">{t.prompt_text}</p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(t.prompt_text); toast.success("Copied"); }}><Copy className="size-3 mr-1" /> Copy</Button>
                        <Button size="sm" onClick={() => { setPrompt(t.prompt_text); setTab("chat"); }} className="bg-accent text-accent-foreground hover:bg-accent/90">Use</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="outputs" className="mt-4">
          {outputs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No saved outputs yet.</div>
          ) : (
            <div className="space-y-3">
              {outputs.map((o) => (
                <div key={o.id} className="bg-card border border-border rounded-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{o.output_title}</div>
                      <div className="text-[10px] text-muted-foreground flex gap-2 mt-0.5">
                        <span>{o.output_type}</span>
                        {o.projects?.name && <span>• {o.projects.name}</span>}
                        <span>• {new Date(o.created_at).toLocaleString()}</span>
                        {o.is_client_visible && <span className="text-accent">• Client-visible</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(o.output_text); toast.success("Copied"); }}><Copy className="size-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => delOutMut.mutate(o.id)}><Trash2 className="size-3" /></Button>
                    </div>
                  </div>
                  <pre className="text-xs whitespace-pre-wrap mt-3 max-h-48 overflow-y-auto text-foreground/80 font-sans">{o.output_text}</pre>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background"><tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Title</th><th className="p-3">Project</th><th className="p-3">Type</th><th className="p-3">Last activity</th><th className="p-3"></th>
              </tr></thead>
              <tbody>
                {conversations.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-accent/5">
                    <td className="p-3"><button className="text-left" onClick={() => { setActiveId(c.id); setTab("chat"); }}>{c.conversation_title}</button></td>
                    <td className="p-3 text-muted-foreground">{c.projects?.name || "—"}</td>
                    <td className="p-3 text-muted-foreground">{c.conversation_type}</td>
                    <td className="p-3 text-muted-foreground text-xs">{c.last_message_at ? new Date(c.last_message_at).toLocaleString() : "—"}</td>
                    <td className="p-3"><Button size="sm" variant="ghost" onClick={() => archiveMut.mutate(c.id)}><Archive className="size-3" /></Button></td>
                  </tr>
                ))}
                {conversations.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">No conversations.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={saveDialog.open} onOpenChange={(v) => !v && setSaveDialog({ open: false })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save AI Output</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={saveClient} onCheckedChange={(v) => setSaveClient(!!v)} /> Mark as client-visible
            </label>
            <div className="text-xs text-muted-foreground bg-background border border-border p-2 rounded-sm max-h-40 overflow-y-auto whitespace-pre-wrap">{saveDialog.text}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialog({ open: false })}>Cancel</Button>
            <Button onClick={() => saveMut.mutate()} disabled={!saveTitle.trim() || saveMut.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
