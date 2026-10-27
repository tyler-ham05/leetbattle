'use client';

import { useEffect, useState } from 'react';

type TeamId = 'a' | 'b';

interface LobbyPlayer {
	playerId: string;
	displayName: string;
	team: TeamId;
}

interface LobbyState {
	players: LobbyPlayer[];
	currentPlayerId: string;
}

interface LobbySession {
	playerId: string;
	displayName: string;
	token: string;
}

const API_URL = process.env.NEXT_PUBLIC_CODE_URL ?? 'http://127.0.0.1:4001';
const SESSION_KEY = 'leetbattle.lobby.session';
const TEAMS: { id: TeamId; name: string; accent: string }[] = [
	{ id: 'a', name: 'Team 1', accent: 'border-t-zinc-900 dark:border-t-zinc-100' },
	{ id: 'b', name: 'Team 2', accent: 'border-t-zinc-900 dark:border-t-zinc-100' },
];

async function responseError(response: Response): Promise<string> {
	const body = (await response.json().catch(() => null)) as { error?: string } | null;
	return body?.error ?? `Request failed (${response.status})`;
}

async function createOrResumeSession(): Promise<LobbySession> {
	const storedToken = window.localStorage.getItem(SESSION_KEY);
	const response = await fetch(`${API_URL}/lobby/session`, {
		method: 'POST',
		headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
	});
	if (!response.ok) {
		throw new Error(await responseError(response));
	}
	const session = (await response.json()) as LobbySession;
	window.localStorage.setItem(SESSION_KEY, session.token);
	return session;
}

async function fetchLobby(token: string): Promise<LobbyState> {
	const response = await fetch(`${API_URL}/lobby`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!response.ok) {
		throw new Error(await responseError(response));
	}
	return (await response.json()) as LobbyState;
}

export default function LobbyPage() {
	const [session, setSession] = useState<LobbySession | null>(null);
	const [lobby, setLobby] = useState<LobbyState | null>(null);
	const [nameInput, setNameInput] = useState('');
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [savingName, setSavingName] = useState(false);
	const [nameSaved, setNameSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		let refreshTimer: ReturnType<typeof setInterval> | undefined;

		async function start() {
			try {
				const nextSession = await createOrResumeSession();
				if (!active) return;
				setSession(nextSession);
				setNameInput(nextSession.displayName);

				const refresh = async () => {
					try {
						const nextLobby = await fetchLobby(nextSession.token);
						if (active) {
							setLobby(nextLobby);
							setError(null);
						}
					} catch (err) {
						if (active) setError(err instanceof Error ? err.message : 'Could not load lobby');
					}
					finally {
						if (active) setLoading(false);
					}
				};

				await refresh();
				refreshTimer = setInterval(refresh, 2500);
			} catch (err) {
				if (active) {
					setError(err instanceof Error ? err.message : 'Could not connect to the lobby service');
					setLoading(false);
				}
			}
		}

		void start();
		return () => {
			active = false;
			if (refreshTimer) clearInterval(refreshTimer);
		};
	}, []);

	async function updateMembership(method: 'POST' | 'DELETE', team?: TeamId) {
		if (!session || busy) return;
		setBusy(true);
		setError(null);
		try {
			const response = await fetch(
				`${API_URL}/lobby/${method === 'DELETE' ? 'leave' : 'join'}`,
				{
					method,
					headers: {
						Authorization: `Bearer ${session.token}`,
						...(team ? { 'Content-Type': 'application/json' } : {}),
					},
					...(team ? { body: JSON.stringify({ team }) } : {}),
				},
			);
			if (!response.ok) throw new Error(await responseError(response));
			setLobby(await fetchLobby(session.token));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not update your team');
		} finally {
			setBusy(false);
		}
	}

	async function saveName(event: { preventDefault: () => void }) {
		event.preventDefault();
		if (!session || savingName) return;

		const displayName = nameInput.trim();
		if (displayName.length < 1 || displayName.length > 24) {
			setError('Choose a name between 1 and 24 characters.');
			return;
		}

		setSavingName(true);
		setNameSaved(false);
		setError(null);
		try {
			const response = await fetch(`${API_URL}/lobby/name`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${session.token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ displayName }),
			});
			if (!response.ok) throw new Error(await responseError(response));

			const result = (await response.json()) as { displayName: string };
			const updatedSession = { ...session, displayName: result.displayName };
			setSession(updatedSession);
			setNameInput(result.displayName);
			setLobby(await fetchLobby(session.token));
			setNameSaved(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not update your name');
		} finally {
			setSavingName(false);
		}
	}

	const players = lobby?.players ?? [];
	const currentPlayerTeam = players.find((player) => player.playerId === lobby?.currentPlayerId)?.team;

	return (
		<main className="min-h-screen bg-zinc-50 px-5 py-10 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100 sm:px-8">
			<div className="mx-auto max-w-5xl">
				<header className="mb-6">
					<div>
						<p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
							LeetBattle
						</p>
						<h1 className="text-2xl font-semibold tracking-tight">Join the lobby</h1>
						<p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Pick a team. Each team has room for three players.</p>
					</div>
				</header>

				<form onSubmit={saveName} className="mb-5 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-end">
					<div className="flex-1">
						<label htmlFor="lobby-display-name" className="mb-1 block text-sm font-medium">Your display name</label>
						<input
							id="lobby-display-name"
							value={nameInput}
							onChange={(event) => {
								setNameInput(event.target.value);
								setNameSaved(false);
							}}
							maxLength={24}
							placeholder="Enter a name"
							disabled={!session || savingName}
							className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
						/>
						<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">This name is visible to everyone in the lobby.</p>
					</div>
					<div className="flex items-center gap-3">
						<button
							type="submit"
							disabled={!session || savingName || nameInput.trim() === session.displayName}
							className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{savingName ? 'Saving…' : 'Save name'}
						</button>
						{nameSaved && <span role="status" className="text-sm text-green-600 dark:text-green-400">Saved</span>}
					</div>
				</form>

				<div className="mb-5 flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950">
					<div>
						<div className="text-sm text-zinc-500 dark:text-zinc-400">Lobby capacity</div>
						<div className="mt-1 text-xl font-semibold">{players.length} <span className="text-base font-normal text-zinc-500 dark:text-zinc-400">/ 6 players</span></div>
					</div>
					<div aria-live="polite" className="text-right text-sm text-zinc-500 dark:text-zinc-400">
						{loading ? 'Connecting to lobby…' : 'Player counts refresh automatically'}
					</div>
				</div>

				{error && (
					<div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
						{error}
					</div>
				)}

				<div className="grid gap-5 md:grid-cols-2">
					{TEAMS.map((team) => {
						const teamPlayers = players.filter((player) => player.team === team.id);
						const isCurrentTeam = currentPlayerTeam === team.id;
						const otherTeam = team.id === 'a' ? 'b' : 'a';
						const otherTeamFull = players.filter((player) => player.team === otherTeam).length >= 3;

						return (
							<section key={team.id} className={`rounded-lg border border-zinc-200 border-t-4 ${team.accent} bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950`}>
								<div className="mb-5 flex items-center justify-between">
									<h2 className="text-xl font-semibold">{team.name}</h2>
									<span className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{teamPlayers.length}/3</span>
								</div>
								<ul className="mb-5 space-y-2" aria-label={`${team.name} players`}>
									{teamPlayers.length === 0 && (
										<li className="rounded-md border border-dashed border-zinc-300 px-4 py-5 text-center text-sm text-zinc-500 dark:border-zinc-700">No players yet</li>
									)}
									{teamPlayers.map((player) => (
										<li key={player.playerId} className="flex items-center justify-between rounded-md bg-zinc-50 px-4 py-3 text-sm dark:bg-zinc-900">
											<span>{player.displayName}</span>
											{player.playerId === lobby?.currentPlayerId && <span className="text-xs text-green-600 dark:text-green-400">You</span>}
										</li>
									))}
								</ul>

								{isCurrentTeam ? (
									<div className="flex flex-wrap gap-2">
										<button
											onClick={() => updateMembership('POST', otherTeam)}
											disabled={busy || otherTeamFull}
											className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
										>
											{busy ? 'Updating…' : otherTeamFull ? 'Other team is full' : `Switch to Team ${otherTeam === 'a' ? '1' : '2'}`}
										</button>
										<button
											onClick={() => updateMembership('DELETE')}
											disabled={busy}
											className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
										>
											Leave lobby
										</button>
									</div>
								) : currentPlayerTeam ? (
									<div className="rounded-md border border-zinc-200 px-4 py-2.5 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
										You are on {currentPlayerTeam === 'a' ? 'Team 1' : 'Team 2'}
									</div>
								) : (
									<button
										onClick={() => updateMembership('POST', team.id)}
										disabled={busy || teamPlayers.length >= 3 || loading || !session}
										className="w-full rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
									>
										{busy ? 'Updating…' : teamPlayers.length >= 3 ? 'Team full' : `Join ${team.name}`}
									</button>
								)}
							</section>
						);
					})}
				</div>

				<p className="mt-5 text-center text-xs text-zinc-500 dark:text-zinc-400">
					You can join without creating an account. This anonymous player identity is saved in this browser.
				</p>
			</div>
		</main>
	);
}
