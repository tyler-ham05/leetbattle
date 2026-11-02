'use client';

import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../theme';

const INTRO_MS = 3300;

// Full-screen wordmark that draws itself in, then lifts away.
// Plays once per browser tab; hidden by CSS before paint on repeat visits.
export default function Intro() {
	const [done, setDone] = useState(false);

	useEffect(() => {
		try {
			sessionStorage.setItem(STORAGE_KEYS.introSeen, '1');
		} catch {
			// storage blocked: the intro just plays again next time
		}
		const timer = setTimeout(() => setDone(true), INTRO_MS);
		return () => clearTimeout(timer);
	}, []);

	if (done) {
		return null;
	}

	const skip = () => {
		document.documentElement.classList.add('lb-intro-seen');
		setDone(true);
	};

	return (
		<div className="lb-intro fixed inset-0 z-50 flex items-center justify-center bg-page">
			<div className="relative">
				<div className="lb-wipe text-[clamp(56px,10vw,120px)] font-black leading-none tracking-[-0.04em]">
					Leet<span className="text-primary">Battle</span>
				</div>
				<div className="lb-tip" />
			</div>
			<button
				type="button"
				onClick={skip}
				className="absolute bottom-8 right-8 px-3 py-2 text-xs uppercase tracking-[0.14em] text-muted cursor-pointer hover:text-ink"
			>
				Skip
			</button>
		</div>
	);
}
