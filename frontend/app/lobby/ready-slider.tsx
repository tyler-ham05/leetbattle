'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

// Slide to ready (US-4-T-9). The 48px handle travels across a 320px track.
// Reaching the end readies the player at once; reaching the start unreadies
// them; letting go anywhere else snaps back. A two-finger trackpad swipe over
// the track moves it too (natural scrolling), and the swipe is swallowed so
// the browser never goes back a page.
const HANDLE = 56;
const TRAVEL = 264;
const SWIPE_PX = 260;
const SETTLE_MS = 200;

const clamp = (x: number) => Math.max(0, Math.min(1, x));

export default function ReadySlider({ ready, disabled, onChange }: { ready: boolean; disabled: boolean; onChange: (_ready: boolean) => void }) {
	const [x, setX] = useState(ready ? 1 : 0);
	const [dragging, setDragging] = useState(false);
	const track = useRef<HTMLDivElement>(null);
	const drag = useRef(false);
	// The wheel listener is attached once, so it reads the latest values here.
	const live = useRef({ x, ready, disabled, onChange });
	live.current = { x, ready, disabled, onChange };

	// The server decides: follow its ready state whenever it changes.
	useEffect(() => {
		setX(ready ? 1 : 0);
	}, [ready]);

	// Sends the change once the handle reaches an end; true when it did.
	function commit(next: number) {
		const { ready: isReady, onChange: send } = live.current;
		if ((next >= 1 && !isReady) || (next <= 0 && isReady)) {
			drag.current = false;
			setDragging(false);
			setX(next >= 1 ? 1 : 0);
			send(next >= 1);
			return true;
		}
		return false;
	}

	function settle() {
		const { x: at, ready: isReady } = live.current;
		setDragging(false);
		setX((isReady ? at > 0.1 : at > 0.9) ? 1 : 0);
	}

	useEffect(() => {
		const element = track.current;
		if (!element) return;
		let timer: ReturnType<typeof setTimeout> | undefined;
		function onWheel(event: WheelEvent) {
			event.preventDefault();
			if (live.current.disabled || Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.5) return;
			const next = clamp(live.current.x - event.deltaX / SWIPE_PX);
			clearTimeout(timer);
			if (commit(next)) return;
			live.current.x = next;
			setX(next);
			setDragging(true);
			timer = setTimeout(settle, SETTLE_MS);
		}
		element.addEventListener('wheel', onWheel, { passive: false });
		return () => {
			element.removeEventListener('wheel', onWheel);
			clearTimeout(timer);
		};
	}, []);

	function down(event: PointerEvent<HTMLDivElement>) {
		if (disabled) return;
		event.currentTarget.setPointerCapture?.(event.pointerId);
		drag.current = true;
		setDragging(true);
	}

	function move(event: PointerEvent<HTMLDivElement>) {
		if (!drag.current) return;
		const box = event.currentTarget.getBoundingClientRect();
		const next = clamp((event.clientX - box.left - HANDLE / 2) / (box.width - HANDLE));
		if (!commit(next)) {
			live.current.x = next;
			setX(next);
		}
	}

	function up() {
		if (!drag.current) return;
		drag.current = false;
		settle();
	}

	function key(event: KeyboardEvent<HTMLDivElement>) {
		if (disabled) return;
		const wanted = event.key === 'ArrowRight' ? true : event.key === 'ArrowLeft' ? false : event.key === ' ' || event.key === 'Enter' ? !ready : null;
		if (wanted === null) return;
		event.preventDefault();
		if (wanted !== ready) commit(wanted ? 1 : 0);
	}

	const ease = dragging ? 'none' : '0.35s cubic-bezier(0.2, 0.7, 0.2, 1)';
	return (
		<div
			ref={track}
			role="slider"
			tabIndex={disabled ? -1 : 0}
			aria-label="Slide to ready"
			aria-disabled={disabled}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(x * 100)}
			aria-valuetext={ready ? 'Ready' : 'Not ready'}
			onPointerDown={down}
			onPointerMove={move}
			onPointerUp={up}
			onPointerCancel={up}
			onKeyDown={key}
			className={`lb-slider relative h-14 w-80 touch-none select-none overflow-hidden overscroll-contain rounded-xl border bg-surface outline-offset-[3px] transition-[border-color,opacity] duration-300 ${ready ? 'border-primary' : 'border-line'} ${disabled ? 'cursor-not-allowed opacity-45' : 'cursor-grab'}`}
		>
			<span
				aria-hidden="true"
				className="absolute inset-0 origin-left bg-primary"
				style={{ transform: `scaleX(${0.15 + x * 0.85})`, opacity: ready ? 1 : x * 0.35, transition: `transform ${ease}, opacity ${ease}` }}
			/>
			<span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pl-10 text-[15px] font-bold text-muted" style={{ opacity: ready ? 0 : 1 - x * 1.4 }}>
				{disabled ? 'Waiting for players' : 'Slide to ready'}
			</span>
			<span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pr-10 text-[15px] font-bold text-on-primary transition-opacity duration-250" style={{ opacity: ready ? 1 : 0 }}>
				Ready
			</span>
			<span
				aria-hidden="true"
				className={`absolute left-[3px] top-[3px] flex h-12 w-12 items-center justify-center rounded-[9px] transition-colors duration-300 ${ready ? 'bg-on-primary text-primary' : 'bg-primary text-on-primary'}`}
				style={{ transform: `translateX(${x * TRAVEL}px) rotate(${ready ? 180 : 0}deg)`, transition: `transform ${ease}, background-color 0.3s, color 0.3s` }}
			>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
			</span>
		</div>
	);
}
