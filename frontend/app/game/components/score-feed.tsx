'use client';

import { useEffect, useState } from 'react';
import type { TeamId } from '../../_shared/teams';
import { teamsFor } from '../../_shared/teams';
import type { PoolProblem } from '../socket-context';

const SHOWN_FOR_MS = 4_000;

interface Line {
	id: number;
	text: string;
	color: string;
}

// One line under the match top bar when a team newly solves a question
// (US-4-T-6): "Your team solved Q2", in that team's color, for 4 seconds.
// Q is the question's position in the pool. A newer solve replaces the line;
// whatever was solved before the page loaded shows nothing.
export default function ScoreFeed({ pool, solved, myTeam }: { pool: PoolProblem[]; solved: Record<TeamId, string[]>; myTeam?: TeamId }) {
	const [seen, setSeen] = useState(solved);
	const [line, setLine] = useState<Line | null>(null);

	if (seen !== solved) {
		setSeen(solved);
		for (const team of teamsFor(myTeam)) {
			const position = solved[team.id]
				.filter((taskId) => !seen[team.id].includes(taskId))
				.map((taskId) => pool.findIndex((problem) => problem.taskId === taskId))
				.find((index) => index >= 0);
			if (position !== undefined) {
				setLine({ id: (line?.id ?? 0) + 1, text: `${team.name} solved Q${position + 1}`, color: team.color });
			}
		}
	}

	useEffect(() => {
		if (!line) return;
		const timer = setTimeout(() => setLine(null), SHOWN_FOR_MS);
		return () => clearTimeout(timer);
	}, [line]);

	// Sits over the top of the editor, so the page never shifts as lines come and go.
	return (
		<div aria-live="polite" className="pointer-events-none relative z-10 flex h-0 justify-center">
			{line && (
				<p key={line.id} className={`lb-feed-in absolute top-0 rounded-b-lg border border-t-0 border-line bg-surface px-4 py-1 text-sm font-semibold ${line.color}`}>
					{line.text}
				</p>
			)}
		</div>
	);
}
