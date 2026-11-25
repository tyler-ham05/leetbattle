'use client';
import { useEffect, useState } from 'react';
import { useEditor } from '../context';
import OutputBlock, { CaseOutputBlocks, isErrorVerdict } from './output-block';

// A Run result in color: primary when the case passed, danger when it failed.
function verdictColor(verdict: string | undefined): string {
	if (!verdict) return '';
	return verdict === 'Accepted' ? 'text-primary' : 'text-danger';
}

export default function TestCasesPanel() {
	const { testCases, hiddenCaseCount, runResult } = useEditor();
	const [activeCase, setActiveCase] = useState(0);

	useEffect(() => {
		setActiveCase(0);
	}, [testCases]);

	if (testCases.length === 0) {
		return (
			<div className="flex h-full items-center justify-center p-4 text-sm text-muted">
				No test cases available for this problem
			</div>
		);
	}

	const testCase = testCases[activeCase];
	const run = runResult?.[activeCase];

	return (
		<div className="flex h-full flex-col text-sm text-ink">
			<div className="flex items-center gap-2 border-b border-line px-4 py-2">
				{testCases.map((_, index) => {
					const color = verdictColor(runResult?.[index]?.verdict);
					return (
						<button
							key={index}
							onClick={() => setActiveCase(index)}
							className={`rounded-md px-3 py-1 text-xs font-medium ${
								index === activeCase
									? `bg-raised ${color || 'text-ink'}`
									: `${color || 'text-muted'} hover:bg-raised`
							}`}
						>
							Case {index + 1}
						</button>
					);
				})}
				{hiddenCaseCount > 0 && (
					<span className="ml-auto text-xs text-muted">+{hiddenCaseCount} hidden, run on submit</span>
				)}
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				{run && <p className={`mb-3 font-medium ${verdictColor(run.verdict)}`}>{run.verdict}</p>}
				<OutputBlock label="Input">{testCase.input}</OutputBlock>
				<OutputBlock label="Expected output" className="mt-3">{testCase.expected}</OutputBlock>
				{/* An error has no output to compare, so it gets its own block with the
				    traceback (the case's stderr), or the message when stderr is empty (US-8-T-3). */}
				{run && (isErrorVerdict(run.verdict)
					? <OutputBlock label="Error" className="mt-3">{run.stderr || run.response || ''}</OutputBlock>
					: <OutputBlock label="Your output" className="mt-3">{run.response ?? ''}</OutputBlock>)}
				{run && <CaseOutputBlocks stdout={run.stdout} stderr={run.stderr} errored={isErrorVerdict(run.verdict)} />}
			</div>
		</div>
	);
}
