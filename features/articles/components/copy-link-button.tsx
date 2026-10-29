"use client";

import { useState } from "react";
import { IconCheck, IconLink } from "@tabler/icons-react";

/** Copies this article's absolute URL. Falls back to a prompt where the
 * clipboard API is blocked. */
export default function CopyLinkButton({
  path,
  label,
  copiedLabel,
}: {
  path: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt(label, url);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-heading transition hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {copied ? (
        <IconCheck size={18} className="text-primary" aria-hidden="true" />
      ) : (
        <IconLink size={18} aria-hidden="true" />
      )}
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
