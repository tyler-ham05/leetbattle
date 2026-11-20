'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '../login/protected';
import { useAuth } from '../login/context';
import HomeTopBar from '../_home/components/topbar';
import PageLoader, { LOADER_MS } from '../_shared/page-loader';
import { prefersReducedMotion } from '../_shared/motion';
import { useLobbySocket } from './socket-context';
import type { LobbyPlayer, TeamId } from './socket-context';

// Team 1 sits on the left and enters from the left; Team 2 is mirrored on the right.
const TEAMS: { id: TeamId; name: string; nameColor: string; bar: string; tint: string; check: string; mirrored: boolean }[] = [
	{ id: 'a', name: 'Team 1', nameColor: 'text-primary', bar: 'bg-primary', tint: 'bg-primary/10', check: 'stroke-primary', mirrored: false },
	{ id: 'b', name: 'Team 2', nameColor: 'text-secondary', bar: 'bg-secondary', tint: 'bg-secondary/10', check: 'stroke-secondary', mirrored: true },
];

const TEAM_SIZES = [1, 2, 3];

const BUTTON = 'lb-press inline-flex items-center justify-center font-semibold disabled:cursor-not-allowed';
const QUIET = 'border border-line text-ink hover:bg-raised disabled:text-muted disabled:hover:bg-transparent';
const FILLED = 'lb-press-lift disabled:opacity-40';

// A team's bar above the arena: it fills in from the outer edge as seats are
// taken, and drains into VS while the match counts down (US-5-T-20).
function TeamBar({ team, fill, draining, seconds }: { team: typeof TEAMS[number]; fill: number; draining: boolean; seconds: number | null }) {
	// The drain lasts as long as the countdown had left when it started.
	const drainSeconds = useRef<number | null>(null);
	if (draining && drainSeconds.current === null) drainSeconds.current = seconds ?? 3;
	if (!draining) drainSeconds.current = null;

	const edge = team.mirrored ? 'right' : 'left';
	return (
		<div className="relative h-[3px] overflow-hidden rounded-full bg-raised">
			<div
				data-team-bar={team.id}
				data-draining={String(draining)}
				className={`absolute inset-y-0 rounded-full ${team.bar}`}
				style={{
					[edge]: draining ? '100%' : '0%',
					width: draining ? '0%' : `${fill * 100}%`,
					transition: draining
						? `${edge} ${drainSeconds.current}s linear, width ${drainSeconds.current}s linear`
						: 'width 0.8s cubic-bezier(0.2, 0.7, 0.2, 1)',
				}}
			/>
		</div>
	);
}

function LobbyContent() {
	const { user } = useAuth();
	const { socket, connected, lobby, error, matchReadiness, gameStarted, connect, clearError } = useLobbySocket();
	const router = useRouter();
	const [nameInput, setNameInput] = useState('');
	const [editingName, setEditingName] = useState(false);
	const [clashDone, setClashDone] = useState(false);

	useEffect(() => {
		connect();
	}, [connect]);

	const currentPlayer = lobby?.players.find((player) => player.userId === user?.id);
	// Only the match's players move to it; someone watching the lobby stays put.
	const joiningMatch = Boolean((matchReadiness || gameStarted) && currentPlayer);

	// The team clash plays once the match is on; the game page opens after it.
	useEffect(() => {
		if (!joiningMatch) return;
		if (prefersReducedMotion()) {
			setClashDone(true);
			return;
		}
		const timer = setTimeout(() => setClashDone(true), LOADER_MS.clash);
		return () => clearTimeout(timer);
	}, [joiningMatch]);

	useEffect(() => {
		if (joiningMatch && gameStarted && clashDone) router.push(`/game/${gameStarted.gameId}`);
	}, [joiningMatch, gameStarted, clashDone, router]);

	function send(event: string, payload?: unknown) {
		if (!socket?.connected) return;
		clearError();
		socket.emit(event, payload);
	}

	function saveName(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const displayName = nameInput.trim();
		if (displayName.length < 1 || displayName.length > 24) return;
		send('lobby:set-name', displayName);
		setNameInput(displayName);
		setEditingName(false);
	}

	const players = lobby?.players ?? [];
	const teamSize = lobby?.teamSize ?? 3;
	const seatCount = teamSize * 2;
	const isHost = Boolean(user && lobby?.hostId === user.id);
	const full = (lobby?.playerCount ?? 0) >= seatCount;
	const isLoading = !connected || !lobby;
	const seconds = lobby?.countdownSecondsRemaining ?? null;
	const counting = !isLoading && Boolean(currentPlayer) && seconds !== null;
	const seated = players.filter((player) => player.team !== null);
	const readyCount = seated.filter((player) => player.ready).length;
	const allReady = seated.length === seatCount && readyCount === seatCount;

	// The headline says what the lobby is waiting on; each new line rises in.
	let headline = seated.length < seatCount ? `Waiting for ${seatCount - seated.length} more` : allReady ? 'Everyone is ready' : `${readyCount} of ${seatCount} ready`;
	if (isLoading) {
		headline = 'Connecting to lobby…';
	} else if (!currentPlayer) {
		headline = full ? 'This lobby is full.' : 'You have not joined this lobby yet.';
	} else if (joiningMatch) {
		headline = 'Joining match…';
	}

	const nameDraft = nameInput || currentPlayer?.displayName || '';
	const nameInvalid = !connected || nameDraft.trim().length < 1 || nameDraft.trim().length > 24 || nameDraft.trim() === currentPlayer?.displayName;

	function seatRow(player: LobbyPlayer, team: typeof TEAMS[number]) {
		const isMe = player.userId === user?.id;
		return (
			<li
				key={player.userId}
				data-ready={String(player.ready)}
				className={`${team.mirrored ? 'lb-in-b flex-row-reverse' : 'lb-in-a'} relative flex min-h-[54px] items-center justify-between gap-3 overflow-hidden rounded-[10px] px-4 py-2 ${isMe ? 'bg-raised' : 'bg-surface'}`}
			>
				<span
					aria-hidden="true"
					className={`absolute inset-0 ${team.tint} transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${team.mirrored ? 'origin-right' : 'origin-left'} ${player.ready ? 'scale-x-100' : 'scale-x-0'}`}
				/>
				{isMe && editingName ? (
					<form onSubmit={saveName} className={`relative flex items-center gap-2 ${team.mirrored ? 'flex-row-reverse' : ''}`}>
						<label htmlFor="lobby-display-name" className="sr-only">Display name</label>
						<input
							id="lobby-display-name"
							autoFocus
							value={nameDraft}
							onChange={(event) => setNameInput(event.target.value)}
							onKeyDown={(event) => event.key === 'Escape' && setEditingName(false)}
							maxLength={24}
							className="h-9 w-44 rounded-lg border border-primary bg-page px-2.5 text-[15px] outline-none"
						/>
						<button type="submit" disabled={nameInvalid} className={`${BUTTON} ${FILLED} h-9 rounded-lg bg-primary px-3 text-[13px] text-on-primary`}>Save name</button>
					</form>
				) : (
					<span className={`relative flex items-center gap-2 ${team.mirrored ? 'flex-row-reverse' : ''}`}>
						<span className="text-[15px] font-medium">{player.displayName}</span>
						{isMe && (
							<>
								<span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">You</span>
								<button
									type="button"
									aria-label="Edit your display name"
									onClick={() => setEditingName(true)}
									className={`${BUTTON} h-7 w-7 rounded-md text-muted hover:bg-page hover:text-ink`}
								>
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></svg>
								</button>
							</>
						)}
					</span>
				)}
				<span className={`relative flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-300 ${player.ready ? 'text-ink' : 'text-muted'}`}>
					{!player.connected ? 'Reconnecting…' : (
						<>
							{player.ready && <svg viewBox="0 0 16 16" aria-hidden="true" className={`lb-check ${team.check}`}><path d="M3 8.5l3.2 3.2L13 4.8" /></svg>}
							{player.ready ? 'Ready' : 'Not ready'}
						</>
					)}
				</span>
			</li>
		);
	}

	return (
		<div className="flex min-h-screen flex-col bg-page font-sans text-ink">
			<PageLoader variant="katana" />
			{joiningMatch && <PageLoader variant="clash" />}
			<HomeTopBar actions={currentPlayer && (
				<>
					{isHost ? (
						<div role="group" aria-label="Players per team" className={`relative flex gap-0.5 rounded-[9px] border border-line p-[3px] transition-opacity duration-300 ${counting ? 'opacity-40' : ''}`}>
							<span aria-hidden="true" className="absolute top-[3px] h-7 w-11 rounded-md bg-raised transition-[left] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]" style={{ left: `${3 + (teamSize - 1) * 46}px` }} />
							{TEAM_SIZES.map((size) => (
								<button
									key={size}
									onClick={() => send('lobby:set-team-size', size)}
									disabled={!connected || size === teamSize}
									aria-pressed={size === teamSize}
									className={`${BUTTON} relative h-7 w-11 rounded-md font-mono text-xs ${size === teamSize ? 'text-ink' : 'text-muted hover:text-ink'}`}
								>
									{size}v{size}
								</button>
							))}
						</div>
					) : (
						<span className="font-mono text-xs font-semibold text-muted">{teamSize}v{teamSize}</span>
					)}
					<button onClick={() => send('lobby:leave')} disabled={!connected} className={`${BUTTON} ${QUIET} h-8 rounded-lg px-3 text-[13px]`}>Leave lobby</button>
				</>
			)} />

			<main className="flex flex-1 flex-col items-center px-5 pt-14 pb-16">
				<div className="flex w-full max-w-[980px] flex-col items-center">
					<div role="status" aria-live="polite" className="flex min-h-[72px] items-center justify-center text-center">
						{counting && seconds !== null ? (
							<>
								<span className="sr-only">Starting match in {seconds}…</span>
								<h1 key={seconds} className="lb-digit font-mono text-[72px] font-bold leading-none">{seconds}</h1>
							</>
						) : (
							<h1 key={headline} className="lb-rise text-[44px] font-extrabold leading-[1.05] tracking-[-0.04em]">{headline}</h1>
						)}
					</div>

					{error && <div role="alert" className="mt-6 w-full rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error.message}</div>}

					<div aria-hidden="true" className="mt-7 grid w-full grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] items-center">
						{TEAMS.map((team) => (
							<Fragment key={team.id}>
								{team.mirrored && (
									<span className={`text-center font-mono text-sm font-bold tracking-[0.2em] transition-colors duration-500 ${allReady ? 'text-ink' : 'text-muted'}`}>VS</span>
								)}
								<TeamBar
									team={team}
									fill={Math.min(players.filter((player) => player.team === team.id).length / teamSize, 1)}
									draining={counting || joiningMatch}
									seconds={seconds}
								/>
							</Fragment>
						))}
					</div>

					<div className="mt-9 grid w-full gap-5 md:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)]">
						{TEAMS.map((team) => {
							const teamPlayers = players.filter((player) => player.team === team.id);
							const openSeats = Math.max(teamSize - teamPlayers.length, 0);
							const isMyTeam = currentPlayer?.team === team.id;
							// An open seat on any team but the user's own is how they join or switch.
							const seatAction = currentPlayer && !isMyTeam ? `${currentPlayer.team ? 'Switch to' : 'Join'} ${team.name}` : null;

							return (
								<Fragment key={team.id}>
									{team.mirrored && <span aria-hidden="true" className="hidden md:block" />}
									<section className="flex flex-col gap-1.5">
										<div className={`flex items-baseline justify-between px-1 pb-2.5 ${team.mirrored ? 'flex-row-reverse' : ''}`}>
											<h2 className={`text-[22px] font-extrabold tracking-[-0.03em] ${team.nameColor}`}>{team.name}</h2>
											<span className="font-mono text-[13px] font-semibold text-muted">{teamPlayers.length}/{teamSize}</span>
										</div>
										<ul className="flex flex-col gap-1.5" aria-label={`${team.name} players`}>
											{teamPlayers.map((player) => seatRow(player, team))}
											{Array.from({ length: openSeats }, (_, i) => (
												<li key={`open-${i}`} className="lb-fade-in">
													{seatAction ? (
														<button
															type="button"
															aria-label={seatAction}
															onClick={() => send('lobby:join-team', team.id)}
															disabled={!connected}
															className={`lb-seat-open ${BUTTON} min-h-[54px] w-full justify-between rounded-[10px] border border-dashed border-line px-4 text-sm text-muted hover:bg-surface hover:text-ink ${team.mirrored ? 'flex-row-reverse' : ''}`}
														>
															<span>Open seat</span>
															<span className={`lb-seat-hint text-[13px] font-semibold ${team.nameColor}`}>{currentPlayer?.team ? 'Switch here' : 'Join here'}</span>
														</button>
													) : (
														<div className={`flex min-h-[54px] items-center rounded-[10px] border border-dashed border-line px-4 text-sm text-muted ${team.mirrored ? 'justify-end' : ''}`}>Open seat</div>
													)}
												</li>
											))}
										</ul>
									</section>
								</Fragment>
							);
						})}
					</div>

					<div className="mt-10 flex min-h-[54px] items-center">
						{currentPlayer ? (
							!joiningMatch && (
								<button
									onClick={() => send('lobby:set-ready', !currentPlayer.ready)}
									disabled={!connected || !lobby?.canReady}
									className={`${BUTTON} h-[54px] w-60 rounded-xl text-base font-bold ${currentPlayer.ready ? QUIET : `${FILLED} bg-primary text-on-primary`}`}
								>
									{currentPlayer.ready ? 'Unready' : 'Ready up'}
								</button>
							)
						) : (
							<button onClick={() => send('lobby:join')} disabled={!connected || full} className={`${BUTTON} ${FILLED} h-[54px] w-60 rounded-xl bg-primary text-base font-bold text-on-primary`}>Join lobby</button>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}

export default function LobbyPage() {
	return (
		<RequireAuth>
			<LobbyContent />
		</RequireAuth>
	);
}
