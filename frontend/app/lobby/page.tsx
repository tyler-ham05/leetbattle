'use client';

import { Fragment, useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '../login/protected';
import { useAuth } from '../login/context';
import HomeTopBar from '../_home/components/topbar';
import PageLoader from '../_shared/page-loader';
import { useLobbySocket } from './socket-context';
import type { TeamId } from './socket-context';

const TEAMS: { id: TeamId; name: string; nameColor: string; fill: string; check: string }[] = [
	{ id: 'a', name: 'Team 1', nameColor: 'text-primary', fill: 'bg-primary text-on-primary', check: 'stroke-primary' },
	{ id: 'b', name: 'Team 2', nameColor: 'text-secondary', fill: 'bg-secondary text-page', check: 'stroke-secondary' },
];

const TEAM_SIZES = [1, 2, 3];
const TEAM_WORDS = ['', 'one', 'two', 'three'];

const BUTTON = 'lb-press inline-flex min-h-11 items-center justify-center rounded-[10px] px-5 text-sm font-semibold disabled:cursor-not-allowed';
const QUIET = 'border border-line text-ink hover:bg-raised disabled:text-muted disabled:hover:bg-transparent';
const FILLED = 'lb-press-lift disabled:opacity-50';

// One marker per lobby seat: team colours first, then players without a team, then empty seats.
function SeatPips({ teamA, teamB, waiting, seatCount }: { teamA: number; teamB: number; waiting: number; seatCount: number }) {
	const seats = [
		...Array<string>(teamA).fill('a'),
		...Array<string>(teamB).fill('b'),
		...Array<string>(waiting).fill('waiting'),
	].slice(0, seatCount);
	while (seats.length < seatCount) {
		seats.push('empty');
	}
	return (
		<div aria-hidden="true" className="flex gap-1">
			{seats.map((seat, i) => <span key={i} data-seat={seat} className="lb-seat-pip" />)}
		</div>
	);
}

// The line under the status row: it drains over the seconds left when the countdown started.
function CountdownDrain({ seconds }: { seconds: number }) {
	const [from] = useState(seconds);
	return (
		<div
			className="lb-drain h-full bg-primary"
			style={{ '--from': Math.min(from / 5, 1), animationDuration: `${from}s` } as CSSProperties}
		/>
	);
}

function LobbyContent() {
	const { user } = useAuth();
	const { socket, connected, lobby, error, matchReadiness, gameStarted, connect, clearError } = useLobbySocket();
	const router = useRouter();
	const [nameInput, setNameInput] = useState('');
	const [nameSaved, setNameSaved] = useState(false);

	useEffect(() => {
		connect();
	}, [connect]);

	const currentPlayer = lobby?.players.find((player) => player.userId === user?.id);
	// Only the match's players move to it; someone watching the lobby stays put.
	const joiningMatch = Boolean((matchReadiness || gameStarted) && currentPlayer);

	useEffect(() => {
		if (joiningMatch && gameStarted) router.push(`/game/${gameStarted.gameId}`);
	}, [joiningMatch, gameStarted, router]);

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
		setNameSaved(true);
	}

	const players = lobby?.players ?? [];
	const teamSize = lobby?.teamSize ?? 3;
	const seatCount = teamSize * 2;
	const isHost = Boolean(user && lobby?.hostId === user.id);
	const full = (lobby?.playerCount ?? 0) >= seatCount;
	const isLoading = !connected || !lobby;
	const seconds = lobby?.countdownSecondsRemaining ?? null;
	const counting = !isLoading && Boolean(currentPlayer) && seconds !== null;

	let status = 'Fill both teams with connected players to ready up';
	if (isLoading) {
		status = 'Connecting to lobby…';
	} else if (!currentPlayer) {
		status = full ? 'This lobby is full.' : 'You have not joined this lobby yet.';
	} else if (joiningMatch) {
		status = 'Joining match…';
	} else if (seconds !== null) {
		status = `Starting match in ${seconds}…`;
	} else if (lobby.canReady) {
		status = `${lobby.readyCount}/${seatCount} players ready`;
	}

	return (
		<div className="flex min-h-screen flex-col bg-page font-sans text-ink">
			<PageLoader variant="clash" />
			<HomeTopBar />
			<main className="flex-1 px-5 pt-12 pb-16">
				<div className="mx-auto flex max-w-[1040px] flex-col gap-8">
					<header className="flex flex-col gap-2">
						<h1 className="text-4xl font-extrabold leading-[1.05] tracking-[-0.035em]">Lobby</h1>
						<p className="text-[15px] text-muted">Two teams of {TEAM_WORDS[teamSize]}.</p>
					</header>

					<div>
						<div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 pb-5">
							<div className="flex min-h-11 flex-wrap items-center gap-x-6 gap-y-4">
								<div className="flex items-center gap-3">
									<SeatPips
										teamA={players.filter((player) => player.team === 'a').length}
										teamB={players.filter((player) => player.team === 'b').length}
										waiting={players.filter((player) => player.team === null).length}
										seatCount={seatCount}
									/>
									<span className="font-mono text-sm font-semibold">
										{lobby?.playerCount ?? 0} / {seatCount}<span className="sr-only"> players in the lobby</span>
									</span>
								</div>
								<div role="status" aria-live="polite" className="flex items-center gap-3 text-sm text-muted">
									{counting ? (
										<>
											<span className="sr-only">{status}</span>
											<span aria-hidden="true">Starting match in</span>
											<span key={seconds} aria-hidden="true" className="lb-second font-mono text-[28px] font-bold leading-none text-ink">{seconds}</span>
										</>
									) : (
										<span key={status} className="lb-fade-in">{status}</span>
									)}
								</div>
							</div>
							{currentPlayer
								? <button onClick={() => send('lobby:leave')} disabled={!connected} className={`${BUTTON} ${QUIET}`}>Leave lobby</button>
								: <button onClick={() => send('lobby:join')} disabled={!connected || full} className={`${BUTTON} ${FILLED} bg-primary text-on-primary`}>Join lobby</button>}
						</div>
						<div className="h-0.5 bg-line">
							{counting && seconds !== null && <CountdownDrain seconds={seconds} />}
						</div>
					</div>

					{error && <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error.message}</div>}

					{currentPlayer && (
						<div className="lb-fade-in flex flex-wrap items-center gap-3">
							<span id="lobby-team-size" className="text-sm font-medium">Players per team</span>
							{isHost ? (
								<div role="group" aria-labelledby="lobby-team-size" className="inline-flex rounded-[10px] border border-line p-1">
									{TEAM_SIZES.map((size) => (
										<button
											key={size}
											onClick={() => send('lobby:set-team-size', size)}
											disabled={!connected || size === teamSize}
											aria-pressed={size === teamSize}
											className={`lb-press min-h-9 rounded-lg px-4 font-mono text-sm font-semibold ${size === teamSize ? 'bg-primary text-on-primary' : 'text-ink hover:bg-raised'}`}
										>
											{size}v{size}
										</button>
									))}
								</div>
							) : (
								<span className="font-mono text-sm font-semibold">{teamSize}v{teamSize}</span>
							)}
							{!isHost && <span className="text-xs text-muted">Only the host can change this.</span>}
						</div>
					)}

					{currentPlayer && (
						<form onSubmit={saveName} className="lb-fade-in flex flex-col gap-1.5">
							<label htmlFor="lobby-display-name" className="text-sm font-medium">Your display name</label>
							<div className="flex flex-wrap items-center gap-3">
								<input
									id="lobby-display-name"
									value={nameInput || currentPlayer.displayName}
									onChange={(event) => {
										setNameInput(event.target.value);
										setNameSaved(false);
									}}
									maxLength={24}
									placeholder="Enter a name"
									className="h-11 w-full max-w-xs rounded-lg border border-line bg-page px-3.5 text-[15px] outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary focus:ring-[3px] focus:ring-primary/20"
								/>
								<button type="submit" disabled={!connected || nameInput.trim().length < 1 || nameInput.trim().length > 24 || nameInput.trim() === currentPlayer.displayName} className={`${BUTTON} ${QUIET}`}>Save name</button>
								{nameSaved && <span role="status" className="lb-fade-in text-sm font-medium text-primary">Saved</span>}
							</div>
							<p className="text-xs text-muted">This name is visible to everyone in the lobby.</p>
						</form>
					)}

					<div className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
						{TEAMS.map((team) => {
							const teamPlayers = players.filter((player) => player.team === team.id);
							const otherTeam: TeamId = team.id === 'a' ? 'b' : 'a';
							// Whether this card's team, the one a switch would move into, is full.
							const teamFull = teamPlayers.length >= teamSize;
							const isCurrentTeam = currentPlayer?.team === team.id;
							const isOtherTeam = currentPlayer?.team === otherTeam;
							const joinDisabled = !connected || (!isCurrentTeam && teamFull) || isCurrentTeam;
							const openSeats = Math.max(teamSize - teamPlayers.length, 0);

							return (
								<Fragment key={team.id}>
									{team.id === 'b' && <span aria-hidden="true" className="text-center font-mono text-[13px] font-bold tracking-[0.2em] text-muted">VS</span>}
									<section className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-6">
										<div className="flex items-baseline justify-between gap-3">
											<h2 className={`text-[22px] font-bold tracking-[-0.02em] ${team.nameColor}`}>{team.name}</h2>
											<span className="font-mono text-[13px] font-semibold text-muted">{teamPlayers.length}/{teamSize}</span>
										</div>
										<ul className="flex flex-col gap-2" aria-label={`${team.name} players`}>
											{teamPlayers.map((player) => (
												<li key={player.userId} className="lb-seat-in flex min-h-[60px] flex-wrap items-center justify-between gap-3 rounded-lg bg-page py-2 pr-2 pl-4">
													<span className="flex items-baseline gap-2.5">
														<span className="text-[15px] font-medium">{player.displayName}</span>
														{player.userId === user?.id && <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">You</span>}
													</span>
													<span className="flex items-center gap-3.5">
														{!player.connected
															? <span className="text-[13px] font-medium text-muted">Reconnecting…</span>
															: (
																<span className="inline-flex items-center gap-1.5">
																	{player.ready && <svg viewBox="0 0 16 16" aria-hidden="true" className={`lb-check ${team.check}`}><path d="M3 8.5l3.2 3.2L13 4.8" /></svg>}
																	<span className={`text-[13px] font-medium transition-colors duration-300 ${player.ready ? 'text-ink' : 'text-muted'}`}>{player.ready ? 'Ready' : 'Not ready'}</span>
																</span>
															)}
														{player.userId === user?.id && (
															<button
																onClick={() => send('lobby:set-ready', !player.ready)}
																disabled={!connected || !lobby?.canReady}
																className={`${BUTTON} px-4 ${player.ready ? QUIET : `${FILLED} ${team.fill}`}`}
															>
																{player.ready ? 'Unready' : 'Ready up'}
															</button>
														)}
													</span>
												</li>
											))}
											{Array.from({ length: openSeats }, (_, i) => (
												<li key={`open-${i}`} className="lb-fade-in flex min-h-[60px] items-center rounded-lg border border-dashed border-line px-4 text-sm text-muted">Open seat</li>
											))}
										</ul>
										{currentPlayer && (
											<button
												onClick={() => send('lobby:join-team', team.id)}
												disabled={joinDisabled}
												className={`${BUTTON} w-full ${joinDisabled ? QUIET : `${FILLED} ${team.fill}`}`}
											>
												{isCurrentTeam ? 'Your team' : teamFull ? 'Team full' : isOtherTeam ? `Switch to ${team.name}` : `Join ${team.name}`}
											</button>
										)}
									</section>
								</Fragment>
							);
						})}
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
