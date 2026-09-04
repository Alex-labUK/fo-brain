import type { AnalysisSection } from "@/core/orchestration/analysis-core";

type AnalysisSectionsProps = {
  sections: AnalysisSection[];
};

export function AnalysisSections({ sections }: AnalysisSectionsProps) {
  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const hasBody =
          Boolean(section.content) ||
          (section.roleAssignments?.length ?? 0) > 0 ||
          (section.actions?.length ?? 0) > 0;
        if (!hasBody) return null;

        return (
          <section
            key={section.title}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
          >
            <h2 className="text-sm font-semibold leading-snug text-zinc-900">{section.title}</h2>

            {section.content && (
              <p className="mt-1.5 text-sm leading-snug text-zinc-800">{section.content}</p>
            )}

            {section.roleAssignments && section.roleAssignments.length > 0 && (
              <div className="mt-2 space-y-2">
                {section.roleAssignments.map((assignment) => (
                  <div key={assignment.role} className="rounded-lg bg-zinc-50 px-3 py-2">
                    <p className="text-sm font-medium leading-snug text-zinc-900">{assignment.role}</p>
                    <p className="my-0.5 text-center text-xs text-zinc-400">↓</p>
                    <p className="text-sm leading-snug text-zinc-700">{assignment.result}</p>
                  </div>
                ))}
              </div>
            )}

            {section.actions && section.actions.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm leading-snug text-zinc-800">
                {section.actions.map((action, index) => (
                  <li key={`${index}-${action}`} className="flex gap-2">
                    <span className="shrink-0 text-zinc-400">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
