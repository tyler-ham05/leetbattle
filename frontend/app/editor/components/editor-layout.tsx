'use client';
// The practice editor's layout: the question on the left, the code (tabs,
// Monaco, Run / Submit, results, test cases) on the right. Shared by the
// practice page (/editor) and the game page once the bans are in. Must be
// rendered inside an EditorProvider.
import type { ReactNode } from 'react';
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

export default function EditorLayout({ belowQuestion }: EditorLayoutProps) {
	// Someone else's workspace (see app/game/components -- WorkspaceSwitcher):
	// nothing here can be run or submitted on their behalf.
	const { readOnly } = useEditor();
	return (
		<div className="flex min-h-0 flex-1 bg-page font-sans">

			<div className="flex w-1/2 flex-col border-r border-line">
				<div className="min-h-0 flex-1">
					<QuestionPanel />
				</div>
				{belowQuestion && (
					<div className="h-64 shrink-0 border-t border-line">
						{belowQuestion}
					</div>
				)}
			</div>

			<div className="flex w-1/2 flex-col">
				<div className="flex h-3/5 min-h-0 flex-col">
					<CodeTabs />
					<div className="min-h-0 flex-1">
						<Monaco />
					</div>
				</div>
				{!readOnly && (
					<>
						<SubmitBar />
						<ResultsPanel />
					</>
				)}
				<div className="h-2/5 min-h-0 border-t border-line">
					<TestCasesPanel />
				</div>
			</div>
		</div>
	);
}
