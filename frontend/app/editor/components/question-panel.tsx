'use client';
import Spinner from '../../_shared/spinner';
import { useEditor } from '../context';
import QuestionNavigation from './question-navigation';

// Shared with the game page's problem list.
export const DIFFICULTY_STYLES: Record<string, string> = {
	Easy: 'text-green-600 dark:text-green-400',
	Medium: 'text-yellow-600 dark:text-yellow-400',
	Hard: 'text-red-600 dark:text-red-400',
};

// "two-sum" -> "Two Sum". Shared with the game page's problem list.
export function titleFromTaskId(taskId: string): string {
	return taskId
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

export default function QuestionPanel() {
	const { currentQuestion, error } = useEditor();

	if (error) {
		return (
			<div className="p-6 text-sm text-danger">
				Failed to load question: {error}
			</div>
		);
	}

	if (!currentQuestion) {
		return (
			<div role="status" className="flex items-center gap-2.5 p-6 text-sm text-muted">
				<Spinner />
				Loading question...
			</div>
		);
	}

	return (
		<div className="h-full overflow-y-auto p-6 text-sm text-ink">
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
						className="rounded-full bg-raised px-2 py-0.5 text-xs text-muted"
					>
						{tag}
					</span>
				))} */}
			</div>

			<p className="mt-4 whitespace-pre-line leading-6 text-muted">
				{currentQuestion.problem_description}
			</p>
		</div>
	);
}
