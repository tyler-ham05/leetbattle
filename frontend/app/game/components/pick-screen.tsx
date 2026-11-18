// The screen where each player picks one of the problems left after banning,
// shown on the game page while the game is picking (US-6-T-10). Like the ban
// screen, it only renders what it is given: the pool (with who on each team
// has picked what) comes from GameService's `game:state`, and `onPick` sends
// the pick to the server. Picks are per team: a problem can be picked by one
// player per team independently, so this screen only ever shows (and only
// ever blocks on) the signed-in player's own team's picks.
'use client';

import { useAuth } from '../../login/context';
import type { PoolProblem, TeamId } from '../socket-context';

const CARD = 'flex min-h-[168px] w-full flex-col justify-between gap-5 rounded-xl p-5 text-left';

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const inWords = (count: number) => NUMBER_WORDS[count] ?? String(count);
const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

function PickIcon() {
	return (
		<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M3 8.5l3.2 3.2L13 5" />
		</svg>
	);
}

// The number and topics of a question. A picked question's topics are struck through.
function QuestionTopics({ position, problem, picked }: { position: number; problem: PoolProblem; picked: boolean }) {
	const chip = picked
		? 'border border-line font-medium text-muted line-through'
		: 'bg-raised font-semibold';
	return (
		<span className="flex flex-col gap-3.5">
			<span data-testid="question-label" className="text-sm font-medium text-muted">Question {position}</span>
			<span className="flex flex-wrap gap-2">
				{problem.topics.map((topic) => (
					<span key={topic} data-testid="topic" className={`rounded-full px-3 py-1.5 text-[15px] ${chip}`}>{topic}</span>
				))}
			</span>
		</span>
	);
}

interface PickScreenProps {
	// The problems left after banning, shared by both teams.
	problems: PoolProblem[];
	// How many teammates must pick -- always equal to problems.length.
	teamSize: number;
	myTeam: TeamId;
	onPick: (_questionId: number) => void;
}

export default function PickScreen({ problems, teamSize, myTeam, onPick }: PickScreenProps) {
	const { user } = useAuth();

	const pickerOf = (problem: PoolProblem) => problem.pickedBy[myTeam];
	const pickers = problems.flatMap((problem) => {
		const picker = pickerOf(problem);
		return picker ? [picker] : [];
	});
	const hasPicked = pickers.some((picker) => picker.userId === user?.id);
	// One marker per teammate: picks made first, then the picks still to come.
	const markers = [
		...pickers.map(() => myTeam),
		...Array<string>(teamSize).fill('empty'),
	].slice(0, teamSize);
	const nameColor = myTeam === 'a' ? 'text-primary' : 'text-secondary';

	return (
		<section className="flex flex-col gap-8">
			<header className="flex flex-col gap-2">
				<h2 className="text-4xl font-extrabold leading-[1.05] tracking-[-0.035em]">Pick a question</h2>
				<p className="text-[15px] text-muted">
					{capitalise(inWords(problems.length))} questions are left after the bans. Pick one to work on -- your teammates can&apos;t pick the one you choose.
				</p>
			</header>

			<div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-line pb-5">
				<div className="flex items-center gap-3">
					<div aria-hidden="true" className="flex gap-1">
						{markers.map((marker, i) => <span key={i} data-seat={marker} className="lb-seat-pip" />)}
					</div>
					<span className="text-sm font-semibold">{pickers.length} of {teamSize} picks made</span>
				</div>
				<p role="status" aria-live="polite" className="text-sm text-muted">
					{hasPicked ? 'Your pick is in. Waiting for your teammates.' : 'Choose a question to work on.'}
				</p>
			</div>

			<ul aria-label="Questions" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{problems.map((problem, i) => {
					const picker = pickerOf(problem);
					const topics = <QuestionTopics position={i + 1} problem={problem} picked={!!picker} />;

					if (picker) {
						return (
							<li key={problem.questionId} className={`${CARD} border border-dashed border-line`}>
								{topics}
								<span className="flex items-center gap-2 text-[13px] font-semibold text-muted">
									<PickIcon />
									Picked by{' '}
									<span className={nameColor}>
										{picker.userId === user?.id ? 'you' : picker.displayName}
									</span>
								</span>
							</li>
						);
					}
					if (hasPicked) {
						return (
							<li key={problem.questionId} className={`${CARD} border border-line bg-surface`}>
								{topics}
								<span className="text-[13px] font-medium text-muted">Available</span>
							</li>
						);
					}
					return (
						<li key={problem.questionId} className="flex">
							<button onClick={() => onPick(problem.questionId)} className={`lb-press ${CARD} border border-line bg-surface hover:bg-raised`}>
								{topics}
								<span className="flex items-center gap-2 text-[13px] font-semibold text-primary">
									<PickIcon />
									Pick this question
								</span>
							</button>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
