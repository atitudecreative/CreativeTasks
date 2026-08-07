"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_MINISTRY_COOKIE } from "@/lib/data/ministries";

export async function setActiveMinistry(formData: FormData) {
  const ministryId = String(formData.get("ministryId") ?? "");
  if (!ministryId) return;

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_MINISTRY_COOKIE, ministryId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/dashboard");
}
