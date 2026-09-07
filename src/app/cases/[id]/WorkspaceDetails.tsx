import { workspaceType } from "@/app/cases/[id]/workspace-ui";

type WorkspaceDetailsProps = {
  title: string;
  hint?: string;
  children: React.ReactNode;
};

export function WorkspaceDetails({ title, hint, children }: WorkspaceDetailsProps) {
  return (
    <details className="group border-t border-zinc-200 last:border-b">
      <summary className="flex min-h-11 cursor-pointer list-none items-center marker:content-none [&::-webkit-details-marker]:hidden">
        <span className={`flex w-full items-center justify-between gap-4 ${workspaceType.body}`}>
          <span className="min-w-0 truncate">{title}</span>
          <span className={`shrink-0 ${workspaceType.muted}`}>
            {hint ? (
              hint
            ) : (
              <>
                <span className="group-open:hidden">Показать</span>
                <span className="hidden group-open:inline">Скрыть</span>
              </>
            )}
          </span>
        </span>
      </summary>
      <div className="pb-4 pt-2">{children}</div>
    </details>
  );
}
