// The teammate code view should provide shared, editable tabs for every problem.
// Monaco is represented by a controlled textarea, while a small in-memory
// Socket.IO network lets two rendered players exchange events without starting
// or calling any backend service.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser, jsonResponse, stubFetch, threeProblems } from './helpers';

type SocketListener = (_payload: unknown) => void;

const socketHarness = vi.hoisted(() => {
	const sockets: {
		listeners: Map<string, SocketListener[]>;
		connected: boolean;
	}[] = [];

	return {
		sockets,
		reset() {
			sockets.length = 0;
		},
		io() {
			const socket = {
				listeners: new Map<string, SocketListener[]>(),
				connected: true,
				on(event: string, listener: SocketListener) {
					const listeners = this.listeners.get(event) ?? [];
					listeners.push(listener);
					this.listeners.set(event, listeners);
					return this;
				},
				emit(event: string, payload: unknown) {
					for (const peer of sockets) {
						for (const listener of peer.listeners.get(event) ?? []) {
							listener(payload);
						}
					}
					return this;
				},
				connect() {
					this.connected = true;
					return this;
				},
				disconnect() {
					this.connected = false;
					return this;
				},
			};
			sockets.push(socket);
			return socket;
		},
	};
});

vi.mock('@monaco-editor/react', () => ({
	default: ({ value, onChange }: { value: string; onChange: (_value: string) => void }) => (
		<textarea
			data-testid="monaco"
			value={value ?? ''}
			onChange={(event) => onChange(event.target.value)}
		/>
	),
}));
vi.mock('socket.io-client', () => ({ io: socketHarness.io }));
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: fakeUser, isLoading: false }),
}));
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import EditorPage from '../app/editor/page';

const CODE_URL = 'http://127.0.0.1:4001';

// Keep the editor tests isolated from AuthService and CodeService.
function stubCodeService() {
	stubFetch((url, init) => {
		if (url === `${CODE_URL}/problem` && (!init || init.method === 'GET')) {
			return jsonResponse(threeProblems);
		}
		if (url === `${CODE_URL}/problem` && init?.method === 'POST') {
			return jsonResponse({ verdict: 'Accepted', cases: [], responses: [] });
		}
		return jsonResponse({ verdict: 'Accepted', passed: 2, case: null, response: null });
	});
}

// A loaded player region gives the two simulated teammates separate accessible
// scopes while sharing only the mocked WebSocket connection.
async function renderTeammates() {
	stubCodeService();
	render(
		<>
			<section aria-label="Player one">
				<EditorPage />
			</section>
			<section aria-label="Player two">
				<EditorPage />
			</section>
		</>,
	);
	const first = screen.getByRole('region', { name: 'Player one' });
	const second = screen.getByRole('region', { name: 'Player two' });
	await Promise.all([
		within(first).findByText('Description for problem 1'),
		within(second).findByText('Description for problem 1'),
	]);
	return { first: within(first), second: within(second) };
}

beforeEach(() => {
	vi.unstubAllGlobals();
	socketHarness.reset();
});

afterEach(() => cleanup());

describe('default code tab', () => {
	it('shows Tab 1 when a game starts on problem 1', async () => {
		stubCodeService();
		render(<EditorPage />);
		await screen.findByText('Description for problem 1');

		expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeTruthy();
	});

	it('keeps Tab 1 available after switching to problem 2', async () => {
		const user = userEvent.setup();
		stubCodeService();
		render(<EditorPage />);
		await screen.findByText('Description for problem 1');
		await user.click(screen.getByRole('button', { name: '2' }));
		await screen.findByText('Description for problem 2');

		expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeTruthy();
	});

	it('keeps Tab 1 available after switching to problem 3', async () => {
		const user = userEvent.setup();
		stubCodeService();
		render(<EditorPage />);
		await screen.findByText('Description for problem 1');
		await user.click(screen.getByRole('button', { name: '3' }));
		await screen.findByText('Description for problem 3');

		expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeTruthy();
	});
});

describe('tab creation and editing', () => {
	it('creates a blank Monaco editor from the accessible new-tab button', async () => {
		const user = userEvent.setup();
		stubCodeService();
		render(<EditorPage />);
		await screen.findByText('Description for problem 1');

		await user.click(screen.getByRole('button', { name: 'Create new tab' }));
		expect((screen.getByTestId('monaco') as HTMLTextAreaElement).value).toBe('');
	});

	it('copies all code from a tab using its context menu', async () => {
		const user = userEvent.setup();
		stubCodeService();
		render(<EditorPage />);
		await screen.findByText('Description for problem 1');

		const originalCode = 'class Solution:\n    def solve(self):\n        return 42';
		fireEvent.change(screen.getByTestId('monaco'), { target: { value: originalCode } });
		fireEvent.contextMenu(screen.getByRole('tab', { name: 'Tab 1' }));
		await user.click(await screen.findByRole('menuitem', { name: 'Copy tab' }));

		expect((screen.getByTestId('monaco') as HTMLTextAreaElement).value).toBe(originalCode);
	});

	it('renames a tab through its context menu', async () => {
		const user = userEvent.setup();
		stubCodeService();
		render(<EditorPage />);
		await screen.findByText('Description for problem 1');

		fireEvent.contextMenu(screen.getByRole('tab', { name: 'Tab 1' }));
		await user.click(await screen.findByRole('menuitem', { name: 'Rename tab' }));
		const nameInput = await screen.findByRole('textbox', { name: 'Tab name' });
		await user.clear(nameInput);
		await user.type(nameInput, 'Review solution');
		await user.keyboard('{Enter}');

		expect(screen.getByRole('tab', { name: 'Review solution' })).toBeTruthy();
	});

	it('removes a tab through its context menu', async () => {
		const user = userEvent.setup();
		stubCodeService();
		render(<EditorPage />);
		await screen.findByText('Description for problem 1');

		await user.click(screen.getByRole('button', { name: 'Create new tab' }));
		const newTab = await screen.findByRole('tab', { name: 'Tab 2' });
		fireEvent.contextMenu(newTab);
		await user.click(await screen.findByRole('menuitem', { name: 'Remove tab' }));

		expect(screen.queryByRole('tab', { name: 'Tab 2' })).toBeNull();
	});
});

describe('shared teammate tabs over WebSockets', () => {
	it('synchronizes code edits in the same tab between teammates', async () => {
		const { first, second } = await renderTeammates();
		const sharedCode = 'print("shared with my teammate")';

		fireEvent.change(first.getByTestId('monaco'), { target: { value: sharedCode } });

		await waitFor(() =>
			expect((second.getByTestId('monaco') as HTMLTextAreaElement).value).toBe(sharedCode),
		);
	});

	it('shares a newly created tab with the other teammate', async () => {
		const user = userEvent.setup();
		const { first, second } = await renderTeammates();

		await user.click(first.getByRole('button', { name: 'Create new tab' }));

		await waitFor(() => expect(second.getByRole('tab', { name: 'Tab 2' })).toBeTruthy());
	});

	it('shares a tab rename with the other teammate', async () => {
		const user = userEvent.setup();
		const { first, second } = await renderTeammates();

		fireEvent.contextMenu(first.getByRole('tab', { name: 'Tab 1' }));
		await user.click(await screen.findByRole('menuitem', { name: 'Rename tab' }));
		const nameInput = await first.findByRole('textbox', { name: 'Tab name' });
		await user.clear(nameInput);
		await user.type(nameInput, 'Review solution');
		await user.keyboard('{Enter}');

		await waitFor(() => expect(second.getByRole('tab', { name: 'Review solution' })).toBeTruthy());
	});

	it('shares tab removal with the other teammate', async () => {
		const user = userEvent.setup();
		const { first, second } = await renderTeammates();

		await user.click(first.getByRole('button', { name: 'Create new tab' }));
		const newTab = await first.findByRole('tab', { name: 'Tab 2' });
		fireEvent.contextMenu(newTab);
		await user.click(await screen.findByRole('menuitem', { name: 'Remove tab' }));

		await waitFor(() => expect(second.queryByRole('tab', { name: 'Tab 2' })).toBeNull());
	});
});
