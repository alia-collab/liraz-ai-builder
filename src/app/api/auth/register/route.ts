import { NextRequest } from "next/server";
import { z } from "zod";
import { registerUser } from "@/lib/projects";
import { getClientIp, jsonError, jsonSuccess } from "@/lib/api/helpers";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).optional(),
  locale: z.enum(["HE", "EN"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
    }

    const { user, organization } = await registerUser({
      ...parsed.data,
      ipAddress: getClientIp(request),
    });

    return jsonSuccess({
      user: { id: user.id, email: user.email, name: user.name },
      organizationId: organization.id,
    }, 201);
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_EXISTS") {
      return jsonError("An account with this email already exists", 409);
    }
    console.error("Register error:", err);
    return jsonError("Registration failed", 500);
  }
}
