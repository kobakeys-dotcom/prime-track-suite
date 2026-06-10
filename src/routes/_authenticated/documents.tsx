import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { Plus, Files, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { listDocuments, createDocument, getUploadSignedUrl, getDownloadUrl } from "@/lib/documents.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ProjectPicker } from "@/components/project-picker";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — ProjectCore" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const fetcher = useServerFn(listDocuments);
  const dl = useServerFn(getDownloadUrl);
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["documents"], queryFn: () => fetcher() });

  async function download(path: string) {
    try {
      const { url } = await dl({ data: { path } });
      window.open(url, "_blank");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">Permits, contracts, certificates, ITPs, MSDS — every project file.</p>
        </div>
        <UploadDialog onCreated={() => qc.invalidateQueries({ queryKey: ["documents"] })} />
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : rows.length === 0 ? (
          <div className="bg-card border border-border rounded-sm p-12 text-center">
            <Files className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No documents yet</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Project</th><th className="text-left px-4 py-3">Category</th><th className="text-left px-4 py-3">Expires</th><th className="text-left px-4 py-3">Uploaded</th><th className="w-12"></th></tr>
              </thead>
              <tbody>
                {rows.map((r: any) => {
                  const expiring = r.expires_at && new Date(r.expires_at).getTime() < Date.now() + 30 * 86400000;
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.project_name}</td>
                      <td className="px-4 py-3 text-xs">{r.category ?? "—"}</td>
                      <td className={`px-4 py-3 text-xs ${expiring ? "text-rose-600 font-semibold" : ""}`}>{r.expires_at ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {r.file_url && (
                          <button onClick={() => download(r.file_url)} className="text-accent hover:text-accent/80"><Download className="size-4" /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function UploadDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ project_id: "", name: "", category: "", expires_at: "" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const getSigned = useServerFn(getUploadSignedUrl);
  const create = useServerFn(createDocument);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !form.name) return;
    setUploading(true);
    try {
      const { signedUrl, path } = await getSigned({ data: { filename: file.name, content_type: file.type } });
      const upRes = await fetch(signedUrl, { method: "PUT", body: file, headers: { "content-type": file.type } });
      if (!upRes.ok) throw new Error("Upload failed");
      await create({ data: {
        project_id: form.project_id || null,
        name: form.name,
        category: form.category || null,
        expires_at: form.expires_at || null,
        file_url: path,
        file_size: file.size,
      } });
      toast.success("Document uploaded");
      onCreated();
      setOpen(false);
      setForm({ project_id: "", name: "", category: "", expires_at: "" });
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
    } finally { setUploading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-accent text-white hover:bg-accent/90"><Plus className="size-4" /> Upload</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div><Label>Project (optional)</Label><ProjectPicker value={form.project_id} onChange={(v) => setForm({ ...form, project_id: v })} /></div>
          <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Permit, Contract…" /></div>
            <div><Label>Expires</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
          </div>
          <div><Label>File *</Label><Input ref={fileRef} type="file" required /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={uploading} className="bg-accent text-white hover:bg-accent/90">
              {uploading ? <>Uploading…</> : <><Upload className="size-4" /> Upload</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
