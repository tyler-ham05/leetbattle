'use client';
import { useEffect, useState } from 'react';
import { useEditor } from '../context';

export default function TestCasesPanel() {
	const { testCases } = useEditor();
	const [activeCase, setActiveCase] = useState(0);

	useEffect(() => {
		setActiveCase(0);
	}, [testCases]);

	if (testCases.length === 0) {
		return (
			<div className="flex h-full items-center justify-center p-4 text-sm text-muted">
				No test cases available for this problem.
			</div>
		);
	}

	const testCase = testCases[activeCase];

	return (
		<div className="flex h-full flex-col text-sm text-ink">
			<div className="flex items-center gap-2 border-b border-line px-4 py-2">
				{testCases.map((_, index) => (
					<button
						key={index}
						onClick={() => setActiveCase(index)}
						className={`rounded-md px-3 py-1 text-xs font-medium ${
							index === activeCase
								? 'bg-raised text-ink'
								: 'text-muted hover:bg-raised'
						}`}
					>
            Case {index + 1}
					</button>
				))}
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				<div>
					<p className="text-xs text-muted">Input</p>
					<pre className="mt-1 rounded-md bg-raised p-3 font-mono text-xs">
						{testCase.input}
					</pre>
				</div>
				<div className="mt-3">
					<p className="text-xs text-muted">
            Expected Output
					</p>
					<pre className="mt-1 rounded-md bg-raised p-3 font-mono text-xs">
						{testCase.expected}
					</pre>
				</div>
			</div>
		</div>
	);
}
