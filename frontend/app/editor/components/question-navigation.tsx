'use client';
import { useEditor } from '../context';

const DIFFICULTY_BORDER_STYLES: Record<string, string> = {
	Easy: 'border-b-green-500',
	Medium: 'border-b-yellow-500',
	Hard: 'border-b-red-500',
};

export default function QuestionNavigation() {
	const { currentQuestion, setCurrentQuestion, questions } = useEditor();

	return (
		<div className="flex w-full gap-3 overflow-y-auto pb-4 text-sm text-zinc-900 dark:text-zinc-100">
			{questions.map((question, index) => (
				<button
					key={question.question_id}
					onClick={() => setCurrentQuestion(question)}
					className={`flex h-12 flex-1 items-center justify-center rounded-t-md border-b-4 text-sm font-medium transition-colors ${
						DIFFICULTY_BORDER_STYLES[question.difficulty] ?? 'border-b-zinc-300'
					} ${
						question.question_id === currentQuestion?.question_id
							? 'bg-zinc-200 dark:bg-zinc-700'
							: 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700'
					}`}
				>
					{index + 1}
				</button>
			))}
		</div>
	);
}
