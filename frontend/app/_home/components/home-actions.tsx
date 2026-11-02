import PracticeCard from './practice-card';
import Link from 'next/link';

// Placeholder dashboard -- kept deliberately bare so it's easy to redesign later.
export default function HomeActions() {
	return (
		<div className="flex flex-col items-center gap-4 sm:flex-row">
			<PracticeCard />
			<Link
				href="/lobby"
				className="flex w-64 flex-col gap-2 rounded-xl border border-line p-5 transition hover:border-primary"
			>
				<span className="text-lg font-semibold text-ink">Join lobby</span>
				<span className="text-sm text-muted">Team up with other players for a match.</span>
			</Link>
		</div>
	);
}
