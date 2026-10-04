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

Authentication verifies passwords with Supabase Auth. After successful authentication, the server matches the verified email to an existing `public.users` application record to retrieve its role and status; it does not create or synchronize user records. The server checks the current database role on each protected request and stores only a signed session in an HTTP-only cookie. The example below shows the required server configuration; replace every placeholder with real values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
SUPABASE_PUBLISHABLE_KEY=your-project-publishable-key
AUTH_SESSION_SECRET=at-least-32-random-bytes
```

Place `.env.local` in the project root, alongside `package.json`. Next.js loads it automatically. `SUPABASE_SERVICE_ROLE_KEY` must contain a server-only service-role JWT or newer `sb_secret_` key; it is used only by server code and must never use a `NEXT_PUBLIC_` name. `SUPABASE_PUBLISHABLE_KEY` may instead be provided as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; it is used for password authentication with Supabase Auth. Keep the service key and `AUTH_SESSION_SECRET` private. `AUTH_SESSION_SECRET` must be at least 32 bytes in development and production. The email returned by Supabase Auth must already match an existing `public.users.email` record; the app retrieves its role from that record and does not create duplicate users. Apply the migrations to a linked Supabase project with `npx supabase login`, `npx supabase link --project-ref YOUR_PROJECT_REF`, then `npx supabase db push`. This adds role/status and manager-to-employee relationships without seeding or overwriting existing users.

For disposable test accounts, set all `SEED_MANAGER_*` and `SEED_EMPLOYEE_*` variables in `.env.local`, then run `node --env-file=.env.local scripts/seed-users.mjs`. It inserts a manager and an employee assigned to that manager; duplicate IDs or emails are not overwritten. Never use test credentials in production.

Install existing project dependencies with `pnpm install`, then start the app with `pnpm dev` from this directory. Employee and manager dashboards are `/employee/dashboard` and `/manager/dashboard` respectively. Leave, roster, and attendance records remain the existing prototype data; the manager's user directory and team scope are database-backed.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
