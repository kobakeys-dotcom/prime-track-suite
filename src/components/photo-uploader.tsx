import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function PhotoUploader({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const photos = Array.isArray(value) ? value : [];

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const path = `photos/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error } = await supabase.storage.from("project-files").upload(path, file, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("project-files").createSignedUrl
          ? await supabase.storage.from("project-files").createSignedUrl(path, 60 * 60 * 24 * 365)
          : { data: null };
        uploaded.push(data?.signedUrl ?? path);
      }
      onChange([...photos, ...uploaded]);
      toast.success(`${uploaded.length} photo(s) uploaded`);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function remove(i: number) {
    onChange(photos.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {photos.map((url, i) => (
          <div key={i} className="relative size-16 rounded overflow-hidden border border-border bg-muted">
            <img src={url} alt="" className="size-full object-cover" />
            <button type="button" onClick={() => remove(i)} className="absolute top-0 right-0 bg-rose-600 text-white p-0.5 rounded-bl">
              <X className="size-3" />
            </button>
          </div>
        ))}
        <label className="size-16 border border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:bg-muted text-muted-foreground">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} disabled={uploading} />
        </label>
      </div>
      <p className="text-[10px] text-muted-foreground">JPG/PNG · stored in your private project files bucket.</p>
    </div>
  );
}
