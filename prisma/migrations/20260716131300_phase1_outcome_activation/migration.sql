-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "statement" TEXT NOT NULL,
    "successCondition" TEXT,
    "requestFacts" TEXT NOT NULL DEFAULT '',
    "headFocus" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subsystem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerRoleKey" TEXT
);

-- CreateTable
CREATE TABLE "Activation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "outcomeId" TEXT NOT NULL,
    "subsystemId" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT '',
    "expectedFeedback" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "excludeReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Activation_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "Outcome" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Activation_subsystemId_fkey" FOREIGN KEY ("subsystemId") REFERENCES "Subsystem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "branchId" TEXT,
    "outcomeId" TEXT,
    "facts" TEXT NOT NULL DEFAULT '',
    "questionsAsked" JSONB NOT NULL DEFAULT [],
    "decisionTree" TEXT NOT NULL DEFAULT '',
    "recordedResult" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Case_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "DecisionEngineBranch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Case_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "Outcome" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Case" ("id", "title", "domain", "status", "branchId", "facts", "questionsAsked", "decisionTree", "recordedResult", "createdAt", "updatedAt")
SELECT "id", "title", "domain", "status", "branchId", "facts", "questionsAsked", "decisionTree", "outcome", "createdAt", "updatedAt" FROM "Case";
DROP TABLE "Case";
ALTER TABLE "new_Case" RENAME TO "Case";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Subsystem_key_key" ON "Subsystem"("key");
