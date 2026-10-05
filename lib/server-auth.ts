import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readServerConfig } from "@/lib/server-env";
import type { Employee, Role } from "@/lib/types";

export const SESSION_COOKIE = "leave-management-session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export type AppUser = Employee & {
  id: string;
  databaseId: string;
  user_id: string;
  email: string;
  role: Role;
  status: "active" | "disabled";
  manager_id: string | null;
  session_version: number;
  department: string;
  designation: string;
  joiningDate: string;
  probationCleared: boolean;
};

export type ManagedUser = Pick<
  AppUser,
  "id" | "user_id" | "name" | "email" | "role" | "status" | "manager_id"
>;

export type PublicUser = Omit<AppUser, "session_version" | "databaseId" | "manager_id">;

type UserRecord = {
  id: string;
  auth_user_id?: string | null;
  user_id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "disabled";
  manager_id: string | null;
  session_version: number;
  department: string | null;
  designation: string | null;
  joining_date: string | null;
  probation_cleared: boolean;
};

type EmployeeRoleProfile = {
  employee_id: string;
  name: string;
  email: string;
  category: "Employee" | "Manager";
  department: string | null;
  designation: string | null;
  joining_date: string | null;
  probation_cleared: boolean;
};

type SessionPayload = {
  sub: string;
  version: number;
  exp: number;
};

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly apiMessage?: string,
    public readonly networkCode?: string,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class SupabaseAuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly code?: string,
    public readonly networkCode?: string,
  ) {
    super("Supabase authentication request failed.");
    this.name = "SupabaseAuthError";
  }
}

export class SupabaseAdminError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly networkCode?: string,
  ) {
    super(message);
    this.name = "SupabaseAdminError";
  }
}

export function getDatabaseConfig() {
  return readServerConfig().config;
}

export async function databaseRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const config = getDatabaseConfig();
  if (!config) throw new DatabaseError("Database authentication is not configured.", 503);

  let response: Response;
  try {
    const headers = new Headers(init.headers);
    headers.set("apikey", config.serviceKey);
    if (config.serviceKey.startsWith("sb_secret_")) {
      headers.delete("Authorization");
    } else {
      headers.set("Authorization", `Bearer ${config.serviceKey}`);
    }
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    response = await fetch(`${config.url}/rest/v1/${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    throw new DatabaseError(
      "Database connection failed.",
      503,
      "NETWORK_ERROR",
      undefined,
      getNetworkErrorCode(error),
    );
  }
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    let code: string | undefined;
    let apiMessage: string | undefined;
    try {
      const parsed = JSON.parse(details) as { code?: unknown; message?: unknown };
      if (typeof parsed.code === "string" && /^[A-Z0-9_]{1,32}$/.test(parsed.code)) {
        code = parsed.code;
      }
      if (typeof parsed.message === "string") {
        apiMessage = parsed.message
          .replaceAll(config.serviceKey, "[redacted]")
          .replaceAll(config.url, "[redacted]")
          .replace(
            /\b(?:sb_(?:secret|publishable)_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g,
            "[redacted]",
          )
          .replace(/[\u0000-\u001f\u007f]/g, " ")
          .slice(0, 300);
      }
    } catch {
      // Do not expose or log raw upstream response bodies.
    }
    throw new DatabaseError(
      "Database request failed.",
      response.status,
      code,
      apiMessage,
    );
  }
  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

export async function authenticateSupabaseUser(email: string, password: string) {
  const config = getDatabaseConfig();
  if (!config) throw new DatabaseError("Database authentication is not configured.", 503);

  let response: Response | undefined;
  let lastNetworkError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          apikey: config.publishableKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (response.status < 500 || attempt === 1) break;
      await response.body?.cancel();
    } catch (error) {
      clearTimeout(timeout);
      lastNetworkError = error;
      if (attempt === 1) {
        throw new SupabaseAuthError(
          503,
          error instanceof Error && error.name === "AbortError"
            ? "TIMEOUT"
            : "NETWORK_ERROR",
          getNetworkErrorCode(error),
        );
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if (!response) {
    throw new SupabaseAuthError(
      503,
      lastNetworkError instanceof Error && lastNetworkError.name === "AbortError"
        ? "TIMEOUT"
        : "NETWORK_ERROR",
      getNetworkErrorCode(lastNetworkError),
    );
  }

  if (!response.ok) {
    let code: string | undefined;
    try {
      const details = (await response.json()) as { code?: unknown; error_code?: unknown };
      const candidate = details.error_code ?? details.code;
      if (typeof candidate === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(candidate)) {
        code = candidate;
      }
    } catch {
      // Do not expose or log raw upstream response bodies.
    }
    if (response.status >= 500) {
      console.error(
        `Supabase Auth returned a server error after one retry (status=${response.status}, authCode=${code ?? "none"})`,
      );
    }
    throw new SupabaseAuthError(response.status, code);
  }

  const result = (await response.json()) as {
    user?: {
      id?: unknown;
      email?: unknown;
      app_metadata?: unknown;
      user_metadata?: unknown;
    };
  };
  if (
    typeof result.user?.id !== "string" ||
    typeof result.user.email !== "string" ||
    !result.user.email
  ) {
    throw new SupabaseAuthError(response.status, "INVALID_RESPONSE");
  }

  const appMetadata = result.user.app_metadata;
  const userMetadata = result.user.user_metadata;
  return {
    id: result.user.id,
    email: result.user.email,
    isManager:
      typeof appMetadata === "object" &&
      appMetadata !== null &&
      "role" in appMetadata &&
      (appMetadata.role === "manager" || appMetadata.role === "admin"),
    name:
      typeof userMetadata === "object" &&
      userMetadata !== null &&
      "name" in userMetadata &&
      typeof userMetadata.name === "string"
        ? userMetadata.name.trim().slice(0, 120)
        : "",
  };
}

export async function createSupabaseAuthUser(
  email: string,
  password: string,
  name: string,
) {
  const result = await requestSupabaseAdmin("users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    }),
  });
  if (
    typeof result !== "object" ||
    result === null ||
    !("id" in result) ||
    typeof result.id !== "string"
  ) {
    throw new SupabaseAdminError("Supabase Admin API returned an invalid response.", 502);
  }
  return { id: result.id };
}

export async function deleteSupabaseAuthUser(id: string) {
  await requestSupabaseAdmin(`users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

async function requestSupabaseAdmin(path: string, init: RequestInit) {
  const config = getDatabaseConfig();
  if (!config) {
    throw new SupabaseAdminError("Supabase Admin API is not configured.", 503);
  }

  let response: Response;
  try {
    const headers = new Headers(init.headers);
    headers.set("apikey", config.serviceKey);
    if (config.serviceKey.startsWith("sb_secret_")) {
      headers.delete("Authorization");
    } else {
      headers.set("Authorization", `Bearer ${config.serviceKey}`);
    }
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    response = await fetch(`${config.url}/auth/v1/admin/${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    throw new SupabaseAdminError(
      "Supabase Admin API request failed.",
      503,
      "NETWORK_ERROR",
      getNetworkErrorCode(error),
    );
  }

  if (!response.ok) {
    let code: string | undefined;
    try {
      const details = (await response.json()) as {
        code?: unknown;
        error_code?: unknown;
      };
      const candidate = details.error_code ?? details.code;
      if (typeof candidate === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(candidate)) {
        code = candidate;
      }
    } catch {
      // Do not expose or log raw upstream response bodies.
    }
    throw new SupabaseAdminError(
      "Supabase Admin API request failed.",
      response.status,
      code,
    );
  }

  if (response.status === 204) return null;
  if (init.method === "DELETE") return null;
  return (await response.json()) as unknown;
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8 || password.length > 128) {
    throw new Error("Password must be between 8 and 128 characters.");
  }
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, saltHex, keyHex, extra] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !saltHex || !keyHex || extra !== undefined) return false;
  if (!/^[a-f0-9]{32}$/i.test(saltHex) || !/^[a-f0-9]{128}$/i.test(keyHex)) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await deriveKey(password, Buffer.from(saltHex, "hex"));
  return timingSafeEqual(actual, expected);
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, PASSWORD_KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

const USER_FIELDS =
  "id,user_id,name,email,role,status,manager_id,session_version,department,designation,joining_date,probation_cleared";
const USER_FIELDS_WITH_AUTH_ID =
  "id,auth_user_id,user_id,name,email,role,status,manager_id,session_version,department,designation,joining_date,probation_cleared";

export async function findUserByIdentifier(identifier: string) {
  const query = new URLSearchParams({
    select: USER_FIELDS,
    or: `(email.eq.${identifier.toLowerCase()},user_id.eq.${identifier})`,
    limit: "1",
  });
  const users = await databaseRequest<UserRecord[]>(`users?${query.toString()}`);
  return users[0] ?? null;
}

export async function findUserByEmail(email: string) {
  const query = new URLSearchParams({
    select: USER_FIELDS_WITH_AUTH_ID,
    email: `eq.${email.trim().toLowerCase()}`,
    limit: "1",
  });
  const users = await databaseRequest<UserRecord[]>(`users?${query.toString()}`);
  return users[0] ?? null;
}

export async function findUserByEmailWithoutAuthLink(email: string) {
  const query = new URLSearchParams({
    select: USER_FIELDS,
    email: `eq.${email.trim().toLowerCase()}`,
    limit: "1",
  });
  const users = await databaseRequest<UserRecord[]>(`users?${query.toString()}`);
  return users[0] ?? null;
}

export async function findUserByAuthId(authUserId: string) {
  const query = new URLSearchParams({
    select: USER_FIELDS_WITH_AUTH_ID,
    auth_user_id: `eq.${authUserId}`,
    limit: "1",
  });
  const users = await databaseRequest<UserRecord[]>(`users?${query.toString()}`);
  return users[0] ?? null;
}

export async function findEmployeeRoleProfile(authUserId: string, email: string) {
  const fields =
    "employee_id,name,email,category,department,designation,joining_date,probation_cleared";
  const authQuery = new URLSearchParams({
    select: fields,
    auth_user_id: `eq.${authUserId}`,
    limit: "1",
  });
  const byAuthId = await databaseRequest<EmployeeRoleProfile[]>(
    `employees?${authQuery.toString()}`,
  );
  if (byAuthId[0]) return byAuthId[0];

  const emailQuery = new URLSearchParams({
    select: fields,
    email: `eq.${email.trim().toLowerCase()}`,
    limit: "1",
  });
  const byEmail = await databaseRequest<EmployeeRoleProfile[]>(
    `employees?${emailQuery.toString()}`,
  );
  return byEmail[0] ?? null;
}

export async function createManagerApplicationUser(input: {
  authUserId: string;
  email: string;
  name: string;
  linkAuthId?: boolean;
  employeeProfile?: EmployeeRoleProfile;
}) {
  const applicationUser = {
    user_id: input.employeeProfile?.employee_id ?? `MGR-${input.authUserId.toUpperCase()}`,
    name: input.employeeProfile?.name || input.name || input.email.split("@")[0],
    email: input.email.trim().toLowerCase(),
    password_hash: "supabase-auth-managed",
    role: "manager",
    status: "active",
    manager_id: null,
    department: input.employeeProfile?.department ?? null,
    designation: input.employeeProfile?.designation ?? null,
    joining_date: input.employeeProfile?.joining_date ?? null,
    probation_cleared: input.employeeProfile?.probation_cleared ?? false,
  };
  try {
    const created = await databaseRequest<UserRecord[]>("users", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(
        input.linkAuthId === false
          ? applicationUser
          : { ...applicationUser, auth_user_id: input.authUserId },
      ),
    });
    return created[0] ?? null;
  } catch (error) {
    if (error instanceof DatabaseError && error.status === 409 && input.linkAuthId !== false) {
      return findUserByAuthId(input.authUserId);
    }
    throw error;
  }
}

export async function promoteUserToManager(user: UserRecord) {
  const query = new URLSearchParams({
    id: `eq.${user.id}`,
    session_version: `eq.${user.session_version}`,
    select: USER_FIELDS,
  });
  const updated = await databaseRequest<UserRecord[]>(`users?${query.toString()}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      role: "manager",
      manager_id: null,
      session_version: user.session_version + 1,
    }),
  });
  return updated[0] ?? findUserById(user.id);
}

export async function linkUserToAuthId(user: UserRecord, authUserId: string) {
  const query = new URLSearchParams({
    id: `eq.${user.id}`,
    auth_user_id: "is.null",
    select: USER_FIELDS,
  });
  const linked = await databaseRequest<UserRecord[]>(`users?${query.toString()}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ auth_user_id: authUserId }),
  });
  return linked[0] ?? findUserByAuthId(authUserId);
}

export async function findUserById(id: string) {
  const query = new URLSearchParams({
    select: USER_FIELDS,
    id: `eq.${id}`,
    limit: "1",
  });
  const users = await databaseRequest<UserRecord[]>(`users?${query.toString()}`);
  return users[0] ? toAppUser(users[0]) : null;
}

function toAppUser(user: UserRecord): AppUser {
  return {
    id: user.user_id,
    databaseId: user.id,
    user_id: user.user_id,
    name: user.name,
    initials: user.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join(""),
    email: user.email,
    role: user.role,
    status: user.status,
    manager_id: user.manager_id,
    session_version: user.session_version,
    department: user.department ?? "",
    designation: user.designation ?? "",
    joiningDate: user.joining_date ?? "",
    probationCleared: user.probation_cleared,
  };
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return null;

  const user = await findUserById(payload.sub);
  if (
    !user ||
    user.status !== "active" ||
    user.session_version !== payload.version
  ) {
    return null;
  }
  return user;
}

export async function authorizeApiRole(role?: Role): Promise<
  | { user: AppUser; error?: never }
  | { user?: never; error: { status: 401 | 403 | 503; message: string } }
> {
  let user: AppUser | null;
  try {
    user = await getCurrentUser();
  } catch {
    return { error: { status: 503, message: "Authentication service unavailable." } };
  }
  if (!user) return { error: { status: 401, message: "Authentication required." } };
  if (role && user.role !== role) {
    return { error: { status: 403, message: "You do not have permission to access this resource." } };
  }
  return { user };
}

export function toPublicUser(user: AppUser): PublicUser {
  const {
    session_version: _sessionVersion,
    databaseId: _databaseId,
    manager_id: _managerId,
    ...publicUser
  } = user;
  return publicUser;
}

export function createSessionToken(user: Pick<AppUser, "id" | "session_version">) {
  const config = getDatabaseConfig();
  if (!config) throw new DatabaseError("Session signing is not configured.", 503);
  const payload: SessionPayload = {
    sub: user.id,
    version: user.session_version,
    exp: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload, config.sessionSecret);
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token: string | undefined): SessionPayload | null {
  const config = getDatabaseConfig();
  if (!config || !token) return null;
  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(encodedPayload, config.sessionSecret), "base64url");
  const actual = Buffer.from(signature, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString()) as SessionPayload;
    if (
      typeof payload.sub !== "string" ||
      typeof payload.version !== "number" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function getNetworkErrorCode(error: unknown) {
  if (!(error instanceof Error) || !("cause" in error)) return undefined;
  const cause = error.cause;
  if (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    typeof cause.code === "string" &&
    /^[A-Z0-9_]{1,32}$/.test(cause.code)
  ) {
    return cause.code;
  }
  return undefined;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_LIFETIME_SECONDS,
  };
}

export async function requirePageRole(role: Role) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) {
    redirect(user.role === "manager" ? "/manager/dashboard" : "/employee/dashboard");
  }
  return user;
}

export async function getManagedUsers(managerId?: string) {
  const query = new URLSearchParams({
    select: "id,user_id,name,email,role,status,manager_id",
    role: "eq.employee",
    order: "name.asc",
  });
  if (managerId) query.set("manager_id", `eq.${managerId}`);
  return databaseRequest<ManagedUser[]>(`users?${query.toString()}`);
}