'use client';
import { useEffect } from 'react';
import Spinner from '../../_shared/spinner';
import { useEditor } from '../context';

// While one is running its label swaps for a spinner (the button keeps its
// width and full color); the other one greys out.
export default function SubmitBar() {
	const { onRun, onSubmit, loadingAction, isLoading, readOnly } = useEditor();
	const running = loadingAction === 'run';
	const submitting = loadingAction === 'submit';

	// Ctrl/Cmd+Enter runs, Ctrl/Cmd+Shift+Enter submits, anywhere on the page.
	// Inside Monaco the editor catches these keys first (see monaco.tsx).
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey) || event.defaultPrevented) return;
			event.preventDefault();
			if (readOnly || isLoading) return;
			if (event.shiftKey) onSubmit();
			else onRun();
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isLoading, onRun, onSubmit, readOnly]);

	return (
		<div className="flex items-center justify-end gap-2 border-b border-line px-4 py-2">
			<button
				onClick={onRun}
				disabled={isLoading}
				aria-label="Run"
				aria-busy={running}
				className="flex h-8 w-20 items-center justify-center rounded-md bg-raised px-3 text-sm font-medium text-ink hover:bg-line disabled:cursor-not-allowed disabled:text-muted aria-busy:text-ink"
			>
				{running ? <Spinner /> : 'Run'}
			</button>
			<button
				onClick={onSubmit}
				disabled={isLoading}
				aria-label="Submit"
				aria-busy={submitting}
				className="flex h-8 w-20 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 aria-busy:opacity-100"
			>
				{submitting ? <Spinner /> : 'Submit'}
			</button>
		</div>
	);
}
