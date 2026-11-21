// The two teams as the user sees them (sprint 4 polish). A player's own team
// always comes first, is called "Your team" and gets the primary color; the
// other is the "Rival team" in the secondary color. Someone who is not on a
// team sees "Team 1" (team a) then "Team 2" (team b).
export type TeamId = 'a' | 'b';

export interface ShownTeam {
	id: TeamId;
	name: string;
	// Text color class (text-primary / text-secondary) and the matching SVG fill.
	color: string;
	fill: string;
}

const FIRST = { color: 'text-primary', fill: 'fill-primary' };
const SECOND = { color: 'text-secondary', fill: 'fill-secondary' };

export function teamsFor(myTeam?: TeamId | null): [ShownTeam, ShownTeam] {
	if (!myTeam) {
		return [{ id: 'a', name: 'Team 1', ...FIRST }, { id: 'b', name: 'Team 2', ...SECOND }];
	}
	const rival: TeamId = myTeam === 'a' ? 'b' : 'a';
	return [{ id: myTeam, name: 'Your team', ...FIRST }, { id: rival, name: 'Rival team', ...SECOND }];
}
