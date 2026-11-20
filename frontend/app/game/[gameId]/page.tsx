'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import RequireAuth from '../../login/protected';
import { useAuth } from '../../login/context';
import HomeTopBar from '../../_home/components/topbar';
import PageLoader from '../../_shared/page-loader';
import type { TeamId } from '../../lobby/socket-context';
import { EditorProvider } from '../../editor/context';
import type { EditorWorkspace } from '../../editor/context';
import EditorLayout from '../../editor/components/editor-layout';
import TeamChat from '../../editor/components/team-chat';
import { ScoreLine } from '../../editor/components/scoreboard';
import { ChatProvider } from '../../editor/chat-context';
import BanScreen from '../components/ban-screen';
import PickScreen from '../components/pick-screen';
import WorkspaceSwitcher from '../components/workspace-switcher';
import { GameSocketProvider, useGameSocket } from '../socket-context';
import type { GamePlayer, GameResult, TeammateCode } from '../socket-context';

const TEAMS: { id: TeamId; name: string; nameColor: string }[] = [
	{ id: 'a', name: 'Team 1', nameColor: 'text-primary' },
	{ id: 'b', name: 'Team 2', nameColor: 'text-secondary' },
];

const teamName = (team: TeamId) => TEAMS.find((entry) => entry.id === team)?.name ?? '';

// How the result screen explains why the game ended.
const END_REASONS: Record<GameResult['reason'], string> = {
	forfeit: 'by forfeit',
	disconnect: 'by disconnect: the other team left the match',
	time: 'when time ran out',
	solved: 'by solving every problem',
};

const BUTTON = 'lb-press inline-flex min-h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold disabled:cursor-not-allowed';

// 1200 -> "20:00"
function formatClock(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Counts down locally from the server's last `secondsRemaining`; every new
// game state resyncs it, so clients never drift far from the server's clock.
function Clock({ seconds, running, className = 'font-mono text-[28px] font-bold leading-none text-ink' }: { seconds: number; running: boolean; className?: string }) {
	const [left, setLeft] = useState(seconds);

	useEffect(() => {
		setLeft(seconds);
		if (!running) return;
		const timer = setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1_000);
		return () => clearInterval(timer);
	}, [seconds, running]);

	return <span className={className}>{formatClock(left)}</span>;
}

function Roster({ team, players, userId }: { team: typeof TEAMS[number]; players: GamePlayer[]; userId?: string }) {
	return (
		<section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
			<h2 className={`text-[20px] font-bold tracking-[-0.02em] ${team.nameColor}`}>{team.name}</h2>
			<ul className="flex flex-col gap-2" aria-label={`${team.name} players`}>
				{players.map((player) => (
					<li key={player.userId} className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-page px-4 py-2">
						<span className="flex items-baseline gap-2.5">
							<span className="text-[15px] font-medium">{player.displayName}</span>
							{player.userId === userId && <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">You</span>}
						</span>
						{player.left
							? <span className="text-[13px] font-medium text-muted">Left</span>
							: !player.connected && <span className="text-[13px] font-medium text-muted">Reconnecting…</span>}
					</li>
				))}
			</ul>
		</section>
	);
}

// The player's connected teammates, by name, just left of Forfeit in the top
// bar: the people whose confirmation a forfeit needs. Nothing when none are left.
function ConnectedTeammates({ teammates }: { teammates: GamePlayer[] }) {
	if (teammates.length === 0) return null;
	return (
		<ul aria-label="Teammates" className="flex items-center gap-1.5">
			{teammates.map((teammate) => (
				<li key={teammate.userId} className="rounded-full border border-line bg-raised px-2.5 py-0.5 text-[13px] font-medium text-muted">
					{teammate.displayName}
				</li>
			))}
		</ul>
	);
}

// The top-bar button plus its confirmation. Once sent it stays disabled: the
// team forfeits when every connected teammate has confirmed.
function ForfeitControl({ onForfeit }: { onForfeit: () => void }) {
	const [confirming, setConfirming] = useState(false);
	const [sent, setSent] = useState(false);

	return (
		<>
			<button onClick={() => setConfirming(true)} disabled={sent} className={`${BUTTON} border border-danger/40 text-danger hover:bg-danger/10 disabled:opacity-50 disabled:hover:bg-transparent`}>
				Forfeit
			</button>
			{confirming && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-page/70 px-4">
					<div role="dialog" aria-modal="true" aria-labelledby="forfeit-title" className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-lg">
						<h2 id="forfeit-title" className="text-lg font-bold">Forfeit the match?</h2>
						<p className="text-sm text-muted">Your team forfeits once every connected teammate confirms. This can&apos;t be undone.</p>
						<div className="flex justify-end gap-3">
							<button autoFocus onClick={() => setConfirming(false)} className={`${BUTTON} border border-line text-ink hover:bg-raised`}>Cancel</button>
							<button
								onClick={() => {
									onForfeit();
									setSent(true);
									setConfirming(false);
								}}
								className={`${BUTTON} bg-danger text-page`}
							>
								Forfeit
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

// The end of the match. myTeam is the viewer's team (undefined when they aren't
// one of the players), so a draw or an onlooker gets neither Victory nor Defeat.
// scores are the last game:state's, as the match stood when it ended.
function ResultScreen({ result, myTeam, scores }: { result: GameResult; myTeam?: TeamId; scores?: Record<TeamId, number> }) {
	const outcome = result.winner && myTeam ? (result.winner === myTeam ? 'Victory' : 'Defeat') : null;
	return (
		<section className="flex flex-col items-start gap-4 rounded-xl border border-line bg-surface p-8">
			{outcome && <p className={`text-sm font-semibold uppercase tracking-wide ${outcome === 'Victory' ? 'text-primary' : 'text-danger'}`}>{outcome}</p>}
			<h2 className="text-4xl font-extrabold tracking-[-0.035em]">{result.winner ? `${teamName(result.winner)} wins` : 'Draw'}</h2>
			<p className="text-[15px] text-muted">
				{result.winner ? `Won ${END_REASONS[result.reason]}.` : 'Time ran out with the scores level.'}
			</p>
			{scores && (
				<ul aria-label="Final scores" className="flex flex-col gap-1">
					{TEAMS.map((team) => (
						<li key={team.id} className="flex items-baseline gap-3 text-[15px]">
							<span className={`font-semibold ${team.nameColor}`}>{team.name}</span> <span className="tabular-nums">{scores[team.id]}</span>
						</li>
					))}
				</ul>
			)}
			<Link href="/lobby" className={`${BUTTON} min-h-11 bg-primary text-on-primary`}>Back to lobby</Link>
		</section>
	);
}

// The practice editor on the problems left after the bans, plus a switcher
// above it so the player can look at their teammates' workspaces without
// losing their own editable tabs and code. A teammate's workspace reuses the
// exact same editor UI (EditorLayout, with its QuestionPanel / CodeTabs /
// Monaco), just driven by a second, read-only EditorProvider fed their shared
// code instead of this player's own.
function MatchEditor({ questionIds, defaultQuestionId, submit, shareCode, teammates, teammateCode }: {
	questionIds: number[];
	// The question the player picked on the pick screen, if any (US-6-T-10).
	defaultQuestionId?: number;
	submit: (_questionId: number, _code: string) => Promise<import('../../editor/controller').SubmitResult>;
	shareCode: (_questionId: number, _workspace: EditorWorkspace) => void;
	teammates: GamePlayer[];
	teammateCode: TeammateCode;
}) {
	const [viewedUserId, setViewedUserId] = useState<string | null>(null);
	const viewedTeammate = teammates.find((teammate) => teammate.userId === viewedUserId) ?? null;

	// Always mounted, even while viewing a teammate, so this player's own
	// tabs and code never reset just from switching the workspace view away
	// and back (see context.tsx -- EditorProvider owns that state, not EditorLayout).
	return (
		<EditorProvider questionIds={questionIds} defaultQuestionId={defaultQuestionId} submit={submit} shareCode={shareCode}>
			<WorkspaceSwitcher teammates={teammates} viewedUserId={viewedUserId} onSelect={setViewedUserId} />
			{viewedTeammate ? (
				// The code tab bar says whose code this is (US-5-T-19).
				<EditorProvider key={viewedTeammate.userId} questionIds={questionIds} readOnly ownerName={viewedTeammate.displayName} externalWorkspaces={teammateCode[viewedTeammate.userId] ?? {}}>
					<EditorLayout belowQuestion={<TeamChat />} />
				</EditorProvider>
			) : (
				<EditorLayout belowQuestion={<TeamChat />} />
			)}
		</EditorProvider>
	);
}

function GameContent() {
	const { gameId } = useParams<{ gameId: string }>();
	const { user } = useAuth();
	const { socket, connected, game, result, error, connect, forfeit, ban, pick, submit, shareCode, teammateCode } = useGameSocket();
	const joined = connected && game !== null;
	const playing = joined && game.phase === 'playing' && !result;
	const banning = joined && game.phase === 'banning' && !result;
	const picking = joined && game.phase === 'picking' && !result;
	const myTeam = game?.players.find((entry) => entry.userId === user?.id)?.team;
	const teammates = game?.players.filter((entry) => entry.team === myTeam && entry.userId !== user?.id) ?? [];
	// The player's own pick, if any, so it carries over as their default editor tab.
	const myPick = myTeam && game?.problemPool.find((problem) => problem.pickedBy?.[myTeam]?.userId === user?.id);

	useEffect(() => {
		connect(gameId);
	}, [connect, gameId]);

	const errorAlert = error && !result && (
		<div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
			<span>{error.message}</span>
			<Link href="/lobby" className="font-semibold underline underline-offset-4">Back to lobby</Link>
		</div>
	);

	// While playing, the editor fills the page like practice: no heading or
	// rosters, the score and clock in the middle of the top bar (US-5-T-19).
	if (playing) {
		return (
			<div className="flex h-screen flex-col bg-page font-sans text-ink">
				<PageLoader variant="pen" />
				<HomeTopBar
					center={<ScoreLine scores={game.scores} time={<Clock seconds={game.secondsRemaining} running className="" />} />}
					actions={(
						<>
							<ConnectedTeammates teammates={teammates.filter((entry) => entry.connected)} />
							<ForfeitControl onForfeit={forfeit} />
						</>
					)}
				/>
				{errorAlert}
				{/* Team chat (US-3-T-2) goes over the game socket, so only teammates see it.
				    The provider wraps the whole editor so its messages survive switching workspaces. */}
				<ChatProvider socket={socket}>
					<MatchEditor
						questionIds={game.problemPool.map((problem) => problem.questionId)}
						defaultQuestionId={myPick ? myPick.questionId : undefined}
						submit={submit}
						shareCode={shareCode}
						teammates={teammates}
						teammateCode={teammateCode}
					/>
				</ChatProvider>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col bg-page font-sans text-ink">
			<PageLoader variant="pen" />
			<HomeTopBar />
			<main className="flex-1 px-5 pt-12 pb-16">
				<div className="mx-auto flex max-w-[1040px] flex-col gap-8">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div className="flex flex-col gap-2">
							<h1 className="text-4xl font-extrabold leading-[1.05] tracking-[-0.035em]">Match</h1>
							<p className="text-[15px] text-muted">Two teams, the same problems, twenty minutes.</p>
						</div>
						{joined && !result && (
							<div className="flex items-center gap-6">
								<span className="font-mono text-sm font-semibold"><span className="text-primary">{game.scores.a}</span> – <span className="text-secondary">{game.scores.b}</span></span>
								{banning && <span className="flex items-baseline gap-2"><span className="text-sm text-muted">Bans close in</span><Clock seconds={game.banSecondsRemaining} running /></span>}
								{picking && <span className="flex items-baseline gap-2"><span className="text-sm text-muted">Picks close in</span><Clock seconds={game.pickSecondsRemaining} running /></span>}
								{!banning && !picking && <Clock seconds={game.secondsRemaining} running={game.phase === 'playing'} />}
							</div>
						)}
					</div>

					{result && <ResultScreen result={result} myTeam={myTeam} scores={game?.scores} />}

					{errorAlert}

					{!joined && !error && !result && <p role="status" aria-live="polite" className="text-sm text-muted">Joining match…</p>}

					{joined && !result && (
						<>
							{game.phase === 'waiting' && (
								<p role="status" aria-live="polite" className="text-sm text-muted">
									Waiting for players ({game.players.filter((player) => player.connected).length}/{game.players.length})
								</p>
							)}

							<div className="grid gap-5 md:grid-cols-2">
								{TEAMS.map((team) => (
									<Roster key={team.id} team={team} players={game.players.filter((player) => player.team === team.id)} userId={user?.id} />
								))}
							</div>

							{banning && <BanScreen problems={game.problemPool} playerCount={game.players.length} onBan={ban} />}

							{picking && myTeam && (
								<PickScreen
									problems={game.problemPool}
									teamSize={game.players.filter((player) => player.team === myTeam).length}
									myTeam={myTeam}
									onPick={pick}
								/>
							)}
						</>
					)}
				</div>
			</main>
		</div>
	);
}

export default function GamePage() {
	return (
		<RequireAuth>
			<GameSocketProvider>
				<GameContent />
			</GameSocketProvider>
		</RequireAuth>
	);
}
