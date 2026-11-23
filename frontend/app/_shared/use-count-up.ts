'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './motion';

// Counts from 0 up to `target`: waits `delayMs`, then eases out over
// `durationMs`. With reduced motion it is just `target` from the start.
export function useCountUp(target: number, delayMs: number, durationMs: number) {
	const [reduced] = useState(prefersReducedMotion);
	const [value, setValue] = useState(reduced ? target : 0);

	useEffect(() => {
		if (reduced) {
			setValue(target);
			return;
		}
		let frame = 0;
		const start = performance.now() + delayMs;
		const tick = (now: number) => {
			const progress = Math.min(1, Math.max(0, (now - start) / durationMs));
			setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
			if (progress < 1) {
				frame = requestAnimationFrame(tick);
			}
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [reduced, target, delayMs, durationMs]);

	return value;
}

// Counts from whatever it last showed to a new `target` over `durationMs`,
// easing out. The first value is `target` itself (no count on page load),
// and with reduced motion every new target just shows at once.
export function useCountTo(target: number, durationMs: number) {
	const [reduced] = useState(prefersReducedMotion);
	const [value, setValue] = useState(target);
	const shown = useRef(target);

	useEffect(() => {
		const from = shown.current;
		if (reduced || from === target) {
			shown.current = target;
			setValue(target);
			return;
		}
		let frame = 0;
		const start = performance.now();
		const tick = (now: number) => {
			const progress = Math.min(1, Math.max(0, (now - start) / durationMs));
			const next = Math.round(from + (target - from) * (1 - Math.pow(1 - progress, 3)));
			shown.current = next;
			setValue(next);
			if (progress < 1) {
				frame = requestAnimationFrame(tick);
			}
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [reduced, target, durationMs]);

	return value;
}
