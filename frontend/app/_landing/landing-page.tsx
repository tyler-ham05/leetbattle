import Link from 'next/link';
import HomeNav from '../_shared/home-nav';
import Wordmark from '../_shared/wordmark';
import MatchDemo from './match-demo';
import ScrollSections from './scroll-sections';

export default function LandingPage() {
	return (
		// US-5-T-18: no full-screen intro here, so nothing waits for it: the
		// wordmark draws in right away.
		<div className="relative flex-1 overflow-x-clip" style={{ '--lb-intro-delay': '0.1s' } as React.CSSProperties}>

			<div className="mx-auto max-w-[1180px] px-6 sm:px-8">
				<nav className="flex flex-wrap items-center justify-between gap-4 py-7">
					<Link href="/" className="text-xl font-extrabold tracking-[-0.02em]">
						<Wordmark />
					</Link>
					<div className="flex flex-wrap items-center gap-6 text-[15px] text-muted">
						<HomeNav />
					</div>
				</nav>

				{/* US-5-T-14: the wordmark draws in behind the page loader's pen tip, which
				    then stays after it as a blinking cursor (lb-hero-* in globals.css). */}
				<section className="flex flex-col items-center gap-7 pt-16 pb-12 text-center sm:pt-22">
					<h1 className="relative m-0 text-[clamp(64px,10vw,140px)] font-black leading-none tracking-[-0.04em]">
						<span className="lb-hero-word block">Leet<span className="text-primary">Battle</span></span>
						<span data-testid="pen-tip" aria-hidden="true" className="lb-hero-tip" />
					</h1>
					<p className="lb-reveal m-0 text-xl text-muted" style={{ '--d': '0.6s' } as React.CSSProperties}>
						Team coding battles, live in your browser
					</p>
					<Link href="/login" className="lb-reveal inline-flex h-[54px] items-center gap-2.5 rounded-[14px] bg-primary px-8 text-base font-bold text-on-primary hover:opacity-90" style={{ '--d': '0.75s' } as React.CSSProperties}>
						Play
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
							<path d="M5 12h14M13 6l6 6-6 6" />
						</svg>
					</Link>
				</section>

				<div className="mx-auto max-w-[1100px] pt-6 pb-20">
					<MatchDemo />
				</div>

				<ScrollSections />

				<footer className="flex flex-wrap justify-between gap-4 border-t border-line pt-7 pb-10 text-sm text-muted">
					<span><Wordmark /></span>
					<span>UC Santa Cruz · Baskin Engineering</span>
				</footer>
			</div>
		</div>
	);
}
