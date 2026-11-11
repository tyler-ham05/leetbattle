'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { prefersReducedMotion } from '../../_shared/motion';

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

// How close (in pixels) the cursor has to come before it pushes a snippet.
const REACH = 140;

// One snippet's push away from its spot on the fall: offset, speed and spin.
interface Kick { x: number; y: number; vx: number; vy: number; spin: number; vspin: number }

function moveKicked(el: HTMLElement, kick: Kick) {
	el.style.transform = `translate(${kick.x.toFixed(1)}px, ${kick.y.toFixed(1)}px) rotate(${kick.spin.toFixed(1)}deg)`;
}

// Lets the cursor knock snippets around: they fly off, spin, slow down and stay put.
function useCursorKicks(enabled: boolean) {
	const els = useRef<(HTMLElement | null)[]>([]);

	useEffect(() => {
		if (!enabled) {
			return;
		}
		const kicks: Kick[] = DROPS.map(() => ({ x: 0, y: 0, vx: 0, vy: 0, spin: 0, vspin: 0 }));
		let last: { x: number; y: number } | null = null;
		let frame = 0;

		// Each frame the push slows down; the snippet keeps falling from wherever it ends up.
		const step = () => {
			let moving = false;
			kicks.forEach((kick, i) => {
				kick.vx *= 0.92;
				kick.vy *= 0.92;
				kick.vspin *= 0.92;
				kick.x += kick.vx;
				kick.y += kick.vy;
				kick.spin += kick.vspin;
				const el = els.current[i];
				if (el) {
					moveKicked(el, kick);
				}
				moving ||= Math.abs(kick.vx) + Math.abs(kick.vy) + Math.abs(kick.vspin) > 0.05;
			});
			frame = moving ? requestAnimationFrame(step) : 0;
		};

		const onMove = (e: MouseEvent) => {
			// A fast swipe kicks harder than a slow hover.
			const speed = last ? Math.hypot(e.clientX - last.x, e.clientY - last.y) : 0;
			last = { x: e.clientX, y: e.clientY };
			els.current.forEach((el, i) => {
				if (!el) {
					return;
				}
				const box = el.getBoundingClientRect();
				const dx = box.left + box.width / 2 - e.clientX;
				const dy = box.top + box.height / 2 - e.clientY;
				const distance = Math.hypot(dx, dy) || 1;
				if (distance > REACH) {
					return;
				}
				const push = (1 - distance / REACH) * (4 + Math.min(speed, 60) * 0.35);
				const kick = kicks[i];
				kick.vx += (dx / distance) * push;
				kick.vy += (dy / distance) * push;
				kick.vspin += (dx >= 0 ? 1 : -1) * push * 0.8;
				kick.x += kick.vx;
				kick.y += kick.vy;
				moveKicked(el, kick);
			});
			if (!frame) {
				frame = requestAnimationFrame(step);
			}
		};

		window.addEventListener('mousemove', onMove);
		return () => {
			window.removeEventListener('mousemove', onMove);
			cancelAnimationFrame(frame);
		};
	}, [enabled]);

	return els;
}

export default function CodeRain() {
	// Start animated (what the server renders), then honour the user's setting.
	const [animated, setAnimated] = useState(true);
	const kickable = useCursorKicks(animated);

	useEffect(() => {
		setAnimated(!prefersReducedMotion());
	}, []);

	return (
		<div data-code-rain aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
			{DROPS.map((drop, i) => (
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
					<span
						data-kick
						ref={(el) => {
							kickable.current[i] = el;
						}}
						className="inline-block"
					>
						{drop.text}
					</span>
				</span>
			))}
		</div>
	);
}
