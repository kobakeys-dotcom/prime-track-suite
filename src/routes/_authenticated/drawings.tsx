import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { Plus, PencilRuler, Download } from "lucide-react";
import { toast } from "sonner";
import { listDrawings, createDrawing, getUploadSignedUrl, getDownloadUrl } from "@/lib/documents.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ProjectPicker } from "@/components/project-picker";

export const Route = createFileRoute("/_authenticated/drawings")({
  head: () => ({ meta: [{ title: "Drawing Register — ProjectCore" }] }),
  component: DrawingsPage,
});

function DrawingsPage() {
  const fetcher = useServerFn(listDrawings);
  const dl = useServerFn(getDownloadUrl);
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["drawings"], queryFn: () => fetcher() });

  async function download(path: string) {
    try { const { url } = await dl({ data: { path } }); window.open(url, "_blank"); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Drawing Register</h1>
          <p className="text-sm text-muted-foreground mt-1">Issued-for-construction drawings with revision tracking.</p>
        </div>
        <NewDrawingDialog onCreated={() => qc.invalidateQueries({ queryKey: ["drawings"] })} />
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : rows.length === 0 ? (
          <div className="bg-card border border-border rounded-sm p-12 text-center">
            <PencilRuler className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No drawings yet</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr><th className="text-left px-4 py-3">Number</th><th className="text-left px-4 py-3">Title</th><th className="text-left px-4 py-3">Project</th><th className="text-left px-4 py-3">Discipline</th><th className="text-left px-4 py-3">Rev</th><th className="text-left px-4 py-3">Issued</th><th className="w-12"></th></tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{r.number}</td>
                    <td className="px-4 py-3 font-medium">{r.title ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.project_name}</td>
                    <td className="px-4 py-3 text-xs">{r.discipline ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono">{r.revision ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{r.issued_date ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.file_url && <button onClick={() => download(r.file_url)} className="text-accent"><Download className="size-4" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function NewDrawingDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ project_id: "", number: "", title: "", discipline: "", revision: "", issued_date: "" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const getSigned = useServerFn(getUploadSignedUrl);
  const create = useServerFn(createDrawing);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project_id || !form.number) return;
    setUploading(true);
    try {
      let file_url: string | null = null;
      const file = fileRef.current?.files?.[0];
      if (file) {
        const { signedUrl, path } = await getSigned({ data: { filename: file.name, content_type: file.type } });
        const upRes = await fetch(signedUrl, { method: "PUT", body: file, headers: { "content-type": file.type } });
        if (!upRes.ok) throw new Error("Upload failed");
        file_url = path;
      }
      await create({ data: {
        project_id: form.project_id, number: form.number,
        title: form.title || null, discipline: form.discipline || null,
        revision: form.revision || null, issued_date: form.issued_date || null,
        file_url,
      } });
      toast.success("Drawing added");
      onCreated();
      setOpen(false);
      setForm({ project_id: "", number: "", title: "", discipline: "", revision: "", issued_date: "" });
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) { toast.error(err?.message ?? "Failed"); }
    finally { setUploading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-accent text-white hover:bg-accent/90"><Plus className="size-4" /> New Drawing</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add drawing</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div><Label>Project *</Label><ProjectPicker value={form.project_id} onChange={(v) => setForm({ ...form, project_id: v })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Number *</Label><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="A-101" required /></div>
            <div><Label>Revision</Label><Input value={form.revision} onChange={(e) => setForm({ ...form, revision: e.target.value })} placeholder="Rev A" /></div>
          </div>
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Discipline</Label><Input value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })} placeholder="Architectural" /></div>
            <div><Label>Issued date</Label><Input type="date" value={form.issued_date} onChange={(e) => setForm({ ...form, issued_date: e.target.value })} /></div>
          </div>
          <div><Label>File (optional)</Label><Input ref={fileRef} type="file" accept="application/pdf,image/*" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={uploading} className="bg-accent text-white hover:bg-accent/90">{uploading ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
