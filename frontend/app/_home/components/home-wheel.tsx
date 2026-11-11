'use client';
import { useRef, type CSSProperties, type WheelEvent } from 'react';
import { MENU } from './home-menu';

// How many options sit on each side of the selected one. The outermost slot is
// invisible: it's where options slide in from and out to as the wheel turns.
const REACH = 3;

export function wrap(index: number) {
	return ((index % MENU.length) + MENU.length) % MENU.length;
}

// A sideways picker wheel, like a phone's timer picker turned on its side.
// `position` counts steps without wrapping, so every option keeps a stable key
// and slides to its new spot (the wheel rolls) instead of jumping.
export default function HomeWheel({ position, onStep }: { position: number; onStep: (_steps: number) => void }) {
	const lastScroll = useRef(0);

	// A scroll or trackpad swipe turns the wheel one step; a short pause between
	// steps keeps one flick from spinning past everything.
	const onWheel = (e: WheelEvent) => {
		const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
		const now = Date.now();
		if (Math.abs(delta) < 8 || now - lastScroll.current < 350) {
			return;
		}
		lastScroll.current = now;
		onStep(delta > 0 ? 1 : -1);
	};

	const slots = [];
	for (let offset = -REACH; offset <= REACH; offset++) {
		const k = position + offset;
		const option = MENU[wrap(k)];
		const distance = Math.abs(offset);
		const style = {
			'--off': offset,
			'--scale': Math.max(0.4, 1 - distance * 0.22),
			opacity: [1, 0.4, 0.12, 0][distance],
		} as CSSProperties;
		const label = (
			<>
				<span className="text-[clamp(36px,5vw,64px)] font-extrabold leading-[1.1] tracking-[-0.04em]">{option.title}</span>
			</>
		);
		slots.push(offset === 0 || distance === 1 ? (
			<button
				key={k}
				type="button"
				onClick={() => onStep(offset)}
				aria-label={offset === 0 ? `${option.title}, selected` : `Show ${option.title}`}
				className={`lb-wheel-item ${offset === 0 ? 'text-ink' : 'text-muted'}`}
				style={style}
			>
				{label}
			</button>
		) : (
			<span key={k} aria-hidden="true" className="lb-wheel-item text-muted" style={style}>{label}</span>
		));
	}

	return (
		<div role="group" aria-label="Pick a mode" onWheel={onWheel} className="lb-wheel relative flex h-[clamp(200px,24vw,260px)] items-center justify-center overflow-hidden">
			<div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[clamp(110px,13vw,150px)] w-[clamp(240px,32vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-line bg-surface" />
			{slots}
			<StepButton label="Previous" side="left-0" path="M15 6l-6 6 6 6" onClick={() => onStep(-1)} />
			<StepButton label="Next" side="right-0" path="M9 6l6 6-6 6" onClick={() => onStep(1)} />
		</div>
	);
}

function StepButton({ label, side, path, onClick }: { label: string; side: string; path: string; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			className={`absolute ${side} flex size-11 items-center justify-center rounded-full border border-line bg-page text-ink hover:bg-raised`}
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
				<path d={path} />
			</svg>
		</button>
	);
}
