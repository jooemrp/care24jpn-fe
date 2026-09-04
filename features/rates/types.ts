import type { actionPlan as FeesCopyValue, pricing as PricingCopyValue } from "@/constants/copy";
import type { CourseRates, SupporterRates } from "@/constants/pricing";

export type PricingCopy = typeof PricingCopyValue;
type FeesCopyShape = typeof FeesCopyValue;
export type FeesCopy = Omit<FeesCopyShape, "columns"> & {
  columns: Omit<FeesCopyShape["columns"], "service"> & {
    /** The first table column intentionally has no visible header label. */
    service?: FeesCopyShape["columns"]["service"];
  };
};

/**
 * The single rates payload shared by the pricing and supporter-fee views.
 *
 * The customer and supporter projections are created from the same mapped
 * rate table on the server. Keeping them together means a query cannot
 * hydrate one page from a different CMS snapshot than the other.
 */
export type RatesContent = {
  pricing: PricingCopy;
  fees: FeesCopy;
  courseRates: CourseRates[];
  supporterRates: SupporterRates[];
};
