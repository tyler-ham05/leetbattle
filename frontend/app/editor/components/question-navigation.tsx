'use client';
import { useEditor } from '../context';

export default function QuestionNavigation() {
	const { currentQuestion, setCurrentQuestion, questions, questionStatus } = useEditor();

	return (
		<div className="mb-5 flex w-full gap-1 rounded-lg border border-line bg-surface p-1 text-sm">
			{questions.map((question, index) => {
				const selected = question.question_id === currentQuestion?.question_id;
				// Solved: the number in the primary color. Submitted but not
				// solved: muted and underlined. Nothing else marks it.
				const status = questionStatus?.[question.question_id];
				const idleColor = selected ? 'text-ink' : 'text-muted hover:text-ink';
				const color = status === 'solved' ? 'text-primary' : idleColor;
				return (
					<button
						key={question.question_id}
						onClick={() => setCurrentQuestion(question)}
						aria-current={selected ? 'true' : undefined}
						className={`lb-press flex h-10 flex-1 items-center justify-center rounded-md font-medium ${color} ${
							selected ? 'bg-raised font-bold' : ''
						} ${status === 'attempted' ? 'underline underline-offset-4' : ''}`}
					>
						{index + 1}
					</button>
				);
			})}
		</div>
	);
}
