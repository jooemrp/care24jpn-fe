"use client";

import { useQuery } from "@tanstack/react-query";
import { unwrap } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { getRates } from "./actions";
import type { RatesContent } from "./types";

const RATES_STALE_TIME = 60_000;

/**
 * One cache entry serves both `/pricing` and `/fees`. The server action
 * returns customer and supporter projections together, so navigating between
 * the pages reuses one coherent rates snapshot.
 */
export function useRatesQuery() {
  return useQuery<RatesContent>({
    queryKey: queryKeys.rates,
    queryFn: async () => unwrap(await getRates()),
    staleTime: RATES_STALE_TIME,
  });
}
