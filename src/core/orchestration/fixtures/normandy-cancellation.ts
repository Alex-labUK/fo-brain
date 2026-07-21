import type { SubsystemCatalogItem } from "@/core/orchestration/types";

/** Canonical Normandy trip cancellation fixture for deterministic proposal tests. */
export const NORMANDY_REQUEST_FACTS = `The youngest child has broken an arm during a family activity. The planned ten-day Normandy road trip is cancelled. The family will remain at the residence instead of travelling. The couple's travel schedule may change. Hotel and flight bookings must be unwound. The trip was cancelled due to a documented child injury; insurance may apply.`;

export const NORMANDY_DESIRED_OUTCOME = `Support the family through the injury and unwind the Normandy trip with minimum financial loss.`;

export const NORMANDY_EXPECTED_SUBSYSTEM_KEYS = [
  "family",
  "health",
  "travel",
  "household_operations",
  "executive_schedule",
  "insurance",
] as const;

export const NORMANDY_EXCLUDED_SUBSYSTEM_KEYS = ["residence", "staff"] as const;

/** Minimal catalogue slice used by the Normandy test — mirrors data/subsystems.json keys. */
export const NORMANDY_TEST_CATALOG: SubsystemCatalogItem[] = [
  { id: "sub_family", key: "family", name: "Family", description: null, ownerRoleKey: "family_coordinator" },
  { id: "sub_health", key: "health", name: "Health", description: null, ownerRoleKey: "health_coordinator" },
  { id: "sub_travel", key: "travel", name: "Travel", description: null, ownerRoleKey: "travel_manager" },
  {
    id: "sub_household_operations",
    key: "household_operations",
    name: "Household Operations",
    description: null,
    ownerRoleKey: "household_ops_manager",
  },
  {
    id: "sub_residence",
    key: "residence",
    name: "Residence / House",
    description: null,
    ownerRoleKey: "house_manager",
  },
  { id: "sub_staff", key: "staff", name: "Staff / HR", description: null, ownerRoleKey: "hr_manager" },
  {
    id: "sub_executive_schedule",
    key: "executive_schedule",
    name: "Executive Schedule",
    description: null,
    ownerRoleKey: "executive_assistant",
  },
  {
    id: "sub_insurance",
    key: "insurance",
    name: "Insurance",
    description: null,
    ownerRoleKey: "insurance_coordinator",
  },
];
