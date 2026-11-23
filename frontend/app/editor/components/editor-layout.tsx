'use client';
// The practice editor's layout: the question on the left, the code (tabs,
// Monaco, Run / Submit, results, test cases) on the right. Shared by the
// practice page (/editor) and the game page once the bans are in. Must be
// rendered inside an EditorProvider.
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import Monaco from './monaco';
import CodeTabs from './code-tabs';
import QuestionPanel from './question-panel';
import TestCasesPanel from './test-cases-panel';
import SubmitBar from './submit-bar';
import ResultsPanel from './results-panel';
import { useEditor } from '../context';

interface EditorLayoutProps {
	// Shown under the question, e.g. the team chat on the practice page.
	belowQuestion?: ReactNode;
}

// Each pane keeps at least this share (%) of its split; arrow keys move a divider by STEP.
const MIN_SHARE = 20;
const MAX_SHARE = 100 - MIN_SHARE;
const STEP = 5;

const clampShare = (share: number) => Math.round(Math.min(MAX_SHARE, Math.max(MIN_SHARE, share)));

// The first pane's share (%) of a split, set by dragging the divider or by the
// arrow keys on it. 'x' splits side by side, 'y' one above the other.
function useSplit(initial: number, axis: 'x' | 'y') {
	const [share, setShare] = useState(initial);
	const containerRef = useRef<HTMLDivElement>(null);
	const stopDrag = useRef<() => void>(() => undefined);

	useEffect(() => () => stopDrag.current(), []);

	const onMouseDown = (event: ReactMouseEvent) => {
		event.preventDefault();
		const move = (moveEvent: MouseEvent) => {
			const rect = containerRef.current?.getBoundingClientRect();
			const size = axis === 'x' ? rect?.width : rect?.height;
			if (!rect || !size) return;
			const offset = axis === 'x' ? moveEvent.clientX - rect.left : moveEvent.clientY - rect.top;
			setShare(clampShare((offset / size) * 100));
		};
		const stop = () => {
			window.removeEventListener('mousemove', move);
			window.removeEventListener('mouseup', stop);
		};
		stopDrag.current();
		stopDrag.current = stop;
		window.addEventListener('mousemove', move);
		window.addEventListener('mouseup', stop);
	};

	const onKeyDown = (event: ReactKeyboardEvent) => {
		const [less, more] = axis === 'x' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
		if (event.key !== less && event.key !== more) return;
		event.preventDefault();
		setShare((current) => clampShare(current + (event.key === more ? STEP : -STEP)));
	};

	return { share, containerRef, dividerProps: { onMouseDown, onKeyDown } };
}

// A thin line between two panes that can be dragged, or focused and moved
// with the arrow keys.
function PaneDivider({ label, axis, share, ...handlers }: {
	label: string;
	axis: 'x' | 'y';
	share: number;
	onMouseDown: (_event: ReactMouseEvent) => void;
	onKeyDown: (_event: ReactKeyboardEvent) => void;
}) {
	const shape = axis === 'x' ? 'w-1 cursor-col-resize border-l' : 'h-1 cursor-row-resize border-t';
	return (
		<div
			role="separator"
			tabIndex={0}
			aria-label={label}
			aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
			aria-valuenow={share}
			aria-valuemin={MIN_SHARE}
			aria-valuemax={MAX_SHARE}
			className={`shrink-0 border-line hover:bg-line focus-visible:bg-line focus-visible:outline-none ${shape}`}
			{...handlers}
		/>
	);
}

export default function EditorLayout({ belowQuestion }: EditorLayoutProps) {
	// Someone else's workspace (see app/game/components -- WorkspaceSwitcher):
	// nothing here can be run or submitted on their behalf.
	const { readOnly } = useEditor();
	const questionSplit = useSplit(50, 'x');
	const codeSplit = useSplit(60, 'y');
	return (
		<div ref={questionSplit.containerRef} className="flex min-h-0 flex-1 bg-page font-sans">

			<div className="flex min-w-0 shrink-0 flex-col" style={{ width: `${questionSplit.share}%` }}>
				<div className="min-h-0 flex-1">
					<QuestionPanel />
				</div>
				{belowQuestion && (
					<div className="h-64 shrink-0 border-t border-line">
						{belowQuestion}
					</div>
				)}
			</div>
			<PaneDivider label="Resize question and code" axis="x" share={questionSplit.share} {...questionSplit.dividerProps} />

			<div ref={codeSplit.containerRef} className="flex min-w-0 flex-1 flex-col">
				<div className="flex min-h-0 shrink-0 flex-col" style={{ height: `${codeSplit.share}%` }}>
					<CodeTabs />
					<div className="min-h-0 flex-1">
						<Monaco />
					</div>
				</div>
				<PaneDivider label="Resize code and test cases" axis="y" share={codeSplit.share} {...codeSplit.dividerProps} />
				{!readOnly && (
					<>
						<SubmitBar />
						<ResultsPanel />
					</>
				)}
				<div className="min-h-0 flex-1">
					<TestCasesPanel />
				</div>
			</div>
		</div>
	);
}
