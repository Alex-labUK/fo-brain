import { draftSubsystemProposals } from "./draft-subsystem-proposals";
import {
  NORMANDY_DESIRED_OUTCOME,
  NORMANDY_EXCLUDED_SUBSYSTEM_KEYS,
  NORMANDY_EXPECTED_SUBSYSTEM_KEYS,
  NORMANDY_REQUEST_FACTS,
  NORMANDY_TEST_CATALOG,
} from "./fixtures/normandy-cancellation";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function runNormandyProposalTest(): void {
  const proposals = draftSubsystemProposals(
    NORMANDY_REQUEST_FACTS,
    NORMANDY_DESIRED_OUTCOME,
    NORMANDY_TEST_CATALOG,
  );

  const proposedKeys = proposals.map((item) => item.subsystemKey).sort();

  assert(
    proposedKeys.length === NORMANDY_EXPECTED_SUBSYSTEM_KEYS.length,
    `Expected ${NORMANDY_EXPECTED_SUBSYSTEM_KEYS.length} proposals, got ${proposedKeys.length}: ${proposedKeys.join(", ")}`,
  );

  for (const key of NORMANDY_EXPECTED_SUBSYSTEM_KEYS) {
    assert(proposedKeys.includes(key), `Missing expected subsystem: ${key}`);
  }

  for (const key of NORMANDY_EXCLUDED_SUBSYSTEM_KEYS) {
    assert(!proposedKeys.includes(key), `Should not propose subsystem: ${key}`);
  }

  for (const proposal of proposals) {
    assert(proposal.reasonForActivation.trim().length > 0, `${proposal.subsystemKey}: missing reasonForActivation`);
    assert(proposal.roleRelevantContext.trim().length > 0, `${proposal.subsystemKey}: missing roleRelevantContext`);
    assert(proposal.expectedFeedback.trim().length > 0, `${proposal.subsystemKey}: missing expectedFeedback`);
    assert(
      proposal.roleRelevantContext !== NORMANDY_REQUEST_FACTS,
      `${proposal.subsystemKey}: must not copy full request facts as context`,
    );
  }

  const family = proposals.find((item) => item.subsystemKey === "family");
  assert(
    family?.roleRelevantContext.includes("injured") ?? false,
    "Family context should mention child injury",
  );

  const health = proposals.find((item) => item.subsystemKey === "health");
  assert(
    health?.roleRelevantContext.includes("broken an arm") ?? false,
    "Health context should mention broken arm",
  );

  console.log("Normandy proposal test passed.");
  console.log(JSON.stringify(proposals, null, 2));
}

runNormandyProposalTest();
