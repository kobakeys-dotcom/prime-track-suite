import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { X, ArrowRight, Loader2, Lock, Mail, User, Building2 } from "lucide-react";

const C = {
  ink: "#0b1f1a",
  forest: "#064e3b",
  emerald: "#0d7a5f",
  gold: "#c9a84c",
  cream: "#f5f0e0",
  paper: "#fbfaf5",
};

export function AuthDialog({
  open,
  onClose,
  initialMode = "signin",
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: "signin" | "signup";
}) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName, company_name: companyName },
          },
        });
        if (error) throw error;
        toast.success("Account created. Signing you in…");
        const { error: signinErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signinErr) throw signinErr;
        onClose();
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ background: "rgba(11,31,26,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <style>{`
        .ad-display { font-family: "Sora", system-ui, sans-serif; letter-spacing: -0.02em; }
        .ad-input {
          width: 100%; height: 44px; padding: 0 12px 0 38px;
          border-radius: 10px; border: 1px solid rgba(11,31,26,0.12);
          background: #fff; font-size: 14px; font-family: "Manrope", sans-serif;
          transition: border-color .15s, box-shadow .15s;
        }
        .ad-input:focus { outline: none; border-color: ${C.forest}; box-shadow: 0 0 0 3px rgba(13,122,95,0.15); }
        .ad-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: rgba(11,31,26,0.4); }
        .ad-btn-primary { background: ${C.forest}; color: #fff; transition: background .15s; }
        .ad-btn-primary:hover:not(:disabled) { background: ${C.emerald}; }
        .ad-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
      `}</style>

      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          background: C.paper,
          fontFamily: '"Manrope", system-ui, sans-serif',
          color: C.ink,
          boxShadow: "0 30px 80px -20px rgba(6,78,59,0.45)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div
          className="relative px-7 pt-7 pb-6"
          style={{
            background: `linear-gradient(135deg, ${C.forest} 0%, ${C.ink} 100%)`,
            color: "#fff",
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{ background: "radial-gradient(400px 200px at 90% 0%, rgba(201,168,76,0.5), transparent 60%)" }}
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 size-8 rounded-full grid place-items-center hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="size-4 text-white" />
          </button>
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg grid place-items-center" style={{ background: C.gold }}>
                <span className="ad-display font-bold text-sm" style={{ color: C.ink }}>PC</span>
              </div>
              <span className="ad-display font-bold">ProjectCore</span>
            </div>
            <h2 className="ad-display text-2xl font-bold mt-5">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
              {mode === "signin"
                ? "Sign in to your project command center."
                : "Start managing projects in minutes."}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="px-7 py-6 space-y-4">
          {mode === "signup" && (
            <>
              <Field icon={User} label="Full name" value={fullName} onChange={setFullName} required />
              <Field icon={Building2} label="Company name" value={companyName} onChange={setCompanyName} required />
            </>
          )}
          <Field icon={Mail} type="email" label="Email" value={email} onChange={setEmail} required />
          <Field icon={Lock} type="password" label="Password" value={password} onChange={setPassword} required minLength={6} />

          <button
            type="submit"
            disabled={loading}
            className="ad-btn-primary w-full h-11 rounded-lg font-semibold text-sm inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="size-4 animate-spin" /> Please wait…</>
            ) : (
              <>{mode === "signin" ? "Sign in" : "Create account"} <ArrowRight className="size-4" /></>
            )}
          </button>

          <p className="text-xs text-center pt-1" style={{ color: "rgba(11,31,26,0.6)" }}>
            {mode === "signin" ? "New to ProjectCore?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-semibold hover:underline"
              style={{ color: C.forest }}
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </form>

        <div className="px-7 pb-5 text-[10px] text-center uppercase tracking-widest" style={{ color: "rgba(11,31,26,0.45)" }}>
          Secured by enterprise-grade encryption
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon, label, value, onChange, type = "text", required, minLength,
}: {
  icon: any; label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; minLength?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(11,31,26,0.7)" }}>{label}</label>
      <div className="relative">
        <Icon className="ad-icon size-4" />
        <input
          className="ad-input"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
        />
      </div>
    </div>
  );
}
