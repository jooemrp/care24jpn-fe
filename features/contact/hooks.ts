"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { unwrap } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { getContact, submitContact } from "./actions";
import type { ContactPayload } from "./schema";
import type { ContactSubmitResult } from "./status-copy";
import type { ContactContent } from "@/features/cms/contact-map";

/**
 * Client-side mutation boundary for the contact Server Action. The action
 * reference is the only server dependency that crosses into this module;
 * credentials and upstream request details stay on the server.
 */
export function useContactMutation() {
  return useMutation<ContactSubmitResult, Error, ContactPayload>({
    mutationKey: queryKeys.contact.submit,
    mutationFn: async (payload) => unwrap(await submitContact(payload)),
  });
}

const CONTACT_STALE_TIME = 60_000;

export function useContactQuery() {
  return useQuery<ContactContent>({
    queryKey: queryKeys.contact.content,
    queryFn: async () => unwrap(await getContact()),
    staleTime: CONTACT_STALE_TIME,
  });
}
