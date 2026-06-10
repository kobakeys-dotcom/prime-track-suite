import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, FileText, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { listDailyReports, createDailyReport } from "@/lib/daily-reports.functions";
import { getUploadSignedUrl, getDownloadUrl } from "@/lib/documents.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";

export function DailyReportsPanel({ projectId, showProjectColumn = false }: { projectId?: string; showProjectColumn?: boolean }) {
  const fetchReports = useServerFn(listDailyReports);
  const dl = useServerFn(getDownloadUrl);
  const qc = useQueryClient();
  const key = ["daily-reports", projectId ?? "all"];
  const { data: rows = [], isLoading } = useQuery({
    queryKey: key, queryFn: () => fetchReports({ data: { projectId } }),
  });

  async function openPhoto(path: string) {
    try { const { url } = await dl({ data: { path } }); window.open(url, "_blank"); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{projectId && <NewReportDialog projectId={projectId} onCreated={() => qc.invalidateQueries({ queryKey: key })} />}</div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-sm p-10 text-center">
          <FileText className="size-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No daily reports yet</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                {showProjectColumn && <th className="text-left px-4 py-3">Project</th>}
                <th className="text-left px-4 py-3">Weather</th>
                <th className="text-left px-4 py-3">Work completed</th>
                <th className="text-left px-4 py-3">Photos</th>
                <th className="text-left px-4 py-3">Author</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => {
                const photos: string[] = Array.isArray(r.photos) ? r.photos : [];
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30 align-top">
                    <td className="px-4 py-3 font-mono text-xs">{r.report_date}</td>
                    {showProjectColumn && <td className="px-4 py-3 text-xs">{r.project_name}</td>}
                    <td className="px-4 py-3 text-xs">{r.weather ?? "—"}{r.temperature_c != null && ` · ${r.temperature_c}°C`}</td>
                    <td className="px-4 py-3 text-xs max-w-xs truncate">{r.work_completed ?? "—"}</td>
                    <td className="px-4 py-3">
                      {photos.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : (
                        <div className="flex items-center gap-1">
                          {photos.slice(0, 3).map((p) => (
                            <button key={p} onClick={() => openPhoto(p)} className="size-6 rounded-sm border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                              <ImageIcon className="size-3" />
                            </button>
                          ))}
                          {photos.length > 3 && <span className="text-[10px] text-muted-foreground">+{photos.length - 3}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{r.author_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">{r.status}</span>
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

function NewReportDialog({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const empty = {
    report_date: today, weather: "", temperature_c: "",
    manpower_count: "", work_completed: "", issues: "", next_day_plan: "",
    equipment: "", materials_used: "",
  };
  const [form, setForm] = useState(empty);
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const create = useServerFn(createDailyReport);
  const getSigned = useServerFn(getUploadSignedUrl);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    try {
      const uploaded: string[] = [];
      for (const f of files) {
        const { signedUrl, path } = await getSigned({ data: { filename: f.name, content_type: f.type } });
        const up = await fetch(signedUrl, { method: "PUT", body: f, headers: { "content-type": f.type } });
        if (!up.ok) throw new Error("Upload failed");
        uploaded.push(path);
      }
      setPhotoPaths((prev) => [...prev, ...uploaded]);
      if (fileRef.current) fileRef.current.value = "";
      toast.success(`${uploaded.length} photo(s) uploaded`);
    } catch (err: any) { toast.error(err?.message ?? "Upload failed"); }
  }

  const mut = useMutation({
    mutationFn: () => create({ data: {
      project_id: projectId,
      report_date: form.report_date,
      weather: form.weather || null,
      temperature_c: form.temperature_c ? Number(form.temperature_c) : null,
      manpower_count: form.manpower_count ? Number(form.manpower_count) : null,
      work_completed: form.work_completed || null,
      issues: form.issues || null,
      next_day_plan: form.next_day_plan || null,
      equipment: form.equipment || null,
      materials_used: form.materials_used || null,
      photo_paths: photoPaths,
      status: "submitted" as const,
    } }),
    onSuccess: () => {
      toast.success("Daily report submitted");
      onCreated();
      setOpen(false);
      setForm(empty);
      setPhotoPaths([]);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-accent text-white hover:bg-accent/90"><Plus className="size-4" /> New Report</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New daily report</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Date *</Label><Input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} required /></div>
            <div><Label>Weather</Label><Input value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })} placeholder="Sunny" /></div>
            <div><Label>Temp °C</Label><Input type="number" value={form.temperature_c} onChange={(e) => setForm({ ...form, temperature_c: e.target.value })} /></div>
          </div>
          <div><Label>Manpower count</Label><Input type="number" value={form.manpower_count} onChange={(e) => setForm({ ...form, manpower_count: e.target.value })} /></div>
          <div><Label>Work completed</Label><Textarea rows={3} value={form.work_completed} onChange={(e) => setForm({ ...form, work_completed: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Equipment on site</Label><Textarea rows={2} value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} placeholder="2× excavator, 1× crane…" /></div>
            <div><Label>Materials used</Label><Textarea rows={2} value={form.materials_used} onChange={(e) => setForm({ ...form, materials_used: e.target.value })} placeholder="Concrete 30 m³…" /></div>
          </div>
          <div><Label>Issues / blockers</Label><Textarea rows={2} value={form.issues} onChange={(e) => setForm({ ...form, issues: e.target.value })} /></div>
          <div><Label>Next day plan</Label><Textarea rows={2} value={form.next_day_plan} onChange={(e) => setForm({ ...form, next_day_plan: e.target.value })} /></div>
          <div>
            <Label>Photos</Label>
            <Input ref={fileRef} type="file" accept="image/*" multiple onChange={onFileChange} />
            {photoPaths.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {photoPaths.map((p) => (
                  <div key={p} className="flex items-center gap-1 text-[10px] bg-muted px-2 py-1 rounded">
                    <ImageIcon className="size-3" />
                    <span className="truncate max-w-[140px]">{p.split("/").pop()}</span>
                    <button type="button" onClick={() => setPhotoPaths((prev) => prev.filter((x) => x !== p))} className="text-muted-foreground hover:text-destructive"><X className="size-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending} className="bg-accent text-white hover:bg-accent/90">
              {mut.isPending ? "Submitting…" : "Submit report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
