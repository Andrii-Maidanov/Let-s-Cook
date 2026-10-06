# LET’S COOK API and PostgreSQL

This backend maps the existing PostgreSQL dump schema directly. It does not
create replacement recipes or silently seed application tables.

## Local development

1. Start the database: `docker compose up -d postgres`.
2. Restore the original backup into a fresh, empty public schema:

   ```powershell
   pnpm db:restore
   # Or pass an explicit path:
   .\scripts\restore-database.ps1 -DumpPath 'C:\path\to\database-dump-2026-10-05.sql'
   ```

   The restore script opens the SQL file read-only, refuses to restore over
   existing public tables, and copies it temporarily into the database
   container. It never rewrites the backup.
3. Start the API and Vite frontend together: `pnpm dev`.
4. Verify all database row counts against the dump with `pnpm db:verify`.
5. Start the API, then run `pnpm auth:verify`. It prompts for the existing
   admin password with hidden input, tests authentication and authenticated
   recipe/menu-item CRUD, then removes the temporary test records.

PostgreSQL uses a named Docker volume. To import the dump again, use a fresh
volume; the restore script intentionally will not drop existing application
data. The role bootstrap creates non-login compatibility roles needed by the
original dump's owner and ACL statements.

## API

- `GET /api/recipes?search=&category=`
- `GET /api/recipes/:id`
- `POST /api/recipes`
- `PUT /api/recipes/:id` and `PATCH /api/recipes/:id`
- `DELETE /api/recipes/:id`
- `GET /api/menu-items?search=&category=`
- `GET /api/menu-items/:id`
- `POST /api/menu-items`, `PUT`/`PATCH /api/menu-items/:id`, and
  `DELETE /api/menu-items/:id`
- `GET /api/categories?kind=recipe|dish`
- `GET /api/search?q=...`
- `GET /api/health`
- `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`

Database connection, repository queries, route handlers, Zod validation, and
HTTP error handling live in separate modules. Authentication verifies the
existing bcrypt hash, stores opaque random sessions in `public.sessions`, and
sets an HTTP-only, SameSite cookie. User profiles returned by the API omit
password hashes and session identifiers. Catalog reads require a valid
session; all writes require the admin role. Photo recognition and automatic
translation have provider interfaces only; no AI provider is configured.
