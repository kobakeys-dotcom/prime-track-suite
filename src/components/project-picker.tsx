import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProjectsLite } from "@/lib/admin.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ProjectPicker({
  value, onChange, placeholder = "Select project",
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const fetcher = useServerFn(listProjectsLite);
  const { data = [] } = useQuery({ queryKey: ["projects-lite"], queryFn: () => fetcher() });
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {data.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
