const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: "text-green-600 dark:text-green-400",
  Medium: "text-yellow-600 dark:text-yellow-400",
  Hard: "text-red-600 dark:text-red-400",
};

const DUMMY_QUESTION = {
  id: 1,
  title: "Two Sum",
  difficulty: "Easy",
  tags: ["Array", "Hash Table"],
  description:
    "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input has exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
  examples: [
    {
      input: "nums = [2,7,11,15], target = 9",
      output: "[0,1]",
      explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
    },
    {
      input: "nums = [3,2,4], target = 6",
      output: "[1,2]",
    },
  ],
  constraints: [
    "2 <= nums.length <= 10^4",
    "-10^9 <= nums[i] <= 10^9",
    "-10^9 <= target <= 10^9",
    "Only one valid answer exists.",
  ],
};

export default function QuestionPanel() {
  const question = DUMMY_QUESTION;

  return (
    <div className="h-full overflow-y-auto p-6 text-sm text-zinc-900 dark:text-zinc-100">
      <h1 className="text-xl font-semibold">
        {question.id}. {question.title}
      </h1>

      <div className="mt-2 flex items-center gap-3">
        <span
          className={`text-xs font-medium ${DIFFICULTY_STYLES[question.difficulty] ?? ""}`}
        >
          {question.difficulty}
        </span>
        {question.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {tag}
          </span>
        ))}
      </div>

      <p className="mt-4 whitespace-pre-line leading-6 text-zinc-700 dark:text-zinc-300">
        {question.description}
      </p>

      {question.examples.map((example, index) => (
        <div key={index} className="mt-4">
          <p className="font-medium">Example {index + 1}:</p>
          <div className="mt-1 space-y-1 rounded-md bg-zinc-100 p-3 font-mono text-xs dark:bg-zinc-900">
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">Input: </span>
              {example.input}
            </p>
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">Output: </span>
              {example.output}
            </p>
            {example.explanation && (
              <p>
                <span className="text-zinc-500 dark:text-zinc-400">
                  Explanation:{" "}
                </span>
                {example.explanation}
              </p>
            )}
          </div>
        </div>
      ))}

      <div className="mt-4">
        <p className="font-medium">Constraints:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
          {question.constraints.map((constraint, index) => (
            <li key={index}>{constraint}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
