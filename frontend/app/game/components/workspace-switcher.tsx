'use client';
import type { GamePlayer } from '../socket-context';

interface WorkspaceSwitcherProps {
	// The viewer's teammates (own team, excluding the viewer); never the other team.
	teammates: GamePlayer[];
	// null means the viewer's own, editable workspace.
	viewedUserId: string | null;
	onSelect: (_userId: string | null) => void;
}

const TAB = 'flex h-8 max-w-48 items-center gap-1.5 truncate rounded-md px-3 text-xs font-medium';
const SELECTED = 'bg-raised text-ink';
const UNSELECTED = 'text-muted hover:bg-raised hover:text-ink';

// A crossed-out wifi, shown on a disconnected teammate's tab (US-5-T-19).
function DisconnectedIcon() {
	return (
		<svg data-testid="disconnected-icon" aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
			<path d="M2 2l20 20" />
			<path d="M8.5 16.4a5 5 0 0 1 7 0" />
			<path d="M5 12.9a10 10 0 0 1 5.2-2.8" />
			<path d="M19 12.9a10 10 0 0 0-2-1.4" />
			<path d="M1.4 9a15 15 0 0 1 4.3-2.6" />
			<path d="M22.6 9a15 15 0 0 0-11-3.9" />
			<circle cx="12" cy="20" r="0.6" fill="currentColor" />
		</svg>
	);
}

export default function WorkspaceSwitcher({ teammates, viewedUserId, onSelect }: WorkspaceSwitcherProps) {
	return (
		<div role="tablist" aria-label="Workspace" className="flex h-10 shrink-0 items-center gap-1 border-b border-line bg-page px-2">
			<button
				type="button"
				role="tab"
				aria-selected={viewedUserId === null}
				onClick={() => onSelect(null)}
				className={`${TAB} ${viewedUserId === null ? SELECTED : UNSELECTED}`}
			>
				You
			</button>
			{teammates.map((teammate) => (
				<button
					key={teammate.userId}
					type="button"
					role="tab"
					aria-selected={viewedUserId === teammate.userId}
					// Disconnected teammates stay viewable, just faded and marked.
					aria-label={teammate.connected ? undefined : `${teammate.displayName}, disconnected`}
					onClick={() => onSelect(teammate.userId)}
					className={`${TAB} ${viewedUserId === teammate.userId ? SELECTED : UNSELECTED} ${teammate.connected ? '' : 'opacity-50'}`}
				>
					{!teammate.connected && <DisconnectedIcon />}
					{teammate.displayName}
				</button>
			))}
		</div>
	);
}
