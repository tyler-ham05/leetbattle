// Tests for the team chat following new messages and marking the player's own
// messages (US-3-T-5).
// Pseudocode these tests were written from: test/chat-follow-test-pseudo.md
//
// Nothing here talks to a backend: messages are mocked data handed to the chat
// provider or fired on a fake game socket, and the signed-in player is a fake.
//
// jsdom has no layout, so every list reports a height of 0. The tests stub
// scrollHeight / clientHeight / scrollTop on the message list to put the
// player at the bottom or scrolled up, then read scrollTop back to see whether
// the panel moved the list.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser } from './helpers';

// The signed-in player is "Ada" (u1).
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: fakeUser, isLoading: false }),
}));

import TeamChat from '../app/editor/components/team-chat';
import { ChatProvider } from '../app/editor/chat-context';
import type { ChatMessage } from '../app/editor/chat-context';
import type { Socket } from 'socket.io-client';

// Mocked team comments from two teammates (neither is the signed-in player).
const teamComments: ChatMessage[] = [
	{ id: 'm1', userId: 'u2', displayName: 'Grace', text: 'I will take question 2' },
	{ id: 'm2', userId: 'u3', displayName: 'Katherine', text: 'Try a hash map' },
];

// A chat:message from Grace (u2), as GameService sends it.
const fromGrace = { id: 'm9', userId: 'u2', displayName: 'Grace', team: 'a', text: 'Question 3 is tricky', sentAt: '2026-11-17T12:00:00.000Z' };

// A chat:message from the signed-in player Ada (u1) herself.
const fromAda = { ...fromGrace, id: 'm10', userId: 'u1', displayName: 'Ada', text: 'On it' };

type Handler = (_payload: unknown) => void;

// A stand-in for the game socket (same as chat.test.tsx): `on` records
// handlers, `fire` runs them like a server event would, `emit` records sends.
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

// Renders the chat panel on a fake game socket, then delivers Grace's message
// so the message list exists before a test stubs its scroll position.
function renderChatWithSocket() {
	const fake = fakeSocket();
	render(
		<ChatProvider socket={fake.socket as unknown as Socket}>
			<TeamChat />
		</ChatProvider>,
	);
	act(() => fake.fire('chat:message', fromGrace));
	return fake;
}

// Renders only the chat panel (no socket), starting from the given comments.
function renderChat(comments: ChatMessage[] = teamComments) {
	render(
		<ChatProvider initialMessages={comments}>
			<TeamChat />
		</ChatProvider>,
	);
}

// The scrolling list of messages.
function messageList(): HTMLElement {
	return screen.getByRole('list');
}

// The message list's fake layout: `height` px of content in a 200px box.
// Starts at 1000px; a test calls `grow` to stand in for a new message adding
// content below what the player can see.
const layout = { height: 1000 };
const BOX = 200;

// Gives the message list the fake layout, scrolled down `scrollTop` px.
// scrollTop stays writable so the panel can move the list. Then fires a
// scroll event, the way the browser would after the player scrolled there.
function placeList(scrollTop: number) {
	const list = messageList();
	let top = scrollTop;
	Object.defineProperty(list, 'scrollHeight', { configurable: true, get: () => layout.height });
	Object.defineProperty(list, 'clientHeight', { configurable: true, get: () => BOX });
	Object.defineProperty(list, 'scrollTop', {
		configurable: true,
		get: () => top,
		set: (value: number) => {
			top = value;
		},
	});
	fireEvent.scroll(list);
	return list;
}

// Delivers a message from Grace (`message`, default a new one) and grows the
// list's content by 60px, as the browser would once the message is drawn.
function deliver(fake: ReturnType<typeof fakeSocket>, message: unknown = { ...fromGrace, id: 'm11' }) {
	layout.height += 60;
	act(() => fake.fire('chat:message', message));
}

// With 1000px of content in a 200px box, the bottom starts at scrollTop 800.
const BOTTOM = 800;
// 700px above the bottom: clearly scrolled up to read.
const SCROLLED_UP = 100;

// The list shows the newest message once scrollTop reaches the bottom of the
// (grown) content. The panel may set it to scrollHeight, which a browser
// clamps to the bottom, so anything at or past the bottom counts.
function isAtNewest(list: HTMLElement): boolean {
	return list.scrollTop >= layout.height - BOX;
}

// The quiet button that jumps back down to the newest message.
function newMessagesButton() {
	return screen.queryByRole('button', { name: 'New messages' });
}

beforeEach(() => {
	layout.height = 1000;
});

afterEach(() => cleanup());

describe('following new messages at the bottom', () => {
	it('US-3-T-5 scrolls to a new message when the player is at the bottom', () => {
		const fake = renderChatWithSocket();
		const list = placeList(BOTTOM);

		deliver(fake);

		// The list was moved down to show the new message.
		expect(isAtNewest(list)).toBe(true);
	});

	it('US-3-T-5 scrolls to a new message when the player is within 48px of the bottom', () => {
		const fake = renderChatWithSocket();
		// 40px above the bottom still counts as "at the bottom".
		const list = placeList(BOTTOM - 40);

		deliver(fake);

		expect(isAtNewest(list)).toBe(true);
	});

	it('US-3-T-5 does not show "New messages" when the player is at the bottom', () => {
		const fake = renderChatWithSocket();
		placeList(BOTTOM);

		deliver(fake);

		// The new message is already in view, so there is nothing to jump to.
		expect(newMessagesButton()).toBeNull();
	});
});

describe('not moving a player who scrolled up', () => {
	it('US-3-T-5 does not move the list when the player has scrolled up', () => {
		const fake = renderChatWithSocket();
		const list = placeList(SCROLLED_UP);

		deliver(fake);

		// The player keeps reading where they were.
		expect(list.scrollTop).toBe(SCROLLED_UP);
	});

	it('US-3-T-5 shows "New messages" when a message arrives while the player has scrolled up', () => {
		const fake = renderChatWithSocket();
		placeList(SCROLLED_UP);

		deliver(fake);

		expect(newMessagesButton()).not.toBeNull();
	});

	it('US-3-T-5 scrolls to the newest message when "New messages" is clicked', async () => {
		const user = userEvent.setup();
		const fake = renderChatWithSocket();
		const list = placeList(SCROLLED_UP);
		deliver(fake);

		await user.click(screen.getByRole('button', { name: 'New messages' }));

		expect(isAtNewest(list)).toBe(true);
	});

	it('US-3-T-5 hides "New messages" once it is clicked', async () => {
		const user = userEvent.setup();
		const fake = renderChatWithSocket();
		placeList(SCROLLED_UP);
		deliver(fake);

		await user.click(screen.getByRole('button', { name: 'New messages' }));

		expect(newMessagesButton()).toBeNull();
	});

	it('US-3-T-5 hides "New messages" when the player scrolls back to the bottom', () => {
		const fake = renderChatWithSocket();
		placeList(SCROLLED_UP);
		deliver(fake);

		// The player scrolls down by hand (to the bottom of the grown list)
		// instead of clicking the button.
		placeList(layout.height - BOX);

		expect(newMessagesButton()).toBeNull();
	});
});

describe('sending always scrolls to the bottom', () => {
	it('US-3-T-5 scrolls to the newest message when a scrolled-up player sends one', async () => {
		const user = userEvent.setup();
		// No socket: the sent message shows straight away.
		renderChat();
		const list = placeList(SCROLLED_UP);

		await user.type(screen.getByRole('textbox', { name: 'Message your team' }), 'Question 1 is done{Enter}');

		expect(isAtNewest(list)).toBe(true);
	});

	it('US-3-T-5 scrolls to the player\'s own message when it comes back over the socket while scrolled up', () => {
		const fake = renderChatWithSocket();
		const list = placeList(SCROLLED_UP);

		// GameService sends the sender their own message too.
		deliver(fake, fromAda);

		expect(isAtNewest(list)).toBe(true);
	});
});

describe('marking the player\'s own messages', () => {
	// Shows one message from Ada (the signed-in player) and one from Grace.
	function renderOwnAndTeammate() {
		renderChat([
			{ id: 'm1', userId: 'u1', displayName: 'Ada', text: 'On it' },
			{ id: 'm2', userId: 'u2', displayName: 'Grace', text: 'Thanks' },
		]);
		return screen.getAllByRole('listitem');
	}

	it('US-3-T-5 labels the player\'s own message "You"', () => {
		const [own] = renderOwnAndTeammate();

		expect(own.textContent).toContain('You');
	});

	it('US-3-T-5 does not show the player\'s own name on their message', () => {
		const [own] = renderOwnAndTeammate();

		expect(own.textContent).not.toContain('Ada');
	});

	it('US-3-T-5 shows the "You" label in the ink color', () => {
		renderOwnAndTeammate();

		expect(screen.getByText('You').className).toContain('text-ink');
	});

	it('US-3-T-5 still shows a teammate\'s name on their message', () => {
		const [, teammate] = renderOwnAndTeammate();

		expect(teammate.textContent).toContain('Grace');
	});

	it('US-3-T-5 keeps a teammate\'s name in the primary color', () => {
		renderOwnAndTeammate();

		expect(screen.getByText('Grace').className).toContain('text-primary');
	});
});
