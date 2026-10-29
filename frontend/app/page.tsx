import Link from 'next/link';
import Intro from './components/intro';
import LiveDemo from './components/live-demo';
import ThemeControls from './components/theme-controls';

const STEPS = [
	{ n: '01', title: 'Queue up', body: 'Join ranked matchmaking or share a room code with friends. Six players, two teams, one problem set.' },
	{ n: '02', title: 'Solve together', body: 'Write code in the browser IDE, watch your teammates live, and comment directly on their lines.' },
	{ n: '03', title: 'Climb the ranks', body: 'Hidden tests grade every submission. The higher team score wins, and your rating moves with each match.' },
];

const MODES = [
	{ name: 'Team 3v3', desc: 'Highest team score when time runs out wins.', live: true },
	{ name: 'Duel 1v1', desc: 'Coming soon.', live: false },
	{ name: 'Sudden death', desc: 'Coming soon.', live: false },
	{ name: 'Relay', desc: 'Coming soon.', live: false },
];

function Wordmark() {
	return <>Leet<span className="text-primary">Battle</span></>;
}

export default function Home() {
	return (
		<div className="relative flex-1 overflow-hidden">
			<Intro />

			<div className="mx-auto max-w-[1180px] px-6 sm:px-8">
				<nav className="flex flex-wrap items-center justify-between gap-4 py-7">
					<Link href="/" className="text-xl font-extrabold tracking-[-0.02em]">
						<Wordmark />
					</Link>
					<div className="flex flex-wrap items-center gap-6 text-[15px] text-muted">
						<a href="#how" className="hidden hover:text-ink md:inline">How it works</a>
						<a href="#modes" className="hidden hover:text-ink md:inline">Modes</a>
						<Link href="/editor" className="hidden hover:text-ink md:inline">Practice</Link>
						<ThemeControls />
						<Link href="/login" className="inline-flex h-11 items-center rounded-xl bg-ink px-[18px] font-bold text-page hover:opacity-85">
							Sign in
						</Link>
					</div>
				</nav>

				<section className="flex flex-wrap items-center gap-16 pt-16 pb-12 sm:pt-22">
					<div className="flex min-w-0 flex-[1_1_520px] flex-col gap-7">
						<h1 className="lb-reveal m-0 text-[clamp(42px,4.8vw,68px)] font-extrabold leading-[1.02] tracking-[-0.035em]">
							Practice under pressure.
							<br />
							<span className="text-primary">Win as a team.</span>
						</h1>
						<p className="lb-reveal m-0 max-w-[480px] text-lg leading-relaxed text-muted" style={{ '--d': '0.15s' } as React.CSSProperties}>
							Two teams of three solve the same coding problems in a shared browser IDE. Watch your teammates&apos; code, leave comments, and submit before time runs out.
						</p>
						<div className="lb-reveal flex flex-wrap gap-3" style={{ '--d': '0.3s' } as React.CSSProperties}>
							<Link href="/lobby" className="inline-flex h-[54px] items-center gap-2.5 rounded-[14px] bg-primary px-[26px] text-base font-bold text-on-primary hover:opacity-90">
								Find a match
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
									<path d="M5 12h14M13 6l6 6-6 6" />
								</svg>
							</Link>
							<Link href="/lobby?private=1" className="inline-flex h-[54px] items-center rounded-[14px] border border-line px-6 text-base font-semibold hover:bg-raised">
								Create private lobby
							</Link>
						</div>
					</div>

					<div className="lb-reveal min-w-0 flex-[1_1_480px]" style={{ '--d': '0.2s' } as React.CSSProperties}>
						<LiveDemo />
					</div>
				</section>

				<div className="flex flex-col items-center gap-2.5 pt-8 pb-18 font-mono text-[11px] tracking-[0.3em] text-muted" aria-hidden="true">
					SCROLL
					<span className="lb-cue h-[46px] w-px bg-primary" />
				</div>

				<section id="how" className="flex flex-col gap-10 pt-10 pb-22">
					<h2 className="m-0 text-[40px] font-extrabold leading-none tracking-[-0.03em]">How it works</h2>
					<div className="grid gap-10 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
						{STEPS.map((step) => (
							<div key={step.n} className="flex flex-col gap-3 border-t border-line pt-[22px]">
								<span className="font-mono text-[13px] font-semibold text-primary">{step.n}</span>
								<h3 className="m-0 text-[22px] font-bold">{step.title}</h3>
								<p className="m-0 text-[15px] leading-relaxed text-muted">{step.body}</p>
							</div>
						))}
					</div>
				</section>

				<section id="modes" className="flex flex-col gap-10 pt-6 pb-24">
					<h2 className="m-0 text-[40px] font-extrabold leading-none tracking-[-0.03em]">Modes</h2>
					<div className="grid gap-10 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
						{MODES.map((mode) => (
							<div key={mode.name} className={`flex flex-col gap-2.5 border-t pt-[22px] ${mode.live ? 'border-primary' : 'border-line'}`}>
								<h3 className={`m-0 text-[22px] font-bold ${mode.live ? 'text-ink' : 'text-muted'}`}>{mode.name}</h3>
								<p className="m-0 text-[15px] leading-relaxed text-muted">{mode.desc}</p>
							</div>
						))}
					</div>
				</section>

				<footer className="flex flex-wrap justify-between gap-4 border-t border-line pt-7 pb-10 text-sm text-muted">
					<span><Wordmark /></span>
					<span>UC Santa Cruz · Baskin Engineering</span>
				</footer>
			</div>
		</div>
	);
}
