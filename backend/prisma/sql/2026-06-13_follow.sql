-- Aditivo e idempotente: cria a tabela Follow (sistema de seguidores) sem tocar
-- em nada existente. Aplicado via `prisma db execute` em vez de `db push` porque
-- o DB tem drift (colunas fora do schema) e o db push tentaria dropá-las.

CREATE TABLE IF NOT EXISTS "Follow" (
  "id" TEXT NOT NULL,
  "followerId" TEXT NOT NULL,
  "followingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Follow_followerId_followingId_key"
  ON "Follow" ("followerId", "followingId");
CREATE INDEX IF NOT EXISTS "Follow_followingId_idx" ON "Follow" ("followingId");
CREATE INDEX IF NOT EXISTS "Follow_followerId_idx" ON "Follow" ("followerId");

DO $$ BEGIN
  ALTER TABLE "Follow"
    ADD CONSTRAINT "Follow_followerId_fkey"
    FOREIGN KEY ("followerId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Follow"
    ADD CONSTRAINT "Follow_followingId_fkey"
    FOREIGN KEY ("followingId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Curtida única: novas reações nascem como 'like'. Linhas antigas (fire/clap)
-- ficam intactas e continuam contando como curtida na lógica do app.
ALTER TABLE "Reaction" ALTER COLUMN "type" SET DEFAULT 'like';
