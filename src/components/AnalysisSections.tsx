import {
  ROUTE_LABELS,
  scenarioSymbol,
  type AnalysisSection,
} from "@/core/orchestration/analysis-core";

type AnalysisSectionsProps = {
  sections: AnalysisSection[];
};

export function AnalysisSections({ sections }: AnalysisSectionsProps) {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-zinc-900">{section.title}</h2>

          {section.content && (
            <p className="mt-2 text-sm leading-snug text-zinc-800">{section.content}</p>
          )}

          {section.roleAssignments && section.roleAssignments.length > 0 && (
            <div className="mt-3 space-y-3">
              {section.roleAssignments.map((assignment) => (
                <div key={assignment.role} className="rounded-lg bg-zinc-50 px-4 py-3">
                  <p className="text-sm font-medium text-zinc-900">{assignment.role}</p>
                  <p className="my-1 text-center text-xs text-zinc-400">↓</p>
                  <p className="text-sm leading-snug text-zinc-700">{assignment.result}</p>
                </div>
              ))}
            </div>
          )}

          {section.actions && section.actions.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-sm leading-snug text-zinc-800">
              {section.actions.map((action, index) => (
                <li key={`${index}-${action}`} className="flex gap-2">
                  <span className="text-zinc-400">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          )}

          {section.scenarios && section.scenarios.length > 0 && (
            <div className="mt-3 space-y-2">
              {section.scenarios.map((scenario) => (
                <div key={scenario.tone} className="rounded-lg bg-zinc-50 px-4 py-3">
                  <p className="text-sm font-medium text-zinc-900">
                    {scenarioSymbol(scenario.tone)} {ROUTE_LABELS[scenario.tone]}
                  </p>
                  <p className="my-1 text-center text-xs text-zinc-400">↓</p>
                  <p className="text-sm leading-snug text-zinc-700">{scenario.action}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
