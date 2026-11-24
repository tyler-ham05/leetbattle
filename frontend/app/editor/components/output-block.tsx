import type { ReactNode } from 'react';

// A small label over a raised mono block: how the test cases panel and the
// submission result show inputs, expected values and the player's output.
// Long output scrolls inside the block (US-8-T-3) instead of stretching the page.
export default function OutputBlock({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
	return (
		<div className={className}>
			<p className="text-xs text-muted">{label}</p>
			<pre className="mt-1 max-h-48 overflow-x-auto overflow-y-auto rounded-md bg-raised p-3 font-mono text-xs">{children}</pre>
		</div>
	);
}

// A test case's stdout and stderr, each in its own block (US-8-T-3). A block
// only appears when its stream has output, and an errored case's stderr is
// left out because the "Error" block already shows it.
export function CaseOutputBlocks({ stdout, stderr, errored = false }: { stdout?: string; stderr?: string; errored?: boolean }) {
	return (
		<>
			{stdout && <OutputBlock label="Stdout" className="mt-3">{stdout}</OutputBlock>}
			{stderr && !errored && <OutputBlock label="Stderr" className="mt-3">{stderr}</OutputBlock>}
		</>
	);
}

// Verdicts where the code didn't produce an answer to compare: it crashed, ran
// out of time, or printed too much.
export const isErrorVerdict = (verdict: string) => verdict !== 'Accepted' && verdict !== 'Wrong Answer';
