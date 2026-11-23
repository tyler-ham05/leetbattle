'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { TeamId } from '../../lobby/socket-context';
import type { GamePlayer, GameResult } from '../socket-context';
import { useCountUp } from '../../_shared/use-count-up';
import { teamsFor } from '../../_shared/teams';
import type { ShownTeam } from '../../_shared/teams';

// When things come in, in seconds: the word lands and moves up first, then
// the halves rise, the scores count up, the crowns drop and the buttons follow.
const HALVES_AT = 1.55;
const COUNT_FROM_MS = 1500;
const COUNT_FOR_MS = 700;
const CROWNS_AT = 1.85;
const BUTTONS_AT = 2.2;

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
		<span data-testid="final-score" className={`text-8xl font-black leading-[0.8] tracking-[-0.05em] tabular-nums ${won ? team.color : 'text-muted'}`}>{shown}</span>
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
						{player.displayName}
					</li>
				))}
			</ul>
		</section>
	);
}

// The end of the match. myTeam is the viewer's team (undefined when they
// aren't one of the players), so a draw or an onlooker gets neither Victory!
// nor Defeat, just who won.
export default function ResultScreen({ result, myTeam, scores, players }: { result: GameResult; myTeam?: TeamId; scores: Record<TeamId, number>; players: GamePlayer[] }) {
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

			<div className="lb-result-rise flex flex-wrap justify-center gap-3" style={{ '--d': `${BUTTONS_AT}s` } as CSSProperties}>
				<Link href="/lobby" className={`${BUTTON} bg-primary text-on-primary`}>Play again</Link>
				<Link href="/" className={`${BUTTON} border border-line text-ink hover:bg-raised`}>Home</Link>
			</div>
		</main>
	);
}
