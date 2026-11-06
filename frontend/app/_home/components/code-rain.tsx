'use client';
import { useEffect, useState, type CSSProperties } from 'react';

// Pieces of solutions that fall behind the home menu.
const SNIPPETS = [
	'O(n log n)', 'return dp[n]', '{ }', 'while lo <= hi:', '=>', 'O(1)', 'def solve():', '[i, j]',
	'seen = set()', '</>', 'O(n)', '✓ 6/6', 'for i in range(n):', '&&',
];

const COLORS = ['text-primary', 'text-ink', 'text-muted', 'text-kw'];

// Most fall straight; some tilt up to 32 degrees and slide that way as they fall.
const ANGLES = [0, 0, -32, 32, -18, 14, 0, -32, 24, 32, -10, 0];

// Seeded random numbers: the layout looks random but is identical on the server
// and in the browser, so React doesn't see a mismatch when the page loads.
function seeded(seed: number) {
	let value = seed;
	return () => {
		value = (value * 9301 + 49297) % 233280;
		return value / 233280;
	};
}

const rand = seeded(7);
const DROPS = SNIPPETS.map((text) => {
	const angle = ANGLES[Math.floor(rand() * ANGLES.length)];
	const duration = 22 + rand() * 22;
	return {
		text,
		color: COLORS[Math.floor(rand() * COLORS.length)],
		left: rand() * 94,
		top: rand() * 90, // only used when motion is off, to spread the snippets out
		size: Math.round(12 + rand() * 16),
		opacity: 0.05 + rand() * 0.06,
		angle,
		drift: Math.round(-Math.tan((angle * Math.PI) / 180) * 520),
		duration,
		delay: -rand() * duration,
	};
});

function prefersReducedMotion() {
	return typeof window !== 'undefined'
		&& typeof window.matchMedia === 'function'
		&& window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function CodeRain() {
	// Start animated (what the server renders), then honour the user's setting.
	const [animated, setAnimated] = useState(true);

	useEffect(() => {
		setAnimated(!prefersReducedMotion());
	}, []);

	return (
		<div data-code-rain aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
			{DROPS.map((drop) => (
				<span
					key={drop.text}
					data-snippet
					data-animated={animated ? 'true' : 'false'}
					className={`lb-fall absolute whitespace-nowrap font-mono font-bold [font-variant-ligatures:none] ${drop.color}`}
					style={{
						left: `${drop.left}%`,
						top: animated ? 0 : `${drop.top}%`,
						fontSize: drop.size,
						opacity: drop.opacity,
						'--rot': `${drop.angle}deg`,
						'--dx': `${drop.drift}px`,
						'--dur': `${drop.duration}s`,
						'--d': `${drop.delay}s`,
					} as CSSProperties}
				>
					{drop.text}
				</span>
			))}
		</div>
	);
}
