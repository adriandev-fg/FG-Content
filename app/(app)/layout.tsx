import type { ReactNode } from "react";
import { requireViewer } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { Shell } from "./shell";

/** Every signed-in page. The badge counts what waits for this viewer: client changes for the team, reviews for a client. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer();
  let q = db().from("fgc_content").select("id", { count: "exact", head: true });
  q = viewer.role === "admin" ? q.eq("status", "changes_requested") : q.eq("business_id", viewer.businessId!).eq("status", "in_review");
  const { count } = await q;
  return (
    <Shell role={viewer.role} name={viewer.name || viewer.email} businessName={viewer.businessName} attention={count ?? 0}>
      {children}
    </Shell>
  );
}
