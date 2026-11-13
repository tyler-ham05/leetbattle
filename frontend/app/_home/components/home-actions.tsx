'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useAuth } from '../../login/context';
import CodeRain from './code-rain';

export const MENU = [
	{ title: 'Practice', description: 'Three random problems in the editor', href: '/editor' },
	{ title: 'Lobby', description: 'Join a six-player lobby and pick a team', href: '/lobby' },
	{ title: 'Settings', description: 'Name, password and color theme', href: '/settings' },
];

// The rows of the menu: the three pages, then Log out at the bottom.
const ROWS = MENU.length + 1;
const LOG_OUT = MENU.length;

// Signed-in home screen, styled like a game title screen: the player's name,
// a big LeetBattle title and a stacked menu, over the falling code.
// Hover, Tab or the arrow keys pick a row; Enter opens it.
export default function HomeActions() {
	const { user, logout } = useAuth();
	const router = useRouter();
	const [selected, setSelected] = useState(0);
	const selectedRef = useRef(0);
	const rows = useRef<(HTMLElement | null)[]>([]);

	const select = (index: number) => {
		selectedRef.current = index;
		setSelected(index);
	};

	const onLogout = async () => {
		await logout();
		router.push('/');
	};

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				const next = (selectedRef.current + (e.key === 'ArrowDown' ? 1 : -1) + ROWS) % ROWS;
				selectedRef.current = next;
				setSelected(next);
				rows.current[next]?.focus();
			}
			// A focused row opens itself; with nothing focused, Enter opens the selected row.
			const nothingFocused = !document.activeElement || document.activeElement === document.body;
			if (e.key === 'Enter' && nothingFocused) {
				if (selectedRef.current === LOG_OUT) {
					void onLogout();
				} else {
					router.push(MENU[selectedRef.current].href);
				}
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	return (
		<div className="relative flex w-full flex-1 self-stretch overflow-hidden">
			<CodeRain />
			<div aria-hidden="true" className="lb-title-fade pointer-events-none absolute inset-0" />
			<div className="relative flex flex-1 flex-col justify-center px-[clamp(24px,8vw,110px)] py-16">
				<p className="lb-rise-in m-0 font-mono text-[13px] font-semibold uppercase tracking-[0.2em] text-primary" style={{ '--d': '0.05s' } as CSSProperties}>
					Player · {user?.name ?? user?.email}
				</p>
				<h1 className="lb-rise-in mt-3.5 mb-0 text-[clamp(56px,8vw,96px)] font-black leading-[0.9] tracking-[-0.055em]" style={{ '--d': '0.1s' } as CSSProperties}>
					Leet<span className="text-primary">Battle</span>
				</h1>
				<ul aria-label="Menu" className="mt-14 mb-0 flex list-none flex-col gap-0.5 p-0">
					{MENU.map((option, i) => (
						<li key={option.title}>
							<Link
								ref={(el) => {
									rows.current[i] = el;
								}}
								href={option.href}
								data-selected={i === selected}
								onMouseEnter={() => select(i)}
								onFocus={() => select(i)}
								className="lb-title-row lb-rise-in"
								style={{ '--d': `${0.25 + i * 0.07}s` } as CSSProperties}
							>
								<span>{option.title}</span>
								<span className="lb-title-desc">{option.description}</span>
							</Link>
						</li>
					))}
					<li>
						<button
							ref={(el) => {
								rows.current[LOG_OUT] = el;
							}}
							type="button"
							data-selected={selected === LOG_OUT}
							onMouseEnter={() => select(LOG_OUT)}
							onFocus={() => select(LOG_OUT)}
							onClick={onLogout}
							className="lb-title-row lb-title-row-small lb-rise-in"
							style={{ '--d': `${0.25 + LOG_OUT * 0.07}s` } as CSSProperties}
						>
							Log out
						</button>
					</li>
				</ul>
			</div>
			<div className="absolute bottom-11 left-[clamp(24px,8vw,110px)] hidden items-center gap-5 text-[13px] text-muted sm:flex">
				<span className="flex items-center gap-2"><kbd className="lb-key">↑</kbd><kbd className="lb-key">↓</kbd><span>Select</span></span>
				<span className="flex items-center gap-2"><kbd className="lb-key">Enter</kbd><span>Open</span></span>
			</div>
		</div>
	);
}
