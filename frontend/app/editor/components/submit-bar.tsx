'use client';
import { useEditor } from '../context';

function Spinner() {
	return (
		<svg
			className="h-3.5 w-3.5 animate-spin"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<circle
				className="opacity-25"
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				strokeWidth="4"
			/>
			<path
				className="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
			/>
		</svg>
	);
}

export default function SubmitBar() {
	const { onRun, onSubmit, loadingAction, isLoading } = useEditor();

	return (
		<div className="flex items-center justify-end gap-2 border-b border-line px-4 py-2">
			<button
				onClick={onRun}
				disabled={isLoading}
				className="flex w-20 items-center justify-center gap-1.5 rounded-md bg-raised px-3 py-1.5 text-sm font-medium text-ink hover:bg-line disabled:cursor-not-allowed disabled:opacity-60"
			>
				{loadingAction === 'run' && <Spinner />}
				Run
			</button>
			<button
				onClick={onSubmit}
				disabled={isLoading}
				className="flex w-20 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{loadingAction === 'submit' && <Spinner />}
				Submit
			</button>
		</div>
	);
}
