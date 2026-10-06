# SQL dump inventory

Source: `database-dump-2026-10-05.sql`, read-only inspection;
PostgreSQL server 18.6, pg_dump 18.4.
The backup is intentionally not copied into this repository because it
contains user/session records and password hashes. Restore it with
`scripts/restore-database.ps1`.

JSON columns below are JSONB as declared by PostgreSQL in the dump.
`NULL` columns are nullable; all columns marked `NOT NULL` match the dump.

## Tables and rows

| Table | Rows |
| --- | ---: |
| `public.app_categories` | 20 |
| `public.login_attempts` | 11 |
| `public.menu_items` | 296 |
| `public.recipes` | 407 |
| `public.sessions` | 10 |
| `public.user_passwords` | 1 |
| `public.users` | 1 |

## Column definitions

### `public.app_categories`

- `id text NOT NULL`
- `kind text NOT NULL`
- `category_key text NOT NULL`
- `names jsonb NOT NULL DEFAULT '{}'`
- `sort_order integer NOT NULL DEFAULT 0`
- `created_at timestamp with time zone NOT NULL DEFAULT now()`

### `public.login_attempts`

- `id integer NOT NULL DEFAULT nextval('public.login_attempts_id_seq'::regclass)`
- `email character varying(255) NOT NULL`
- `attempted_at timestamp without time zone NULL DEFAULT CURRENT_TIMESTAMP`
- `success boolean NULL DEFAULT false`

### `public.menu_items`

- `id text NOT NULL`
- `name text NOT NULL`
- `section text NULL`
- `components jsonb NOT NULL DEFAULT '[]'`
- `week text NULL`
- `updated_at text NULL`
- `notes jsonb NOT NULL DEFAULT '[]'`
- `history jsonb NOT NULL DEFAULT '[]'`
- `custom boolean NOT NULL DEFAULT false`
- `source_order integer NOT NULL`
- `translations jsonb NOT NULL DEFAULT '{}'`
- `photo_url text NULL`

### `public.recipes`

- `id text NOT NULL`
- `name text NOT NULL`
- `section text NULL`
- `station text NULL`
- `ingredients jsonb NOT NULL DEFAULT '[]'`
- `steps jsonb NOT NULL DEFAULT '[]'`
- `critical_points jsonb NOT NULL DEFAULT '[]'`
- `serving_notes text NULL`
- `updated_at text NULL`
- `notes jsonb NOT NULL DEFAULT '[]'`
- `history jsonb NOT NULL DEFAULT '[]'`
- `custom boolean NOT NULL DEFAULT false`
- `source_order integer NOT NULL`
- `translations jsonb NOT NULL DEFAULT '{}'`
- `photo_url text NULL`

### `public.sessions`

- `id text NOT NULL`
- `user_id integer NOT NULL`
- `created_at timestamp with time zone NULL DEFAULT now()`
- `last_accessed timestamp with time zone NULL DEFAULT now()`
- `expires_at timestamp with time zone NOT NULL`

### `public.user_passwords`

- `id integer NOT NULL DEFAULT nextval('public.user_passwords_id_seq'::regclass)`
- `user_id integer NOT NULL`
- `password_hash text NOT NULL`
- `created_at timestamp with time zone NULL DEFAULT now()`

### `public.users`

- `id integer NOT NULL DEFAULT nextval('public.users_id_seq'::regclass)`
- `email text NOT NULL`
- `display_name text NOT NULL`
- `avatar_url text NULL`
- `role public.user_role NOT NULL DEFAULT 'user'`
- `created_at timestamp with time zone NULL DEFAULT now()`
- `updated_at timestamp with time zone NULL DEFAULT now()`

## Enum, keys, indexes

- Enum `public.user_role`: `user`, `admin`.
- Sequences: `login_attempts_id_seq`, `user_passwords_id_seq`,
  `users_id_seq`, each owned by its table's `id`.
- Primary keys: `id` on all seven tables.
- Unique constraints: `app_categories(kind, category_key)`,
  `user_passwords(user_id)`, `users(email)`.
- Foreign keys: `sessions.user_id → users.id ON DELETE CASCADE`;
  `user_passwords.user_id → users.id ON DELETE CASCADE`.
- Other table checks: none in the dump.
- Nine standalone indexes:
  `idx_sessions_expires_at`, `idx_sessions_user_id`, `idx_users_email`,
  `login_attempts_cleanup_idx` (partial), `login_attempts_email_fail_idx`
  (partial, lowercased email and descending attempted time),
  `menu_name_idx` (lowercased name), `menu_section_idx`,
  `recipes_name_idx` (lowercased name), `recipes_section_idx`.

The dump also contains ownership and default-privilege statements for the
original hosting roles. The Compose bootstrap creates those compatibility
roles as non-login roles so the unchanged SQL dump can restore locally.
