// The screen where each player picks one of the problems left after banning,
// shown on the game page while the game is picking (US-6-T-10). Like the ban
// screen, it only renders what it is given: the pool (with who on each team
// has picked what) comes from GameService's `game:state`, and `onPick` sends
// the pick to the server. Picks are per team: a problem can be picked by one
// player per team independently, so this screen only ever shows (and only
// ever blocks on) the signed-in player's own team's picks.
'use client';

import { useAuth } from '../../login/context';
import { teamsFor } from '../../_shared/teams';
import type { TeamId } from '../../_shared/teams';
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

interface PickScreenProps {
	// The problems left after banning, shared by both teams.
	problems: PickableProblem[];
	// How many teammates must pick, always equal to problems.length.
	teamSize: number;
	myTeam: TeamId;
	onPick: (_questionId: number) => void;
}

export default function PickScreen({ problems, teamSize, myTeam, onPick }: PickScreenProps) {
	const { user } = useAuth();

	const pickerOf = (problem: PickableProblem) => problem.pickedBy[myTeam];
	const pickCount = problems.filter((problem) => pickerOf(problem)).length;
	const hasPicked = problems.some((problem) => pickerOf(problem)?.userId === user?.id);
	// Every picker here is on the viewer's own team, which is always shown first, in the primary color.
	const nameColor = teamsFor(myTeam)[0].color;

	return (
		<ChoiceScreen
			title="Pick a question"
			intro={`${capitalise(inWords(problems.length))} questions are left after the bans. Pick one to work on. Your teammates can't pick the one you choose.`}
			progress={`${pickCount} of ${teamSize} picks made`}
			status={hasPicked ? 'Your pick is in. Waiting for your teammates.' : 'Choose a question to work on.'}
		>
			{problems.map((problem, i) => {
				const picker = pickerOf(problem);
				if (picker) {
					return (
						<QuestionCard
							key={problem.questionId}
							position={i + 1}
							topics={problem.topics}
							state="taken"
							footer={(
								<span className="flex items-center gap-2 text-[13px] font-semibold text-muted">
									<PickIcon />
									Picked by{' '}
									<span className={nameColor}>{picker.userId === user?.id ? 'you' : picker.displayName}</span>
								</span>
							)}
						/>
					);
				}
				return (
					<QuestionCard
						key={problem.questionId}
						position={i + 1}
						topics={problem.topics}
						state={hasPicked ? 'open' : 'choose'}
						onChoose={() => onPick(problem.questionId)}
						footer={hasPicked
							? <span className="text-[13px] font-medium text-muted">Available</span>
							: <span className="flex items-center gap-2 text-[13px] font-semibold text-primary"><PickIcon />Pick this question</span>}
					/>
				);
			})}
		</ChoiceScreen>
	);
}
