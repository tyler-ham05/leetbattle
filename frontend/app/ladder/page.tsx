'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '../login/protected';
import { useAuth } from '../login/context';
import HomeTopBar from '../_home/components/topbar';
import { useQueueSocket } from './socket-context';
import { displayNameOf } from './display-name';
import type { QueueMode } from './socket-context';
import MatchStart from './match-start';

const SIZES: QueueMode[] = ['1v1', '2v2', '3v3'];
// Players on each team.
const TEAM: Record<QueueMode, number> = { '1v1': 1, '2v2': 2, '3v3': 3 };
// More gamemodes are added here as they arrive.
const GAMEMODES = ['Classic'];
// "MATCH FOUND" shows on the button this long, then the match-start screen
// plays for START_MS before the game opens. GameService starts the match 5
// seconds after creating it, so every player still arrives in time.
const FOUND_MS = 600;
const START_MS = 2800;

function clock(seconds: number) {
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// Counts up from 0:00 while the player waits. Remounted (by key) for each queue joined.
function QueueTimer() {
	const [seconds, setSeconds] = useState(0);
	useEffect(() => {
		const id = setInterval(() => setSeconds((current) => current + 1), 1000);
		return () => clearInterval(id);
	}, []);
	return <span data-testid="queue-timer" className="font-bold tracking-[0.06em] text-muted tabular-nums">{clock(seconds)}</span>;
}

function Chevron() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-200 group-aria-expanded:rotate-180">
			<path d="M6 9l6 6 6-6" />
		</svg>
	);
}

// A dropdown tile: its label, the current value in large type (a new value
// rolls in from above or below) and a menu of options under it. Named after
// its value ("Team size 2v2") so a screen reader hears the choice.
function Tile<T extends string>({ label, value, options, onPick, disabled, mono }: {
	label: string;
	value: T;
	options: T[];
	onPick: (_value: T) => void;
	disabled: boolean;
	mono?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const at = options.indexOf(value);

	// A click outside or Escape closes the menu.
	useEffect(() => {
		if (!open) return;
		const outside = (event: MouseEvent) => {
			if (!ref.current?.contains(event.target as Node)) setOpen(false);
		};
		const escape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setOpen(false);
		};
		document.addEventListener('mousedown', outside);
		document.addEventListener('keydown', escape);
		return () => {
			document.removeEventListener('mousedown', outside);
			document.removeEventListener('keydown', escape);
		};
	}, [open]);

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				aria-label={`${label} ${value}`}
				aria-haspopup="true"
				aria-expanded={open && !disabled}
				disabled={disabled}
				onClick={() => setOpen((current) => !current)}
				className={`${FOCUS} lb-press group flex h-[92px] w-full flex-col items-center justify-between rounded-[14px] border border-line bg-surface px-4 py-3.5 text-center text-ink hover:enabled:border-primary/55 aria-expanded:border-primary active:enabled:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50`}
			>
				{/* The label is centered; the chevron is pinned to the right so it doesn't push the label off center. */}
				<span className="relative flex w-full items-center justify-center text-xs font-semibold tracking-[0.1em] text-muted">
					{label.toUpperCase()}
					<span className="absolute right-0 flex items-center">
						<Chevron />
					</span>
				</span>
				<span className="lb-lad-roll relative block h-[34px] w-full overflow-hidden" aria-hidden="true">
					{options.map((option, index) => (
						<span
							key={option}
							data-at={index < at ? 'above' : index > at ? 'below' : 'on'}
							className={`inset-x-0 text-center text-[32px] leading-[34px] font-extrabold tracking-[-0.03em] ${mono ? 'font-mono' : 'text-[28px]'}`}
						>
							{option}
						</span>
					))}
				</span>
			</button>
			{open && !disabled && (
				<div className="lb-enter absolute inset-x-0 top-[calc(100%+6px)] z-10 flex flex-col rounded-xl border border-line bg-surface p-1 shadow-xl">
					{options.map((option) => (
						<button
							key={option}
							type="button"
							onClick={() => {
								onPick(option);
								setOpen(false);
							}}
							className={`${FOCUS} flex h-11 items-center rounded-lg px-3 text-left text-base font-bold transition-colors hover:bg-raised ${mono ? 'font-mono' : ''} ${option === value ? 'text-primary' : 'text-ink'}`}
						>
							{option}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

// What a seat says. There are no player icons yet, so seats show names: the
// player's own name, the real names once the match sends them, "Player found"
// for someone QueueService hasn't named yet, and "Searching" for an open seat.
function seatName(seat: number, filled: number, names: string[] | undefined, own: string | undefined) {
	if (seat >= filled) return 'Searching';
	if (names?.[seat]) return names[seat];
	if (seat === 0 && own) return own;
	return 'Player found';
}

// A green ring for keyboard focus only; a mouse click shows none.
const FOCUS = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary';

// One team's seats down the side of the page. It slides in only while the
// player is queued (and is hidden from screen readers otherwise).
function TeamColumn({ side, label, size, filled, names, own, shown }: {
	side: 'mine' | 'rivals';
	label: string;
	size: number;
	filled: number;
	names?: string[];
	own?: string;
	shown: boolean;
}) {
	const mine = side === 'mine';
	return (
		<aside
			aria-label={label}
			aria-hidden={!shown}
			data-side={side}
			data-shown={shown}
			className={`lb-lad-side pointer-events-none absolute top-0 flex w-[clamp(260px,calc(50vw-50%-48px-3vw),400px)] flex-col gap-3 max-xl:hidden ${mine ? 'right-[calc(100%+48px)]' : 'left-[calc(100%+48px)]'}`}
		>
			<span className="absolute inset-x-0 bottom-full mb-3 flex items-baseline justify-between text-[13px] leading-none font-semibold tracking-[0.1em] text-muted">
				{label.toUpperCase()}
				<b data-testid={mine ? 'your-team-count' : 'rivals-count'} className="text-[15px] font-bold tracking-[0.05em] text-ink tabular-nums">{`${filled} / ${size}`}</b>
			</span>
			{Array.from({ length: size }, (_, seat) => {
				const isFilled = seat < filled;
				const name = seatName(seat, filled, names, mine ? own : undefined);
				const known = isFilled && name !== 'Player found';
				const isYou = mine && seat === 0;
				return (
					<div
						key={seat}
						data-seat=""
						data-filled={isFilled}
						className={`flex h-[72px] items-center gap-3 overflow-hidden rounded-2xl border px-6 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.6),0_0_22px_rgb(0_0_0/0.22)] text-[20px] font-semibold transition-[background-color,border-color,color] duration-500 ${mine ? '' : 'flex-row-reverse text-right'} ${
							isFilled ? `lb-lad-filled border-solid bg-surface ${mine ? 'border-primary/55' : 'border-secondary/55'}` : 'border-transparent bg-raised text-muted'
						} ${known ? `text-[24px] font-extrabold ${mine ? 'text-primary' : 'text-secondary'}` : isFilled ? 'text-ink' : ''}`}
					>
						<span data-seat-name="" className={`min-w-0 flex-1 ${isFilled ? 'truncate' : 'lb-lad-searching'}`}>
							{/* On an open seat the dots after "Searching" count up (CSS), then start again. */}
							{name}
						</span>
						{isYou && <span className="rounded-md bg-primary px-2 py-1 font-mono text-[12px] font-bold tracking-[0.16em] text-on-primary">YOU</span>}
					</div>
				);
			})}
		</aside>
	);
}

function Ladder() {
	const router = useRouter();
	const { user } = useAuth();
	const { socket, connected, queue, matched, error, connect } = useQueueSocket();
	const [size, setSize] = useState<QueueMode>('2v2');
	const [gamemode, setGamemode] = useState(GAMEMODES[0]);
	const waitingIn = queue?.queue ?? null;
	// QueueService takes the player out of the queue as it matches them, so the
	// columns keep the last queue they were in.
	const [lastQueue, setLastQueue] = useState<QueueMode | null>(null);
	if (waitingIn && waitingIn !== lastQueue) setLastQueue(waitingIn);
	const shownSize = matched ? lastQueue ?? size : waitingIn ?? size;
	const busy = Boolean(waitingIn || matched);
	const you = user ? displayNameOf(user) : undefined;

	// The game the match-start screen is showing for, once FOUND_MS has passed.
	const [startFor, setStartFor] = useState<string | null>(null);
	const gameId = matched?.gameId ?? null;
	const routerRef = useRef(router);
	useEffect(() => {
		routerRef.current = router;
	}, [router]);
	useEffect(() => {
		if (!gameId) return;
		// Both timers are set once, so a re-render never delays the game.
		const show = setTimeout(() => setStartFor(gameId), FOUND_MS);
		const open = setTimeout(() => routerRef.current.push(`/game/${gameId}`), FOUND_MS + START_MS);
		return () => {
			clearTimeout(show);
			clearTimeout(open);
		};
	}, [gameId]);

	useEffect(() => {
		connect();
	}, [connect]);

	// Seats fill in the order the match is made: the player, their team, then the rivals.
	const team = TEAM[shownSize];
	const waiting = matched ? team * 2 : Math.min(Math.max(queue?.counts[shownSize] ?? 1, 1), team * 2);
	const mineFilled = Math.min(waiting, team);
	const rivalsFilled = Math.max(waiting - team, 0);

	return (
		<div className="relative flex flex-1 flex-col overflow-hidden">
			<HomeTopBar />
			<div className="pointer-events-none absolute inset-x-0 top-12 bottom-0" aria-hidden="true">
				{/* The faint size: its digits out at the sides, the "v" barely there behind the controls. */}
				<div className="lb-lad-zone absolute inset-0 overflow-hidden">
					{SIZES.map((option) => (
						<div
							key={option}
							data-on={option === shownSize}
							aria-hidden="true"
							className="lb-lad-giant absolute inset-0 flex items-center justify-center font-mono leading-none font-extrabold text-ink"
						>
							<span>{option[0]}</span>
							<span>v</span>
							<span>{option[2]}</span>
						</div>
					))}
				</div>
				{/* While queued the background dims a little, so the teams stand out. */}
				<div data-on={busy} className="lb-lad-dim absolute inset-0 bg-page" />
			</div>
			<main className="relative mx-auto flex w-full max-w-[520px] flex-1 flex-col gap-6 px-6 pt-10 pb-14">
				<h1 className="m-0 text-center text-[64px] leading-none font-black tracking-[-0.05em]">Ladder</h1>
				<div className="grid grid-cols-2 gap-3.5">
					<Tile label="Team size" value={shownSize} options={SIZES} onPick={setSize} disabled={busy} mono />
					<Tile label="Gamemode" value={gamemode} options={GAMEMODES} onPick={setGamemode} disabled={busy} />
				</div>
				{/* The team columns hang off the rank card: the first seat lines up with its top. */}
				<div className="relative">
					<TeamColumn side="mine" label="Your team" size={team} filled={mineFilled} names={matched?.yourTeam} own={you} shown={busy} />
					<TeamColumn side="rivals" label="Rivals" size={team} filled={rivalsFilled} names={matched?.rivals} shown={busy} />
					<section aria-label="Rank" className="relative flex flex-col items-center gap-5 rounded-[20px] bg-surface p-7">
						{['top-0 left-0 border-t-2 border-l-2 rounded-tl-[20px]', 'top-0 right-0 border-t-2 border-r-2 rounded-tr-[20px]', 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-[20px]', 'right-0 bottom-0 border-r-2 border-b-2 rounded-br-[20px]'].map((corner) => (
							<span key={corner} aria-hidden="true" className={`absolute size-[22px] border-primary ${corner}`} />
						))}
						<span className="text-[13px] font-bold tracking-[0.2em] text-muted">RANK</span>
						<div aria-hidden="true" className="size-[140px] rounded-full bg-raised" />
						<div aria-hidden="true" className="h-1.5 w-full rounded-[3px] bg-raised" />
					</section>
				</div>
				<div className="flex min-h-12 justify-center">
					{waitingIn && (
						<p className="lb-enter m-0 flex flex-col items-center gap-0.5">
							<b data-testid="in-queue" className="font-mono text-[30px] leading-none font-extrabold">{queue?.counts[waitingIn] ?? 0}</b>
							<span className="text-xs tracking-[0.1em] text-muted">IN QUEUE</span>
						</p>
					)}
				</div>
				{busy ? (
					<div className="lb-enter grid grid-cols-[minmax(0,1fr)_auto] gap-2.5">
						<div
							role="status"
							className={`flex h-[72px] items-center justify-center gap-3 rounded-[14px] border-2 border-transparent text-lg font-extrabold tracking-[0.12em] [--lb-fill:var(--lb-surface)] [--lb-glint:var(--lb-primary)] ${matched ? 'lb-nod bg-primary text-on-primary' : 'lb-trace lb-lad-trace text-ink'}`}
						>
							{matched ? 'MATCH FOUND' : (
								<>
									WAITING
									<QueueTimer key={waitingIn ?? 'queue'} />
								</>
							)}
						</div>
						<button
							type="button"
							aria-label="Leave"
							onClick={() => socket?.emit('queue:leave')}
							disabled={Boolean(matched)}
							className={`${FOCUS} lb-press flex size-[72px] flex-col items-center justify-center gap-1 rounded-[14px] border border-line bg-surface text-[11px] font-semibold text-ink hover:enabled:bg-raised active:enabled:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40`}
						>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
							Leave
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => socket?.emit('queue:join', size)}
						disabled={!connected}
						className={`${FOCUS} lb-press lb-enter h-[72px] w-full rounded-[14px] bg-primary text-[22px] font-black tracking-[0.24em] text-on-primary hover:enabled:brightness-105 active:enabled:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40`}
					>
						PLAY
					</button>
				)}
				{error && <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error.message}</div>}
			</main>
			{matched && startFor === matched.gameId && <MatchStart yourTeam={matched.yourTeam} rivals={matched.rivals} you={you} />}
		</div>
	);
}

export default function LadderPage() {
	return (
		<RequireAuth>
			<Ladder />
		</RequireAuth>
	);
}
