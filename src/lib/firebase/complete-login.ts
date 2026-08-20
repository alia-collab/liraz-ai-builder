"use client";

export async function completeFirebaseLogin(idToken: string, name?: string) {
  const res = await fetch("/api/auth/firebase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Sign-in failed");
  }
  return data as { created: boolean; user: { id: string; email: string } };
}

export async function logoutApp() {
  try {
    const { getFirebaseAuth } = await import("@/lib/firebase/client");
    const { signOut } = await import("firebase/auth");
    await signOut(getFirebaseAuth());
  } catch {
    // Firebase may be unconfigured; still clear server cookie.
  }
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
}
