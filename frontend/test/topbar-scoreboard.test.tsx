// The match top bar reads like a scoreboard: each team's score is big and
// heavy, with the team's name small above it, in the main font and the team's
// color, and the two columns face each other around the clock. Pure
// rendering: no sockets, no backend.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ScoreLine } from '../app/editor/components/scoreboard';

afterEach(() => cleanup());

// A player on team a, so team a is "Your team" (first) and team b "Rival team".
function renderLine() {
	render(<ScoreLine scores={{ a: 150, b: 0 }} myTeam="a" time="18:18" />);
}
// The column holding a team's name and score.
const column = (id: 'a' | 'b') => screen.getByTestId(`score-${id}`).parentElement as HTMLElement;
const label = (name: string) => screen.getByText(name);

describe('top bar scoreboard', () => {
	it('stacks your team\'s name above its score', () => {
		renderLine();
		expect(column('a').className).toContain('flex-col');
	});

	it('puts the name first in the column, above the score', () => {
		renderLine();
		expect(column('a').firstElementChild?.textContent).toBe('Your team');
	});

	// The names use the app's main font (Onest), not the monospaced caps.
	it('shows the team name in the main font, not monospace', () => {
		renderLine();
		expect(label('Your team').className).not.toContain('font-mono');
	});

	it('shows the team name in normal case, not uppercase', () => {
		renderLine();
		expect(label('Your team').className).not.toContain('uppercase');
	});

	it('shows your team\'s name in your team\'s color', () => {
		renderLine();
		expect(label('Your team').className).toContain('text-primary');
	});

	it('shows the rival\'s name in the rival\'s color', () => {
		renderLine();
		expect(label('Rival team').className).toContain('text-secondary');
	});

	it('makes the score heavy', () => {
		renderLine();
		expect(screen.getByTestId('score-a').className).toContain('font-black');
	});

	it('lines your team\'s column up toward the clock', () => {
		renderLine();
		expect(column('a').className).toContain('items-end');
	});

	it('lines the rival\'s column up away from the clock', () => {
		renderLine();
		expect(column('b').className).toContain('items-start');
	});

	// A 1v1 is just you against one rival, so the labels drop "team".
	it('labels your side "You" in a 1v1', () => {
		render(<ScoreLine scores={{ a: 150, b: 0 }} myTeam="a" solo time="18:18" />);
		expect(screen.getByTestId('score-a').previousElementSibling?.textContent).toBe('You');
	});

	it('labels the other side "Rival" in a 1v1', () => {
		render(<ScoreLine scores={{ a: 150, b: 0 }} myTeam="a" solo time="18:18" />);
		expect(screen.getByTestId('score-b').previousElementSibling?.textContent).toBe('Rival');
	});

	// The clock matches the rest of the bar: main font, with same-width digits.
	it('shows the clock in the main font', () => {
		renderLine();
		expect(screen.getByLabelText('Time left').className).not.toContain('font-mono');
	});

	it('keeps the clock digits the same width so it does not wiggle', () => {
		renderLine();
		expect(screen.getByLabelText('Time left').className).toContain('tabular-nums');
	});
});
