import Link from 'next/link';

// US-5-T-15: short statements that explain the game as the player scrolls.
// The motion is CSS only (lb-scroll-* in globals.css): each statement comes
// into focus in the middle of the screen, and the clock's hand turns a full
// circle as the player scrolls past it. Browsers without scroll-driven
// animations, and players who ask for reduced motion, get the same sections
// standing still.

const STATEMENT = 'm-0 text-[clamp(64px,10vw,150px)] font-extrabold leading-[0.95] tracking-[-0.05em]';

// The 12 hour marks around the clock face, as [x1, y1, x2, y2] on a 340 box.
const TICKS = Array.from({ length: 12 }, (_, i) => {
	const angle = (i * Math.PI) / 6;
	const point = (r: number) => [170 + r * Math.sin(angle), 170 - r * Math.cos(angle)];
	return [...point(140), ...point(124)];
});

function Dots({ color, side }: { color: string; side: 'left' | 'right' }) {
	// Two players, and a dashed third: a team has one to three players.
	return (
		<div className={`flex gap-3.5 lb-scroll-${side}`}>
			<span className={`size-[30px] rounded-full ${color}`} />
			<span className={`size-[30px] rounded-full ${color}`} />
			<span className={`size-[30px] rounded-full border-2 border-dashed ${color.replace('bg-', 'border-')}`} />
		</div>
	);
}

export default function ScrollSections() {
	return (
		<div data-testid="scroll-sections">
			<div data-testid="scroll-progress" aria-hidden="true" className="lb-scroll-track fixed inset-x-0 top-0 z-40 h-[3px] bg-surface">
				<div className="lb-scroll-bar h-full bg-primary" />
			</div>

			<section className="mx-auto flex h-[440px] max-w-[1080px] flex-col items-start justify-center gap-10 px-8">
				<h2 className={`lb-scroll-word text-left ${STATEMENT}`}>Two teams</h2>
				<div data-testid="team-dots" aria-hidden="true" className="flex items-center gap-14">
					<Dots color="bg-primary" side="left" />
					<Dots color="bg-secondary" side="right" />
				</div>
				<span className="font-mono text-[15px] tracking-[0.12em] text-muted">1v1 · 2v2 · 3v3</span>
			</section>

			<section className="mx-auto flex h-[420px] max-w-[1080px] flex-col items-end justify-center gap-9 px-8">
				<h2 className={`lb-scroll-word text-right ${STATEMENT}`}>Same problems</h2>
				<div className="flex flex-wrap justify-end gap-3 font-mono text-[15px] font-semibold">
					<span data-testid="difficulty" className="rounded-xl border border-line px-[18px] py-2.5 text-green-600 dark:text-green-400">Easy</span>
					<span data-testid="difficulty" className="rounded-xl border border-line px-[18px] py-2.5 text-yellow-600 dark:text-yellow-400">Medium</span>
					<span data-testid="difficulty" className="rounded-xl border border-line px-[18px] py-2.5 text-red-600 dark:text-red-400">Hard</span>
				</div>
			</section>

			<section aria-label="Thirty minutes on the clock" className="lb-scroll-clock">
				<div className="lb-scroll-clock-pin flex h-[640px] flex-col items-center justify-center gap-8 px-8">
					<div data-testid="clock-face" aria-hidden="true" className="relative size-[340px] max-sm:scale-75">
						<div className="lb-scroll-arc absolute inset-0 rounded-full" />
						<svg className="absolute inset-0" width="340" height="340" viewBox="0 0 340 340">
							<g className="stroke-line" strokeWidth="3" strokeLinecap="round">
								{TICKS.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
							</g>
						</svg>
						<div className="lb-scroll-hand absolute inset-0">
							<span className="absolute left-[167px] top-[58px] h-[116px] w-1.5 rounded-[3px] bg-ink" />
						</div>
						<span className="absolute left-[158px] top-[158px] size-6 rounded-full bg-primary" />
					</div>
					<span className="lb-scroll-done text-xl text-muted">Every second counts</span>
				</div>
			</section>

			<section className="flex h-[400px] items-center justify-center px-8">
				<h2 className={`lb-scroll-word text-center text-primary ${STATEMENT}`}>One winner</h2>
			</section>

			<section className="flex flex-col items-center gap-8 px-8 pt-10 pb-28 text-center">
				<h2 className="m-0 text-[clamp(56px,8vw,120px)] font-extrabold leading-[0.95] tracking-[-0.05em]">Your move</h2>
				<Link href="/login" className="inline-flex h-[60px] items-center gap-2.5 rounded-[18px] bg-primary px-9 text-lg font-bold text-on-primary hover:opacity-90">
					Play
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						<path d="M5 12h14M13 6l6 6-6 6" />
					</svg>
				</Link>
			</section>
		</div>
	);
}
