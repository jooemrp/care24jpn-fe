"use server";

import type { ApiResult } from "@/lib/api";
import { getRatesStrict } from "@/features/cms/rates";
import type { RatesContent } from "./types";

/**
 * Strict Server Action for the shared pricing/fees query.
 *
 * The action deliberately returns the shared ApiResult envelope. Client
 * hooks unwrap it into TanStack Query errors, while preserving the upstream
 * error code and trace id for retryable UI and diagnostics.
 */
export async function getRates(): Promise<ApiResult<RatesContent>> {
  return getRatesStrict();
}
