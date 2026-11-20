import Link from 'next/link';

// The landing page's closing call to action. It comes into focus as it
// scrolls in (lb-reveal-view in globals.css).
export default function YourMove() {
	return (
		<section className="lb-reveal-view flex flex-col items-center gap-8 px-8 pt-10 pb-28 text-center">
			<h2 className="m-0 text-[clamp(56px,8vw,120px)] font-extrabold leading-[0.95] tracking-[-0.05em]">Your move</h2>
			<Link href="/login" className="inline-flex h-[60px] items-center gap-2.5 rounded-[18px] bg-primary px-9 text-lg font-bold text-on-primary hover:opacity-90">
				Play
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
					<path d="M5 12h14M13 6l6 6-6 6" />
				</svg>
			</Link>
		</section>
	);
}
