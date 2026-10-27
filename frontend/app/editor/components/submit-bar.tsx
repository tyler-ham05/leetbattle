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
		<div className="flex items-center justify-end gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
			<button
				onClick={onRun}
				disabled={isLoading}
				className="flex w-20 items-center justify-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
			>
				{loadingAction === 'run' && <Spinner />}
				Run
			</button>
			<button
				onClick={onSubmit}
				disabled={isLoading}
				className="flex w-20 items-center justify-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{loadingAction === 'submit' && <Spinner />}
				Submit
			</button>
		</div>
	);
}
