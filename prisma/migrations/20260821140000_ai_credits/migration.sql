-- Safe additive migration: Liraz AI Credits ledger
-- Does not drop or alter existing user/project/subscription/AIRequest data beyond adding creditsUsed.

CREATE TYPE "AICreditTxnType" AS ENUM (
  'MONTHLY_GRANT',
  'AI_USAGE',
  'PURCHASE',
  'ADMIN_ADJUSTMENT',
  'REFUND',
  'EXPIRATION',
  'RESERVATION',
  'RESERVATION_RELEASE'
);

CREATE TYPE "AICreditBucket" AS ENUM ('SUBSCRIPTION', 'PURCHASED');

CREATE TYPE "AICreditReservationStatus" AS ENUM ('PENDING', 'SETTLED', 'RELEASED', 'EXPIRED');

CREATE TYPE "AICreditPurchaseStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

ALTER TABLE "AIRequest" ADD COLUMN IF NOT EXISTS "creditsUsed" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AICreditAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionCredits" INTEGER NOT NULL DEFAULT 0,
    "purchasedCredits" INTEGER NOT NULL DEFAULT 0,
    "reservedCredits" INTEGER NOT NULL DEFAULT 0,
    "cycleKey" TEXT,
    "cycleAllowance" INTEGER NOT NULL DEFAULT 0,
    "cycleUsed" INTEGER NOT NULL DEFAULT 0,
    "nextRenewalAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AICreditAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AICreditAccount_userId_key" ON "AICreditAccount"("userId");
CREATE INDEX "AICreditAccount_userId_idx" ON "AICreditAccount"("userId");

ALTER TABLE "AICreditAccount"
  ADD CONSTRAINT "AICreditAccount_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AICreditPackage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "priceUsdCents" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AICreditPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AICreditPackage_slug_key" ON "AICreditPackage"("slug");
CREATE INDEX "AICreditPackage_isActive_sortOrder_idx" ON "AICreditPackage"("isActive", "sortOrder");

CREATE TABLE "AICreditPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "amountUsdCents" INTEGER NOT NULL,
    "status" "AICreditPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "paypalOrderId" TEXT,
    "paypalCaptureId" TEXT,
    "grantedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AICreditPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AICreditPurchase_paypalOrderId_key" ON "AICreditPurchase"("paypalOrderId");
CREATE UNIQUE INDEX "AICreditPurchase_paypalCaptureId_key" ON "AICreditPurchase"("paypalCaptureId");
CREATE INDEX "AICreditPurchase_userId_status_idx" ON "AICreditPurchase"("userId", "status");
CREATE INDEX "AICreditPurchase_status_idx" ON "AICreditPurchase"("status");

ALTER TABLE "AICreditPurchase"
  ADD CONSTRAINT "AICreditPurchase_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AICreditPurchase"
  ADD CONSTRAINT "AICreditPurchase_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "AICreditPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AICreditReservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "AICreditReservationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "settledUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "AICreditReservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AICreditReservation_userId_status_idx" ON "AICreditReservation"("userId", "status");
CREATE INDEX "AICreditReservation_accountId_status_idx" ON "AICreditReservation"("accountId", "status");
CREATE INDEX "AICreditReservation_expiresAt_idx" ON "AICreditReservation"("expiresAt");

ALTER TABLE "AICreditReservation"
  ADD CONSTRAINT "AICreditReservation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AICreditReservation"
  ADD CONSTRAINT "AICreditReservation_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "AICreditAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AICreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "AICreditTxnType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "bucket" "AICreditBucket",
    "description" TEXT NOT NULL,
    "aiRequestId" TEXT,
    "reservationId" TEXT,
    "purchaseId" TEXT,
    "idempotencyKey" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AICreditTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AICreditTransaction_idempotencyKey_key" ON "AICreditTransaction"("idempotencyKey");
CREATE INDEX "AICreditTransaction_userId_createdAt_idx" ON "AICreditTransaction"("userId", "createdAt");
CREATE INDEX "AICreditTransaction_accountId_idx" ON "AICreditTransaction"("accountId");
CREATE INDEX "AICreditTransaction_aiRequestId_idx" ON "AICreditTransaction"("aiRequestId");
CREATE INDEX "AICreditTransaction_type_idx" ON "AICreditTransaction"("type");

ALTER TABLE "AICreditTransaction"
  ADD CONSTRAINT "AICreditTransaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AICreditTransaction"
  ADD CONSTRAINT "AICreditTransaction_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "AICreditAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AICreditTransaction"
  ADD CONSTRAINT "AICreditTransaction_aiRequestId_fkey"
  FOREIGN KEY ("aiRequestId") REFERENCES "AIRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AICreditTransaction"
  ADD CONSTRAINT "AICreditTransaction_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "AICreditReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AICreditTransaction"
  ADD CONSTRAINT "AICreditTransaction_purchaseId_fkey"
  FOREIGN KEY ("purchaseId") REFERENCES "AICreditPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
