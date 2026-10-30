'use client';

import { useEffect, useState, type CSSProperties } from 'react';

type TokenKind = 'kw' | 'fn' | 'num' | 'plain';
type Token = [text: string, kind: TokenKind];

// The solution the demo "types". Indentation is part of the plain tokens.
const SOLUTION: Token[][] = [
	[['def ', 'kw'], ['merge', 'fn'], ['(intervals):', 'plain']],
	[['    intervals.', 'plain'], ['sort', 'fn'], ['(key=', 'plain'], ['lambda', 'kw'], [' x: x[', 'plain'], ['0', 'num'], ['])', 'plain']],
	[['    out = []', 'plain']],
	[['    ', 'plain'], ['for', 'kw'], [' s, e ', 'plain'], ['in', 'kw'], [' intervals:', 'plain']],
	[['        ', 'plain'], ['if', 'kw'], [' out ', 'plain'], ['and', 'kw'], [' s <= out[-', 'plain'], ['1', 'num'], ['][', 'plain'], ['1', 'num'], [']:', 'plain']],
	[['            out[-', 'plain'], ['1', 'num'], ['][', 'plain'], ['1', 'num'], ['] = ', 'plain'], ['max', 'fn'], ['(out[-', 'plain'], ['1', 'num'], ['][', 'plain'], ['1', 'num'], ['], e)', 'plain']],
	[['        ', 'plain'], ['else', 'kw'], [':', 'plain']],
	[['            out.append([s, e])', 'plain']],
	[['    ', 'plain'], ['return', 'kw'], [' out', 'plain']],
];

const TOKEN_CLASS: Record<TokenKind, string> = {
	kw: 'text-kw',
	fn: 'text-ink',
	num: 'text-num',
	plain: 'text-muted',
};

const TESTS = ['case 1', 'case 2', 'case 3', 'hidden 6/6'];

const CYCLE_SECONDS = 18; // 4s countdown + 14s of play
const COUNTDOWN_SECONDS = 4; // 3, 2, 1, LeetBattle!
const MATCH_SECONDS = 30 * 60;

// Typing schedule: each line starts after the previous one finishes.
const CHAR_SECONDS = 0.022;
const LINES = (() => {
	let at = 0.3;
	return SOLUTION.map((tokens, i) => {
		const length = tokens.reduce((n, [text]) => n + text.length, 0);
		const duration = Math.max(0.25, length * CHAR_SECONDS);
		const line = { n: i + 1, tokens, length, duration, delay: at };
		at += duration + 0.12;
		return line;
	});
})();
const TYPING_DONE = LINES[LINES.length - 1].delay + LINES[LINES.length - 1].duration;

function formatClock(seconds: number) {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function cssVars(vars: Record<string, string | number>) {
	return vars as CSSProperties;
}

export default function LiveDemo() {
	// Seconds since the demo started; negative while the page intro plays.
	const [tick, setTick] = useState(-3);

	useEffect(() => {
		const timer = setInterval(() => setTick((t) => t + 1), 1000);
		return () => clearInterval(timer);
	}, []);

	const phase = tick < 0 ? -1 : tick % CYCLE_SECONDS;
	const cycle = tick < 0 ? 0 : Math.floor(tick / CYCLE_SECONDS);
	const playing = phase >= COUNTDOWN_SECONDS;
	const played = playing ? phase - COUNTDOWN_SECONDS : 0;
	const ourScore = playing && played >= Math.ceil(TYPING_DONE + 1.6) ? 200 : 0;
	const theirScore = playing && played >= 3 ? 100 : 0;

	return (
		<div className="overflow-hidden rounded-[20px] border border-line bg-surface">
			<div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
				<Score label="Your team" value={ourScore} className="text-primary" />
				<span className="font-mono text-lg font-bold tabular-nums" aria-label="Match clock">
					{formatClock(MATCH_SECONDS - played)}
				</span>
				<Score label="Opponents" value={theirScore} className="text-secondary" align="end" />
			</div>

			<div
				className="relative min-h-[206px] overflow-x-auto py-3.5 pr-5 font-code text-[13px] leading-[19px] text-muted [font-variant-ligatures:none]"
				aria-label="Live demo of a match"
			>
				{playing ? (
					<div key={`code-${cycle}`}>
						{LINES.map((line, i) => {
							const isLast = i === LINES.length - 1;
							return (
								<div key={line.n} className={`flex h-[19px] items-center ${isLast ? 'bg-raised' : ''}`}>
									<span className="w-14 flex-none pr-[22px] text-right opacity-55">{line.n}</span>
									<span
										className="lb-type"
										style={cssVars({ '--steps': line.length, '--dur': `${line.duration}s`, '--d': `${line.delay}s` })}
									>
										{line.tokens.map(([text, kind], j) => (
											<span key={j} className={TOKEN_CLASS[kind]}>{text}</span>
										))}
									</span>
									{isLast && <span className="lb-caret" style={cssVars({ '--d': `${line.delay + line.duration}s` })} />}
								</div>
							);
						})}
					</div>
				) : (
					<Countdown phase={phase} />
				)}
			</div>

			<div className="flex min-h-[58px] flex-wrap items-center gap-2 border-t border-line bg-raised px-5 py-3.5 font-mono text-xs">
				{playing ? (
					TESTS.map((label, i) => (
						<span
							key={`${cycle}-${label}`}
							className="lb-tick inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-primary"
							style={cssVars({ '--d': `${TYPING_DONE + 0.4 + i * 0.3}s` })}
						>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
								<path d="M5 12l5 5 9-10" />
							</svg>
							{label}
						</span>
					))
				) : (
					<span className="text-muted">merge_intervals.py · Python</span>
				)}
			</div>
		</div>
	);
}

function Score({ label, value, className, align = 'start' }: { label: string; value: number; className: string; align?: 'start' | 'end' }) {
	return (
		<div className={`flex flex-col gap-0.5 ${align === 'end' ? 'items-end' : 'items-start'}`}>
			<span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
			<span key={value} className={`lb-pop font-mono text-[22px] font-bold tabular-nums ${className}`}>{value}</span>
		</div>
	);
}

function Countdown({ phase }: { phase: number }) {
	return (
		<div className="absolute inset-0 flex items-center justify-center bg-surface">
			{phase < 0 && (
				<span className="font-mono text-[13px] font-medium tracking-[0.24em] text-muted">MATCH STARTING</span>
			)}
			{phase >= 0 && phase <= 2 && (
				<span key={phase} className="lb-count font-mono text-[120px] font-extrabold leading-none text-ink">
					{3 - phase}
				</span>
			)}
			{phase === 3 && (
				<div className="relative">
					<span className="lb-wipe block text-[64px] font-black leading-none tracking-[-0.03em]" style={cssVars({ '--dur': '0.7s', '--d': '0s' })}>
						Leet<span className="text-primary">Battle!</span>
					</span>
					<span className="lb-tip" style={cssVars({ '--dur': '0.7s', '--d': '0s' })} />
				</div>
			)}
		</div>
	);
}
