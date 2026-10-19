'use client';
import { useState } from 'react';

const DUMMY_TEST_CASES = [
	{ input: 'nums = [2,7,11,15], target = 9', expected: '[0,1]' },
	{ input: 'nums = [3,2,4], target = 6', expected: '[1,2]' },
	{ input: 'nums = [3,3], target = 6', expected: '[0,1]' },
];

export default function TestCasesPanel() {
	const [activeCase, setActiveCase] = useState(0);
	const testCase = DUMMY_TEST_CASES[activeCase];

	return (
		<div className="flex h-full flex-col text-sm text-zinc-900 dark:text-zinc-100">
			<div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
				{DUMMY_TEST_CASES.map((_, index) => (
					<button
						key={index}
						onClick={() => setActiveCase(index)}
						className={`rounded-md px-3 py-1 text-xs font-medium ${
							index === activeCase
								? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
								: 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
						}`}
					>
            Case {index + 1}
					</button>
				))}
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				<div>
					<p className="text-xs text-zinc-500 dark:text-zinc-400">Input</p>
					<pre className="mt-1 rounded-md bg-zinc-100 p-3 font-mono text-xs dark:bg-zinc-900">
						{testCase.input}
					</pre>
				</div>
				<div className="mt-3">
					<p className="text-xs text-zinc-500 dark:text-zinc-400">
            Expected Output
					</p>
					<pre className="mt-1 rounded-md bg-zinc-100 p-3 font-mono text-xs dark:bg-zinc-900">
						{testCase.expected}
					</pre>
				</div>
			</div>
		</div>
	);
}
