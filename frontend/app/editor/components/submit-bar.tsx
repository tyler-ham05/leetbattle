'use client';

interface SubmitBarProps {
	onRun?: () => void;
	onSubmit?: () => void;
}

export default function SubmitBar({ onRun, onSubmit }: SubmitBarProps) {
	return (
		<div className="flex items-center justify-end gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
			<button
				onClick={onRun}
				className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
			>
				Run
			</button>
			<button
				onClick={onSubmit}
				className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
			>
				Submit
			</button>
		</div>
	);
}
