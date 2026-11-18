// Holds the team chat for the match screen.
// With a game socket (US-3-T-2), `send` emits `chat:send` to GameService.
// Without one, messages live in local state only.
// With a `history` (US-3-T-3), the team's earlier messages are shown first.
'use client';
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../login/context';

export interface ChatMessage {
	id: string;
	userId: string;
	displayName: string;
	text: string;
}

export interface ChatContextValue {
	messages: ChatMessage[];
	// Resolves true once the message is accepted, false if GameService refuses it.
	send: (_text: string) => Promise<boolean>;
	// Why GameService refused the last message (e.g. "Message too long"), if it did.
	error: string | null;
}

const ChatContext = createContext<ChatContextValue | null>(null);

// How long a chat error stays on screen before it goes away on its own.
const ERROR_SHOWN_MS = 5_000;

export function ChatProvider({
	children,
	initialMessages = [],
	socket = null,
	history,
}: {
	children: ReactNode;
	initialMessages?: ChatMessage[];
	// The match's game socket; null outside a match.
	socket?: Socket | null;
	// The team's chat so far, oldest first, from GameService's "chat:history".
	// Sent again on every reconnect, so it is followed rather than read once.
	history?: ChatMessage[];
}) {
	const { user } = useAuth();
	const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
	const [error, setError] = useState<string | null>(null);
	const errorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	// Shows `text` for ERROR_SHOWN_MS. A new error restarts the clock, so a
	// second "Whoa, slow down!" stays up for the full 5 seconds too.
	const showError = (text: string) => {
		clearTimeout(errorTimer.current);
		setError(text);
		errorTimer.current = setTimeout(() => setError(null), ERROR_SHOWN_MS);
	};
	useEffect(() => () => clearTimeout(errorTimer.current), []);

	// Shows the history first, then any messages already on screen that it
	// doesn't include, so a new history (e.g. after a reconnect) adds what was
	// missed without showing anything twice.
	useEffect(() => {
		if (!history) return;
		const inHistory = new Set(history.map((message) => message.id));
		setMessages((current) => [...history, ...current.filter((message) => !inHistory.has(message.id))]);
	}, [history]);

	// GameService sends each team message (the player's own included) as `chat:message`.
	useEffect(() => {
		if (!socket) return;
		const onMessage = (message: ChatMessage) => setMessages((current) => [...current, message]);
		socket.on('chat:message', onMessage);
		return () => {
			socket.off('chat:message', onMessage);
		};
	}, [socket]);

	const send = (text: string): Promise<boolean> => {
		// Over the socket, the message only shows once GameService sends it back.
		if (socket) {
			// GameService answers { ok: true } once it accepts the message, or { error } to refuse it.
			return new Promise((resolve) => {
				socket.emit('chat:send', { text: text.trim() }, (response?: { ok?: true; error?: string }) => {
					if (response?.error) {
						showError(response.error);
						resolve(false);
						return;
					}
					// An accepted message means the player has slowed down; drop the error now.
					clearTimeout(errorTimer.current);
					setError(null);
					resolve(true);
				});
			});
		}
		setMessages((current) => [
			...current,
			{
				id: `local-${current.length}`,
				userId: user?.id ?? '',
				displayName: user?.name ?? '',
				text: text.trim(),
			},
		]);
		return Promise.resolve(true);
	};

	return <ChatContext.Provider value={{ messages, send, error }}>{children}</ChatContext.Provider>;
}

export function useTeamChat(): ChatContextValue {
	const context = useContext(ChatContext);
	if (!context) {
		throw new Error('useTeamChat must be used within a ChatProvider');
	}
	return context;
}
