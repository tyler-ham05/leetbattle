'use client';
import Spinner from '../../_shared/spinner';
import { useEditor } from '../context';
import QuestionNavigation from './question-navigation';

// Theme colors, so the difficulty moves with the scheme and mode.
export const DIFFICULTY_STYLES: Record<string, string> = {
	Easy: 'text-primary',
	Medium: 'text-secondary',
	Hard: 'text-danger',
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
				Loading question…
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
			</div>

			<p className="mt-4 whitespace-pre-line leading-6 text-muted">
				{currentQuestion.problem_description}
			</p>
		</div>
	);
}
