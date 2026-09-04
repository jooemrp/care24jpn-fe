"use client";

import { useQuery } from "@tanstack/react-query";
import { unwrap } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { getHome } from "./actions";
import type { HomeContent } from "./types";

const HOME_STALE_TIME = 60_000;

/** One full-page CMS query shared by every homepage section. */
export function useHomeQuery() {
  return useQuery<HomeContent>({
    queryKey: queryKeys.home,
    queryFn: async () => unwrap(await getHome()),
    staleTime: HOME_STALE_TIME,
  });
}
