'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '../login/protected';
import { useAuth } from '../login/context';
import HomeTopBar from '../_home/components/topbar';
import { useBan } from './context';
import type { BanQuestion } from './context';

// One ban per player, six players per match.
const TOTAL_BANS = 6;

const CARD = 'flex min-h-[168px] w-full flex-col justify-between gap-5 rounded-xl p-5 text-left';

function BanIcon() {
	return (
		<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
			<circle cx="8" cy="8" r="6" />
			<path d="M3.8 12.2l8.4-8.4" />
		</svg>
	);
}

// The number and topics of a question. A banned question's topics are struck through.
function QuestionTopics({ position, question }: { position: number; question: BanQuestion }) {
	const chip = question.bannedBy
		? 'border border-line font-medium text-muted line-through'
		: 'bg-raised font-semibold';
	return (
		<span className="flex flex-col gap-3.5">
			<span data-testid="question-label" className="text-sm font-medium text-muted">Question {position}</span>
			<span className="flex flex-wrap gap-2">
				{question.topics.map((topic) => (
					<span key={topic} data-testid="topic" className={`rounded-full px-3 py-1.5 text-[15px] ${chip}`}>{topic}</span>
				))}
			</span>
		</span>
	);
}

function BanContent() {
	const { user } = useAuth();
	const { questions, ban } = useBan();
	const router = useRouter();

	const banners = questions.flatMap((question) => (question.bannedBy ? [question.bannedBy] : []));
	const hasBanned = banners.some((banner) => banner.userId === user?.id);
	// One marker per ban: Team 1's bans first, then Team 2's, then the bans still to come.
	const markers = [
		...banners.filter((banner) => banner.team === 'a').map(() => 'a'),
		...banners.filter((banner) => banner.team === 'b').map(() => 'b'),
		...Array<string>(TOTAL_BANS).fill('empty'),
	].slice(0, TOTAL_BANS);

	const allBansIn = banners.length >= TOTAL_BANS;
	useEffect(() => {
		if (allBansIn) router.push('/editor');
	}, [allBansIn, router]);

	return (
		<div className="flex min-h-screen flex-col bg-page font-sans text-ink">
			<HomeTopBar />
			<main className="flex-1 px-5 pt-12 pb-16">
				<div className="mx-auto flex max-w-[1040px] flex-col gap-8">
					<header className="flex flex-col gap-2">
						<h1 className="text-4xl font-extrabold leading-[1.05] tracking-[-0.035em]">Ban a question</h1>
						<p className="text-[15px] text-muted">Nine questions, shown by topic only. Every player bans one, and the match is played on the three that are left.</p>
					</header>

					<div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-line pb-5">
						<div className="flex items-center gap-3">
							<div aria-hidden="true" className="flex gap-1">
								{markers.map((marker, i) => <span key={i} data-seat={marker} className="lb-seat-pip" />)}
							</div>
							<span className="text-sm font-semibold">{banners.length} of {TOTAL_BANS} bans made</span>
						</div>
						<p role="status" aria-live="polite" className="text-sm text-muted">
							{allBansIn ? 'All bans are in' : hasBanned ? 'Your ban is in. Waiting for the other players.' : 'You have 1 ban left. Choose a question to remove.'}
						</p>
					</div>

					<ul aria-label="Questions" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{questions.map((question, i) => {
							const banner = question.bannedBy;
							const topics = <QuestionTopics position={i + 1} question={question} />;

							if (banner) {
								return (
									<li key={question.id} className={`${CARD} border border-dashed border-line`}>
										{topics}
										<span className="flex items-center gap-2 text-[13px] font-semibold text-muted">
											<BanIcon />
											Banned by{' '}
											<span className={banner.team === 'a' ? 'text-primary' : 'text-secondary'}>
												{banner.userId === user?.id ? 'you' : banner.displayName}
											</span>
										</span>
									</li>
								);
							}
							if (hasBanned) {
								return (
									<li key={question.id} className={`${CARD} border border-line bg-surface`}>
										{topics}
										<span className="text-[13px] font-medium text-muted">Still in play</span>
									</li>
								);
							}
							return (
								<li key={question.id} className="flex">
									<button onClick={() => ban(question.id)} className={`lb-press ${CARD} border border-line bg-surface hover:bg-raised`}>
										{topics}
										<span className="flex items-center gap-2 text-[13px] font-semibold text-danger">
											<BanIcon />
											Ban this question
										</span>
									</button>
								</li>
							);
						})}
					</ul>

					<p className="flex flex-wrap gap-6 text-[13px] text-muted">
						<span className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-primary" />Team 1</span>
						<span className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-secondary" />Team 2</span>
					</p>
				</div>
			</main>
		</div>
	);
}

export default function BanPage() {
	return (
		<RequireAuth>
			<BanContent />
		</RequireAuth>
	);
}
