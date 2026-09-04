import "server-only";

import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

export type CmsQueryBoundaryProps = {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
  children: ReactNode;
};

/**
 * Prefetch one server-owned CMS query and transfer its resolved data to the
 * browser QueryClient. The route stays a Server Component while the feature
 * view can use the same query key during client navigation.
 */
export default async function CmsQueryBoundary({
  queryKey,
  queryFn,
  children,
}: CmsQueryBoundaryProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  await queryClient.prefetchQuery({ queryKey, queryFn });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
