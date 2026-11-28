'use client';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '../login/protected';
import HomeTopBar from '../_home/components/topbar';
import { useQueueSocket } from './socket-context';
import type { QueueMode } from './socket-context';

const QUEUE_MODES: QueueMode[] = ['1v1', '2v2', '3v3'];
// Players a match needs: two teams of 1, 2 or 3.
const PLAYERS: Record<QueueMode, number> = { '1v1': 2, '2v2': 4, '3v3': 6 };
// Short on purpose: GameService starts the match 5 seconds after creating it,
// so every player still reaches the game page in time.
const COUNTDOWN_SECONDS = 2;
const BUTTON = 'lb-press inline-flex h-11 w-full items-center justify-center rounded-[10px] px-4 text-sm font-semibold disabled:cursor-not-allowed';
const EASE_OUT = 'ease-[cubic-bezier(0.22,1,0.36,1)]';

// idle: nobody queued. queued / dim: the player's card and the others while
// they wait. found / leaving: the chosen card and the others once matched.
type CardState = 'idle' | 'queued' | 'dim' | 'found' | 'leaving';

const FRAME: Record<CardState, string> = {
	idle: 'bg-line hover:-translate-y-0.5',
	queued: 'lb-card-trace -translate-y-1',
	dim: 'bg-line opacity-45 hover:opacity-80',
	found: 'lb-card-found bg-primary',
	leaving: 'lb-card-leaving bg-line',
};

function clock(seconds: number) {
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// Counts up from 0:00 while the player waits. The page remounts it (by key)
// for each queue they join, so it starts over.
function QueueTimer() {
	const [seconds, setSeconds] = useState(0);
	useEffect(() => {
		const id = setInterval(() => setSeconds((current) => current + 1), 1000);
		return () => clearInterval(id);
	}, []);
	return <>{clock(seconds)}</>;
}

// "Match found" and 2, 1 in the lobby's digit style, then the game page.
function MatchCountdown({ gameId }: { gameId: string }) {
	const router = useRouter();
	const [left, setLeft] = useState(COUNTDOWN_SECONDS);
	// The game opens on a timer set once, so a slow render never delays it.
	useEffect(() => {
		const tick = setInterval(() => setLeft((current) => current - 1), 1000);
		const open = setTimeout(() => router.push(`/game/${gameId}`), COUNTDOWN_SECONDS * 1000);
		return () => {
			clearInterval(tick);
			clearTimeout(open);
		};
	}, [gameId, router]);
	const shown = Math.max(left, 1);

	return (
		<>
			<h1 className="lb-fade-in m-0 text-sm font-semibold text-primary">Match found</h1>
			<p key={shown} data-testid="match-countdown" className="lb-digit m-0 font-mono text-[96px] leading-none font-extrabold" aria-hidden="true">{shown}</p>
			<span className="sr-only" aria-live="assertive">Starting in {shown}</span>
		</>
	);
}

// One thin bar per seat, filled for each player waiting. Once matched, the
// first half turns into the player's team color and the second into the rival's.
function SeatBars({ need, count, found }: { need: number; count: number; found: boolean }) {
	return (
		<div className="grid w-full gap-1.5" style={{ gridTemplateColumns: `repeat(${need}, minmax(0, 1fr))` }} aria-hidden="true">
			{Array.from({ length: need }, (_, seat) => {
				const filled = found || seat < count;
				const color = found && seat >= need / 2 ? 'bg-secondary' : 'bg-primary';
				return (
					<div key={seat} className={`h-1.5 overflow-hidden rounded-[3px] bg-line ${found && seat === need / 2 - 1 ? 'mr-2.5' : ''}`}>
						<span
							data-seat=""
							data-filled={String(filled)}
							className={`block h-full origin-left ${color} ${filled ? 'scale-x-100' : 'scale-x-0'} transition-[scale,background-color] duration-[240ms] ${EASE_OUT}`}
							style={found ? { transitionDelay: `${120 + seat * 40}ms` } : undefined}
						/>
					</div>
				);
			})}
		</div>
	);
}

function Ladder() {
	const { socket, connected, queue, matched, error, connect } = useQueueSocket();
	const waitingIn = queue?.queue ?? null;
	// QueueService takes the player out of the queue as it matches them, so the
	// reveal uses the last queue they were in.
	const [lastQueue, setLastQueue] = useState<QueueMode | null>(null);
	if (waitingIn && waitingIn !== lastQueue) setLastQueue(waitingIn);
	const chosen = matched ? lastQueue : waitingIn;
	const chosenIndex = chosen ? QUEUE_MODES.indexOf(chosen) : -1;

	useEffect(() => {
		connect();
	}, [connect]);

	function stateOf(mode: QueueMode): CardState {
		if (matched) return mode === chosen ? 'found' : chosen ? 'leaving' : 'dim';
		if (waitingIn) return mode === waitingIn ? 'queued' : 'dim';
		return 'idle';
	}

	return (
		<div className="flex flex-1 flex-col">
			<HomeTopBar />
			<main className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-10 px-6 pt-16 pb-16">
				<div className="flex min-h-[150px] flex-col items-center justify-center gap-2.5 text-center">
					{matched ? (
						<MatchCountdown gameId={matched.gameId} />
					) : (
						<>
							<h1 key={waitingIn ? 'finding' : 'ladder'} className="lb-rise m-0 text-[44px] leading-[1.05] font-extrabold tracking-[-0.04em]">
								{waitingIn ? 'Finding players' : 'Ladder'}
							</h1>
							<p className="m-0 text-muted">
								{waitingIn ? 'Keep this tab open, the match starts the moment the seats fill' : 'Queue for a 1v1, 2v2 or 3v3 match'}
							</p>
						</>
					)}
				</div>
				<div className="grid gap-5 md:grid-cols-3">
					{QUEUE_MODES.map((mode, index) => {
						const state = stateOf(mode);
						const need = PLAYERS[mode];
						const count = state === 'found' ? need : queue?.counts[mode] ?? 0;
						const teams = mode === '1v1' ? ['You', 'Rival'] : ['Your team', 'Rival team'];
						const position = { '--lb-shift': 1 - index, '--lb-side': index < chosenIndex ? -1 : 1 } as CSSProperties;
						return (
							<div key={mode} className="lb-enter" style={{ animationDelay: `${index * 40}ms` }} aria-hidden={state === 'leaving' || undefined}>
								<div data-mode={mode} data-state={state} className={`lb-card-move rounded-2xl p-px ${FRAME[state]}`} style={position}>
									<section aria-label={`${mode} queue`} className="flex min-h-[300px] flex-col items-center gap-[22px] rounded-[15px] bg-surface px-6 pt-7 pb-6 text-center">
										<div className="flex flex-col items-center gap-2">
											<span className="font-mono text-[52px] leading-none font-extrabold tracking-[-0.04em]">{mode}</span>
											<span className="min-h-[18px] font-mono text-sm text-muted">{state === 'queued' && <QueueTimer key={mode} />}</span>
										</div>
										<div className="flex w-full flex-col items-center gap-2.5">
											<SeatBars need={need} count={count} found={state === 'found'} />
											{state === 'found' ? (
												<div className="lb-fade-in flex w-full justify-between text-[13px] font-semibold">
													<span className="text-primary">{teams[0]}</span>
													<span className="text-secondary">{teams[1]}</span>
												</div>
											) : (
												<p className="m-0 text-sm text-muted">{`${count} of ${need} players`}</p>
											)}
										</div>
										<div className="mt-auto w-full">
											{state === 'found' && (
												<button type="button" disabled className={`${BUTTON} bg-primary text-on-primary`}>Starting</button>
											)}
											{state === 'queued' && (
												<button type="button" onClick={() => socket?.emit('queue:leave')} className={`${BUTTON} border border-line text-ink hover:bg-raised`}>
													Leave queue
												</button>
											)}
											{state !== 'found' && state !== 'queued' && (
												<button
													type="button"
													onClick={() => socket?.emit('queue:join', mode)}
													disabled={!connected || Boolean(matched)}
													className={`${BUTTON} lb-press-lift bg-primary text-on-primary disabled:opacity-40`}
												>
													Join {mode}
												</button>
											)}
										</div>
									</section>
								</div>
							</div>
						);
					})}
				</div>
				{error && <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error.message}</div>}
			</main>
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
