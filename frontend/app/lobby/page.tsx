'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import RequireAuth from '../login/protected';
import { useAuth } from '../login/context';
import HomeTopBar from '../_home/components/topbar';
import PageLoader from '../_shared/page-loader';
import { useLobbySocket } from './socket-context';
import type { TeamId } from './socket-context';

const TEAMS: { id: TeamId; name: string; accent: string }[] = [
	{ id: 'a', name: 'Team 1', accent: 'border-t-primary' },
	{ id: 'b', name: 'Team 2', accent: 'border-t-secondary' },
];

function LobbyContent() {
	const { user } = useAuth();
	const { socket, connected, lobby, error, matchReadiness, connect, clearError } = useLobbySocket();
	const [nameInput, setNameInput] = useState('');
	const [nameSaved, setNameSaved] = useState(false);

	useEffect(() => {
		connect();
	}, [connect]);

	const currentPlayer = lobby?.players.find((player) => player.userId === user?.id);

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
	const full = (lobby?.playerCount ?? 0) >= 6;
	const isLoading = !connected || !lobby;

	return (
		<div className="flex min-h-screen flex-col bg-page font-sans text-ink">
			<PageLoader variant="clash" />
			<HomeTopBar />
			<main className="flex-1 px-5 py-10 sm:px-8">
				<div className="mx-auto max-w-[1180px]">
					<header className="mb-8">
						<div>
							<h1 className="text-3xl font-bold tracking-tight">Join the lobby</h1>
							<p className="mt-2 text-sm text-muted">Join the six-player lobby, then choose a team.</p>
						</div>
					</header>

					{currentPlayer && (
						<form onSubmit={saveName} className="mb-5 flex flex-col gap-3 rounded-2xl border border-line bg-raised p-5 sm:flex-row sm:items-end">
							<div className="flex-1">
								<label htmlFor="lobby-display-name" className="mb-1 block text-sm font-medium">Your display name</label>
								<input
									id="lobby-display-name"
									value={nameInput || currentPlayer.displayName}
									onChange={(event) => {
										setNameInput(event.target.value);
										setNameSaved(false);
									}}
									maxLength={24}
									placeholder="Enter a name"
									className="w-full rounded-xl border border-line bg-page px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
								/>
								<p className="mt-1 text-xs text-muted">This name is visible to everyone in the lobby.</p>
							</div>
							<div className="flex items-center gap-3">
								<button type="submit" disabled={!connected || nameInput.trim().length < 1 || nameInput.trim().length > 24 || nameInput.trim() === currentPlayer.displayName} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">Save name</button>
								{nameSaved && <span role="status" className="text-sm font-medium text-primary">Saved</span>}
							</div>
						</form>
					)}

					<div className="mb-5 flex items-center justify-between rounded-2xl border border-line bg-raised px-5 py-4">
						<div>
							<div className="text-sm text-muted">Lobby players</div>
							<div className="mt-1 text-xl font-semibold">{lobby?.playerCount ?? 0} <span className="text-base font-normal text-muted">/ 6 players</span></div>
						</div>
						<div aria-live="polite" className="text-right text-sm text-muted">{isLoading ? 'Connecting to lobby…' : 'Live updates'}</div>
					</div>

					{error && <div role="alert" className="mb-5 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error.message}</div>}

					{!currentPlayer && (
						<div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-raised p-5">
							<div className="text-sm text-muted">{full ? 'This lobby is full.' : 'You have not joined this lobby yet.'}</div>
							<button onClick={() => send('lobby:join')} disabled={!connected || full} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">Join lobby</button>
						</div>
					)}

					<div className="grid gap-5 md:grid-cols-2">
						{TEAMS.map((team) => {
							const teamPlayers = players.filter((player) => player.team === team.id);
							const otherTeam: TeamId = team.id === 'a' ? 'b' : 'a';
							const otherTeamFull = players.filter((player) => player.team === otherTeam).length >= 3;
							const isCurrentTeam = currentPlayer?.team === team.id;
							const isOtherTeam = currentPlayer?.team === otherTeam;

							return (
								<section key={team.id} className={`rounded-2xl border border-line border-t-4 ${team.accent} bg-raised p-5`}>
									<div className="mb-5 flex items-center justify-between">
										<h2 className="text-xl font-semibold">{team.name}</h2>
										<span className="rounded-full bg-page px-3 py-1 text-sm text-muted">{teamPlayers.length}/3</span>
									</div>
									<ul className="mb-5 space-y-2" aria-label={`${team.name} players`}>
										{teamPlayers.length === 0 && <li className="rounded-md border border-dashed border-line px-4 py-5 text-center text-sm text-muted">No players yet</li>}
										{teamPlayers.map((player) => (
											<li key={player.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-page px-4 py-3 text-sm">
												<span className="flex items-center gap-2">
													{player.displayName}
													{player.userId === user?.id && <span className="text-xs font-medium text-primary">You</span>}
												</span>
												<span className="flex items-center gap-3">
													{!player.connected
														? <span className="text-xs text-muted">Reconnecting…</span>
														: <span className={`text-xs font-medium ${player.ready ? 'text-primary' : 'text-muted'}`}>{player.ready ? 'Ready' : 'Not ready'}</span>}
													{player.userId === user?.id && (
														<button
															onClick={() => send('lobby:set-ready', !player.ready)}
															disabled={!connected || !lobby?.canReady}
															className="rounded-lg border border-line px-3 py-1 text-xs font-semibold hover:bg-raised disabled:cursor-not-allowed disabled:opacity-50"
														>
															{player.ready ? 'Unready' : 'Ready up'}
														</button>
													)}
												</span>
											</li>
										))}
									</ul>
									{currentPlayer && (
										<button
											onClick={() => send('lobby:join-team', team.id)}
											disabled={!connected || (!isCurrentTeam && teamPlayers.length >= 3) || isCurrentTeam}
											className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
										>
											{isCurrentTeam ? 'Your team' : isOtherTeam ? (otherTeamFull ? 'Other team is full' : `Switch to ${team.name}`) : teamPlayers.length >= 3 ? 'Team full' : `Join ${team.name}`}
										</button>
									)}
								</section>
							);
						})}
					</div>

					{currentPlayer && (
						<div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-raised p-5">
							<button onClick={() => send('lobby:leave')} disabled={!connected} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-page disabled:opacity-50">Leave lobby</button>
							<div role="status" aria-live="polite" className="text-sm font-medium text-muted">
								{lobby?.countdownSecondsRemaining !== null && lobby?.countdownSecondsRemaining !== undefined
									? `Starting match in ${lobby.countdownSecondsRemaining}…`
									: lobby?.canReady
										? `${lobby.readyCount}/6 players ready`
										: 'Fill both teams with connected players to ready up'}
							</div>
						</div>
					)}

					{matchReadiness && <div role="status" className="mt-5 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-ink">All six players are ready. Lobby {matchReadiness.lobbyId} is ready for the match component.</div>}
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
