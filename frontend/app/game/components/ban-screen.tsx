// The screen where each team votes one question off, shown on the game page
// while the game is banning (US-8-T-1). It only renders what it is given: the
// pool, its own team's votes on each question and the ban state all come from
// GameService's `game:state`, and `onVote` sends the vote to the server. Every
// count shown comes from that state, never from the pool's length or the
// number of players, so a later game mode can change the format server-side.
//
// Once the window closes the server resolves the vote and sends the bans back
// for a short reveal: each banned question is shown struck through, in the
// place it had in the pool, labelled with the team that banned it and never
// with who voted. Nothing is votable during the reveal.
'use client';

import { useAuth } from '../../login/context';
import { teamsFor } from '../../_shared/teams';
import type { ShownTeam, TeamId } from '../../_shared/teams';
import type { BanState, BannedProblem, PoolProblem } from '../socket-context';
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
	// The questions still in the pool, each with the viewer's own team's votes.
	problems: PoolProblem[];
	bans: BanState;
	// The viewer's team, so a ban can be labelled "Your team" / "Rival team".
	myTeam?: TeamId | null;
	onVote: (_questionId: number) => void;
}

// One card on the screen: a question still in the pool, or one a team banned.
type ShownQuestion =
	| { banned: null; problem: PoolProblem }
	| { banned: BannedProblem; problem: BannedProblem };

// The questions in the places they had before the bans: the pool as it stands,
// with each banned question put back at its own position. Inserting them in
// position order rebuilds the original list, so a card's place on the screen
// never moves when the bans land.
function questionsInPlace(problems: PoolProblem[], banned: BannedProblem[]): ShownQuestion[] {
	const shown: ShownQuestion[] = problems.map((problem) => ({ banned: null, problem }));
	for (const entry of [...banned].sort((one, two) => one.position - two.position)) {
		shown.splice(entry.position - 1, 0, { banned: entry, problem: entry });
	}
	return shown;
}

export default function BanScreen({ problems, bans, myTeam, onVote }: BanScreenProps) {
	const { user } = useAuth();
	const teams = teamsFor(myTeam);
	const shownTeam = (team: TeamId): ShownTeam => teams.find((entry) => entry.id === team) ?? teams[0];

	const shown = questionsInPlace(problems, bans.banned);
	// The bans are in: the window has closed and this is the reveal, so no
	// question takes a vote any more.
	const revealing = bans.banned.length > 0;
	const myVote = problems.find((problem) => problem.votes.some((voter) => voter.userId === user?.id));

	return (
		<ChoiceScreen
			title="Vote to ban a question"
			intro={`${capitalise(inWords(shown.length))} questions, shown by topic only. Each team votes one off, and the match is played on the ${inWords(bans.questionsInPlay)} that are left.`}
			progress={`${bans.votesCast} of ${bans.voters} votes in`}
			status={revealing
				? 'The votes are in. The match moves on in a moment.'
				: myVote
					? 'Your vote is in. You can move it until the window closes.'
					: 'Vote for the question you want banned.'}
		>
			{shown.map((entry, i) => {
				if (entry.banned) {
					const team = shownTeam(entry.banned.team);
					return (
						<QuestionCard
							key={entry.problem.questionId}
							position={i + 1}
							topics={entry.problem.topics}
							state="taken"
							strike
							footer={(
								<span className="flex items-center gap-2 text-[13px] font-semibold text-muted">
									<BanIcon />
									Banned by <span className={team.color}>{team.name}</span>
								</span>
							)}
						/>
					);
				}
				const { problem } = entry;
				const mine = problem.votes.some((voter) => voter.userId === user?.id);
				const teammates = problem.votes.filter((voter) => voter.userId !== user?.id);
				return (
					<QuestionCard
						key={problem.questionId}
						position={i + 1}
						topics={problem.topics}
						state={revealing ? 'open' : 'choose'}
						onChoose={() => onVote(problem.questionId)}
						footer={(
							<span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] font-semibold">
								{revealing
									? <span className="font-medium text-muted">Still in play</span>
									: mine
										? <span className="flex items-center gap-2 text-primary"><BanIcon />Your vote</span>
										: <span className="flex items-center gap-2 text-danger"><BanIcon />Vote to ban</span>}
								{teammates.map((voter) => (
									<span key={voter.userId} data-testid="voter" className="font-medium text-muted">{voter.displayName}</span>
								))}
							</span>
						)}
					/>
				);
			})}
		</ChoiceScreen>
	);
}
