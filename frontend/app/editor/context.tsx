// Context contains the state of the app
// Instead of having to pass props around each of the widgets, just
// subscribe to them here!
'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../login/context';
import { getToken } from '../login/controller';
import { useOptionalLobbySocket } from '../lobby/socket-context';
import { APIService, parseTestCases, Problem, RunResult, SubmitResult, TestCase } from './controller';

export type LoadingAction = 'run' | 'submit' | null;

export interface EditorTab {
	id: string;
	name: string;
	code: string;
}

export interface EditorWorkspace {
	tabs: EditorTab[];
	activeTabId: string;
}

const EDITOR_WORKSPACE_EVENT = 'editor:workspace:update';
// How long the editor waits after the last edit before sharing code in a match.
const SHARE_CODE_DEBOUNCE_MS = 500;
const LOBBY_URL = process.env.NEXT_PUBLIC_LOBBY_URL ?? 'http://localhost:4003';

function createWorkspace(question: Problem): EditorWorkspace {
	return {
		tabs: [{
			id: 'tab-1',
			name: 'Tab 1',
			code: question.starter_code.replaceAll('\\n', '\n'),
		}],
		activeTabId: 'tab-1',
	};
}

function isEditorTab(value: unknown): value is EditorTab {
	if (!value || typeof value !== 'object') return false;
	const tab = value as Record<string, unknown>;
	return typeof tab.id === 'string'
		&& typeof tab.name === 'string'
		&& typeof tab.code === 'string';
}

function isEditorWorkspace(value: unknown): value is EditorWorkspace {
	if (!value || typeof value !== 'object') return false;
	const workspace = value as Record<string, unknown>;
	return Array.isArray(workspace.tabs)
		&& workspace.tabs.length > 0
		&& workspace.tabs.every(isEditorTab)
		&& typeof workspace.activeTabId === 'string'
		&& workspace.tabs.some((tab) => tab.id === workspace.activeTabId);
}

export interface EditorContextValue {
	questions: Problem[];
	currentQuestion: Problem | null;
	setCurrentQuestion: (_question: Problem) => void;
	// Only the first VISIBLE_CASES of the problem's cases, like LeetCode: Run
	// uses just these; Submit runs every case on CodeService.
	testCases: TestCase[];
	// How many of the problem's cases are not shown (they still run on Submit).
	hiddenCaseCount: number;
	tabs: EditorTab[];
	activeTabId: string;
	selectTab: (_tabId: string) => void;
	createTab: () => void;
	copyTab: (_tabId: string) => void;
	renameTab: (_tabId: string, _name: string) => void;
	removeTab: (_tabId: string) => void;
	code: string;
	setCode: (_code: string) => void;
	error: string | null;
	onRun: () => void;
	onSubmit: () => void;
	runResult: RunResult | null;
	submitResult: SubmitResult | null;
	// Why a submission in a match was refused (e.g. the team cooldown).
	submitError: string | null;
	loadingAction: LoadingAction;
	isLoading: boolean;
	// True when this provider is showing someone else's workspace: nothing can
	// be edited, created, renamed or removed, and nothing is ever sent anywhere.
	readOnly: boolean;
	// Whose workspace a read-only provider shows, e.g. "Grace".
	ownerName?: string;
}

// Practice (/editor) passes none of these. In a match the game page passes all
// three: the problems left after the bans, Submit through the game, and where
// to send the player's code (their own team only, through GameService).
interface EditorProviderProps {
	children: ReactNode;
	questionIds?: number[];
	submit?: (_questionId: number, _code: string) => Promise<SubmitResult>;
	shareCode?: (_questionId: number, _workspace: EditorWorkspace) => void;
	// Renders a teammate's workspace read only (see app/game/components --
	// WorkspaceSwitcher): the same editor UI, driven by their shared code
	// instead of this provider's own, with every mutation disabled.
	readOnly?: boolean;
	// The workspace to show per question while readOnly; a question with
	// nothing in here yet falls back to its starter code.
	externalWorkspaces?: Record<number, EditorWorkspace>;
	// Whose workspace this is while readOnly, shown in the code tab bar.
	ownerName?: string;
	// US-6-T-10: the question the player picked on the pick screen, shown as
	// their first tab instead of whichever problem happens to be first in the
	// pool, so a pick carries over into the game.
	defaultQuestionId?: number;
}

// How many test cases a problem shows (and Run runs).
const VISIBLE_CASES = 3;

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children, questionIds, submit, shareCode, readOnly = false, externalWorkspaces, ownerName, defaultQuestionId }: EditorProviderProps) {
	const { user } = useAuth();
	const inMatch = questionIds !== undefined;
	// The question_ids as a string, so a new array with the same ids (every
	// game state) doesn't reload the problems.
	const questionIdsKey = questionIds?.join(',');
	const lobbySocket = useOptionalLobbySocket();
	const [questions, setQuestions] = useState<Problem[]>([]);
	const [currentQuestion, setCurrentQuestion] = useState<Problem | null>(null);
	const [workspaces, setWorkspaces] = useState<Record<number, EditorWorkspace>>({});
	// Overrides which of a read-only workspace's tabs is shown; browsing a
	// teammate's tabs never touches their activeTabId, only this provider's own view of it.
	const [localActiveTabId, setLocalActiveTabId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [runResult, setRunResult] = useState<RunResult | null>(null);
	const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const shareTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
	const socketRef = useRef<Socket | null>(null);
	const allTestCases = currentQuestion ? parseTestCases(currentQuestion.input_output) : [];
	const testCases = allTestCases.slice(0, VISIBLE_CASES);
	const hiddenCaseCount = allTestCases.length - testCases.length;
	const workspaceSource = readOnly ? (externalWorkspaces ?? {}) : workspaces;
	const workspace = currentQuestion
		? workspaceSource[currentQuestion.question_id] ?? createWorkspace(currentQuestion)
		: { tabs: [], activeTabId: '' };
	const activeTabId = (readOnly && localActiveTabId) || workspace.activeTabId;
	const activeTab = workspace.tabs.find((tab) => tab.id === activeTabId) ?? workspace.tabs[0];
	const code = activeTab?.code ?? '';

	const applyRemoteWorkspace = useCallback((payload: unknown) => {
		if (!payload || typeof payload !== 'object') return;
		const update = payload as Record<string, unknown>;
		if (!Number.isInteger(update.questionId) || !isEditorWorkspace(update.workspace)) return;
		setWorkspaces((current) => ({
			...current,
			[update.questionId as number]: update.workspace as EditorWorkspace,
		}));
	}, []);

	useEffect(() => {
		// In a match, code only leaves through the game (to the player's own
		// team); the lobby socket would reach both teams.
		if (inMatch) return;
		let socket = lobbySocket?.socket ?? null;
		let ownsSocket = false;

		if (lobbySocket) {
			socket = lobbySocket.connect();
		} else if (user) {
			socket = io(LOBBY_URL, {
				autoConnect: false,
				auth: {
					token: getToken(),
					displayName: user.name?.trim() || user.email.split('@')[0],
				},
			});
			socket.connect();
			ownsSocket = true;
		}

		if (!socket) return;
		socketRef.current = socket;
		socket.on(EDITOR_WORKSPACE_EVENT, applyRemoteWorkspace);

		return () => {
			socket.off?.(EDITOR_WORKSPACE_EVENT, applyRemoteWorkspace);
			if (socketRef.current === socket) socketRef.current = null;
			if (ownsSocket) socket.disconnect();
		};
	}, [applyRemoteWorkspace, inMatch, lobbySocket?.connect, lobbySocket?.socket, user]);

	const updateWorkspace = useCallback((nextWorkspace: EditorWorkspace) => {
		if (!currentQuestion) return;
		const questionId = currentQuestion.question_id;
		setWorkspaces((current) => ({ ...current, [questionId]: nextWorkspace }));
		if (shareCode) {
			clearTimeout(shareTimer.current);
			shareTimer.current = setTimeout(() => shareCode(questionId, nextWorkspace), SHARE_CODE_DEBOUNCE_MS);
			return;
		}
		socketRef.current?.emit(EDITOR_WORKSPACE_EVENT, { questionId, workspace: nextWorkspace });
	}, [currentQuestion, shareCode]);

	useEffect(() => () => clearTimeout(shareTimer.current), []);

	const setCode = useCallback((nextCode: string) => {
		if (readOnly || !currentQuestion || !activeTab) return;
		updateWorkspace({
			...workspace,
			tabs: workspace.tabs.map((tab) => tab.id === activeTab.id ? { ...tab, code: nextCode } : tab),
		});
	}, [activeTab, currentQuestion, readOnly, updateWorkspace, workspace]);

	const selectTab = useCallback((tabId: string) => {
		if (!workspace.tabs.some((tab) => tab.id === tabId)) return;
		// Browsing a teammate's tabs only changes this provider's own view of
		// which one is open; it never writes back into their workspace.
		if (readOnly) {
			setLocalActiveTabId(tabId);
			return;
		}
		updateWorkspace({ ...workspace, activeTabId: tabId });
	}, [readOnly, updateWorkspace, workspace]);

	const createTab = useCallback(() => {
		if (readOnly || !currentQuestion) return;
		const nextIndex = workspace.tabs.length + 1;
		const tab: EditorTab = {
			id: `tab-${nextIndex}`,
			name: `Tab ${nextIndex}`,
			code: '',
		};
		updateWorkspace({
			tabs: [...workspace.tabs, tab],
			activeTabId: tab.id,
		});
	}, [currentQuestion, readOnly, updateWorkspace, workspace]);

	const copyTab = useCallback((tabId: string) => {
		if (readOnly || !currentQuestion) return;
		const source = workspace.tabs.find((tab) => tab.id === tabId);
		if (!source) return;
		const nextIndex = workspace.tabs.length + 1;
		const copy: EditorTab = {
			...source,
			id: `tab-${nextIndex}`,
			name: `Tab ${nextIndex}`,
		};
		updateWorkspace({ tabs: [...workspace.tabs, copy], activeTabId: copy.id });
	}, [currentQuestion, readOnly, updateWorkspace, workspace]);

	const renameTab = useCallback((tabId: string, name: string) => {
		if (readOnly) return;
		const nextName = name.trim();
		if (!nextName) return;
		updateWorkspace({
			...workspace,
			tabs: workspace.tabs.map((tab) => tab.id === tabId ? { ...tab, name: nextName } : tab),
		});
	}, [readOnly, updateWorkspace, workspace]);

	const removeTab = useCallback((tabId: string) => {
		if (readOnly || workspace.tabs.length < 2) return;
		const tabs = workspace.tabs.filter((tab) => tab.id !== tabId);
		const nextActiveTabId = workspace.activeTabId === tabId ? tabs[0].id : workspace.activeTabId;
		updateWorkspace({ tabs, activeTabId: nextActiveTabId });
	}, [readOnly, updateWorkspace, workspace]);

	// Browsing a teammate's tabs is local to whichever question is on screen;
	// switching questions always starts from that question's own open tab.
	useEffect(() => {
		setLocalActiveTabId(null);
	}, [currentQuestion?.question_id]);

	useEffect(() => {
		const api = new APIService();
		// In a match: the problems left after the bans, in pool order. In
		// practice: a random set.
		const load = questionIdsKey === undefined
			? api.generate()
			: Promise.all(questionIdsKey.split(',').filter(Boolean).map((id) => api.getProblem(Number(id))));
		load
			.then((problems) => {
				setQuestions(problems);
				// Readonly workspace: default to a question the teammate has
				// actually shared code for, not just the first in the pool.
				// Otherwise, default to the question the player picked on the pick
				// screen (US-6-T-10), if any, so their pick carries into the game.
				const preferred = readOnly && externalWorkspaces
					? problems.find((problem) => externalWorkspaces[problem.question_id]) ?? problems[0]
					: problems.find((problem) => problem.question_id === defaultQuestionId) ?? problems[0];
				setCurrentQuestion(preferred ?? null);
			})
			.catch((err) => setError(err.message));
	}, [questionIdsKey]);

	const onRun = () => {
		if (!currentQuestion || loadingAction) {
			return;
		}
		setLoadingAction('run');
		const api = new APIService();
		api
			.run(code, testCases, currentQuestion.question_id)
			.then(setRunResult)
			.catch((err) => setError(err.message))
			.finally(() => setLoadingAction(null));
	};

	const onSubmit = () => {
		if (!currentQuestion || loadingAction) {
			return;
		}
		setLoadingAction('submit');
		setSubmitError(null);
		const api = new APIService();
		(submit ?? api.submit.bind(api))(currentQuestion.question_id, code)
			.then(setSubmitResult)
			// A refused match submission is shown with the results; in practice a
			// failure stays a page error, as before.
			.catch((err) => (submit ? setSubmitError(err.message) : setError(err.message)))
			.finally(() => setLoadingAction(null));
	};

	return (
		<EditorContext.Provider
			value={{
				questions,
				currentQuestion,
				setCurrentQuestion,
				testCases,
				hiddenCaseCount,
				tabs: workspace.tabs,
				activeTabId,
				selectTab,
				createTab,
				copyTab,
				renameTab,
				removeTab,
				code,
				setCode,
				error,
				onRun,
				onSubmit,
				runResult,
				submitResult,
				submitError,
				loadingAction,
				isLoading: loadingAction !== null,
				readOnly,
				ownerName,
			}}
		>
			{children}
		</EditorContext.Provider>
	);
}

export function useEditor(): EditorContextValue {
	const context = useContext(EditorContext);
	if (!context) {
		throw new Error('useEditor must be used within an EditorProvider');
	}
	return context;
}
