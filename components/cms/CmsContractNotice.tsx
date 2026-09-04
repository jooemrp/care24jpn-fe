type CmsContractNoticeProps = {
  title?: string;
  details: string;
  className?: string;
};

/**
 * Explicitly identifies a missing Atlas contract without fabricating content.
 * The notice is intentionally plain and theme-neutral so it is safe in every
 * server/client surface that can encounter incomplete CMS data.
 */
export function CmsContractNotice({
  title = "CMS content contract is incomplete",
  details,
  className = "",
}: CmsContractNoticeProps) {
  return (
    <div
      role="status"
      className={`rounded-2xl border border-accent/30 bg-accent-light/40 px-5 py-5 text-left ${className}`}
    >
      <p className="font-semibold text-heading">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-body">{details}</p>
    </div>
  );
}
