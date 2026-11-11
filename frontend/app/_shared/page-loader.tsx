'use client';
import { useEffect, useState } from 'react';
import { prefersReducedMotion } from './motion';

// How long each loader runs before it removes itself (matches the CSS in globals.css).
export const LOADER_MS = { katana: 2300, clash: 2700, pen: 1300 };

export type LoaderVariant = keyof typeof LOADER_MS;

function Wordmark({ className }: { className: string }) {
	return <span className={className}>Leet<span className="text-primary">Battle</span></span>;
}

// Home: the wordmark is sliced diagonally and the halves glide apart.
function Katana() {
	return (
		<>
			<div className="lb-k-backdrop" />
			<div className="lb-k-line lb-k-seam" />
			<div className="lb-k-halves">
				<div className="lb-k-part lb-k-part-top"><div className="lb-k-slip lb-k-slip-top"><div className="lb-k-piece lb-k-top"><Wordmark className="lb-k-word" /></div></div></div>
				<div className="lb-k-part lb-k-part-bottom"><div className="lb-k-slip lb-k-slip-bottom"><div className="lb-k-piece lb-k-bottom"><Wordmark className="lb-k-word" /></div></div></div>
			</div>
			<div className="lb-k-whole"><Wordmark className="lb-k-word lb-k-word-in" /></div>
			<div className="lb-k-line lb-k-track"><div className="lb-k-blade" /></div>
		</>
	);
}

// Lobby: the two team panels slam together, VS drops in, then they pull back.
function Clash() {
	return (
		<>
			<div className="lb-c-backdrop" />
			<div className="lb-c-stage">
				<div className="lb-c-panel lb-c-left">
					<div className="absolute left-[10vw] top-1/2 flex -translate-y-1/2 flex-col gap-3">
						<span className="font-mono text-[15px] font-semibold tracking-[0.2em] text-primary">TEAM 1</span>
						<span className="lb-c-word text-primary">Leet</span>
					</div>
				</div>
				<div className="lb-c-panel lb-c-right">
					<div className="absolute right-[10vw] top-1/2 flex -translate-y-1/2 flex-col items-end gap-3">
						<span className="font-mono text-[15px] font-semibold tracking-[0.2em] text-secondary">TEAM 2</span>
						<span className="lb-c-word text-secondary">Battle</span>
					</div>
				</div>
				<span className="lb-c-vs">VS</span>
			</div>
		</>
	);
}

// Sub pages: the wordmark draws in behind the pen tip, then the panel lifts.
function Pen() {
	return (
		<div className="lb-p-cover">
			<div className="relative">
				<Wordmark className="lb-p-word block text-[64px] font-black leading-none tracking-[-0.04em]" />
				<span className="lb-p-tip" />
			</div>
		</div>
	);
}

const SCENES: Record<LoaderVariant, () => React.JSX.Element> = { katana: Katana, clash: Clash, pen: Pen };

export default function PageLoader({ variant }: { variant: LoaderVariant }) {
	const [show, setShow] = useState(true);

	useEffect(() => {
		// Plays every time the page opens or refreshes, unless the user asked for less motion.
		if (prefersReducedMotion()) {
			setShow(false);
			return;
		}
		const timer = setTimeout(() => setShow(false), LOADER_MS[variant]);
		return () => clearTimeout(timer);
	}, [variant]);

	if (!show) {
		return null;
	}

	const Scene = SCENES[variant];
	return (
		<div data-loader={variant} aria-hidden="true" className="lb-loader pointer-events-none fixed inset-0 z-50 overflow-hidden text-ink">
			<Scene />
		</div>
	);
}
