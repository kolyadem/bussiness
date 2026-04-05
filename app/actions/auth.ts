"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { RegisterFormState } from "@/components/auth/register-form-state";
import { db } from "@/lib/db";

const LOGIN_PATTERN = /^[a-z0-9._-]+$/;
const FULL_NAME_PATTERN = /^[\p{L}\p{M}'’ -]+$/u;
const PASSWORD_MIN_LENGTH = 8;

function normalizeLogin(rawValue: FormDataEntryValue | null) {
  return String(rawValue ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}

function normalizeEmail(rawValue: FormDataEntryValue | null) {
  return String(rawValue ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}

function normalizeFullName(rawValue: FormDataEntryValue | null) {
  return String(rawValue ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeUaPhone(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, "");
  const local = digits.startsWith("380")
    ? digits.slice(3)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  const normalizedLocal = local.slice(0, 9);

  return {
    local: normalizedLocal,
    full: `+380${normalizedLocal}`,
  };
}

function pickValues(formData: FormData) {
  const phone = normalizeUaPhone(String(formData.get("phone") ?? ""));

  return {
    login: normalizeLogin(formData.get("login")),
    phone: phone.local,
    email: normalizeEmail(formData.get("email")),
    fullName: normalizeFullName(formData.get("fullName")),
  };
}

const registerSchema = z
  .object({
    login: z
      .string()
      .min(3, "authLoginMin")
      .max(32, "authLoginMax")
      .refine((value) => LOGIN_PATTERN.test(value), "authLoginFormat"),
    phone: z
      .string()
      .min(1, "authPhoneRequired")
      .length(9, "authPhoneRequired")
      .refine((value) => /^\d{9}$/.test(value), "authPhoneRequired"),
    email: z.string().trim().email("authEmailInvalid").max(254, "authEmailInvalid"),
    fullName: z
      .string()
      .min(2, "authNameRequired")
      .max(80, "authNameRequired")
      .refine((value) => FULL_NAME_PATTERN.test(value), "authNameRequired"),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, "authPasswordMin")
      .max(128, "authPasswordMin"),
    confirmPassword: z.string().min(1, "authConfirmRequired"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "authPasswordsMismatch",
  });

export async function registerAccount(
  _prevState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const values = pickValues(formData);
  const parsed = registerSchema.safeParse({
    login: values.login,
    phone: values.phone,
    email: values.email,
    fullName: values.fullName,
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    const passwordMismatch = parsed.error.issues.some(
      (issue) => issue.path.includes("confirmPassword") && issue.message === "authPasswordsMismatch",
    );

    return {
      status: "error",
      values,
      fieldErrors: parsed.error.flatten().fieldErrors,
      ...(passwordMismatch ? { message: "authPasswordsMismatch" } : {}),
    };
  }

  const { login, email, fullName, password } = parsed.data;
  const normalizedPhone = normalizeUaPhone(parsed.data.phone);

  const [existingLogin, existingEmail] = await Promise.all([
    db.user.findUnique({
      where: {
        login,
      },
      select: {
        id: true,
      },
    }),
    db.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (existingLogin) {
    return {
      status: "error",
      values,
      fieldErrors: {
        login: ["authLoginTaken"],
      },
    };
  }

  if (existingEmail) {
    return {
      status: "error",
      values,
      fieldErrors: {
        email: ["authEmailTaken"],
      },
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await db.user.create({
      data: {
        login,
        phone: normalizedPhone.full,
        email,
        name: fullName,
        passwordHash,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : "";

      return {
        status: "error",
        values,
        fieldErrors: {
          ...(target.includes("login") ? { login: ["authLoginTaken"] } : {}),
          ...(target.includes("email") ? { email: ["authEmailTaken"] } : {}),
        },
      };
    }

    return {
      status: "error",
      values,
      message: "authRegisterFailed",
    };
  }

  return {
    status: "success",
    login,
  };
}
