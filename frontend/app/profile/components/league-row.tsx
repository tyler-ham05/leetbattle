'use client';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PublicProfile } from '../../login/controller';
import Odometer from './odometer';
import { leaguePlace, leagueProgress, metalColour } from './league';
import { signed } from './recent-matches';

// How long the change by the rating floats, and the promotion banner shows.
const DELTA_MS = 1500;
const TOAST_MS = 2700;
// The peel and the shake are over by then; the name is then shown plainly.
const MOVE_MS = 1400;

// A change of league since the row first showed: which way, and from what.
interface Move {
	n: number;
	up: boolean;
	from: string;
}

// Remembers `value` and reports each change with `make(old)`, numbered so a
// repeat change restarts its animation. Cleared again after `ms`.
function useChange<T, C extends { n: number }>(value: T, ms: number, make: (_old: T, _n: number) => C | null) {
	const [last, setLast] = useState(value);
	const [change, setChange] = useState<C | null>(null);
	if (value !== last) {
		setLast(value);
		setChange(make(last, (change?.n ?? 0) + 1));
	}
	useEffect(() => {
		if (!change) return;
		const timer = setTimeout(() => setChange(null), ms);
		return () => clearTimeout(timer);
	}, [change, ms]);
	return change;
}

// The league's name. Up a league, the old name in the old colour peels off
// along a diagonal, showing the new one underneath; down a league, it shakes.
function LeagueName({ league, move }: { league: string; move: Move | null }) {
	if (move?.up) {
		return (
			<span key={move.n} className="lb-pc-peel">
				<span className="lb-pc-peel-under">{league}</span>
				<span className="lb-pc-peel-over" aria-hidden="true" style={{ color: metalColour(move.from) }}>{move.from}</span>
				<span className="lb-pc-peel-crease" aria-hidden="true">{league}</span>
			</span>
		);
	}
	return <span key={move?.n ?? 0} className={move ? 'lb-pc-shake' : undefined}>{league}</span>;
}

// The league in its metal colour, the rating, and a bar from the league's
// lowest rating to the next league (full, with "Top league", in Platinum).
// When the rating changes, the change floats up by it; a promotion also
// drops in a "Promoted <league>" banner.
export default function LeagueRow({ profile }: { profile: PublicProfile }) {
	const league = profile.league ?? 'Bronze I';
	const rating = profile.rating ?? 0;
	const min = profile.leagueMin ?? rating;
	const next = profile.nextLeague ?? null;
	const pct = leagueProgress(rating, min, next);
	const move = useChange<string, Move>(league, MOVE_MS, (from, n) => ({ n, from, up: leaguePlace(league) > leaguePlace(from) }));
	const toast = useChange<string, { n: number; league: string }>(league, TOAST_MS, (from, n) => (leaguePlace(league) > leaguePlace(from) ? { n, league } : null));
	const delta = useChange<number, { n: number; by: number }>(rating, DELTA_MS, (from, n) => ({ n, by: rating - from }));
	return (
		<section aria-label="League" className="lb-pc-league">
			<div className="lb-pc-league-head">
				<div className="flex flex-col gap-2.5">
					<span className="lb-pc-cap">League</span>
					<span className="lb-pc-league-name"><LeagueName league={league} move={move} /></span>
				</div>
				<div className="lb-pc-rating-big">
					<span className="lb-pc-cap">Rating</span>
					<Odometer value={rating} />
					<span className="sr-only">Rating {rating}</span>
					{delta && (
						<span key={delta.n} aria-hidden="true" className={`lb-pc-delta ${delta.by > 0 ? 'lb-pc-up' : 'lb-pc-down'}`}>{signed(delta.by)}</span>
					)}
				</div>
			</div>
			<div role="progressbar" aria-label="Progress to the next league" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} className="lb-pc-track">
				<div className="lb-pc-fill" style={{ '--lb-pc-w': `${pct.toFixed(1)}%` } as CSSProperties} />
			</div>
			<div className="lb-pc-ends">
				<span data-testid="league-from">{league} <b>{min}</b></span>
				<span data-testid="league-to">{next ? <>{next.name} <b>{next.at}</b></> : 'Top league'}</span>
			</div>
			{toast && (
				<div key={toast.n} role="status" data-testid="promotion-toast" className="lb-pc-toast">
					<span className="lb-pc-cap">Promoted</span> <b>{toast.league}</b>
				</div>
			)}
		</section>
	);
}
