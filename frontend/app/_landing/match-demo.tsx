'use client';

import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

// US-5-T-14: a short looping match on the landing page. Both teams type the
// same problem; Team 1 is faster, submits, passes, scores 100 and wins, then
// it stays on "Team 1 wins" (US-5-T-18). Every step is a CSS keyframe in
// globals.css (lb-demo-*), run once on one 12s clock. Replay gives the demo a
// new key, so React mounts a fresh copy and every animation starts over.
// Each element's resting style is its finished state, which is what players
// who ask for reduced motion see.

type Token = [text: string, kind: 'kw' | 'plain'];

// The same problem for both teams. Indentation is part of the plain text.
const SOLUTION: Token[][] = [
	[['def', 'kw'], [' two_sum(nums, t):', 'plain']],
	[['    seen = {}', 'plain']],
	[['    ', 'plain'], ['for', 'kw'], [' i, n ', 'plain'], ['in', 'kw'], [' enumerate(nums):', 'plain']],
	[['        ', 'plain'], ['if', 'kw'], [' t - n ', 'plain'], ['in', 'kw'], [' seen:', 'plain']],
	[['            ', 'plain'], ['return', 'kw'], [' [seen[t - n], i]', 'plain']],
	[['        seen[n] = i', 'plain']],
];

// Team 2 is slower: by the time Team 1 wins it is still on line 4.
const TEAM_2: Token[][] = [
	...SOLUTION.slice(0, 3),
	[['        ', 'plain'], ['if', 'kw'], [' t - n', 'plain']],
];

const TESTS = ['case 1', 'case 2', 'hidden 6/6'];

// Runs one of the lb-demo-* keyframes on the shared 12s loop.
const loop = (name: string): CSSProperties => ({ animationName: name });

function Code({ lines, keyframes }: { lines: Token[][]; keyframes: string }) {
	return (
		<div className="lb-demo-loop min-h-[230px] flex-1 px-[22px] py-[18px] font-code text-sm leading-[26px] text-ink [font-variant-ligatures:none]" style={loop('lb-demo-fade')}>
			{lines.map((tokens, i) => (
				<span key={i} data-testid="code-line" className="lb-demo-line lb-demo-loop" style={loop(`lb-demo-${keyframes}${i + 1}`)}>
					{tokens.map(([text, kind], j) => (
						<span key={j} className={kind === 'kw' ? 'text-kw' : undefined}>{text}</span>
					))}
				</span>
			))}
		</div>
	);
}

function Panel({ team, nameColor, children, className = '', style }: { team: string; nameColor: string; children: ReactNode; className?: string; style?: CSSProperties }) {
	return (
		<section aria-label={team} className={`flex min-w-0 flex-[1_1_320px] flex-col ${className}`} style={style}>
			<h3 className={`m-0 border-b border-line px-[22px] py-3 text-[13px] font-bold ${nameColor}`}>{team}</h3>
			{children}
		</section>
	);
}

function Check() {
	return (
		<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
			<path d="M5 12l5 5 9-10" />
		</svg>
	);
}

export default function MatchDemo() {
	const [run, setRun] = useState(0);

	return (
		<div>
			<section key={run} aria-label="Demo of a match" className="lb-demo-tilt relative overflow-hidden rounded-[28px] border border-line bg-surface">
				<div className="flex items-center justify-between border-b border-line px-7 py-5 font-mono">
					<div className="flex flex-col gap-1">
						<span className="text-[11px] tracking-[0.16em] text-muted">TEAM 1</span>
						<span className="relative h-8 text-[26px] font-bold text-primary">
							<span className="lb-demo-loop absolute left-0 opacity-0" style={loop('lb-demo-s0')}>0</span>
							<span className="lb-demo-loop absolute left-0" style={loop('lb-demo-s100')}>100</span>
						</span>
					</div>
					<span className="text-2xl font-bold" aria-label="Match clock">29:41</span>
					<div className="flex flex-col items-end gap-1">
						<span className="text-[11px] tracking-[0.16em] text-muted">TEAM 2</span>
						<span className="text-[26px] font-bold text-secondary">0</span>
					</div>
				</div>

				<div className="flex flex-wrap">
					<Panel team="Team 1" nameColor="text-primary" className="border-r border-b border-line">
						<Code lines={SOLUTION} keyframes="l" />
						<div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line bg-raised px-[22px] py-3.5">
							<div className="flex gap-1.5 font-mono text-xs text-primary">
								{TESTS.map((label, i) => (
									<span key={label} data-testid="test-result" className="lb-demo-loop inline-flex items-center gap-[5px] rounded-lg border border-line px-[9px] py-1" style={loop(`lb-demo-t${i + 1}`)}>
										<Check />
										{label}
									</span>
								))}
							</div>
							<span className="lb-demo-loop inline-grid h-9 min-w-28 place-items-center rounded-[10px] bg-primary text-sm font-bold text-on-primary" style={loop('lb-demo-press')} aria-hidden="true">
								<span className="lb-demo-loop opacity-0 [grid-area:1/1]" style={loop('lb-demo-submit')}>Submit</span>
								<span className="lb-demo-loop opacity-0 [grid-area:1/1]" style={loop('lb-demo-running')}>Running</span>
								<span className="lb-demo-loop [grid-area:1/1]" style={loop('lb-demo-passed')}>Passed</span>
							</span>
						</div>
					</Panel>

					<Panel team="Team 2" nameColor="text-secondary" className="lb-demo-loop" style={loop('lb-demo-dim')}>
						<Code lines={TEAM_2} keyframes="r" />
						<div className="flex justify-end border-t border-line bg-raised px-[22px] py-3.5">
							<span className="inline-grid h-9 min-w-28 place-items-center rounded-[10px] border border-line text-sm font-bold text-muted" aria-hidden="true">Submit</span>
						</div>
					</Panel>
				</div>

				<div className="pointer-events-none absolute inset-0 grid place-items-center">
					<span className="lb-demo-loop text-[56px] font-extrabold leading-none tracking-[-0.04em] text-primary" style={loop('lb-demo-win')}>Team 1 wins</span>
				</div>
			</section>
			<div className="mt-4 flex justify-center">
				<button type="button" onClick={() => setRun((n) => n + 1)} className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm text-muted hover:bg-raised hover:text-ink">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						<path d="M3 12a9 9 0 1 0 3-6.7" />
						<path d="M3 4v5h5" />
					</svg>
				Replay
				</button>
			</div>
		</div>
	);
}
