import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { defaultLocale, locales, type AppLocale } from "@/lib/constants";
import { db } from "@/lib/db";
import { isPrismaRecoverableBuildTimeError } from "@/lib/prisma-build";

export const USER_ROLES = {
  admin: "ADMIN",
  manager: "MANAGER",
  customer: "CUSTOMER",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

function isAppLocale(value: string | null | undefined): value is AppLocale {
  return Boolean(value && locales.includes(value as AppLocale));
}

const rolePriority: Record<UserRole, number> = {
  ADMIN: 3,
  MANAGER: 2,
  CUSTOMER: 1,
};

const FALLBACK_AUTH_SECRET = "lumina-storefront-dev-auth-secret";

function readConfiguredAuthSecret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? null;
}

function resolveAuthSecret() {
  return readConfiguredAuthSecret() ?? FALLBACK_AUTH_SECRET;
}

function normalizeRole(role: string | null | undefined): UserRole {
  if (role === USER_ROLES.admin || role === USER_ROLES.manager || role === USER_ROLES.customer) {
    return role;
  }

  return USER_ROLES.customer;
}

function normalizeCredentialsIdentifier(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function isAuthSecretConfigured() {
  return Boolean(readConfiguredAuthSecret());
}

export function assertAuthSecretConfigured() {
  if (!isAuthSecretConfigured() && process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing AUTH_SECRET or NEXTAUTH_SECRET. Set one of these environment variables before handling auth requests.",
    );
  }
}

export const authOptions = {
  adapter: PrismaAdapter(db),
  secret: resolveAuthSecret(),
  useSecureCookies: process.env.NODE_ENV === "production",
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        login: {
          label: "Login",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        const identifier = normalizeCredentialsIdentifier(credentials?.login);
        const password = credentials?.password;

        if (!identifier || !password || identifier.length > 254 || password.length > 128) {
          return null;
        }

        const user = await db.user.findFirst({
          where: {
            OR: [{ login: identifier }, { email: identifier }],
          },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          login: user.login,
          name: user.name,
          email: user.email,
          image: user.image,
          role: normalizeRole(user.role),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.login = "login" in user ? (user.login as string | null | undefined) ?? null : null;
        token.role = normalizeRole(
          "role" in user ? (user.role as string | null | undefined) ?? null : null,
        );
      }

      if ((!token.login || !token.role) && token.sub) {
        const dbUser = await db.user.findUnique({
          where: {
            id: token.sub,
          },
          select: {
            login: true,
            role: true,
          },
        });

        token.login = dbUser?.login ?? null;
        token.role = normalizeRole(dbUser?.role);
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        return session;
      }

      session.user = {
        ...session.user,
        id: token.sub ?? "",
        login: (typeof token.login === "string" ? token.login : null) ?? null,
        role: normalizeRole(typeof token.role === "string" ? token.role : null),
      } as typeof session.user;

      return session;
    },
  },
} satisfies NextAuthOptions;

export type AuthenticatedUser = {
  id: string;
  login: string | null;
  email: string | null;
  name: string | null;
  role: UserRole;
  canAccessPriceUpdates: boolean;
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await getAuthSession();

  if (!session?.user) {
    return null;
  }

  const user = session.user as typeof session.user & {
    id?: string;
    login?: string | null;
    role?: string | null;
  };

  if (user.id) {
    try {
      const dbUser = await db.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          id: true,
          login: true,
          email: true,
          name: true,
          role: true,
          canAccessPriceUpdates: true,
        },
      });

      if (dbUser) {
        return {
          id: dbUser.id,
          login: dbUser.login,
          email: dbUser.email,
          name: dbUser.name,
          role: normalizeRole(dbUser.role),
          canAccessPriceUpdates: Boolean(dbUser.canAccessPriceUpdates),
        };
      }
    } catch (error) {
      if (isPrismaRecoverableBuildTimeError(error)) {
        return null;
      }
      throw error;
    }

    return null;
  }

  return null;
}

function extractLocaleFromPathname(pathname: string | null | undefined) {
  if (!pathname) {
    return null;
  }

  const normalizedPathname = pathname.startsWith("http")
    ? new URL(pathname).pathname
    : pathname;
  const [segment] = normalizedPathname.split("/").filter(Boolean);

  return isAppLocale(segment) ? segment : null;
}

async function resolveRequestLocale(locale?: string | null) {
  if (isAppLocale(locale)) {
    return locale;
  }

  const requestHeaders = await headers();
  const headerCandidates = [
    requestHeaders.get("x-pathname"),
    requestHeaders.get("next-url"),
    requestHeaders.get("referer"),
  ];

  for (const candidate of headerCandidates) {
    const detectedLocale = extractLocaleFromPathname(candidate);

    if (detectedLocale) {
      return detectedLocale;
    }
  }

  return defaultLocale;
}

async function getAuthRedirectTargets(_locale?: string | null) {
  return {
    loginHref: "/login",
    fallbackHref: "/",
  };
}

export function getPostLoginPath(_locale: AppLocale, role: string | null | undefined) {
  return hasRole(role, USER_ROLES.manager) ? "/admin" : "/account";
}

export function hasRole(
  role: string | null | undefined,
  requiredRole: UserRole | UserRole[],
) {
  const currentRole = normalizeRole(role);
  const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  return required.some((roleName) => rolePriority[currentRole] >= rolePriority[roleName]);
}

export function isAdminRole(role: string | null | undefined) {
  return hasRole(role, USER_ROLES.admin);
}

export function isManagerRole(role: string | null | undefined) {
  return hasRole(role, USER_ROLES.manager);
}

export function isCustomerRole(role: string | null | undefined) {
  return hasRole(role, USER_ROLES.customer);
}

export async function requireAuthenticatedUser(locale?: string | null) {
  const user = await getAuthenticatedUser();

  if (!user) {
    const { loginHref } = await getAuthRedirectTargets(locale);
    redirect(loginHref);
  }

  return user;
}

export async function requireUserRole(
  requiredRole: UserRole | UserRole[],
  locale?: string | null,
) {
  const user = await requireAuthenticatedUser(locale);

  if (!hasRole(user.role, requiredRole)) {
    const { fallbackHref } = await getAuthRedirectTargets(locale);
    redirect(fallbackHref);
  }

  return user;
}

export async function requireAdminUser(locale?: string | null) {
  return requireUserRole(USER_ROLES.admin, locale);
}

export async function requireManagerUser(locale?: string | null) {
  return requireUserRole(USER_ROLES.manager, locale);
}
