'use client';
import { useEditor } from '../context';
import QuestionNavigation from './question-navigation';

const DIFFICULTY_STYLES: Record<string, string> = {
	Easy: 'text-green-600 dark:text-green-400',
	Medium: 'text-yellow-600 dark:text-yellow-400',
	Hard: 'text-red-600 dark:text-red-400',
};

function titleFromTaskId(taskId: string): string {
	return taskId
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

export default function QuestionPanel() {
	const { currentQuestion, error } = useEditor();

	if (error) {
		return (
			<div className="p-6 text-sm text-red-600 dark:text-red-400">
				Failed to load question: {error}
			</div>
		);
	}

	if (!currentQuestion) {
		return (
			<div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">
				Loading question...
			</div>
		);
	}

	return (
		<div className="h-full overflow-y-auto p-6 text-sm text-zinc-900 dark:text-zinc-100">
			<QuestionNavigation/>
			<h1 className="text-xl font-semibold">
				{currentQuestion.question_id}. {titleFromTaskId(currentQuestion.task_id)}
			</h1>

			<div className="mt-2 flex items-center gap-3">
				<span
					className={`text-xs font-medium ${DIFFICULTY_STYLES[currentQuestion.difficulty] ?? ''}`}
				>
					{currentQuestion.difficulty}
				</span>
				
				{/* Should tags be visible?
					{currentQuestion.tags.map((tag) => (
					<span
						key={tag}
						className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
					>
						{tag}
					</span>
				))} */}
			</div>

			<p className="mt-4 whitespace-pre-line leading-6 text-zinc-700 dark:text-zinc-300">
				{currentQuestion.problem_description}
			</p>
		</div>
	);
}
