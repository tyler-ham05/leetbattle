'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useEditor } from '../context';

interface ContextMenuState {
	tabId: string;
	x: number;
	y: number;
}

export default function CodeTabs() {
	const { tabs, activeTabId, selectTab, createTab, copyTab, renameTab, removeTab, readOnly, ownerName } = useEditor();
	const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
	const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
	const [nameDraft, setNameDraft] = useState('');
	const tabListRef = useRef<HTMLDivElement>(null);
	const contextMenuRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const tabList = tabListRef.current;
		if (tabList) tabList.scrollLeft = tabList.scrollWidth - tabList.clientWidth;
	}, [tabs.length]);

	useEffect(() => {
		if (!contextMenu) return;

		const handleMouseDown = (event: MouseEvent) => {
			if (!contextMenuRef.current?.contains(event.target as Node)) setContextMenu(null);
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			const target = event.target;
			const isMonacoInput = target instanceof Element
				&& !!target.closest('.monaco-editor, [data-testid="monaco"]');
			const isTypingKey = (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey)
				|| ['Backspace', 'Delete', 'Enter', 'Tab'].includes(event.key);
			if (isMonacoInput && isTypingKey) setContextMenu(null);
		};
		const handleInput = (event: Event) => {
			const target = event.target;
			if (target instanceof Element && target.closest('.monaco-editor, [data-testid="monaco"]')) {
				setContextMenu(null);
			}
		};

		document.addEventListener('mousedown', handleMouseDown);
		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('input', handleInput);
		return () => {
			document.removeEventListener('mousedown', handleMouseDown);
			document.removeEventListener('keydown', handleKeyDown);
			document.removeEventListener('input', handleInput);
		};
	}, [contextMenu]);

	const rename = (tabId: string) => {
		renameTab(tabId, nameDraft);
		setRenamingTabId(null);
	};

	return (
		<div className="relative flex h-10 shrink-0 items-center gap-1 border-b border-line bg-page px-2">
			<div
				ref={tabListRef}
				role="tablist"
				aria-label="Code tabs"
				className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
			>
				{tabs.map((tab) => (
					<div key={tab.id} className="relative shrink-0">
						{renamingTabId === tab.id ? (
							<input
								aria-label="Tab name"
								autoFocus
								value={nameDraft}
								onChange={(event) => setNameDraft(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										rename(tab.id);
									} else if (event.key === 'Escape') {
										setRenamingTabId(null);
									}
								}}
								className="h-8 w-36 rounded-md border border-primary bg-surface px-2 text-xs text-ink outline-none"
							/>
						) : (
							<button
								type="button"
								role="tab"
								aria-selected={tab.id === activeTabId}
								aria-label={tab.name}
								onClick={() => {
									selectTab(tab.id);
									setContextMenu(null);
								}}
								onContextMenu={(event) => {
									if (readOnly) return;
									event.preventDefault();
									setContextMenu({ tabId: tab.id, x: event.clientX, y: event.clientY });
								}}
								className={`h-8 max-w-48 truncate rounded-md px-3 text-xs font-medium ${
									tab.id === activeTabId
										? 'bg-raised text-ink'
										: 'text-muted hover:bg-raised hover:text-ink'
								}`}
							>
								{tab.name}
							</button>
						)}
					</div>
				))}
				{!readOnly && (
					<button
						type="button"
						aria-label="Create new tab"
						onClick={() => {
							createTab();
							setContextMenu(null);
						}}
						className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-lg leading-none text-muted hover:bg-raised hover:text-ink"
					>
						+
					</button>
				)}
			</div>
			{readOnly && ownerName && (
				<span className="shrink-0 pr-2 text-xs text-muted">{ownerName}&apos;s code, read only</span>
			)}
			{contextMenu && (
				<div
					ref={contextMenuRef}
					role="menu"
					style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }}
					className="z-50 min-w-36 rounded-md border border-line bg-surface p-1 shadow-lg"
				>
					<button
						type="button"
						role="menuitem"
						onClick={() => {
							copyTab(contextMenu.tabId);
							setContextMenu(null);
						}}
						className="block w-full rounded px-3 py-2 text-left text-xs text-ink hover:bg-raised"
					>
						Copy tab
					</button>
					<button
						type="button"
						role="menuitem"
						onClick={() => {
							const tab = tabs.find((item) => item.id === contextMenu.tabId);
							if (tab) {
								setNameDraft(tab.name);
								setRenamingTabId(tab.id);
							}
							setContextMenu(null);
						}}
						className="block w-full rounded px-3 py-2 text-left text-xs text-ink hover:bg-raised"
					>
						Rename tab
					</button>
					<button
						type="button"
						role="menuitem"
						onClick={() => {
							removeTab(contextMenu.tabId);
							setContextMenu(null);
						}}
						className="block w-full rounded px-3 py-2 text-left text-xs text-danger hover:bg-raised"
					>
						Remove tab
					</button>
				</div>
			)}
		</div>
	);
}
