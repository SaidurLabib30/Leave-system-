import "server-only";

export type ServerConfig = {
  url: string;
  serviceKey: string;
  publishableKey: string;
  sessionSecret: string;
};

function getJwtRole(key: string) {
  if (!key.startsWith("eyJ")) return null;
  try {
    const payload = key.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      role?: unknown;
    };
    return typeof decoded.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}

function isServiceRoleKey(key: string) {
  return /^sb_secret_[A-Za-z0-9_-]+$/.test(key) || getJwtRole(key) === "service_role";
}

function isPublishableKey(key: string) {
  return /^sb_publishable_[A-Za-z0-9_-]+$/.test(key) || getJwtRole(key) === "anon";
}

export function readServerConfig(): {
  config: ServerConfig | null;
  invalidSettings: string[];
} {
  const invalidSettings: string[] = [];
  const configuredUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "";
  let url = "";
  try {
    const parsedUrl = new URL(configuredUrl);
    const isPlaceholderHost =
      parsedUrl.hostname === "your_project_id.supabase.co" ||
      parsedUrl.hostname === "your-project.supabase.co";
    if (
      (parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:") &&
      !isPlaceholderHost
    ) {
      url = configuredUrl.replace(/\/$/, "");
    }
  } catch {
    // Report only the setting name to callers.
  }
  if (!url) invalidSettings.push("SUPABASE_URL");

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!isServiceRoleKey(serviceKey) || /\s/.test(serviceKey)) {
    invalidSettings.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    "";
  if (!isPublishableKey(publishableKey)) {
    invalidSettings.push("SUPABASE_PUBLISHABLE_KEY");
  }

  const sessionSecret = process.env.AUTH_SESSION_SECRET?.trim() ?? "";
  if (Buffer.byteLength(sessionSecret) < 32) {
    invalidSettings.push("AUTH_SESSION_SECRET (at least 32 bytes)");
  }

  if (invalidSettings.length > 0) {
    return { config: null, invalidSettings };
  }

  return {
    config: { url, serviceKey, publishableKey, sessionSecret },
    invalidSettings,
  };
}