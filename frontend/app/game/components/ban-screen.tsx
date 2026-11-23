// The screen where each player bans one question, shown on the game page while
// the game is banning. It only renders what it is given: the pool (with who
// banned what) comes from GameService's `game:state`, and `onBan` sends the
// ban to the server.
'use client';

import { useAuth } from '../../login/context';
import { teamsFor } from '../../_shared/teams';
import type { TeamId } from '../../_shared/teams';
import type { PoolProblem } from '../socket-context';
import { ChoiceScreen, QuestionCard, capitalise, inWords } from './question-card';

function BanIcon() {
	return (
		<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
			<circle cx="8" cy="8" r="6" />
			<path d="M3.8 12.2l8.4-8.4" />
		</svg>
	);
}

interface BanScreenProps {
	problems: PoolProblem[];
	// One ban per player, so this is also the number of bans the match takes.
	playerCount: number;
	// The viewer's team: its banners' names are in the primary color, the other team's in the secondary.
	myTeam?: TeamId | null;
	onBan: (_questionId: number) => void;
}

export default function BanScreen({ problems, playerCount, myTeam, onBan }: BanScreenProps) {
	const { user } = useAuth();
	const teams = teamsFor(myTeam);
	const colorOf = (team: TeamId) => teams.find((shown) => shown.id === team)?.color;

	const banCount = problems.filter((problem) => problem.bannedBy).length;
	const hasBanned = problems.some((problem) => problem.bannedBy?.userId === user?.id);
	const leftInPlay = Math.max(0, problems.length - playerCount);

	return (
		<ChoiceScreen
			title="Ban a question"
			intro={`${capitalise(inWords(problems.length))} questions, shown by topic only. Every player bans one, and the match is played on the ${inWords(leftInPlay)} that are left.`}
			progress={`${banCount} of ${playerCount} bans made`}
			status={hasBanned ? 'Your ban is in. Waiting for the other players.' : 'You have 1 ban left. Choose a question to remove.'}
		>
			{problems.map((problem, i) => {
				const banner = problem.bannedBy;
				if (banner) {
					return (
						<QuestionCard
							key={problem.questionId}
							position={i + 1}
							topics={problem.topics}
							state="taken"
							strike
							footer={(
								<span className="flex items-center gap-2 text-[13px] font-semibold text-muted">
									<BanIcon />
									Banned by{' '}
									<span className={colorOf(banner.team)}>{banner.userId === user?.id ? 'you' : banner.displayName}</span>
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
						state={hasBanned ? 'open' : 'choose'}
						onChoose={() => onBan(problem.questionId)}
						footer={hasBanned
							? <span className="text-[13px] font-medium text-muted">Still in play</span>
							: <span className="flex items-center gap-2 text-[13px] font-semibold text-danger"><BanIcon />Ban this question</span>}
					/>
				);
			})}
		</ChoiceScreen>
	);
}
