"use client";

import { useQuery } from "@tanstack/react-query";
import { unwrap } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { getCompany } from "./actions";

const COMPANY_STALE_TIME = 5 * 60_000;

export function useCompanyQuery() {
  return useQuery({
    queryKey: queryKeys.company,
    queryFn: async () => unwrap(await getCompany()),
    staleTime: COMPANY_STALE_TIME,
  });
}
