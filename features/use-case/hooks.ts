"use client";

import { useQuery } from "@tanstack/react-query";
import { unwrap } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { getUseCase } from "./actions";

const USE_CASE_STALE_TIME = 60_000;

export function useUseCaseQuery() {
  return useQuery({
    queryKey: queryKeys.useCase,
    queryFn: async () => unwrap(await getUseCase()),
    staleTime: USE_CASE_STALE_TIME,
  });
}
