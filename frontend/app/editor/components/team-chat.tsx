'use client';
import { FormEvent, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '../../login/context';
import { useTeamChat } from '../chat-context';

// How close (px) to the bottom of the list still counts as "at the bottom".
const NEAR_BOTTOM_PX = 48;

export default function TeamChat() {
	const { messages, send, error } = useTeamChat();
	const { user } = useAuth();
	const [draft, setDraft] = useState('');
	const canSend = draft.trim() !== '';
	const listRef = useRef<HTMLUListElement>(null);
	// Whether the player was at (or near) the bottom when they last scrolled.
	const atBottom = useRef(true);
	const [hasUnseen, setHasUnseen] = useState(false);

	const scrollToBottom = () => {
		const list = listRef.current;
		if (list) list.scrollTop = list.scrollHeight;
		atBottom.current = true;
		setHasUnseen(false);
	};

	const onScroll = () => {
		const list = listRef.current;
		if (!list) return;
		atBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight <= NEAR_BOTTOM_PX;
		if (atBottom.current) setHasUnseen(false);
	};

	// A new message follows the list down if the player was at the bottom or
	// sent it themselves; otherwise the list stays put and "New messages" shows.
	useLayoutEffect(() => {
		const newest = messages[messages.length - 1];
		if (!newest) return;
		if (atBottom.current || newest.userId === user?.id) scrollToBottom();
		else setHasUnseen(true);
	}, [messages, user?.id]);

	const onSubmit = (event: FormEvent) => {
		event.preventDefault();
		if (!canSend) {
			return;
		}
		// The box is emptied only once the message is accepted, so a rejected
		// one (e.g. "Whoa, slow down!") can be sent again.
		void send(draft).then((accepted) => {
			if (accepted) setDraft('');
		});
	};

	return (
		<section aria-label="Team chat" className="flex h-full flex-col bg-surface text-sm text-ink">
			<h2 className="border-b border-line px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
				Team chat
			</h2>

			{messages.length === 0 ? (
				<p className="flex-1 px-4 py-3 text-muted">No messages yet</p>
			) : (
				<div className="relative flex min-h-0 flex-1 flex-col">
					<ul ref={listRef} onScroll={onScroll} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
						{messages.map((message) => {
							const own = message.userId === user?.id;
							return (
								<li key={message.id} className="leading-5">
									<span className={`mr-2 font-medium ${own ? 'text-ink' : 'text-primary'}`}>{own ? 'You' : message.displayName}</span>
									<span data-testid="chat-text" className="break-words">{message.text}</span>
								</li>
							);
						})}
					</ul>
					{hasUnseen && (
						<button
							type="button"
							onClick={scrollToBottom}
							className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md border border-line bg-surface px-3 py-1 text-xs text-ink hover:bg-raised"
						>
							New messages
						</button>
					)}
				</div>
			)}

			{error && <p role="alert" className="border-t border-line px-4 pt-2 text-xs text-danger">{error}</p>}

			<form onSubmit={onSubmit} className="flex gap-2 border-t border-line px-4 py-2">
				<input
					type="text"
					aria-label="Message your team"
					placeholder="Message your team"
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					className="min-w-0 flex-1 rounded-md border border-line bg-page px-3 py-1.5 text-ink placeholder:text-muted focus:border-primary focus:outline-none"
				/>
				<button
					type="submit"
					disabled={!canSend}
					className="rounded-md bg-primary px-3 py-1.5 font-medium text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
				>
					Send
				</button>
			</form>
		</section>
	);
}
