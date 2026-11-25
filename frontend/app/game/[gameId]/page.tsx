'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import RequireAuth from '../../login/protected';
import { useAuth } from '../../login/context';
import HomeTopBar from '../../_home/components/topbar';
import Spinner from '../../_shared/spinner';
import { teamsFor } from '../../_shared/teams';
import type { ShownTeam } from '../../_shared/teams';
import { EditorProvider, useEditor } from '../../editor/context';
import type { EditorWorkspace } from '../../editor/context';
import EditorLayout from '../../editor/components/editor-layout';
import TeamChat from '../../editor/components/team-chat';
import { ScoreLine } from '../../editor/components/scoreboard';
import { ChatProvider } from '../../editor/chat-context';
import BanScreen from '../components/ban-screen';
import PickScreen from '../components/pick-screen';
import WorkspaceSwitcher from '../components/workspace-switcher';
import ResultScreen from '../components/result-screen';
import ScoreFeed from '../components/score-feed';
import { GameSocketProvider, useGameSocket } from '../socket-context';
import type { GamePlayer, TeammateCode } from '../socket-context';

const BUTTON = 'lb-press inline-flex min-h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold disabled:cursor-not-allowed';

// 1200 -> "20:00"
function formatClock(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Counts down locally from the server's last `secondsRemaining`; every new
// game state resyncs it, so clients never drift far from the server's clock.
// The match clock (`warn`) turns red with under a minute left.
function Clock({ seconds, running, warn = false, className = 'font-mono text-[28px] font-bold leading-none text-ink' }: { seconds: number; running: boolean; warn?: boolean; className?: string }) {
	const [left, setLeft] = useState(seconds);

	useEffect(() => {
		setLeft(seconds);
		if (!running) return;
		const timer = setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1_000);
		return () => clearInterval(timer);
	}, [seconds, running]);

	return <span className={warn && left < 60 ? `${className} text-danger` : className}>{formatClock(left)}</span>;
}

function Roster({ team, players, userId }: { team: ShownTeam; players: GamePlayer[]; userId?: string }) {
	return (
		<section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
			<h2 className={`text-[20px] font-bold tracking-[-0.02em] ${team.color}`}>{team.name}</h2>
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
		<ul aria-label="Teammates" className="flex items-center gap-3">
			{teammates.map((teammate) => (
				<li key={teammate.userId} className="text-[13px] font-medium text-muted">
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
					<div role="dialog" aria-modal="true" aria-labelledby="forfeit-title" className="lb-enter flex w-full max-w-sm flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-lg">
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

// The practice editor on the problems left after the bans, plus a switcher
// above it so the player can look at their teammates' workspaces without
// losing their own editable tabs and code. A teammate's workspace reuses the
// exact same editor UI (EditorLayout, with its QuestionPanel / CodeTabs /
// Monaco), just driven by a second, read-only EditorProvider fed their shared
// code instead of this player's own.
// US-6-T-13: inside a teammate's read-only workspace, switches it once to the
// question they last edited, as soon as the match's questions have loaded.
// After that their own question switcher is free to move around.
function OpenOnQuestion({ questionId }: { questionId?: number }) {
	const { questions, setCurrentQuestion } = useEditor();
	const opened = useRef(false);
	useEffect(() => {
		const question = questions.find((entry) => entry.question_id === questionId);
		if (opened.current || !question) return;
		opened.current = true;
		setCurrentQuestion(question);
	}, [questions, questionId, setCurrentQuestion]);
	return null;
}

function MatchEditor({ questionIds, defaultQuestionId, submit, shareCode, teammates, teammateCode, teammateQuestion, teammateQuestionIds }: {
	questionIds: number[];
	// The question the player picked on the pick screen, if any (US-6-T-10).
	defaultQuestionId?: number;
	submit: (_questionId: number, _code: string) => Promise<import('../../editor/controller').SubmitResult>;
	shareCode: (_questionId: number, _workspace: EditorWorkspace) => void;
	teammates: GamePlayer[];
	teammateCode: TeammateCode;
	// The questionId each teammate last edited (US-6-T-13).
	teammateQuestion: Record<string, number>;
	// Each teammate's own questions (US-8-2): a teammate's picks are usually
	// a different subset of the pool than the viewer's own, so viewing them
	// read only needs their questions, not the viewer's.
	teammateQuestionIds: Record<string, number[]>;
}) {
	const [viewedUserId, setViewedUserId] = useState<string | null>(null);
	const viewedTeammate = teammates.find((teammate) => teammate.userId === viewedUserId) ?? null;

	// Always mounted, even while viewing a teammate, so this player's own
	// tabs and code never reset just from switching the workspace view away
	// and back (see context.tsx -- EditorProvider owns that state, not EditorLayout).
	return (
		<EditorProvider questionIds={questionIds} defaultQuestionId={defaultQuestionId} submit={submit} shareCode={shareCode}>
			<WorkspaceSwitcher teammates={teammates} viewedUserId={viewedUserId} onSelect={setViewedUserId} questionIds={questionIds} teammateQuestion={teammateQuestion} />
			{viewedTeammate ? (
				// The code tab bar says whose code this is (US-5-T-19).
				<EditorProvider key={viewedTeammate.userId} questionIds={teammateQuestionIds[viewedTeammate.userId] ?? []} readOnly ownerName={viewedTeammate.displayName} externalWorkspaces={teammateCode[viewedTeammate.userId] ?? {}} defaultQuestionId={teammateQuestion[viewedTeammate.userId]}>
					<OpenOnQuestion questionId={teammateQuestion[viewedTeammate.userId]} />
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
	const { socket, connected, game, result, error, connect, forfeit, ban, pick, unpick, submit, shareCode, teammateCode, teammateQuestion, chatHistory } = useGameSocket();
	const joined = connected && game !== null;
	const playing = joined && game.phase === 'playing' && !result;
	const banning = joined && game.phase === 'banning' && !result;
	const picking = joined && game.phase === 'picking' && !result;
	const myTeam = game?.players.find((entry) => entry.userId === user?.id)?.team;
	const teammates = game?.players.filter((entry) => entry.team === myTeam && entry.userId !== user?.id) ?? [];
	// The questions exclusively assigned to the signed-in player (US-8-2), not
	// the whole shared pool. A 1v1 never bans or picks at all, and a player
	// who somehow ends up with none of their own still needs something to
	// play, so both fall back to the full pool.
	const myOwnQuestionIds = myTeam
		? game?.problemPool.filter((problem) => problem.pickedBy?.[myTeam]?.userId === user?.id).map((problem) => problem.questionId) ?? []
		: [];
	const myQuestionIds = myOwnQuestionIds.length > 0 ? myOwnQuestionIds : (game?.problemPool.map((problem) => problem.questionId) ?? []);
	// Each teammate's own questions (US-8-2), for viewing their workspace read
	// only -- a teammate's picks are usually a different subset of the pool
	// than the viewer's, so the switcher can't reuse myQuestionIds for them.
	const teammateQuestionIds: Record<string, number[]> = {};
	for (const teammate of teammates) {
		teammateQuestionIds[teammate.userId] = myTeam
			? game?.problemPool.filter((problem) => problem.pickedBy?.[myTeam]?.userId === teammate.userId).map((problem) => problem.questionId) ?? []
			: [];
	}
	// The first of the player's own picks, so it carries over as their default editor tab.
	const myPick = myQuestionIds[0];

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
				<HomeTopBar
					center={<ScoreLine scores={game.scores} myTeam={myTeam} solo={game.players.length === 2} time={<Clock seconds={game.secondsRemaining} running warn className="" />} />}
					actions={(
						<>
							<ConnectedTeammates teammates={teammates.filter((entry) => entry.connected)} />
							<ForfeitControl onForfeit={forfeit} />
						</>
					)}
				/>
				<ScoreFeed pool={game.problemPool} solved={game.solved} myTeam={myTeam} />
				{errorAlert}
				{/* Team chat (US-3-T-2) goes over the game socket, so only teammates see it,
				    and starts with the team's earlier messages (US-3-T-3).
				    The provider wraps the whole editor so its messages survive switching workspaces. */}
				<ChatProvider socket={socket} history={chatHistory}>
					<MatchEditor
						questionIds={myQuestionIds}
						defaultQuestionId={myPick}
						submit={submit}
						shareCode={shareCode}
						teammates={teammates}
						teammateCode={teammateCode}
						teammateQuestion={teammateQuestion}
						teammateQuestionIds={teammateQuestionIds}
					/>
				</ChatProvider>
			</div>
		);
	}

	// Once the match is over, the result takes the whole page (full width, like settings).
	if (result) {
		return (
			<div className="flex min-h-screen flex-col bg-page font-sans text-ink">
				<HomeTopBar />
				<ResultScreen result={result} myTeam={myTeam} scores={game?.scores ?? { a: 0, b: 0 }} players={game?.players ?? []} pool={game?.problemPool ?? []} solved={game?.solved ?? { a: [], b: [] }} />
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col bg-page font-sans text-ink">
			<HomeTopBar />
			<main className="flex-1 px-5 pt-12 pb-16">
				<div className="mx-auto flex max-w-[1040px] flex-col gap-8">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div className="flex flex-col gap-2">
							<h1 className="text-4xl font-extrabold leading-[1.05] tracking-[-0.035em]">Match</h1>
						</div>
						{joined && (
							<div className="flex items-center gap-6">
								{banning && <span className="flex items-baseline gap-2"><span className="text-sm text-muted">Bans close in</span><Clock seconds={game.banSecondsRemaining} running /></span>}
								{picking && <span className="flex items-baseline gap-2"><span className="text-sm text-muted">Picks close in</span><Clock seconds={game.pickSecondsRemaining} running /></span>}
								{!banning && !picking && <Clock seconds={game.secondsRemaining} running={game.phase === 'playing'} warn />}
							</div>
						)}
					</div>

					{errorAlert}

					{!joined && !error && <p role="status" aria-live="polite" className="flex items-center gap-2.5 text-sm text-muted"><Spinner />Joining match…</p>}

					{joined && (
						<>
							{game.phase === 'waiting' && (
								<p role="status" aria-live="polite" className="text-sm text-muted">
									Waiting for players ({game.players.filter((player) => player.connected).length}/{game.players.length})
								</p>
							)}

							<div className="grid gap-5 md:grid-cols-2">
								{/* The player's own team first, in the primary color (US-5-T-22). */}
								{teamsFor(myTeam).map((team) => (
									<Roster key={team.id} team={team} players={game.players.filter((player) => player.team === team.id)} userId={user?.id} />
								))}
							</div>

							{banning && <BanScreen problems={game.problemPool} playerCount={game.players.length} myTeam={myTeam} onBan={ban} />}

							{picking && myTeam && (
								<PickScreen
									problems={game.problemPool}
									teamSize={game.players.filter((player) => player.team === myTeam).length}
									myTeam={myTeam}
									onPick={pick}
									onUnpick={unpick}
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
