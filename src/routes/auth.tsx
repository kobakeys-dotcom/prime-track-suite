import { createFileRoute, redirect } from "@tanstack/react-router";

// /auth is deprecated — sign-in/up happens via the landing-page dialog.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
