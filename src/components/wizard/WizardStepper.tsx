type WizardStep = {
  id: number;
  label: string;
  specStep: number;
};

export const wizardSteps: WizardStep[] = [
  { id: 0, label: "Факты", specStep: 1 },
  { id: 1, label: "Классификация", specStep: 2 },
  { id: 2, label: "Рассуждение", specStep: 4 },
  { id: 3, label: "Итог", specStep: 5 },
];

type WizardStepperProps = {
  currentStep: number;
};

export function WizardStepper({ currentStep }: WizardStepperProps) {
  return (
    <nav aria-label="Шаги мастера">
      <ol className="flex flex-wrap gap-2">
        {wizardSteps.map((step, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <li
              key={step.id}
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
                isActive
                  ? "bg-zinc-900 text-white"
                  : isComplete
                    ? "bg-zinc-200 text-zinc-700"
                    : "bg-zinc-100 text-zinc-400"
              }`}
            >
              <span className="font-medium">{step.specStep}.</span>
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
