type CollapsibleCaseBlockProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function CollapsibleCaseBlock({
  title,
  children,
  defaultOpen = false,
}: CollapsibleCaseBlockProps) {
  return (
    <details
      className="group rounded-xl border border-zinc-200 bg-white shadow-sm"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium uppercase tracking-wide text-zinc-500 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {title}
          <span className="text-xs font-normal normal-case tracking-normal text-zinc-400 group-open:hidden">
            показать
          </span>
          <span className="hidden text-xs font-normal normal-case tracking-normal text-zinc-400 group-open:inline">
            скрыть
          </span>
        </span>
      </summary>
      <div className="border-t border-zinc-100 px-4 pb-3 pt-2">{children}</div>
    </details>
  );
}
