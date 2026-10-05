import { NextResponse } from "next/server";
import {
  DatabaseError,
  SESSION_COOKIE,
  SupabaseAuthError,
  authenticateSupabaseUser,
  createManagerApplicationUser,
  createSessionToken,
  findEmployeeRoleProfile,
  findUserByAuthId,
  findUserByIdentifier,
  findUserByEmail,
  findUserByEmailWithoutAuthLink,
  linkUserToAuthId,
  promoteUserToManager,
  sessionCookieOptions,
} from "@/lib/server-auth";
import { readServerConfig } from "@/lib/server-env";

type LoginBody = {
  identifier?: unknown;
  password?: unknown;
};

function isFormSubmission(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");
}

function loginError(request: Request, status: number, message: string, code: string) {
  if (isFormSubmission(request)) {
    const authError = {
      INVALID_CREDENTIALS: "invalid",
      ACCOUNT_NOT_FOUND: "account-not-found",
      ACCOUNT_DISABLED: "account-disabled",
    }[code] ?? "unavailable";
    return NextResponse.redirect(
      new URL(`/login?authError=${authError}`, request.url),
      303,
    );
  }
  return NextResponse.json(
    { error: message, code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  let stage = "parse-request";
  let body: LoginBody;
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = (await request.json()) as LoginBody;
    } else if (isFormSubmission(request)) {
      const formData = await request.formData();
      body = {
        identifier: formData.get("identifier"),
        password: formData.get("password"),
      };
    } else {
      return loginError(
        request,
        415,
        "Submit login credentials using a POST request.",
        "UNSUPPORTED_CONTENT_TYPE",
      );
    }
  } catch {
    return loginError(
      request,
      400,
      "Enter your email or user ID and password.",
      "MISSING_FIELDS",
    );
  }

  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!identifier || !password) {
    return loginError(
      request,
      400,
      "Enter both your email or user ID and password.",
      "MISSING_FIELDS",
    );
  }
  if (password.length > 128) {
    return loginError(
      request,
      400,
      "Password must be 128 characters or fewer.",
      "INVALID_INPUT",
    );
  }

  if (!/^[\w.@+-]{1,254}$/.test(identifier)) {
    return loginError(
      request,
      404,
      "No account was found for that email or user ID.",
      "ACCOUNT_NOT_FOUND",
    );
  }

  const serverConfig = readServerConfig();
  if (!serverConfig.config) {
    console.error(
      `Login server configuration invalid (settings=${serverConfig.invalidSettings.join(",")})`,
    );
    return loginError(
      request,
      503,
      `Missing or invalid server setting(s): ${serverConfig.invalidSettings.join(", ")}.`,
      "SERVER_ERROR",
    );
  }

  try {
    let authEmail = identifier.toLowerCase();
    if (!identifier.includes("@")) {
      stage = "lookup-user-id";
      const matchingUser = await findUserByIdentifier(identifier);
      if (!matchingUser) {
        return loginError(
          request,
          404,
          "No account was found for that email or user ID.",
          "ACCOUNT_NOT_FOUND",
        );
      }
      authEmail = matchingUser.email;
    }

    stage = "authenticate-user";
    const authenticatedUser = await authenticateSupabaseUser(authEmail, password);

    stage = "lookup-application-user";
    let user;
    try {
      user = await findUserByAuthId(authenticatedUser.id);
      if (!user) {
        const emailMatch = await findUserByEmail(authenticatedUser.email);
        if (emailMatch && !emailMatch.auth_user_id) {
          user = await linkUserToAuthId(emailMatch, authenticatedUser.id);
        } else if (emailMatch?.auth_user_id === authenticatedUser.id) {
          user = emailMatch;
        } else if (!emailMatch && authenticatedUser.isManager) {
          user = await createManagerApplicationUser({
            authUserId: authenticatedUser.id,
            email: authenticatedUser.email,
            name: authenticatedUser.name,
          });
        }
      }
      if (
        user &&
        authenticatedUser.isManager &&
        (user.role !== "manager" || user.manager_id !== null)
      ) {
        user = await promoteUserToManager(user);
      }
    } catch (error) {
      const missingAuthLinkColumn =
        error instanceof DatabaseError &&
        error.status === 400 &&
        error.code === "42703" &&
        error.apiMessage?.includes("auth_user_id");
      if (!missingAuthLinkColumn) throw error;

      console.warn(
        "Login is using the legacy email lookup because public.users.auth_user_id is missing; apply the pending Supabase migration.",
      );
      user = await findUserByEmailWithoutAuthLink(authenticatedUser.email);
      if (authenticatedUser.isManager) {
        user = user
          ? await promoteUserToManager(user)
          : await createManagerApplicationUser({
              authUserId: authenticatedUser.id,
              email: authenticatedUser.email,
              name: authenticatedUser.name,
              linkAuthId: false,
            });
      }
    }
    if (!user) {
      const employeeProfile = await findEmployeeRoleProfile(
        authenticatedUser.id,
        authenticatedUser.email,
      );
      if (authenticatedUser.isManager || employeeProfile?.category === "Manager") {
        user = await createManagerApplicationUser({
          authUserId: authenticatedUser.id,
          email: authenticatedUser.email,
          name: authenticatedUser.name,
          employeeProfile: employeeProfile ?? undefined,
        });
      }
    }
    if (!user) {
      const projectRef = new URL(serverConfig.config.url).hostname.split(".")[0];
      console.error(
        `Login application account not found (stage=${stage}, projectRef=${projectRef}, trustedManagerRole=${authenticatedUser.isManager})`,
      );
      return loginError(
        request,
        404,
        "Supabase authenticated this account, but no application account or Manager profile matches it. An administrator must create its application account or set the employee profile category to Manager. Alternatively, designate the user with app_metadata.role=manager in Supabase Auth. The application will create and link the Manager account on the next sign-in.",
        "ACCOUNT_NOT_FOUND",
      );
    }
    if (user.status !== "active") {
      return loginError(
        request,
        403,
        "This account is disabled. Contact your administrator.",
        "ACCOUNT_DISABLED",
      );
    }

    stage = "create-session";
    const sessionToken = createSessionToken(user);
    const redirectTo = user.role === "manager" ? "/manager/dashboard" : "/employee/dashboard";
    const response = isFormSubmission(request)
      ? NextResponse.redirect(new URL(redirectTo, request.url), 303)
      : NextResponse.json(
          {
            success: true,
            redirectTo,
            user: {
              id: user.user_id,
              name: user.name,
              email: user.email,
              role: user.role,
            },
          },
          { headers: { "Cache-Control": "no-store" } },
        );
    response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof DatabaseError) {
      const networkFailure = error.code === "NETWORK_ERROR";
      console.error(
        `Login database request failed (stage=${stage}, status=${error.status}, databaseCode=${error.code ?? "none"}, networkCode=${error.networkCode ?? "none"}, apiMessage=${JSON.stringify(error.apiMessage ?? "none")})`,
      );
      return loginError(
        request,
        503,
        networkFailure
          ? `Authentication service is unreachable${error.networkCode ? ` (${error.networkCode})` : ""}. Check the server Supabase URL and DNS/network settings.`
          : `Supabase database request failed with HTTP ${error.status}${error.code ? ` (${error.code})` : ""}. Check the server log for the sanitized API error.`,
        networkFailure ? "DATABASE_UNAVAILABLE" : "DATABASE_ERROR",
      );
    }
    if (error instanceof SupabaseAuthError) {
      if (error.status === 400 || error.status === 401) {
        return loginError(
          request,
          401,
          "The email/User ID or password is incorrect.",
          "INVALID_CREDENTIALS",
        );
      }
      console.error(
        `Login Supabase Auth request failed (stage=${stage}, status=${error.status}, authCode=${error.code ?? "none"}, networkCode=${error.networkCode ?? "none"})`,
      );
      return loginError(
        request,
        503,
        "Authentication service is unavailable. Try again shortly.",
        "AUTHENTICATION_UNAVAILABLE",
      );
    }
    console.error(
      `Login request failed unexpectedly (stage=${stage}, errorType=${error instanceof Error ? error.name : typeof error}, networkCode=${getSafeNetworkCode(error) ?? "none"})`,
    );
    return loginError(
      request,
      500,
      "Unable to sign in right now. Try again shortly.",
      "SERVER_ERROR",
    );
  }
}

function getSafeNetworkCode(error: unknown) {
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