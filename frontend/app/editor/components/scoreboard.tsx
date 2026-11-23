'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMatch } from '../match-context';
import { teamsFor } from '../../_shared/teams';
import type { TeamId } from '../../_shared/teams';

function formatTime(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// One team's score, the time left, the other team's score (US-5-T-17). Also
// the middle of the game page's top bar (US-5-T-19). Given the user's team, it
// comes first as "Your team" (sprint 4 polish). Screen readers hear the timer
// as "Time left"; there is no visible label. A score bumps when it goes up.
// How many times each team's score has gone up since the page loaded (US-4-T-6).
// Each rise remounts the number so its bump plays again.
function useScoreBumps(scores: { a: number; b: number }) {
	const [last, setLast] = useState(scores);
	const [bumps, setBumps] = useState({ a: 0, b: 0 });
	if (last.a !== scores.a || last.b !== scores.b) {
		setLast(scores);
		setBumps({ a: bumps.a + Number(scores.a > last.a), b: bumps.b + Number(scores.b > last.b) });
	}
	return bumps;
}

export function ScoreLine({ scores, time, myTeam }: { scores: { a: number; b: number }; time: ReactNode; myTeam?: TeamId }) {
	const [first, second] = teamsFor(myTeam);
	const bumps = useScoreBumps(scores);
	const score = (team: typeof first) => (
		<div className="flex items-baseline gap-2">
			<span className="text-sm text-muted">{team.name}</span>
			<span
				key={bumps[team.id]}
				data-testid={`score-${team.id}`}
				className={`text-lg font-semibold ${team.color} ${bumps[team.id] > 0 ? 'lb-score-bump' : ''}`}
			>
				{scores[team.id]}
			</span>
		</div>
	);
	return (
		<div className="flex items-center gap-6 text-ink">
			{score(first)}
			<span aria-label="Time left" className="font-mono text-lg tabular-nums">{time}</span>
			{score(second)}
		</div>
	);
}

export default function Scoreboard() {
	const { scores, secondsLeft } = useMatch();

	return (
		<section aria-label="Scoreboard" className="flex justify-center border-b border-line bg-surface px-4 py-1.5">
			<ScoreLine scores={scores} time={formatTime(secondsLeft)} />
		</section>
	);
}
