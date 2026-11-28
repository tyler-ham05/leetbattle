'use client';
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../_shared/motion';

// Onest's digit widths in em, used until the real ones are measured (and in
// tests, where nothing has a size). A "1" is much narrower than an "8".
const FALLBACK_WIDTHS = [0.62, 0.42, 0.57, 0.58, 0.6, 0.57, 0.6, 0.53, 0.6, 0.6];
// When the digits start rolling, after the card has landed.
const ROLL_AT_MS = 450;

// Each digit's natural width in `el`'s font, in em, or null if nothing measures.
function measure(el: HTMLElement): number[] | null {
	const probe = document.createElement('span');
	probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
	el.appendChild(probe);
	const size = parseFloat(getComputedStyle(el).fontSize) || 16;
	const widths = Array.from({ length: 10 }, (_, n) => {
		probe.textContent = String(n);
		return probe.getBoundingClientRect().width / size;
	});
	probe.remove();
	return widths.every((w) => w > 0.05) ? widths : null;
}

// The rating as an odometer: each digit is a column of 0-9 that rolls to its
// number. Every slot is as wide as its own digit, so proportional digits never
// look unevenly spaced. Hidden from screen readers; the page says the number.
export default function Odometer({ value, className = '' }: { value: number; className?: string }) {
	const ref = useRef<HTMLSpanElement>(null);
	const [widths, setWidths] = useState(FALLBACK_WIDTHS);
	const [rolled, setRolled] = useState(prefersReducedMotion);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		let live = true;
		const update = () => {
			const measured = live ? measure(el) : null;
			if (measured) setWidths(measured);
		};
		update();
		void document.fonts?.ready.then(update);
		const timer = setTimeout(() => setRolled(true), ROLL_AT_MS);
		return () => {
			live = false;
			clearTimeout(timer);
		};
	}, []);

	return (
		<span ref={ref} data-testid="odometer" aria-hidden="true" className={`lb-pc-odo ${className}`}>
			{String(Math.max(0, Math.round(value))).split('').map((digit, i) => (
				<span key={i} className="lb-pc-odo-col" style={{ width: `${widths[Number(digit)].toFixed(3)}em` }}>
					<span className="lb-pc-odo-strip" style={{ transform: `translateY(${rolled ? -Number(digit) : 0}em)` }}>
						{Array.from({ length: 10 }, (_, n) => <span key={n}>{n}</span>)}
					</span>
				</span>
			))}
		</span>
	);
}
