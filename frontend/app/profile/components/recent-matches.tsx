'use client';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { RecentMatch } from '../../login/controller';

const DAY_MS = 24 * 60 * 60 * 1000;
const WORD = { W: 'Win', L: 'Loss', D: 'Draw' } as const;
// The line keeps this much room above and below, in px.
const PAD_Y = 14;
// Before the plot is measured (and in tests), it draws at this size.
const FALLBACK_SIZE = { w: 600, h: 120 };

// "+16", "−15" (a real minus sign) or "0".
export function signed(n: number): string {
	if (n > 0) return `+${n}`;
	return n < 0 ? `−${Math.abs(n)}` : '0';
}

// "today", "yesterday" or "3 days ago", by calendar day where the viewer is.
function when(playedAt: string): string {
	const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
	const days = Math.round((day(new Date()) - day(new Date(playedAt))) / DAY_MS);
	if (days <= 0) return 'today';
	return days === 1 ? 'yesterday' : `${days} days ago`;
}

const mode = (teamSize: number) => `${teamSize}v${teamSize}`;

// "3 wins in a row", "1 loss in a row", or "Last match a draw".
function streak(matches: RecentMatch[]): string {
	const kind = matches[matches.length - 1].result;
	if (kind === 'D') return 'Last match a draw';
	let run = 0;
	for (let i = matches.length - 1; i >= 0 && matches[i].result === kind; i--) run++;
	const word = kind === 'W' ? (run === 1 ? 'win' : 'wins') : (run === 1 ? 'loss' : 'losses');
	return `${run} ${word} in a row`;
}

// The plot's size in px, so the SVG draws 1:1 and strokes never stretch.
function useSize(ref: RefObject<HTMLDivElement | null>) {
	const [size, setSize] = useState(FALLBACK_SIZE);
	useEffect(() => {
		const el = ref.current;
		if (!el || typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect;
			if (width > 0 && height > 0) setSize({ w: width, h: height });
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, [ref]);
	return size;
}

// One match's segment as a Catmull-Rom curve (as a cubic Bezier) through the
// points on either side, so the whole line is smooth but each match can take
// its own colour.
function segment(points: [number, number][], i: number): string {
	const p0 = points[Math.max(i - 1, 0)];
	const p1 = points[i];
	const p2 = points[i + 1];
	const p3 = points[Math.min(i + 2, points.length - 1)];
	const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
	const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
	const f = (n: number) => n.toFixed(1);
	return `M${f(p1[0])} ${f(p1[1])} C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
}

// What each match is called, for its label and the tooltip.
const title = (m: RecentMatch) => `${WORD[m.result]} in ${mode(m.teamSize)}`;

// The rating over the matches: faint gridlines at round ratings with small
// labels on the left, a baseline from "10 matches ago" to "Now", the current
// rating at the right end, and no fill under the line. Each segment draws
// itself in, in turn, as the page opens; a match added later draws only its
// own. Hovering or focusing a match shows a guide line and a tooltip.
function RatingLine({ matches }: { matches: RecentMatch[] }) {
	const plot = useRef<HTMLDivElement>(null);
	const { w, h } = useSize(plot);
	const [active, setActive] = useState<number | null>(null);
	// When each segment (by match) starts drawing; the first ones in turn.
	const delays = useRef<Map<string, number> | null>(null);
	const first = delays.current === null;
	delays.current ??= new Map();

	const n = matches.length;
	const ratings = [matches[0].ratingAfter - matches[0].change, ...matches.map((m) => m.ratingAfter)];
	const top = Math.max(...ratings);
	const span = Math.max(top - Math.min(...ratings), 20);
	// A flat or short run sits in the middle of the plot.
	const lo = Math.min(...ratings) - (span - (top - Math.min(...ratings))) / 2;
	const X = (i: number) => (i / n) * w;
	const Y = (r: number) => PAD_Y + (1 - (r - lo) / span) * (h - PAD_Y * 2);
	const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;
	const points = ratings.map((r, i) => [X(i), Y(r)] as [number, number]);

	// Round ratings across the range for the gridlines.
	const step = Math.max(5, Math.ceil(span / 2 / 5) * 5);
	const grid: number[] = [];
	for (let v = Math.ceil(lo / step) * step; v <= lo + span; v += step) grid.push(v);

	const now = ratings[n];
	const shown = active === null ? null : matches[active];
	return (
		<div className="lb-pc-line">
			<div ref={plot} data-testid="form-plot" className="lb-pc-plot" onPointerLeave={() => setActive(null)}>
				{grid.map((v) => (
					<span key={v}>
						<span className="lb-pc-grid" style={{ top: pct(Y(v), h) }} />
						<span data-testid="form-ylab" className="lb-pc-ylab" style={{ top: pct(Y(v), h) }}>{v}</span>
					</span>
				))}
				<span className="lb-pc-grid lb-pc-base" />
				<span className="lb-pc-xlab">10 matches ago</span>
				<span className="lb-pc-xlab lb-pc-xlab-now">Now</span>
				<svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
					{active !== null && <line className="lb-pc-cursor" x1={X(active + 1)} x2={X(active + 1)} y1={0} y2={h} />}
					{matches.map((m, i) => {
						const key = `${m.playedAt}|${m.ratingAfter}|${m.result}`;
						if (!delays.current?.has(key)) delays.current?.set(key, first ? 0.7 + i * 0.09 : 0.1);
						return (
							<path
								key={key}
								className={`lb-pc-seg lb-pc-seg-draw ${m.result}`}
								d={segment(points, i)}
								pathLength={1}
								style={{ animationDelay: `${delays.current?.get(key)?.toFixed(2)}s` }}
							/>
						);
					})}
				</svg>
				<span data-testid="form-now" className="lb-pc-now" style={{ top: pct(Y(now), h) }}>{now}</span>
				<div role="list" aria-label="Rating over the last 10 matches" className="lb-pc-hits">
					{matches.map((m, i) => (
						<div
							key={`${m.playedAt}|${i}`}
							role="listitem"
							tabIndex={0}
							aria-label={`${title(m)}, ${signed(m.change)}, ${m.ratingAfter} rating, ${when(m.playedAt)}`}
							className="lb-pc-hit"
							style={{ left: pct(X(i), w), width: pct(X(1), w) }}
							onPointerEnter={() => setActive(i)}
							onFocus={() => setActive(i)}
							onBlur={() => setActive(null)}
						/>
					))}
				</div>
				{shown && active !== null && (
					<div role="tooltip" className="lb-pc-tip" style={{ left: pct(X(active + 1), w) }}>
						<b>{title(shown)} {signed(shown.change)}</b>
						<span>{shown.ratingAfter} rating, {when(shown.playedAt)}</span>
					</div>
				)}
			</div>
		</div>
	);
}

// US-7-T-5: the "Last 10 matches" section at the bottom of the profile: the
// streak and the net change, then the rating line (the one part of the right
// column that grows and shrinks with the window).
export default function RecentMatches({ matches = [] }: { matches?: RecentMatch[] }) {
	const net = matches.reduce((total, m) => total + m.change, 0);
	const tone = net > 0 ? 'lb-pc-up' : net < 0 ? 'lb-pc-down' : '';
	return (
		<section aria-label="Last 10 matches" className="lb-pc-form">
			<div className="lb-pc-form-head">
				<span className="lb-pc-cap">Last 10 matches</span>
				{matches.length > 0 && (
					<span className="lb-pc-form-sum">
						<span data-testid="form-streak">{streak(matches)}</span>
						<span data-testid="form-net">Net <b className={tone}>{signed(net)}</b></span>
					</span>
				)}
			</div>
			{matches.length > 0
				? <RatingLine matches={matches} />
				: <p className="lb-pc-form-empty">No ranked matches yet</p>}
		</section>
	);
}
