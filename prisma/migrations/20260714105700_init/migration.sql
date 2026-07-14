-- CreateTable
CREATE TABLE "DecisionEngineBranch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "appliesWhen" TEXT NOT NULL,
    "blocks" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "branchId" TEXT,
    "facts" TEXT NOT NULL DEFAULT '',
    "questionsAsked" JSONB NOT NULL DEFAULT [],
    "decisionTree" TEXT NOT NULL DEFAULT '',
    "outcome" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Case_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "DecisionEngineBranch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "domainTags" JSONB NOT NULL DEFAULT [],
    "sourceCaseIds" JSONB NOT NULL DEFAULT []
);

-- CreateTable
CREATE TABLE "Principle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "personalCalibrationNote" TEXT
);

-- CreateTable
CREATE TABLE "Pattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "status" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CaseConfirmsPrinciple" (
    "caseId" TEXT NOT NULL,
    "principleId" TEXT NOT NULL,

    PRIMARY KEY ("caseId", "principleId"),
    CONSTRAINT "CaseConfirmsPrinciple_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseConfirmsPrinciple_principleId_fkey" FOREIGN KEY ("principleId") REFERENCES "Principle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseConfirmsPattern" (
    "caseId" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,

    PRIMARY KEY ("caseId", "patternId"),
    CONSTRAINT "CaseConfirmsPattern_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseConfirmsPattern_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "Pattern" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OpenQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "relatedCaseId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolutionNote" TEXT,
    CONSTRAINT "OpenQuestion_relatedCaseId_fkey" FOREIGN KEY ("relatedCaseId") REFERENCES "Case" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
