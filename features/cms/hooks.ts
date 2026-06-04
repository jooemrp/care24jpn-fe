"use client";

import { useQuery } from "@tanstack/react-query";
import { getBilingualPage } from "./actions";
import type { BilingualPageData } from "./types";

export function useBilingualPage(slug: string) {
  return useQuery<BilingualPageData | undefined>({
    queryKey: ["cms", "bilingual", slug],
    queryFn: async () => {
      const result = await getBilingualPage(slug);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}
