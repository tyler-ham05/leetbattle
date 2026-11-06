'use client';
import Link from 'next/link';
import { useState } from 'react';
import CodeRain from './code-rain';
import HomeMenu, { MENU } from './home-menu';
import HomeWheel, { wrap } from './home-wheel';

// Signed-in home screen: a picker wheel of the menu options, an Open button for
// the selected one, and the same options as a list underneath, all over a
// background of falling code.
export default function HomeActions() {
	// Steps the wheel has turned, unwrapped (see HomeWheel). The selected option is wrap(position).
	const [position, setPosition] = useState(0);
	const selected = wrap(position);
	const current = MENU[selected];

	// Selecting from the list turns the wheel the short way round.
	const selectIndex = (index: number) => {
		let steps = index - selected;
		if (steps > MENU.length / 2) {
			steps -= MENU.length;
		} else if (steps < -MENU.length / 2) {
			steps += MENU.length;
		}
		setPosition((p) => p + steps);
	};

	return (
		<div className="relative w-full flex-1 self-stretch overflow-hidden">
			<CodeRain />
			<div className="relative mx-auto flex max-w-[1180px] flex-col gap-10 px-6 pt-12 pb-14 sm:px-8">
				<HomeWheel position={position} onStep={(steps) => setPosition((p) => p + steps)} />
				<div className="-mt-4 flex justify-center">
					<Link
						href={current.href}
						className="inline-flex h-[50px] items-center gap-2.5 rounded-[14px] bg-primary px-6 text-[15px] font-bold text-on-primary hover:opacity-90"
					>
						Open {current.title}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
							<path d="M5 12h14M13 6l6 6-6 6" />
						</svg>
					</Link>
				</div>
				<HomeMenu selected={selected} onSelect={selectIndex} />
			</div>
		</div>
	);
}