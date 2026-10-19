import Monaco from "./components/monaco";
import QuestionPanel from "./components/question-panel";
import TestCasesPanel from "./components/test-cases-panel";

export default function editor() {
  return (
    <div className="flex h-screen bg-zinc-50 font-sans dark:bg-black">
      <div className="w-1/2 border-r border-zinc-200 dark:border-zinc-800">
        <QuestionPanel />
      </div>

      <div className="flex w-1/2 flex-col">
        <div className="h-3/5 min-h-0">
          <Monaco />
        </div>
        <div className="h-2/5 min-h-0 border-t border-zinc-200 dark:border-zinc-800">
          <TestCasesPanel />
        </div>
      </div>
    </div>
  );
}
