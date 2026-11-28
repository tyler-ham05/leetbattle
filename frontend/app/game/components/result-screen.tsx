'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { TeamId } from '../../lobby/socket-context';
import type { GamePlayer, GameResult, PoolProblem } from '../socket-context';
import { useCountUp } from '../../_shared/use-count-up';
import { teamsFor } from '../../_shared/teams';
import type { ShownTeam } from '../../_shared/teams';
import { titleFromTaskId } from '../../editor/components/question-panel';

// When things come in, in seconds: the word lands and moves up first, then
// the halves rise, the scores count up, the crowns drop and the buttons follow.
const HALVES_AT = 1.55;
// The halves are fully in at 2.05s, so the count starts just before that and
// runs long enough to be seen; the crowns drop as it lands.
const COUNT_FROM_MS = 1900;
const COUNT_FOR_MS = 1100;
const CROWNS_AT = 2.95;
const BREAKDOWN_AT = 3.05;
const BUTTONS_AT = 3.25;

const BUTTON = 'lb-press inline-flex min-h-11 items-center rounded-lg px-5 text-sm font-semibold';

function Crown({ delay, fill }: { delay: number; fill: string }) {
	return (
		<span className="lb-result-crown" style={{ '--d': `${delay}s` } as CSSProperties}>
			<svg role="img" aria-label="Winner" width="22" height="22" viewBox="0 0 24 24" className={fill}>
				<path d="M3 7l5 5 4-7 4 7 5-5-2 12H5z" />
			</svg>
		</span>
	);
}

// One team's half: its name and score, then its players. The first half (the
// user's own team) reads left to right, the other mirrors it. The winners each get a crown.
function TeamHalf({ team, score, players, won, side }: { team: ShownTeam; score: number; players: GamePlayer[]; won: boolean; side: 'left' | 'right' }) {
	const shown = useCountUp(score, COUNT_FROM_MS, COUNT_FOR_MS);
	const left = side === 'left';
	const name = <h2 className={`text-[32px] font-extrabold tracking-[-0.03em] ${team.color}`}>{team.name}</h2>;
	const number = (
		<span data-testid="final-score" className={`text-8xl font-black leading-[0.8] tracking-[-0.05em] ${won ? team.color : 'text-muted'}`}>{shown}</span>
	);

	return (
		<section
			aria-label={team.name}
			className={`flex flex-[1_1_320px] flex-col gap-6 py-10 ${left ? 'border-line md:border-r md:pr-12' : 'md:pl-12'}`}
		>
			<div className="flex items-baseline justify-between gap-4">
				{left ? <>{name}{number}</> : <>{number}{name}</>}
			</div>
			<ul className={`flex flex-col gap-3.5 ${left ? '' : 'items-end'}`}>
				{players.map((player, i) => (
					<li key={player.userId} className={`flex items-center gap-3 text-2xl tracking-[-0.02em] ${won ? 'font-bold text-ink' : 'font-semibold text-muted'}`}>
						{won && <Crown delay={CROWNS_AT + i * 0.12} fill={team.fill} />}
						{/* US-7-T-5: every name opens that player's profile. */}
						<Link href={`/profile/${player.userId}`} className="underline-offset-4 hover:underline">{player.displayName}</Link>
					</li>
				))}
			</ul>
		</section>
	);
}

// Under the halves (US-4-T-6): each question in the pool, by position and
// title, and whether each team solved it.
function Breakdown({ teams, pool, solved }: { teams: ShownTeam[]; pool: PoolProblem[]; solved: Record<TeamId, string[]> }) {
	return (
		<table aria-label="Questions" className="lb-result-rise mx-auto w-full max-w-2xl text-left text-[15px]" style={{ '--d': `${BREAKDOWN_AT}s` } as CSSProperties}>
			<thead>
				<tr className="border-b border-line text-sm text-muted">
					<th className="py-2 font-medium">Question</th>
					{teams.map((team) => <th key={team.id} className="w-32 py-2 font-medium">{team.name}</th>)}
				</tr>
			</thead>
			<tbody>
				{pool.map((problem, i) => (
					<tr key={problem.taskId} className="border-b border-line">
						<th scope="row" className="py-2.5 font-medium text-ink">
							<span className="font-mono text-muted">Q{i + 1}</span> {titleFromTaskId(problem.taskId)}
						</th>
						{teams.map((team) => (solved[team.id].includes(problem.taskId)
							? <td key={team.id} className={`py-2.5 font-semibold ${team.color}`}>Solved</td>
							: <td key={team.id} className="py-2.5 text-muted">–</td>))}
					</tr>
				))}
			</tbody>
		</table>
	);
}

// The end of the match. myTeam is the viewer's team (undefined when they
// aren't one of the players), so a draw or an onlooker gets neither Victory!
// nor Defeat, just who won.
export default function ResultScreen({ result, myTeam, scores, players, pool, solved }: {
	result: GameResult;
	myTeam?: TeamId;
	scores: Record<TeamId, number>;
	players: GamePlayer[];
	pool: PoolProblem[];
	solved: Record<TeamId, string[]>;
}) {
	const winner = result.winner;
	const won = winner !== null && winner === myTeam;
	const word = winner === null ? 'Draw' : myTeam ? (won ? 'Victory!' : 'Defeat') : null;
	const teams = teamsFor(myTeam);
	const winnerTeam = teams.find((team) => team.id === winner);

	return (
		<main className={`flex flex-1 flex-col gap-10 overflow-hidden px-[clamp(24px,8vw,110px)] pt-12 pb-16 ${won ? 'lb-result-jolt' : ''}`}>
			<div data-testid="result-word" className={`flex flex-col items-center gap-3.5 text-center ${word === 'Defeat' ? 'lb-result-sink' : 'lb-result-slam'}`}>
				{word && (
					<h1 className={`text-[clamp(56px,8vw,104px)] font-black leading-[0.9] tracking-[-0.055em] ${word === 'Defeat' ? 'text-danger' : 'text-ink'}`}>{word}</h1>
				)}
				{winnerTeam && <h2 className={`text-[28px] font-extrabold tracking-[-0.03em] ${winnerTeam.color}`}>{winnerTeam.name} wins</h2>}
			</div>

			{/* The frame comes in with the halves, so the word never slams into an empty box. */}
			<div className="lb-result-rise flex flex-wrap border-y border-line" style={{ '--d': `${HALVES_AT}s` } as CSSProperties}>
				{teams.map((team, i) => (
					<TeamHalf
						key={team.id}
						team={team}
						score={scores[team.id]}
						players={players.filter((player) => player.team === team.id)}
						won={winner === team.id}
						side={i === 0 ? 'left' : 'right'}
					/>
				))}
			</div>

			<Breakdown teams={teams} pool={pool} solved={solved} />

			<div className="lb-result-rise flex flex-wrap justify-center gap-3" style={{ '--d': `${BUTTONS_AT}s` } as CSSProperties}>
				<Link href="/lobby" className={`${BUTTON} bg-primary text-on-primary`}>Play again</Link>
				<Link href="/" className={`${BUTTON} border border-line text-ink hover:bg-raised`}>Home</Link>
			</div>
		</main>
	);
}
