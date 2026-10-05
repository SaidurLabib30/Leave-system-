import { randomBytes, scrypt as scryptCallback } from "node:crypto";

const settings = {
  url: process.env.SUPABASE_URL?.trim().replace(/\/$/, ""),
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  managerId: process.env.SEED_MANAGER_USER_ID,
  managerName: process.env.SEED_MANAGER_NAME,
  managerEmail: process.env.SEED_MANAGER_EMAIL,
  managerPassword: process.env.SEED_MANAGER_PASSWORD,
  employeeId: process.env.SEED_EMPLOYEE_USER_ID,
  employeeName: process.env.SEED_EMPLOYEE_NAME,
  employeeEmail: process.env.SEED_EMPLOYEE_EMAIL,
  employeePassword: process.env.SEED_EMPLOYEE_PASSWORD,
};

for (const key of ["url", "serviceKey", "managerId", "managerName", "managerEmail", "managerPassword"]) {
  if (!settings[key]) throw new Error(`Missing required setting: ${key}`);
}

const employeeValues = [settings.employeeId, settings.employeeName, settings.employeeEmail, settings.employeePassword];
if (employeeValues.some(Boolean) && employeeValues.some((value) => !value)) {
  throw new Error("Set all SEED_EMPLOYEE_* settings or leave them all empty.");
}

const manager = await insertUser({
  user_id: settings.managerId,
  name: settings.managerName,
  email: settings.managerEmail.toLowerCase(),
  password: settings.managerPassword,
  password_hash: await hashPassword(settings.managerPassword),
  role: "manager",
  status: "active",
  manager_id: null,
});
console.log(`Created manager account ${manager.user_id}.`);

if (settings.employeeId) {
  const employee = await insertUser({
    user_id: settings.employeeId,
    name: settings.employeeName,
    email: settings.employeeEmail.toLowerCase(),
    password: settings.employeePassword,
    password_hash: await hashPassword(settings.employeePassword),
    role: "employee",
    status: "active",
    manager_id: manager.id,
  });
  console.log(`Created employee account ${employee.user_id}, assigned to ${manager.user_id}.`);
}

async function insertUser(user) {
  const authUser = await createAuthUser(user.email, user.password, user.name);
  const applicationUser = { ...user };
  delete applicationUser.password;
  try {
    const response = await fetch(`${settings.url}/rest/v1/users`, {
      method: "POST",
      headers: serviceHeaders({
        "Content-Type": "application/json",
        Prefer: "return=representation",
      }),
      body: JSON.stringify({ ...applicationUser, auth_user_id: authUser.id }),
    });
    if (!response.ok) {
      throw new Error(`Could not insert seed account (${response.status}).`);
    }
    const rows = await response.json();
    return rows[0];
  } catch (error) {
    try {
      await deleteAuthUser(authUser.id);
    } catch (cleanupError) {
      throw new Error(
        `Could not insert seed account and could not remove its Supabase Auth user (${authUser.id}).`,
        { cause: cleanupError },
      );
    }
    throw error;
  }
}

async function createAuthUser(email, password, name) {
  const response = await fetch(`${settings.url}/auth/v1/admin/users`, {
    method: "POST",
    headers: serviceHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    }),
  });
  if (!response.ok) {
    throw new Error(`Could not create Supabase Auth seed user (${response.status}).`);
  }
  const authUser = await response.json();
  if (typeof authUser.id !== "string") {
    throw new Error("Supabase Auth returned an invalid seed user.");
  }
  return authUser;
}

async function deleteAuthUser(id) {
  const response = await fetch(`${settings.url}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: serviceHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Could not remove Supabase Auth seed user (${response.status}).`);
  }
}

function serviceHeaders(additionalHeaders = {}) {
  return {
    apikey: settings.serviceKey,
    ...(settings.serviceKey.startsWith("sb_secret_")
      ? {}
      : { Authorization: `Bearer ${settings.serviceKey}` }),
    ...additionalHeaders,
  };
}

function hashPassword(password) {
  if (password.length < 8 || password.length > 128) {
    throw new Error("Seed passwords must be between 8 and 128 characters.");
  }
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(`scrypt$${salt.toString("hex")}$${key.toString("hex")}`);
    });
  });
}
