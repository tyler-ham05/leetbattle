// US-9-T-2: Ladder matchmaking queues: home menu entry
// Acceptance criteria covered:
//   - The front page shows a "Ladder" button that opens the Ladder page
// Checks that the Ladder row:
//   - appears in the home menu, right after Lobby
//   - links to /ladder
//   - has a one-line description like the other rows
//   - opens with the keyboard like the other rows
// Note: home.test.tsx lists the menu rows exactly and must learn about Ladder.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser } from './helpers';

const push = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: fakeUser, logout: vi.fn(), isLoading: false }),
}));

import HomeActions from '../app/_home/components/home-actions';

const menu = () => screen.getByRole('list', { name: 'Menu' });
const ladderRow = () => within(menu()).getByRole('link', { name: /^Ladder/ });

beforeEach(() => {
	vi.clearAllMocks();
	// jsdom has no matchMedia.
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: false,
		media: query,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}));
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('US-9-T-2 Ladder on the home screen (criterion 1)', () => {
	it('US-9-T-2 shows a Ladder option in the home menu', () => {
		render(<HomeActions />);

		expect(ladderRow()).toBeTruthy();
	});

	it('US-9-T-2 links the Ladder option to the Ladder page', () => {
		render(<HomeActions />);

		expect(ladderRow().getAttribute('href')).toBe('/ladder');
	});

	it('US-9-T-2 gives the Ladder option a one-line description like the other options', () => {
		render(<HomeActions />);

		expect((ladderRow().textContent ?? '').replace(/^Ladder/, '').trim().length).toBeGreaterThan(0);
	});

	it('US-9-T-2 lists Ladder right after Lobby', () => {
		render(<HomeActions />);
		const titles = within(menu()).getAllByRole('link').map((link) => link.textContent?.match(/^(Practice|Lobby|Ladder|Settings)/)?.[1]);

		expect(titles).toEqual(['Practice', 'Lobby', 'Ladder', 'Settings']);
	});

	it('US-9-T-2 opens the Ladder page with the keyboard like the other options', async () => {
		render(<HomeActions />);
		await userEvent.keyboard('{ArrowDown}{ArrowDown}');
		(document.activeElement as HTMLElement | null)?.blur();
		await userEvent.keyboard('{Enter}');

		expect(push).toHaveBeenCalledWith('/ladder');
	});
});
