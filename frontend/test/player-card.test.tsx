// US-7-T-5: the player profile, built around the player card.
// Pseudocode: test/player-card-test-pseudo.md.
//
// No test reaches AuthService: the auth context (GET /me) is replaced with a
// fake that hands back `mocks.user`, and AuthAPIService is replaced with a
// class whose profile calls are vi.fn()s, so each test can check what the page
// would have sent and decide what AuthService answers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser } from './helpers';

// The signed-in player as GET /me returns them: Gold I at 684, 24-17-3, no
// picture, the default katana icon. Gold I runs from 600 to Gold II at 700.
const goldUser = {
	...fakeUser,
	rating: 684, league: 'Gold I', leagueMin: 600, nextLeague: { name: 'Gold II', at: 700 } as { name: string; at: number } | null,
	wins: 24, losses: 17, draws: 3,
	icon: 'katana', description: 'Night-owl Python main.', picture: null as string | null,
};

// Another player's public profile from GET /users/:id (no email).
const grace = {
	id: 'u2', name: 'Grace', icon: 'bolt', description: '', picture: null,
	rating: 120, league: 'Bronze II', leagueMin: 100, nextLeague: { name: 'Bronze III', at: 200 },
	wins: 1, losses: 2, draws: 0, createdAt: '2026-03-04T00:00:00Z',
};

const mocks = vi.hoisted(() => ({
	user: null as unknown,
	params: { id: 'u2' } as Record<string, string>,
	replace: vi.fn(),
	refresh: vi.fn(),
	getUser: vi.fn(),
	updateProfile: vi.fn(),
	setPicture: vi.fn(),
	removePicture: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: mocks.replace, back: vi.fn() }),
	useParams: () => mocks.params,
}));
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: mocks.user, isLoading: false, logout: vi.fn(), refresh: mocks.refresh }),
}));
// Only the profile calls are used by these pages; each one is a mock.
vi.mock('../app/login/controller', () => ({
	AuthAPIService: class {
		getUser = mocks.getUser;
		updateProfile = mocks.updateProfile;
		setPicture = mocks.setPicture;
		removePicture = mocks.removePicture;
	},
}));

import ProfilePage from '../app/profile/page';
import OtherProfilePage from '../app/profile/[id]/page';

// Signs in as `overrides` on top of the Gold I player and opens /profile.
function openOwn(overrides: Partial<typeof goldUser> = {}) {
	mocks.user = { ...goldUser, ...overrides };
	return render(<ProfilePage />);
}

// The card itself (the <article> named "Player card").
const card = () => screen.getByRole('article', { name: 'Player card' });
// Your own avatar is a button that opens the picker.
const avatar = () => screen.getByRole('button', { name: 'Change your icon' });
// The hidden file input "Upload a picture" opens.
const fileInput = () => screen.getByLabelText('Picture file') as HTMLInputElement;

// Picks `file` in the file input, as the browser's file chooser would.
function choose(file: File) {
	fireEvent.change(fileInput(), { target: { files: [file] } });
}
// A file of `type`, reporting `size` bytes (without allocating them).
function fakeFile(name: string, type: string, size = 1024) {
	const file = new File(['x'], name, { type });
	Object.defineProperty(file, 'size', { value: size });
	return file;
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.params = { id: 'u2' };
	// Every save answers with the account as it now is.
	mocks.updateProfile.mockImplementation(async (change: object) => ({ ...(mocks.user as object), ...change }));
	mocks.setPicture.mockImplementation(async (image: string) => ({ ...(mocks.user as object), picture: image }));
	mocks.removePicture.mockImplementation(async () => ({ ...(mocks.user as object), picture: null }));
	mocks.getUser.mockResolvedValue(grace);
	// jsdom has no object URLs; the crop dialog only needs a string to show.
	URL.createObjectURL = vi.fn(() => 'blob:picture');
	URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('US-7-T-5 the own profile page (AC7)', () => {
	// The context loaded GET /me once when the app opened; the page asks again.
	it('US-7-T-5 reloads the player from GET /me when it opens', () => {
		openOwn();
		expect(mocks.refresh).toHaveBeenCalledTimes(1);
	});

	// The heading's letters drop in one by one, so its name comes from aria-label.
	it('US-7-T-5 names the page heading after the player', () => {
		openOwn();
		expect(screen.getByRole('heading', { level: 1, name: 'Ada' })).toBeTruthy();
	});

	it('US-7-T-5 shows the description beside the name', () => {
		openOwn();
		expect(screen.getByText('Night-owl Python main.')).toBeTruthy();
	});

	// fakeUser joined 2026-01-01; the details show the month and year.
	it('US-7-T-5 shows when the player joined', () => {
		openOwn();
		expect(screen.getByText('Joined January 2026')).toBeTruthy();
	});

	it('US-7-T-5 puts "LeetBattle" and "Ranked" across the top of the card', () => {
		openOwn();
		expect(within(card()).getByText('Ranked').previousElementSibling?.textContent).toBe('LeetBattle');
	});

	it('US-7-T-5 shows the league name on the card', () => {
		openOwn();
		expect(within(card()).getByText('Gold I')).toBeTruthy();
	});

	// The visible rating is an odometer (hidden from screen readers); this is its text.
	it('US-7-T-5 gives screen readers the rating as text', () => {
		openOwn();
		expect(screen.getByText('Rating 684')).toBeTruthy();
	});

	it('US-7-T-5 rounds the win rate (24 of 44 matches is 55%)', () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
		openOwn();
		act(() => {
			vi.advanceTimersByTime(4000);
		});
		expect(within(screen.getByRole('group', { name: 'Win rate' })).getByText('55%')).toBeTruthy();
	});

	// The detail line fades in on hover, in space that is always there.
	it('US-7-T-5 gives the Wins stat the detail "of 44 matches"', () => {
		openOwn();
		expect(within(screen.getByRole('group', { name: 'Wins' })).getByText('of 44 matches')).toBeTruthy();
	});

	it('US-7-T-5 labels the left end of the league bar with the league and its lowest rating', () => {
		openOwn();
		expect(screen.getByTestId('league-from').textContent).toBe('Gold I 600');
	});

	it('US-7-T-5 labels the right end of the league bar with the next league and where it starts', () => {
		openOwn();
		expect(screen.getByTestId('league-to').textContent).toBe('Gold II 700');
	});

	// 684 is 84% of the way from 600 to 700.
	it('US-7-T-5 fills the league bar as far as the rating is between the ends', () => {
		openOwn();
		expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('84');
	});

	// Platinum has no next league.
	it('US-7-T-5 reads "Top league" at the right end in Platinum', () => {
		openOwn({ rating: 2100, league: 'Platinum', leagueMin: 2000, nextLeague: null });
		expect(screen.getByTestId('league-to').textContent).toBe('Top league');
	});

	it('US-7-T-5 shows a full bar in Platinum', () => {
		openOwn({ rating: 2100, league: 'Platinum', leagueMin: 2000, nextLeague: null });
		expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
	});

	it('US-7-T-5 never shows the player\'s email', () => {
		openOwn();
		expect(screen.queryByText('ada@example.com')).toBeNull();
	});

	// Gold I is the 7th of 13 leagues: index 6 of 12.
	it('US-7-T-5 sets the shine to the league\'s place out of 12', () => {
		openOwn();
		expect(screen.getByTestId('player-profile').style.getPropertyValue('--lb-pc-shine')).toBe('0.500');
	});

	it('US-7-T-5 takes the metal colour from the league\'s metal', () => {
		openOwn();
		expect(screen.getByTestId('player-profile').style.getPropertyValue('--lb-pc-metal')).toBe('var(--lb-metal-gold)');
	});

	// Text and numbers are Onest with natural digit spacing.
	it('US-7-T-5 uses no mono font on the page', () => {
		const { container } = openOwn();
		expect(container.querySelector('.font-mono')).toBeNull();
	});
});

describe('US-7-T-5 the odometer', () => {
	const digits = () => screen.getAllByTestId('odometer')[0].children;

	it('US-7-T-5 gives the rating one slot per digit', () => {
		openOwn();
		expect(digits()).toHaveLength(3);
	});

	// 618: the "1" sits in a narrower slot than the "8", so the number isn't gappy.
	it('US-7-T-5 makes each digit\'s slot as wide as that digit', () => {
		openOwn({ rating: 618 });
		const width = (i: number) => parseFloat((digits()[i] as HTMLElement).style.width);
		expect(width(1)).toBeLessThan(width(2));
	});
});

describe('US-7-T-5 the avatar and the picker (AC8)', () => {
	it('US-7-T-5 draws the chosen icon when there is no picture', () => {
		openOwn();
		expect(avatar().querySelector('svg')?.getAttribute('data-icon')).toBe('katana');
	});

	it('US-7-T-5 shows the picture as an img when there is one', () => {
		openOwn({ picture: 'data:image/png;base64,AAAA' });
		expect(avatar().querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
	});

	it('US-7-T-5 opens the picker when you click your own avatar', async () => {
		openOwn();
		await userEvent.click(avatar());
		expect(screen.getByRole('group', { name: 'Choose your icon' })).toBeTruthy();
	});

	it('US-7-T-5 lists the 8 icons in the picker', async () => {
		openOwn();
		await userEvent.click(avatar());
		// Each icon button carries its key; Upload and Remove don't.
		expect(screen.getByRole('group', { name: 'Choose your icon' }).querySelectorAll('button[data-icon]')).toHaveLength(8);
	});

	it('US-7-T-5 offers "Upload a picture" in the picker', async () => {
		openOwn();
		await userEvent.click(avatar());
		expect(screen.getByRole('button', { name: 'Upload a picture' })).toBeTruthy();
	});

	it('US-7-T-5 offers no "Remove picture" without a picture', async () => {
		openOwn();
		await userEvent.click(avatar());
		expect(screen.queryByRole('button', { name: 'Remove picture' })).toBeNull();
	});

	it('US-7-T-5 offers "Remove picture" when there is a picture', async () => {
		openOwn({ picture: 'data:image/png;base64,AAAA' });
		await userEvent.click(avatar());
		expect(screen.getByRole('button', { name: 'Remove picture' })).toBeTruthy();
	});

	it('US-7-T-5 saves a chosen icon with PATCH /account', async () => {
		openOwn();
		await userEvent.click(avatar());
		await userEvent.click(screen.getByRole('button', { name: 'Bolt' }));
		expect(mocks.updateProfile).toHaveBeenCalledWith({ icon: 'bolt' });
	});

	// The saved profile comes back from AuthService and the new icon spins in.
	it('US-7-T-5 spins the saved icon into the avatar', async () => {
		openOwn();
		await userEvent.click(avatar());
		await userEvent.click(screen.getByRole('button', { name: 'Bolt' }));
		await waitFor(() => expect(avatar().querySelector('svg.lb-pc-swap')?.getAttribute('data-icon')).toBe('bolt'));
	});

	it('US-7-T-5 removes the picture with DELETE /account/picture', async () => {
		openOwn({ picture: 'data:image/png;base64,AAAA' });
		await userEvent.click(avatar());
		await userEvent.click(screen.getByRole('button', { name: 'Remove picture' }));
		expect(mocks.removePicture).toHaveBeenCalledTimes(1);
	});

	it('US-7-T-5 closes the picker on Escape', async () => {
		openOwn();
		await userEvent.click(avatar());
		await userEvent.keyboard('{Escape}');
		expect(screen.queryByRole('group', { name: 'Choose your icon' })).toBeNull();
	});
});

describe('US-7-T-5 the crop dialog (AC8)', () => {
	// jsdom can't decode or draw pictures: the crop picture reports a size by
	// hand, and the canvas export is a stub that answers like a browser would.
	function stubCanvas(webp = true) {
		HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
		HTMLCanvasElement.prototype.toDataURL = vi.fn((type?: string) => (type === 'image/webp' && webp ? 'data:image/webp;base64,WEBP' : 'data:image/png;base64,PNG'));
	}
	// Opens the dialog with a PNG and lets its picture "load" at 512x384.
	function openCrop() {
		openOwn();
		choose(fakeFile('me.png', 'image/png'));
		const img = screen.getByRole('dialog', { name: 'Crop your picture' }).querySelector('img') as HTMLImageElement;
		Object.defineProperty(img, 'naturalWidth', { value: 512 });
		Object.defineProperty(img, 'naturalHeight', { value: 384 });
		fireEvent.load(img);
	}
	const stage = () => screen.getByLabelText('Picture position: drag, or use the arrow keys');

	it('US-7-T-5 turns down a file that isn\'t PNG, JPEG or WebP', () => {
		openOwn();
		choose(fakeFile('me.gif', 'image/gif'));
		expect(screen.getByRole('alert').textContent).toBe('Choose a PNG, JPEG or WebP picture.');
	});

	it('US-7-T-5 turns down a picture over 8 MB', () => {
		openOwn();
		choose(fakeFile('me.png', 'image/png', 9 * 1024 * 1024));
		expect(screen.getByRole('alert').textContent).toBe('That picture is over 8 MB. Choose a smaller one.');
	});

	it('US-7-T-5 opens the crop dialog for a PNG', () => {
		openCrop();
		expect(screen.getByRole('dialog', { name: 'Crop your picture' })).toBeTruthy();
	});

	it('US-7-T-5 has a Zoom slider', () => {
		openCrop();
		expect(screen.getByRole('slider', { name: 'Zoom' })).toBeTruthy();
	});

	it('US-7-T-5 zooms in on "+"', () => {
		openCrop();
		fireEvent.keyDown(stage(), { key: '+' });
		expect(Number((screen.getByRole('slider', { name: 'Zoom' }) as HTMLInputElement).value)).toBeGreaterThan(1);
	});

	it('US-7-T-5 closes the dialog on Escape', () => {
		openCrop();
		fireEvent.keyDown(stage(), { key: 'Escape' });
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('US-7-T-5 uploads nothing when the dialog is cancelled with Escape', () => {
		openCrop();
		fireEvent.keyDown(stage(), { key: 'Escape' });
		expect(mocks.setPicture).not.toHaveBeenCalled();
	});

	it('US-7-T-5 uploads the WebP export with PUT /account/picture', async () => {
		stubCanvas();
		openCrop();
		await userEvent.click(screen.getByRole('button', { name: 'Use picture' }));
		expect(mocks.setPicture).toHaveBeenCalledWith('data:image/webp;base64,WEBP');
	});

	// A browser that can't make WebP hands back a PNG from toDataURL('image/webp').
	it('US-7-T-5 uploads a PNG export where WebP isn\'t supported', async () => {
		stubCanvas(false);
		openCrop();
		await userEvent.click(screen.getByRole('button', { name: 'Use picture' }));
		expect(mocks.setPicture).toHaveBeenCalledWith('data:image/png;base64,PNG');
	});
});

describe('US-7-T-5 description editing (AC3, AC8)', () => {
	const field = () => screen.getByRole('textbox', { name: 'Description' }) as HTMLInputElement;
	async function openEditor() {
		openOwn();
		await userEvent.click(screen.getByRole('button', { name: 'Edit description' }));
	}

	it('US-7-T-5 offers "Add a short description" when there is none', () => {
		openOwn({ description: '' });
		expect(screen.getByRole('button', { name: 'Add a short description' })).toBeTruthy();
	});

	it('US-7-T-5 opens a Description field from the pencil', async () => {
		await openEditor();
		expect(field()).toBeTruthy();
	});

	it('US-7-T-5 limits the field to 80 characters', async () => {
		await openEditor();
		expect(field().maxLength).toBe(80);
	});

	it('US-7-T-5 counts the characters as you type', async () => {
		await openEditor();
		await userEvent.clear(field());
		await userEvent.type(field(), 'hello');
		expect(screen.getByText('5 / 80')).toBeTruthy();
	});

	// Enter submits the real <form>; the value is trimmed before it is sent.
	it('US-7-T-5 saves the trimmed description on Enter', async () => {
		await openEditor();
		await userEvent.clear(field());
		await userEvent.type(field(), '  hello  {Enter}');
		expect(mocks.updateProfile).toHaveBeenCalledWith({ description: 'hello' });
	});

	it('US-7-T-5 closes the field on Escape', async () => {
		await openEditor();
		await userEvent.keyboard('{Escape}');
		expect(screen.queryByRole('textbox', { name: 'Description' })).toBeNull();
	});

	it('US-7-T-5 saves nothing on Escape', async () => {
		await openEditor();
		await userEvent.type(field(), 'more{Escape}');
		expect(mocks.updateProfile).not.toHaveBeenCalled();
	});

	it('US-7-T-5 saves nothing on Cancel', async () => {
		await openEditor();
		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(mocks.updateProfile).not.toHaveBeenCalled();
	});

	it('US-7-T-5 shows a description with <script> as text', () => {
		openOwn({ description: '<script>alert(1)</script>' });
		expect(screen.getByText('<script>alert(1)</script>')).toBeTruthy();
	});

	it('US-7-T-5 adds no script element for a description with <script>', () => {
		const { container } = openOwn({ description: '<script>alert(1)</script>' });
		expect(container.querySelector('script')).toBeNull();
	});
});

describe('US-7-T-5 another player\'s profile (AC9)', () => {
	// Signed in as Ada (u1), looking at Grace (u2) unless a test changes the id.
	async function openOther() {
		mocks.user = goldUser;
		render(<OtherProfilePage />);
		await screen.findByRole('heading', { level: 1, name: 'Grace' });
	}

	it('US-7-T-5 loads the player from GET /users/:id', async () => {
		await openOther();
		expect(mocks.getUser).toHaveBeenCalledWith('u2');
	});

	it('US-7-T-5 names the heading after the other player', async () => {
		await openOther();
		expect(screen.getByRole('heading', { level: 1, name: 'Grace' })).toBeTruthy();
	});

	it('US-7-T-5 has no pencil on someone else\'s description', async () => {
		mocks.getUser.mockResolvedValue({ ...grace, description: 'Hi there' });
		await openOther();
		expect(screen.queryByRole('button', { name: 'Edit description' })).toBeNull();
	});

	it('US-7-T-5 has no "Add a short description" on someone else\'s profile', async () => {
		await openOther();
		expect(screen.queryByRole('button', { name: 'Add a short description' })).toBeNull();
	});

	it('US-7-T-5 makes someone else\'s avatar not a button', async () => {
		await openOther();
		expect(screen.queryByRole('button', { name: 'Change your icon' })).toBeNull();
	});

	it('US-7-T-5 redirects your own id to /profile', () => {
		mocks.user = goldUser;
		mocks.params = { id: 'u1' };
		render(<OtherProfilePage />);
		expect(mocks.replace).toHaveBeenCalledWith('/profile');
	});

	it('US-7-T-5 shows "Player not found" for an unknown id', async () => {
		mocks.user = goldUser;
		mocks.getUser.mockResolvedValue(null);
		render(<OtherProfilePage />);
		expect(await screen.findByText('Player not found')).toBeTruthy();
	});
});
