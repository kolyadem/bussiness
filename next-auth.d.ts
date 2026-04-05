import { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";
import type { UserRole } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      login: string | null;
      role: UserRole;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    login?: string | null;
    role?: UserRole;
  }
}
