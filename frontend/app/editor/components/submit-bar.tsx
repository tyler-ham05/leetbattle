'use client';
import { useEffect, useState } from 'react';
import Tooltip from '../../_shared/tooltip';
import { useEditor } from '../context';
import type { RunResult, SubmitResult } from '../controller';

// How long a result stays on the button before it goes back to Run / Submit.
const RESULT_MS = 1500;

type Action = 'run' | 'submit';

// A result shown on the button: which button, pass or fail, and its word.
interface Landed {
	action: Action;
	kind: 'pass' | 'fail';
	label: string;
}

function runLanded(results: RunResult): Landed {
	const failed = results.filter((result) => result.verdict !== 'Accepted').length;
	return failed === 0
		? { action: 'run', kind: 'pass', label: 'Passed' }
		: { action: 'run', kind: 'fail', label: `${failed} failed` };
}

function submitLanded({ verdict }: SubmitResult): Landed {
	if (verdict === 'Accepted') return { action: 'submit', kind: 'pass', label: 'Accepted' };
	return { action: 'submit', kind: 'fail', label: verdict === 'Wrong Answer' ? 'Wrong' : 'Error' };
}

// The result that just came back, for RESULT_MS. A request that failed leaves
// the editor holding the result it had before, so only a new result object counts.
function useLandedResult(): Landed | null {
	const { loadingAction, runResult, submitResult } = useEditor();
	const [landed, setLanded] = useState<Landed | null>(null);
	const [inFlight, setInFlight] = useState<{ action: Action; run: RunResult | null; submit: SubmitResult | null } | null>(null);

	// Adjusting state while rendering (no effect needed): a new action starts,
	// or the one in flight has finished.
	if (loadingAction && inFlight?.action !== loadingAction) {
		setInFlight({ action: loadingAction, run: runResult, submit: submitResult });
		setLanded(null);
	} else if (!loadingAction && inFlight) {
		setInFlight(null);
		if (inFlight.action === 'submit' && submitResult && submitResult !== inFlight.submit) setLanded(submitLanded(submitResult));
		if (inFlight.action === 'run' && Array.isArray(runResult) && runResult !== inFlight.run) setLanded(runLanded(runResult));
	}

	useEffect(() => {
		if (!landed) return;
		const id = setTimeout(() => setLanded(null), RESULT_MS);
		return () => clearTimeout(id);
	}, [landed]);

	return landed;
}

// The shortcut's modifier as the player's keyboard labels it.
function modifierKey() {
	return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl';
}

// The button's word. Keyed by the parent on the word, so each new word comes in
// with the usual entrance; while busy it breathes.
function ButtonLabel({ text, busy, check }: { text: string; busy: boolean; check: boolean }) {
	return (
		<span className="lb-enter inline-flex">
			<span className={`inline-flex items-center gap-1.5 ${busy ? 'lb-breath' : ''}`}>
				{check && (
					<svg viewBox="0 0 24 24" className="lb-check stroke-current" aria-hidden="true">
						<path d="M5 12.5l4.5 4.5L19 7.5" />
					</svg>
				)}
				{text}
			</span>
		</span>
	);
}

// Shared by Run and Submit: today's size while idle or busy, a little wider
// while a result is on it. Its own transition keeps the 0.97 press (scale).
const BUTTON = 'flex h-8 items-center justify-center whitespace-nowrap rounded-md border-[1.5px] border-transparent px-3 text-sm font-medium disabled:cursor-not-allowed [transition:scale_150ms_ease-out,width_300ms_cubic-bezier(0.22,1,0.36,1),color_200ms_ease,background-color_200ms_ease,opacity_200ms_ease]';

// What the result does to a button: a pass nods, a fail shakes and turns red.
function resultClasses(landed: Landed | null, idle: string, pass: string) {
	if (!landed) return `w-20 ${idle}`;
	return landed.kind === 'pass' ? `w-[118px] lb-nod ${pass}` : 'w-[118px] lb-shake bg-danger text-page';
}

// While one is busy its word changes and a light runs around its edge (the
// button keeps its size and full color); the other one greys out. When the
// result comes back it lands on the button for 1.5 seconds.
export default function SubmitBar() {
	const { onRun, onSubmit, loadingAction, isLoading, readOnly } = useEditor();
	const running = loadingAction === 'run';
	const submitting = loadingAction === 'submit';
	const landed = useLandedResult();
	const runResult = landed?.action === 'run' ? landed : null;
	const submitResult = landed?.action === 'submit' ? landed : null;

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

	const mod = modifierKey();
	const runText = running ? 'Running' : runResult?.label ?? 'Run';
	const submitText = submitting ? 'Judging' : submitResult?.label ?? 'Submit';

	return (
		<div className="flex items-center justify-end gap-2 border-b border-line px-4 py-2">
			<Tooltip label={`${mod} Enter`}>
				<button
					onClick={onRun}
					disabled={isLoading}
					aria-label="Run"
					aria-busy={running}
					data-result={runResult?.kind}
					className={`${BUTTON} [--lb-fill:var(--lb-raised)] [--lb-glint:var(--lb-primary)] disabled:text-muted aria-busy:text-ink ${running ? 'lb-trace' : ''} ${resultClasses(runResult, 'bg-raised text-ink hover:bg-line', 'bg-raised text-primary')}`}
				>
					<ButtonLabel key={runText} text={runText} busy={running} check={runResult?.kind === 'pass'} />
				</button>
			</Tooltip>
			<Tooltip label={`${mod} Shift Enter`}>
				<button
					onClick={onSubmit}
					disabled={isLoading}
					aria-label="Submit"
					aria-busy={submitting}
					data-result={submitResult?.kind}
					className={`${BUTTON} [--lb-fill:var(--lb-primary)] [--lb-glint:var(--lb-ink)] disabled:opacity-60 aria-busy:opacity-100 ${submitting ? 'lb-trace' : ''} ${resultClasses(submitResult, 'bg-primary text-on-primary hover:opacity-90', 'bg-primary text-on-primary')}`}
				>
					<ButtonLabel key={submitText} text={submitText} busy={submitting} check={submitResult?.kind === 'pass'} />
				</button>
			</Tooltip>
		</div>
	);
}
