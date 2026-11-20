'use client';
import type { ReactNode } from 'react';
import { useMatch } from '../match-context';

function formatTime(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Team 1's score, the time left, Team 2's score (US-5-T-17). Also the middle
// of the game page's top bar (US-5-T-19). Screen readers hear the timer as
// "Time left"; there is no visible label.
export function ScoreLine({ scores, time }: { scores: { a: number; b: number }; time: ReactNode }) {
	return (
		<div className="flex items-center gap-6 text-ink">
			<div className="flex items-baseline gap-2">
				<span className="text-sm text-muted">Team 1</span>
				<span data-testid="score-a" className="text-lg font-semibold text-primary">{scores.a}</span>
			</div>
			<span aria-label="Time left" className="font-mono text-lg tabular-nums">{time}</span>
			<div className="flex items-baseline gap-2">
				<span className="text-sm text-muted">Team 2</span>
				<span data-testid="score-b" className="text-lg font-semibold text-secondary">{scores.b}</span>
			</div>
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
