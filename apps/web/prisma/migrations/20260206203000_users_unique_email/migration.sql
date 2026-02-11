-- Prisma upsert requires a unique constraint on the conflict target.
-- Our seed uses prisma.user.upsert({ where: { email } ... }), so users.email must be UNIQUE.

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

