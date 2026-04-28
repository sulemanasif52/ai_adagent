-- AlterTable
ALTER TABLE "MetaCredential" ADD COLUMN "igUsername" TEXT;
ALTER TABLE "MetaCredential" ADD COLUMN "lastSyncedAt" DATETIME;
ALTER TABLE "MetaCredential" ADD COLUMN "pageName" TEXT;

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "igBusinessId" TEXT NOT NULL,
    "takenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountMetrics" TEXT NOT NULL,
    "audienceMetrics" TEXT,
    CONSTRAINT "AnalyticsSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IgPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "caption" TEXT,
    "mediaType" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "permalink" TEXT,
    "thumbnailUrl" TEXT,
    "timestamp" DATETIME NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "insightsJson" TEXT,
    "insightsAt" DATETIME,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IgPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IgComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "username" TEXT,
    "timestamp" DATETIME NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IgComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "IgPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_userId_takenAt_idx" ON "AnalyticsSnapshot"("userId", "takenAt");

-- CreateIndex
CREATE INDEX "IgPost_userId_timestamp_idx" ON "IgPost"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "IgComment_postId_timestamp_idx" ON "IgComment"("postId", "timestamp");
