import { headers } from "next/headers";

import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";

export async function getStaffSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.banned) {
    return null;
  }

  return session;
}

export async function requireStaff() {
  const session = await getStaffSession();

  if (!session) {
    redirect({
      href: "/login",
      locale: "ru",
    });
  }

  return session;
}