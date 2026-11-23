// The three-line menu icon in the top bar becomes the player's name (in the
// primary color) with a small down arrow; clicking it opens the same menu.
// The name above the LeetBattle title on the home screen is gone. Auth is
// mocked: no backend.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser } from './helpers';

const useAuthMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({ useAuth: () => useAuthMock() }));

import HomeTopBar from '../app/_home/components/topbar';
import HomeActions from '../app/_home/components/home-actions';

const account = () => screen.getByRole('button', { name: 'Account menu' });

beforeEach(() => {
	useAuthMock.mockReturnValue({ user: fakeUser, logout: vi.fn(), isLoading: false });
});
afterEach(() => cleanup());

describe('top bar account button', () => {
	it('shows the signed-in player\'s name', () => {
		render(<HomeTopBar />);
		expect(account().textContent).toBe(fakeUser.name);
	});

	it('shows the email when the player has no name', () => {
		useAuthMock.mockReturnValue({ user: { ...fakeUser, name: null }, logout: vi.fn(), isLoading: false });
		render(<HomeTopBar />);
		expect(account().textContent).toBe(fakeUser.email);
	});

	it('shows the name in the primary color', () => {
		render(<HomeTopBar />);
		expect(account().className).toContain('text-primary');
	});

	// The three-line icon was drawn with <line> elements; the arrow is one path.
	it('shows a down arrow instead of the three-line icon', () => {
		render(<HomeTopBar />);
		expect(account().querySelectorAll('line').length).toBe(0);
	});

	// The button already shows the name, so the open menu doesn't repeat it.
	it('does not repeat the name at the top of the open menu', async () => {
		render(<HomeTopBar />);
		await userEvent.click(account());
		expect(screen.getAllByText(fakeUser.name as string).length).toBe(1);
	});
});

describe('home title screen', () => {
	it('does not show the player\'s name above the title', () => {
		render(<HomeActions />);
		expect(screen.queryByText(fakeUser.name as string)).toBeNull();
	});
});
