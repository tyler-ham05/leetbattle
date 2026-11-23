import type { ReactNode } from 'react';

// A small label over a raised mono block: how the test cases panel and the
// submission result show inputs, expected values and the player's output.
export default function OutputBlock({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
	return (
		<div className={className}>
			<p className="text-xs text-muted">{label}</p>
			<pre className="mt-1 overflow-x-auto rounded-md bg-raised p-3 font-mono text-xs">{children}</pre>
		</div>
	);
}
