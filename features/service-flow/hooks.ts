"use client";

import { useQuery } from "@tanstack/react-query";
import { unwrap } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { getServiceFlow } from "./actions";

const SERVICE_FLOW_STALE_TIME = 60_000;

export function useServiceFlowQuery() {
  return useQuery({
    queryKey: queryKeys.serviceFlow,
    queryFn: async () => unwrap(await getServiceFlow()),
    staleTime: SERVICE_FLOW_STALE_TIME,
  });
}
