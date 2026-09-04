"use client";

import { useQuery } from "@tanstack/react-query";
import { unwrap } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { getFaq } from "./actions";
import type { FaqContent } from "@/features/cms/faq-map";

const FAQ_STALE_TIME = 60_000;

export function useFaqQuery() {
  return useQuery<FaqContent>({
    queryKey: queryKeys.faq,
    queryFn: async () => unwrap(await getFaq()),
    staleTime: FAQ_STALE_TIME,
  });
}
