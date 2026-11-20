'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// Only the first tooltip waits. While one is open, or just after one closes,
// the next shows at once, so moving along a row of icons reads them instantly.
const DELAY_MS = 500;
const WARM_MS = 300;

let openCount = 0;
let lastClosedAt = -Infinity;

function isWarm() {
	const sinceClose = Date.now() - lastClosedAt;
	return openCount > 0 || (sinceClose >= 0 && sinceClose < WARM_MS);
}

export default function Tooltip({ label, children }: { label: string; children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const [instant, setInstant] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isOpen = useRef(false);

	const markOpen = (now: boolean) => {
		if (isOpen.current) return;
		isOpen.current = true;
		openCount++;
		setInstant(now);
		setOpen(true);
	};
	const show = () => {
		if (timer.current) clearTimeout(timer.current);
		if (isWarm()) {
			markOpen(true);
		} else {
			timer.current = setTimeout(() => markOpen(false), DELAY_MS);
		}
	};
	const hide = () => {
		if (timer.current) clearTimeout(timer.current);
		timer.current = null;
		if (!isOpen.current) return;
		isOpen.current = false;
		openCount--;
		lastClosedAt = Date.now();
		setOpen(false);
	};

	// Unmounting while open still counts as closing.
	useEffect(() => hide, []);

	return (
		<span className="relative inline-flex" onPointerEnter={show} onPointerLeave={hide} onFocus={show} onBlur={hide}>
			{children}
			{open && (
				<span
					role="tooltip"
					data-instant={String(instant)}
					className="lb-tooltip pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 origin-top whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
				>
					{label}
				</span>
			)}
		</span>
	);
}
