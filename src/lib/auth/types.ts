import type { GlobalRole } from "@prisma/client";

export type AppUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  globalRole: GlobalRole;
  mfaEnabled: boolean;
};

export type AppSession = {
  user: AppUser;
} | null;
