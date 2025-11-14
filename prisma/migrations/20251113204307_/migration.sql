-- CreateTable
CREATE TABLE "DatabaseUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "region" TEXT NOT NULL,
    "lastLoginIP" TEXT,
    "lastLoginLocation" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatabaseUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseAccessEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "estSizeMB" DOUBLE PRECISION,
    "ip" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatabaseAccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseAnomaly" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatabaseAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DatabaseUser_email_key" ON "DatabaseUser"("email");

-- CreateIndex
CREATE INDEX "LoginAttempt_userId_timestamp_idx" ON "LoginAttempt"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "DatabaseAccessEvent_userId_timestamp_idx" ON "DatabaseAccessEvent"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "DatabaseAccessEvent_tableName_timestamp_idx" ON "DatabaseAccessEvent"("tableName", "timestamp");

-- CreateIndex
CREATE INDEX "DatabaseAnomaly_userId_timestamp_idx" ON "DatabaseAnomaly"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "DatabaseAnomaly_type_timestamp_idx" ON "DatabaseAnomaly"("type", "timestamp");

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DatabaseUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseAccessEvent" ADD CONSTRAINT "DatabaseAccessEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DatabaseUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseAnomaly" ADD CONSTRAINT "DatabaseAnomaly_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DatabaseUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
