// Tests for the team chat panel on the match screen (US-3-T-1) and for sending
// and receiving its messages over the game socket (US-3-T-2).
// Pseudocode these tests were written from: test/chat-test-pseudo.md
//
// Nothing here talks to a backend: the comments are mocked data handed to the
// chat provider, the signed-in player is a fake, the one test that renders
// the whole match screen serves its problems from a stubbed fetch, and the
// US-3-T-2 tests hand the provider a fake game socket.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser, jsonResponse, stubFetch, threeProblems } from './helpers';

// Monaco needs a real browser; swap it for a plain textarea.
vi.mock('@monaco-editor/react', () => ({
	default: ({ value, onChange }: { value: string; onChange: (_v: string) => void }) => (
		<textarea data-testid="monaco" value={value} onChange={(e) => onChange(e.target.value)} />
	),
}));

// The signed-in player is "Ada" (u1); comments they post carry that name.
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: fakeUser, isLoading: false }),
}));
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import EditorPage from '../app/editor/page';
import TeamChat from '../app/editor/components/team-chat';
import { ChatProvider } from '../app/editor/chat-context';
import type { ChatMessage } from '../app/editor/chat-context';
import type { Socket } from 'socket.io-client';

// Mocked team comments from two teammates.
const teamComments: ChatMessage[] = [
	{ id: 'm1', userId: 'u2', displayName: 'Grace', text: 'I will take question 2' },
	{ id: 'm2', userId: 'u3', displayName: 'Katherine', text: 'Try a hash map' },
];

// Renders only the chat panel, starting from the given mocked comments.
function renderChat(comments: ChatMessage[] = teamComments) {
	render(
		<ChatProvider initialMessages={comments}>
			<TeamChat />
		</ChatProvider>,
	);
}

// The box the player types a comment into.
function messageBox(): HTMLInputElement {
	return screen.getByRole('textbox', { name: 'Message your team' }) as HTMLInputElement;
}

// The button that posts the comment.
function sendButton(): HTMLButtonElement {
	return screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement;
}

type Handler = (_payload: unknown) => void;

// A stand-in for the game's socket.io-client Socket (same idea as
// game-socket.test.tsx): `on` records handlers, `fire` invokes them the way
// the real socket would on a server event, and `emit` records what was sent.
function fakeSocket() {
	const handlers = new Map<string, Handler[]>();
	const socket = {
		on: vi.fn((event: string, handler: Handler) => {
			handlers.set(event, [...(handlers.get(event) ?? []), handler]);
			return socket;
		}),
		off: vi.fn((event: string, handler: Handler) => {
			handlers.set(event, (handlers.get(event) ?? []).filter((entry) => entry !== handler));
			return socket;
		}),
		emit: vi.fn(),
	};
	const fire = (event: string, payload?: unknown) => {
		for (const handler of handlers.get(event) ?? []) handler(payload);
	};
	return { socket, fire };
}

// Renders the chat panel connected to a fake game socket, with no comments yet.
function renderChatWithSocket() {
	const fake = fakeSocket();
	render(
		<ChatProvider socket={fake.socket as unknown as Socket}>
			<TeamChat />
		</ChatProvider>,
	);
	return fake;
}

beforeEach(() => {
	vi.unstubAllGlobals();
});

afterEach(() => cleanup());

describe('team chat panel on the match screen', () => {
	it('US-3-T-1 shows a "Team chat" panel when the match screen loads', async () => {
		// The match screen loads its problems from CodeService; serve them from a fake.
		stubFetch(() => jsonResponse(threeProblems));
		render(<EditorPage />);

		// The panel is a labelled region of the match screen.
		expect(await screen.findByRole('region', { name: 'Team chat' })).toBeTruthy();
	});
});

describe('reading team comments', () => {
	it('US-3-T-1 shows the text of each team comment', () => {
		renderChat();

		// Both mocked comments are listed, one list item each.
		expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
			expect.stringContaining('I will take question 2'),
			expect.stringContaining('Try a hash map'),
		]);
	});

	it('US-3-T-1 shows the name of the player who posted each comment', () => {
		renderChat();

		// Each list item starts with its author's name.
		expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
			expect.stringContaining('Grace'),
			expect.stringContaining('Katherine'),
		]);
	});

	it('US-3-T-1 shows "No messages yet" when the team has no comments', () => {
		renderChat([]);

		// With nothing to read, the panel says so instead of showing an empty box.
		expect(screen.getByText('No messages yet')).toBeTruthy();
	});
});

describe('posting a team comment', () => {
	it('US-3-T-1 shows a comment after the player types it and clicks Send', async () => {
		const user = userEvent.setup();
		renderChat();

		await user.type(messageBox(), 'Question 1 is done');
		await user.click(sendButton());

		// The new comment joins the list of team comments.
		expect(screen.getByText('Question 1 is done')).toBeTruthy();
	});

	it('US-3-T-1 shows the signed-in player\'s name on a comment they post', async () => {
		const user = userEvent.setup();
		renderChat([]);

		await user.type(messageBox(), 'Question 1 is done');
		await user.click(sendButton());

		// The signed-in player is Ada, so the only comment is attributed to her.
		expect(screen.getByRole('listitem').textContent).toContain('Ada');
	});

	it('US-3-T-1 posts the comment when the player presses Enter', async () => {
		const user = userEvent.setup();
		renderChat();

		// "{Enter}" presses the Enter key after typing, without touching Send.
		await user.type(messageBox(), 'On it{Enter}');

		expect(screen.getByText('On it')).toBeTruthy();
	});

	it('US-3-T-1 empties the message box after posting', async () => {
		const user = userEvent.setup();
		renderChat();

		await user.type(messageBox(), 'Question 1 is done');
		await user.click(sendButton());

		// The box is ready for the next comment.
		expect(messageBox().value).toBe('');
	});

	it('US-3-T-1 trims the spaces around a posted comment', async () => {
		const user = userEvent.setup();
		renderChat([]);

		await user.type(messageBox(), '   Need help on 3   ');
		await user.click(sendButton());

		// The comment's own text has no leading or trailing spaces.
		expect(screen.getByTestId('chat-text').textContent).toBe('Need help on 3');
	});

	it('US-3-T-1 disables Send while the message box is empty', () => {
		renderChat();

		// Nothing typed yet, so there is nothing to post.
		expect(sendButton().disabled).toBe(true);
	});

	it('US-3-T-1 disables Send while the message box only has spaces', async () => {
		const user = userEvent.setup();
		renderChat();

		await user.type(messageBox(), '   ');

		// Spaces alone are not a comment.
		expect(sendButton().disabled).toBe(true);
	});
});

// US-3-T-2: team chat messages over the game socket (all tests use a mocked socket, no backend)

describe('sending comments over the game socket', () => {
	it('US-3-T-2 emits chat:send with the message text when the player sends a comment', async () => {
		const user = userEvent.setup();
		const fake = renderChatWithSocket();

		await user.type(messageBox(), 'Question 1 is done');
		await user.click(sendButton());

		// The event name and its { text } payload (anything after that is not checked here).
		expect(fake.socket.emit.mock.calls[0].slice(0, 2)).toEqual(['chat:send', { text: 'Question 1 is done' }]);
	});

	it('US-3-T-2 does not show a sent comment until the server delivers it', async () => {
		const user = userEvent.setup();
		renderChatWithSocket();

		await user.type(messageBox(), 'Question 1 is done');
		await user.click(sendButton());

		// The server has not sent chat:message back yet, so the panel is still empty.
		expect(screen.getByText('No messages yet')).toBeTruthy();
	});

	it('US-3-T-2 still shows a sent comment straight away when there is no game socket', async () => {
		const user = userEvent.setup();
		// No socket, as on the practice editor: chat stays on the page (the US-3-T-1 behaviour).
		renderChat([]);

		await user.type(messageBox(), 'Question 1 is done');
		await user.click(sendButton());

		expect(screen.getByText('Question 1 is done')).toBeTruthy();
	});
});

// A chat:message from Grace (u2), a teammate of the signed-in player, as GameService sends it.
const fromGrace = {
	id: 'm9',
	userId: 'u2',
	displayName: 'Grace',
	team: 'a',
	text: 'Try a hash map',
	sentAt: '2026-11-17T12:00:00.000Z',
};

describe('showing comments the server delivers', () => {
	it('US-3-T-2 shows an incoming chat:message in the panel once', () => {
		const fake = renderChatWithSocket();

		act(() => fake.fire('chat:message', fromGrace));

		expect(screen.queryAllByText('Try a hash map')).toHaveLength(1);
	});

	it('US-3-T-2 shows the name of the player who sent an incoming chat:message', () => {
		const fake = renderChatWithSocket();

		act(() => fake.fire('chat:message', fromGrace));

		expect(screen.getByRole('listitem').textContent).toContain('Grace');
	});

	it('US-3-T-2 shows the player\'s own comment once when the server sends it back', async () => {
		const user = userEvent.setup();
		const fake = renderChatWithSocket();

		await user.type(messageBox(), 'Question 1 is done');
		await user.click(sendButton());
		// GameService sends the sender their own message too.
		act(() => fake.fire('chat:message', { ...fromGrace, id: 'm10', userId: 'u1', displayName: 'Ada', text: 'Question 1 is done' }));

		expect(screen.queryAllByText('Question 1 is done')).toHaveLength(1);
	});

	it('US-3-T-2 shows "Message too long" in the chat bar when chat:send is answered with it', async () => {
		const user = userEvent.setup();
		const fake = renderChatWithSocket();

		await user.type(messageBox(), 'Question 1 is done');
		await user.click(sendButton());
		// GameService answers chat:send on its acknowledgement (the callback passed after the payload).
		const answer = fake.socket.emit.mock.calls[0][2] as (_response: { error: string }) => void;
		act(() => answer({ error: 'Message too long' }));

		expect(screen.getByRole('alert').textContent).toBe('Message too long');
	});
});

// US-3-T-4: chat safeguards in the chat panel (all tests use a mocked socket, no backend)

// Types `text`, clicks Send, and returns the acknowledgement callback the
// panel passed with chat:send, so a test can answer the way GameService would.
async function sendAndGetAnswer(fake: ReturnType<typeof fakeSocket>, text = 'Question 1 is done') {
	const user = userEvent.setup();
	await user.type(messageBox(), text);
	await user.click(sendButton());
	return fake.socket.emit.mock.calls[0][2] as (_response: { ok: true } | { error: string }) => void;
}

describe('rejected messages', () => {
	it('US-3-T-4 shows "Whoa, slow down!" in the chat panel when a message is rate limited', async () => {
		const fake = renderChatWithSocket();
		const answer = await sendAndGetAnswer(fake);

		act(() => answer({ error: 'Whoa, slow down!' }));

		expect(screen.getByRole('alert').textContent).toBe('Whoa, slow down!');
	});

	it('US-3-T-4 keeps the typed text in the message box when a message is rejected', async () => {
		const fake = renderChatWithSocket();
		const answer = await sendAndGetAnswer(fake, 'Question 1 is done');

		act(() => answer({ error: 'Whoa, slow down!' }));

		expect(messageBox().value).toBe('Question 1 is done');
	});

	it('US-3-T-4 empties the message box once a message is accepted', async () => {
		const fake = renderChatWithSocket();
		const answer = await sendAndGetAnswer(fake);

		await act(async () => answer({ ok: true }));

		expect(messageBox().value).toBe('');
	});
});

describe('chat errors going away', () => {
	afterEach(() => vi.useRealTimers());

	it('US-3-T-4 hides a chat error 5 seconds after it is shown', async () => {
		const fake = renderChatWithSocket();
		const answer = await sendAndGetAnswer(fake);
		// Fake timers from here on, so the test can move the clock itself.
		vi.useFakeTimers();

		act(() => answer({ error: 'Whoa, slow down!' }));
		act(() => vi.advanceTimersByTime(4_900));
		// Still there just before the 5 seconds are up.
		expect(screen.getByRole('alert').textContent).toBe('Whoa, slow down!');

		act(() => vi.advanceTimersByTime(100));
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('US-3-T-4 hides a chat error straight away when the next message is accepted', async () => {
		const fake = renderChatWithSocket();
		const rejected = await sendAndGetAnswer(fake);
		act(() => rejected({ error: 'Whoa, slow down!' }));

		// The rejected text is still in the box; send it again and have it accepted.
		await userEvent.setup().click(sendButton());
		const accepted = fake.socket.emit.mock.calls[1][2] as (_response: { ok: true }) => void;
		await act(async () => accepted({ ok: true }));

		expect(screen.queryByRole('alert')).toBeNull();
	});
});

describe('unsafe text in chat messages', () => {
	// Shows an incoming chat:message with `text` and returns the chat panel.
	function showIncoming(text: string): HTMLElement {
		const fake = renderChatWithSocket();
		act(() => fake.fire('chat:message', { ...fromGrace, text }));
		return screen.getByRole('region', { name: 'Team chat' });
	}

	it('US-3-T-4 shows HTML in a message as text', () => {
		const panel = showIncoming('<b>hi</b>');

		expect(screen.getByTestId('chat-text').textContent).toBe('<b>hi</b>');
		// Had it been rendered as HTML, the panel would have a bold element.
		expect(panel.querySelector('b')).toBeNull();
	});

	it('US-3-T-4 does not run scripts in a message', () => {
		const panel = showIncoming('<script>alert("hacked")</script><img src="x" onerror="alert(\'hacked\')">');

		expect(screen.getByTestId('chat-text').textContent).toBe('<script>alert("hacked")</script><img src="x" onerror="alert(\'hacked\')">');
		// No script or image (whose onerror would run) made it into the page.
		expect(panel.querySelector('script')).toBeNull();
		expect(panel.querySelector('img')).toBeNull();
	});

	it('US-3-T-4 shows a message containing SQL as plain text', () => {
		showIncoming('\'); DROP TABLE team_messages; --');

		expect(screen.getByTestId('chat-text').textContent).toBe('\'); DROP TABLE team_messages; --');
	});
});

// US-3-T-3: chat history in the chat panel (all tests use a mocked socket, no backend)

// Renders the chat panel connected to a fake game socket, starting from the
// team's chat `history` as the match page passes it in.
function renderChatWithHistory(history: ChatMessage[]) {
	const fake = fakeSocket();
	const view = render(
		<ChatProvider socket={fake.socket as unknown as Socket} history={history}>
			<TeamChat />
		</ChatProvider>,
	);
	return { ...fake, view };
}

describe('chat history in the chat panel', () => {
	it('US-3-T-3 shows a message that is in chat:history and also arrives as a chat:message once', () => {
		const fake = renderChatWithHistory([fromGrace]);

		// The same message (same id) arrives live too.
		act(() => fake.fire('chat:message', fromGrace));

		expect(screen.queryAllByText('Try a hash map')).toHaveLength(1);
	});

	it('US-3-T-3 shows a chat:message that arrives after chat:history below the history', () => {
		const fake = renderChatWithHistory([fromGrace]);

		act(() => fake.fire('chat:message', { ...fromGrace, id: 'm10', text: 'Question 1 is done' }));

		expect(screen.getAllByTestId('chat-text').map((text) => text.textContent)).toEqual(['Try a hash map', 'Question 1 is done']);
	});

	it('US-3-T-3 shows "No messages yet" when chat:history is empty', () => {
		renderChatWithHistory([]);

		expect(screen.getByText('No messages yet')).toBeTruthy();
	});

	it('US-3-T-3 shows the team\'s earlier messages from the new chat:history after reconnecting', () => {
		const fake = renderChatWithHistory([]);

		// The socket reconnects and GameService sends the history again, now
		// with messages sent while this player was away.
		const missed = [fromGrace, { ...fromGrace, id: 'm10', text: 'Question 1 is done' }];
		fake.view.rerender(
			<ChatProvider socket={fake.socket as unknown as Socket} history={missed}>
				<TeamChat />
			</ChatProvider>,
		);

		expect(screen.getAllByTestId('chat-text').map((text) => text.textContent)).toEqual(['Try a hash map', 'Question 1 is done']);
	});

	it('US-3-T-3 does not show messages from before reconnecting twice', () => {
		// Before the drop: one message from the history and one that arrived live.
		const fake = renderChatWithHistory([fromGrace]);
		const live = { ...fromGrace, id: 'm10', text: 'Question 1 is done' };
		act(() => fake.fire('chat:message', live));

		// After reconnecting, the new history has both again, plus one sent while away.
		const missed = { ...fromGrace, id: 'm11', text: 'Moving on to question 3' };
		fake.view.rerender(
			<ChatProvider socket={fake.socket as unknown as Socket} history={[fromGrace, live, missed]}>
				<TeamChat />
			</ChatProvider>,
		);

		expect(screen.getAllByTestId('chat-text').map((text) => text.textContent)).toEqual(['Try a hash map', 'Question 1 is done', 'Moving on to question 3']);
	});
});
