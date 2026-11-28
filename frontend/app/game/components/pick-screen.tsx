// The screen where each player picks problems of their own from the pool left
// after banning (US-6-T-10, extended by US-8-2 to let each player claim more
// than one). Like the ban screen, it only renders what it is given: the pool
// (with who on each team has picked what) comes from GameService's
// `game:state`, and `onPick` / `onUnpick` send picks and deselections to the
// server. Picks are per team: a problem can be picked by one player per team
// independently, so this screen only ever shows (and only ever blocks on)
// the signed-in player's own team's picks.
'use client';

import { useAuth } from '../../login/context';
import { teamsFor } from '../../_shared/teams';
import type { TeamId } from '../../_shared/teams';
import { titleFromTaskId } from '../../editor/components/question-panel';
import type { PoolProblem } from '../socket-context';
import { ChoiceScreen, QuestionCard, capitalise, inWords } from './question-card';

function PickIcon() {
	return (
		<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M3 8.5l3.2 3.2L13 5" />
		</svg>
	);
}

// A problem as the pick screen needs it: bans are already decided by the
// time this screen shows, so it never needs bannedBy.
type PickableProblem = Omit<PoolProblem, 'bannedBy'>;

function UnpickIcon() {
	return (
		<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
			<path d="M4 4l8 8M12 4l-8 8" />
		</svg>
	);
}

// How many of the problems left after banning one player may claim for
// themselves (US-8-2): the pool split evenly across the team, rounded up so
// the whole pool stays claimable even when it doesn't divide evenly.
function pickLimit(poolSize: number, teamSize: number): number {
	return Math.ceil(poolSize / teamSize);
}

interface PickScreenProps {
	// The problems left after banning, shared by both teams.
	problems: PickableProblem[];
	// How many teammates share this pick (US-8-2: no longer always equal to
	// problems.length -- a player may now claim more than one problem).
	teamSize: number;
	myTeam: TeamId;
	onPick: (_questionId: number) => void;
	// Gives one of the signed-in player's own picks back (US-8-2).
	onUnpick: (_questionId: number) => void;
}

export default function PickScreen({ problems, teamSize, myTeam, onPick, onUnpick }: PickScreenProps) {
	const { user } = useAuth();

	const pickerOf = (problem: PickableProblem) => problem.pickedBy[myTeam];
	// Players on the signed-in player's own team who have picked at least one
	// problem, for the progress line -- not the per-player limit, which the
	// spec says never needs to be shown (US-8-2).
	const pickersWhoPicked = new Set(
		problems.map((problem) => pickerOf(problem)?.userId).filter((userId): userId is string => Boolean(userId)),
	);
	const myPicks = problems.filter((problem) => pickerOf(problem)?.userId === user?.id);
	const limit = pickLimit(problems.length, teamSize);
	const atLimit = myPicks.length >= limit;
	// Every picker here is on the viewer's own team, which is always shown first, in the primary color.
	const nameColor = teamsFor(myTeam)[0].color;

	const status = atLimit
		? 'Your picks are in. Waiting for your teammates.'
		: myPicks.length === 0
			? 'Choose a question to work on.'
			: 'Choose another question, or click one of your picks to deselect it.';

	return (
		<ChoiceScreen
			title="Pick a question"
			intro={`${capitalise(inWords(problems.length))} questions are left after the bans. Pick the ones you want to work on — you can deselect to change your mind. Your teammates can't pick the ones you choose.`}
			progress={`${pickersWhoPicked.size} of ${teamSize} picks made`}
			status={status}
		>
			{problems.map((problem, i) => {
				const picker = pickerOf(problem);
				if (picker) {
					const mine = picker.userId === user?.id;
					return (
						<QuestionCard
							key={problem.questionId}
							position={i + 1}
							title={titleFromTaskId(problem.taskId)}
							state="taken"
							onChoose={mine ? () => onUnpick(problem.questionId) : undefined}
							footer={mine ? (
								<span className="flex items-center gap-2 text-[13px] font-semibold text-primary">
									<UnpickIcon />
									Picked by <span className={nameColor}>you</span> — click to deselect
								</span>
							) : (
								<span className="flex items-center gap-2 text-[13px] font-semibold text-muted">
									<PickIcon />
									Picked by <span className={nameColor}>{picker.displayName}</span>
								</span>
							)}
						/>
					);
				}
				return (
					<QuestionCard
						key={problem.questionId}
						position={i + 1}
						title={titleFromTaskId(problem.taskId)}
						state={atLimit ? 'open' : 'choose'}
						onChoose={atLimit ? undefined : () => onPick(problem.questionId)}
						footer={atLimit
							? <span className="text-[13px] font-medium text-muted">Available</span>
							: <span className="flex items-center gap-2 text-[13px] font-semibold text-primary"><PickIcon />Pick this question</span>}
					/>
				);
			})}
		</ChoiceScreen>
	);
}
