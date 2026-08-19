export function parseLeadInput(body: {
  projectId?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
  type?: unknown;
}) {
  const projectId = String(body.projectId ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!projectId || name.length < 2) {
    return { ok: false as const, error: "נא למלא שם ומזהה פרויקט." };
  }
  return {
    ok: true as const,
    data: {
      projectId,
      name,
      email: body.email ? String(body.email).trim() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      message: body.message ? String(body.message).trim() : null,
      type: body.type ? String(body.type) : "contact",
    },
  };
}
