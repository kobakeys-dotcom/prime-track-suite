import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const search = z.object({
  invite: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: search,
  head: () => ({ meta: [{ title: "Sign in — ProjectCore" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { invite, mode: initialMode } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">(
    initialMode ?? (invite ? "signup" : "signin"),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName,
              company_name: invite ? undefined : companyName,
              invitation_token: invite,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created. Signing you in…");
        const { error: signinErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signinErr) throw signinErr;
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 bg-sidebar text-sidebar-foreground p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 bg-accent rounded flex items-center justify-center text-white font-display font-bold">PC</div>
          <span className="text-white font-display font-bold text-lg tracking-tight">ProjectCore</span>
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold text-white leading-tight">
            Project management<br />for teams that build.
          </h1>
          <p className="mt-4 text-sm text-sidebar-foreground max-w-md">
            Plan, track, and deliver construction, engineering, and service projects from a single command center.
          </p>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">© ProjectCore</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="font-display text-2xl font-bold">
              {mode === "signin" ? "Sign in" : invite ? "Accept invitation" : "Create company"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin"
                ? "Welcome back."
                : invite
                  ? "Finish setting up your account."
                  : "You'll be the company admin."}
            </p>
          </div>

          {mode === "signup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              {!invite && (
                <div className="space-y-2">
                  <Label htmlFor="company">Company name</Label>
                  <Input id="company" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground">
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>

          {!invite && (
            <p className="text-xs text-center text-muted-foreground">
              {mode === "signin" ? "Need a company account?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="text-accent font-medium hover:underline"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
