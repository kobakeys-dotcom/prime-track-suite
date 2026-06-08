import type { ReactNode } from "react";

export function ModuleStub({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
      </div>
      <div className="bg-card border border-border rounded-sm p-12 text-center">
        <div className="size-12 mx-auto rounded-sm bg-muted flex items-center justify-center mb-4">
          <div className="size-5 rounded-sm border-2 border-accent" />
        </div>
        <p className="text-sm font-medium">Module scaffolded</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          The database is ready. Full functionality ships in upcoming phases.
        </p>
        {children}
      </div>
    </div>
  );
}
