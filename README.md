This is a [Next.js](https://nextjs.org) employee duty roster and leave management app.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
If `supabase/config.toml` does not exist yet, run `npx supabase init` once. 
Apply the migrations to a linked Supabase project with `npx supabase login`, `npx supabase link --project-ref YOUR_PROJECT_REF`, then `npx supabase db push`. This adds role/status and manager-to-employee relationships without seeding or overwriting existing users.

pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Authentication Setup

The application has exactly two roles: `manager` and `employee`. Authentication verifies passwords with Supabase Auth and links that identity to `public.users.auth_user_id`. Applying the auth-link migration backfills existing application accounts whose email matches a Supabase Auth user. A trusted Supabase Auth account explicitly granted `app_metadata.role=manager`, or an existing `public.employees` profile whose category is `Manager`, is provisioned as an application manager at login if no application account already exists. The application does not treat `user_metadata` or the default Supabase Auth role as an application role source. The server checks the current database role on each protected request and stores only a signed session in an HTTP-only cookie. The example below shows the required server configuration; replace every placeholder with real values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
SUPABASE_PUBLISHABLE_KEY=your-project-publishable-key
AUTH_SESSION_SECRET=at-least-32-random-bytes
```

Place `.env.local` in the project root, alongside `package.json`. Next.js loads it automatically. `SUPABASE_SERVICE_ROLE_KEY` must contain a server-only service-role JWT or newer `sb_secret_` key; it is used only by server code and must never use a `NEXT_PUBLIC_` name. `SUPABASE_PUBLISHABLE_KEY` may instead be provided as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; it is used for password authentication with Supabase Auth. Keep the service key and `AUTH_SESSION_SECRET` private. `AUTH_SESSION_SECRET` must be at least 32 bytes in development and production. To grant manager access, either designate the user with `"role":"manager"` in Supabase Auth **app_metadata** (preserve existing metadata; do not use user-editable `user_metadata`), or set the user's trusted `public.employees.category` profile to `Manager`. The next successful login creates and links the application manager account if needed. Apply all migrations with `npx supabase login`, `npx supabase link --project-ref YOUR_PROJECT_REF`, and `npx supabase db push`.

For disposable test accounts, set all `SEED_MANAGER_*` and `SEED_EMPLOYEE_*` variables in `.env.local`, then run `node --env-file=.env.local scripts/seed-users.mjs`. It creates confirmed Supabase Auth users and their linked application records for a manager and an employee assigned to that manager. Newly created employees from the manager directory are provisioned in both Supabase Auth and `public.users`. Never use test credentials in production.

Attendance check-in and check-out require the browser's current device location. Serve the app over HTTPS (localhost is allowed for development) and allow location access in the browser/device settings. The app records latitude, longitude, and reported accuracy for each attendance event in `public.attendance`; coordinates are returned only to the employee and their assigned manager. Location is not cached in browser storage.

Install existing project dependencies with `pnpm install`, then start the app with `pnpm dev` from this directory. Employee and manager dashboards are `/employee/dashboard` and `/manager/dashboard` respectively. Leave, roster, and attendance records remain the existing prototype data; the manager's user directory and team scope are database-backed.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
