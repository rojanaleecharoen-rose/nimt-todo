-- CreateEnum
CREATE TYPE "Color" AS ENUM ('mint', 'sky', 'lavender', 'peach', 'rose', 'butter');

-- CreateTable
CREATE TABLE "todos" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "color" "Color",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);
