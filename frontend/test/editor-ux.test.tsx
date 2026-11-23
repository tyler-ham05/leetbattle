// US-5-T-23: the editor shows what your code returned, makes Accepted and
// failures easy to tell apart, lets players resize the panes, adds the usual
// Run / Submit shortcuts and marks which questions you have solved.
// Pseudocode: test/editor-ux-test-pseudo.md (one test per bullet, one expect each).
//
// No backend is touched: fetch is stubbed (CodeService), socket.io-client is
// mocked (the practice editor would otherwise open a lobby socket) and Monaco
// is a textarea that also hands the app a fake editor so Monaco's own
// keybindings (addCommand) can be triggered.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser, jsonResponse, makeProblem, requestsOf, stubFetch, threeProblems } from './helpers';

// What Monaco's onMount receives: the commands the app registers with
// editor.addCommand(keybinding, handler) are kept here by keybinding, and
// FAKE_MONACO carries the same KeyMod / KeyCode numbers real Monaco uses.
const monacoMocks = vi.hoisted(() => ({
	commands: new Map<number, () => void>(),
	FAKE_MONACO: { KeyMod: { CtrlCmd: 2048, Shift: 1024 }, KeyCode: { Enter: 3 } },
}));
// Ctrl/Cmd+Enter and Ctrl/Cmd+Shift+Enter as Monaco keybinding numbers.
const CTRL_ENTER = 2048 | 3;
const CTRL_SHIFT_ENTER = 2048 | 1024 | 3;

// Monaco needs a real browser; a textarea with the same value / onChange
// contract stands in, and onMount is called once with a fake editor.
vi.mock('@monaco-editor/react', async () => {
	const { useEffect } = await import('react');
	return {
		default: function FakeMonaco({ value, onChange, onMount }: {
			value: string;
			onChange: (_v: string) => void;
			onMount?: (_editor: unknown, _monaco: unknown) => void;
		}) {
			useEffect(() => {
				onMount?.({ addCommand: (keybinding: number, handler: () => void) => monacoMocks.commands.set(keybinding, handler) }, monacoMocks.FAKE_MONACO);
			}, []);
			return <textarea data-testid="monaco" value={value} onChange={(e) => onChange(e.target.value)} />;
		},
	};
});

// The practice editor opens a lobby socket for shared tabs; keep it offline.
vi.mock('socket.io-client', () => ({
	io: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn(), connect: vi.fn(), disconnect: vi.fn() }),
}));
vi.mock('../app/login/context', () => ({ useAuth: () => ({ user: fakeUser, isLoading: false }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
// No match here: the scoreboard gets an empty one (see editor.test.tsx).
vi.mock('../app/editor/match-context', async (importOriginal) => ({
	...(await importOriginal<typeof import('../app/editor/match-context')>()),
	useMatch: () => ({ scores: { a: 0, b: 0 }, secondsLeft: 0, submissions: [] }),
}));

import EditorPage from '../app/editor/page';
import EditorLayout from '../app/editor/components/editor-layout';
import { EditorProvider } from '../app/editor/context';

const CODE_URL = 'http://127.0.0.1:4001';

// Run of problem 1 (two visible cases): case 1 passes, case 2 returns 5 instead of 2.
const RUN_RESULT = [
	{ verdict: 'Accepted', expected: '1', response: '1' },
	{ verdict: 'Wrong Answer', expected: '2', response: '5' },
];
const ACCEPTED = { verdict: 'Accepted', passed: 3, total: 3, case: null, expected: null, response: null };
const WRONG = { verdict: 'Wrong Answer', passed: 1, total: 3, case: '[1]', expected: '1', response: '2' };

// Serves the 3 problems; Run answers RUN_RESULT; each Submit answers the next
// entry of `submits` (the last one repeats).
function stubCodeService({ submits = [WRONG], problems = threeProblems, holdPosts = false }: {
	submits?: unknown[];
	problems?: unknown[];
	// Leave every POST hanging, so a run or submit stays "already going".
	holdPosts?: boolean;
} = {}) {
	let submitCount = 0;
	return stubFetch((url, init) => {
		if (init?.method === 'POST' && holdPosts) return new Promise<Response>(() => undefined);
		if (url === `${CODE_URL}/solution`) return jsonResponse(RUN_RESULT);
		if (url.startsWith(`${CODE_URL}/solution/`)) {
			const body = submits[Math.min(submitCount, submits.length - 1)];
			submitCount += 1;
			return jsonResponse(body);
		}
		return jsonResponse(problems);
	});
}

async function renderEditor(options: Parameters<typeof stubCodeService>[0] = {}) {
	const fetchMock = stubCodeService(options);
	render(<EditorPage />);
	await screen.findByRole('heading', { name: /1\. Problem Number 1/ });
	return fetchMock;
}

// How many POSTs went to exactly this URL.
const postsTo = (fetchMock: ReturnType<typeof stubFetch>, url: string) =>
	requestsOf(fetchMock).filter((request) => request.method === 'POST' && request.url === url).length;

// Clicks Run and waits until the results are on screen.
async function runCode() {
	await userEvent.click(screen.getByRole('button', { name: 'Run' }));
	await screen.findByText('Your output');
}

// Clicks Submit and waits for the submission result to show up.
async function submitCode(verdict: string) {
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
	return within(await screen.findByRole('region', { name: 'Submission result' })).findByText(verdict);
}

// The value block that sits right under a label ("Input", "Your output", ...).
const blockUnder = (label: HTMLElement) => label.nextElementSibling as HTMLElement;

// Lets an element report a 1000 x 1000 box at the top left of the page, which
// jsdom does not lay out on its own.
function stubRect(element: HTMLElement) {
	element.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000, x: 0, y: 0, toJSON: () => ({}) });
}

const questionDivider = () => screen.getByRole('separator', { name: 'Resize question and code' });
const codeDivider = () => screen.getByRole('separator', { name: 'Resize code and test cases' });
// Lets any pending fetches and state updates settle, for tests that check something did NOT happen.
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));

beforeEach(() => {
	vi.unstubAllGlobals();
	monacoMocks.commands.clear();
});
afterEach(() => cleanup());

describe('test cases panel shows your output after Run', () => {
	it('shows "Your output" for the selected case after Run', async () => {
		await renderEditor();
		await userEvent.click(screen.getByRole('button', { name: 'Run' }));
		// findByText throws if "Your output" never appears.
		expect(await screen.findByText('Your output')).toBeTruthy();
	});

	it('shows what the code returned for the selected case', async () => {
		await renderEditor();
		await runCode();
		await userEvent.click(screen.getByRole('button', { name: 'Case 2' }));
		// Case 2 returned 5 (expected 2).
		expect(blockUnder(screen.getByText('Your output')).textContent).toBe('5');
	});

	it('puts "Your output" after Expected output', async () => {
		await renderEditor();
		await runCode();
		const expected = screen.getByText('Expected output');
		const yours = screen.getByText('Your output');
		// DOCUMENT_POSITION_FOLLOWING: `yours` comes later in the page than `expected`.
		expect(Boolean(expected.compareDocumentPosition(yours) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
	});

	it('does not show "Your output" before Run', async () => {
		await renderEditor();
		expect(screen.queryByText('Your output')).toBeNull();
	});

	it('colors a passed case tab with the primary color', async () => {
		await renderEditor();
		await runCode();
		expect(screen.getByRole('button', { name: 'Case 1' }).className).toContain('text-primary');
	});

	it('colors a failed case tab with the danger color', async () => {
		await renderEditor();
		await runCode();
		expect(screen.getByRole('button', { name: 'Case 2' }).className).toContain('text-danger');
	});

	it('keeps the case tab text plain ("Case N", no icons or dots)', async () => {
		await renderEditor();
		await runCode();
		expect(screen.getByRole('button', { name: 'Case 2' }).textContent?.trim()).toBe('Case 2');
	});

	it('does not color a case tab before Run', async () => {
		await renderEditor();
		expect(screen.getByRole('button', { name: 'Case 2' }).className).not.toMatch(/text-(primary|danger)/);
	});
});

describe('results panel', () => {
	it('colors an Accepted verdict with the primary color', async () => {
		await renderEditor({ submits: [ACCEPTED] });
		expect((await submitCode('Accepted')).className).toContain('text-primary');
	});

	it('colors a Wrong Answer verdict with the danger color', async () => {
		await renderEditor({ submits: [WRONG] });
		expect((await submitCode('Wrong Answer')).className).toContain('text-danger');
	});

	it('shows Passed as a label over a block reading "1 / 3"', async () => {
		await renderEditor({ submits: [WRONG] });
		await submitCode('Wrong Answer');
		const result = screen.getByRole('region', { name: 'Submission result' });
		expect(blockUnder(within(result).getByText('Passed')).textContent).toBe('1 / 3');
	});

	it('shows Input as a label over a block with the failing case', async () => {
		await renderEditor({ submits: [WRONG] });
		await submitCode('Wrong Answer');
		const result = screen.getByRole('region', { name: 'Submission result' });
		expect(blockUnder(within(result).getByText('Input')).textContent).toBe('[1]');
	});

	it('shows Expected as a label over a block with the expected value', async () => {
		await renderEditor({ submits: [WRONG] });
		await submitCode('Wrong Answer');
		const result = screen.getByRole('region', { name: 'Submission result' });
		expect(blockUnder(within(result).getByText('Expected')).textContent).toBe('1');
	});

	it('shows Your output as a label over a block with the player\'s output', async () => {
		await renderEditor({ submits: [WRONG] });
		await submitCode('Wrong Answer');
		const result = screen.getByRole('region', { name: 'Submission result' });
		expect(blockUnder(within(result).getByText('Your output')).textContent).toBe('2');
	});

	it('uses the test cases panel\'s bg-raised mono block style', async () => {
		await renderEditor({ submits: [WRONG] });
		await submitCode('Wrong Answer');
		const block = blockUnder(within(screen.getByRole('region', { name: 'Submission result' })).getByText('Input'));
		expect(['bg-raised', 'font-mono'].every((name) => block.classList.contains(name))).toBe(true);
	});
});

describe('copy', () => {
	it('says "Expected output" in the test cases panel', async () => {
		await renderEditor();
		expect(screen.getByText('Expected output')).toBeTruthy();
	});

	it('says "No test cases available for this problem" with no period', async () => {
		await renderEditor({ problems: [makeProblem(1, 'Easy', { input_output: null })] });
		// getByText matches the whole text, so a trailing period would not match.
		expect(screen.getByText('No test cases available for this problem')).toBeTruthy();
	});

	it('says "Loading question…" while a question loads', () => {
		stubCodeService({ holdPosts: true });
		render(<EditorPage />);
		expect(screen.getByText('Loading question…')).toBeTruthy();
	});
});

describe('resizable panes', () => {
	it('makes the question/code divider a separator', async () => {
		await renderEditor();
		expect(questionDivider()).toBeTruthy();
	});

	it('makes the code/test cases divider a separator', async () => {
		await renderEditor();
		expect(codeDivider()).toBeTruthy();
	});

	it('widens the question pane with ArrowRight on its divider', async () => {
		await renderEditor();
		fireEvent.keyDown(questionDivider(), { key: 'ArrowRight' });
		// Starts at 50%, one step is 5%.
		expect(questionDivider().getAttribute('aria-valuenow')).toBe('55');
	});

	it('narrows the question pane with ArrowLeft on its divider', async () => {
		await renderEditor();
		fireEvent.keyDown(questionDivider(), { key: 'ArrowLeft' });
		expect(questionDivider().getAttribute('aria-valuenow')).toBe('45');
	});

	it('makes the code pane taller with ArrowDown on its divider', async () => {
		await renderEditor();
		fireEvent.keyDown(codeDivider(), { key: 'ArrowDown' });
		// Starts at 60%.
		expect(codeDivider().getAttribute('aria-valuenow')).toBe('65');
	});

	it('makes the code pane shorter with ArrowUp on its divider', async () => {
		await renderEditor();
		fireEvent.keyDown(codeDivider(), { key: 'ArrowUp' });
		expect(codeDivider().getAttribute('aria-valuenow')).toBe('55');
	});

	it('never takes the question pane below 20% by keyboard', async () => {
		await renderEditor();
		for (let i = 0; i < 20; i += 1) fireEvent.keyDown(questionDivider(), { key: 'ArrowLeft' });
		expect(questionDivider().getAttribute('aria-valuenow')).toBe('20');
	});

	it('never takes the question pane above 80% by keyboard', async () => {
		await renderEditor();
		for (let i = 0; i < 20; i += 1) fireEvent.keyDown(questionDivider(), { key: 'ArrowRight' });
		expect(questionDivider().getAttribute('aria-valuenow')).toBe('80');
	});

	it('sets the question pane to where the mouse drags its divider', async () => {
		await renderEditor();
		const divider = questionDivider();
		// The divider's parent is the row both panes live in, 1000px wide.
		stubRect(divider.parentElement as HTMLElement);
		fireEvent.mouseDown(divider, { clientX: 500 });
		fireEvent.mouseMove(window, { clientX: 300 });
		fireEvent.mouseUp(window);
		// The question pane sits right before its divider.
		expect((divider.previousElementSibling as HTMLElement).style.width).toBe('30%');
	});

	it('stops the question pane at 20% when dragged past the edge', async () => {
		await renderEditor();
		const divider = questionDivider();
		stubRect(divider.parentElement as HTMLElement);
		fireEvent.mouseDown(divider, { clientX: 500 });
		fireEvent.mouseMove(window, { clientX: -50 });
		fireEvent.mouseUp(window);
		expect(divider.getAttribute('aria-valuenow')).toBe('20');
	});

	it('sets the code pane to where the mouse drags its divider', async () => {
		await renderEditor();
		const divider = codeDivider();
		// The divider's parent is the code column, 1000px tall.
		stubRect(divider.parentElement as HTMLElement);
		fireEvent.mouseDown(divider, { clientY: 600 });
		fireEvent.mouseMove(window, { clientY: 400 });
		fireEvent.mouseUp(window);
		// The code pane sits right before its divider.
		expect((divider.previousElementSibling as HTMLElement).style.height).toBe('40%');
	});

	it('stops resizing once the mouse is let go', async () => {
		await renderEditor();
		const divider = questionDivider();
		stubRect(divider.parentElement as HTMLElement);
		fireEvent.mouseDown(divider, { clientX: 500 });
		fireEvent.mouseMove(window, { clientX: 300 });
		fireEvent.mouseUp(window);
		fireEvent.mouseMove(window, { clientX: 700 });
		expect(divider.getAttribute('aria-valuenow')).toBe('30');
	});
});

describe('shortcuts', () => {
	it('runs the code on Ctrl+Enter', async () => {
		const fetchMock = await renderEditor();
		fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
		await waitFor(() => expect(postsTo(fetchMock, `${CODE_URL}/solution`)).toBe(1));
	});

	it('runs the code on Cmd+Enter', async () => {
		const fetchMock = await renderEditor();
		fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
		await waitFor(() => expect(postsTo(fetchMock, `${CODE_URL}/solution`)).toBe(1));
	});

	it('submits the code on Ctrl+Shift+Enter', async () => {
		const fetchMock = await renderEditor();
		fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true, shiftKey: true });
		await waitFor(() => expect(postsTo(fetchMock, `${CODE_URL}/solution/1`)).toBe(1));
	});

	it('runs the code on Ctrl+Enter inside Monaco', async () => {
		const fetchMock = await renderEditor();
		// Monaco swallows its own keybindings, so the app registers them with addCommand.
		act(() => monacoMocks.commands.get(CTRL_ENTER)?.());
		await waitFor(() => expect(postsTo(fetchMock, `${CODE_URL}/solution`)).toBe(1));
	});

	it('submits the code on Ctrl+Shift+Enter inside Monaco', async () => {
		const fetchMock = await renderEditor();
		act(() => monacoMocks.commands.get(CTRL_SHIFT_ENTER)?.());
		await waitFor(() => expect(postsTo(fetchMock, `${CODE_URL}/solution/1`)).toBe(1));
	});

	it('does not run anything on Ctrl+Enter in someone else\'s read-only workspace', async () => {
		const fetchMock = stubCodeService();
		render(<EditorProvider readOnly ownerName="Grace"><EditorLayout /></EditorProvider>);
		await screen.findByRole('heading', { name: /1\. Problem Number 1/ });
		fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
		await settle();
		expect(postsTo(fetchMock, `${CODE_URL}/solution`)).toBe(0);
	});

	it('does not run anything on Ctrl+Enter inside Monaco in a read-only workspace', async () => {
		const fetchMock = stubCodeService();
		render(<EditorProvider readOnly ownerName="Grace"><EditorLayout /></EditorProvider>);
		await screen.findByRole('heading', { name: /1\. Problem Number 1/ });
		act(() => monacoMocks.commands.get(CTRL_ENTER)?.());
		await settle();
		expect(postsTo(fetchMock, `${CODE_URL}/solution`)).toBe(0);
	});

	it('does not submit on Ctrl+Shift+Enter while a run is going', async () => {
		const fetchMock = await renderEditor({ holdPosts: true });
		// The run never finishes, so it stays "already going".
		await userEvent.click(screen.getByRole('button', { name: 'Run' }));
		fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true, shiftKey: true });
		await settle();
		expect(postsTo(fetchMock, `${CODE_URL}/solution/1`)).toBe(0);
	});
});

describe('question status in the question navigation', () => {
	it('colors a question that came back Accepted with the primary color', async () => {
		await renderEditor({ submits: [ACCEPTED] });
		await submitCode('Accepted');
		// Move away so question 1 is not the open one.
		await userEvent.click(screen.getByRole('button', { name: '2' }));
		expect(screen.getByRole('button', { name: '1' }).className).toContain('text-primary');
	});

	it('mutes a question submitted but not solved', async () => {
		await renderEditor({ submits: [WRONG] });
		await submitCode('Wrong Answer');
		await userEvent.click(screen.getByRole('button', { name: '2' }));
		expect(screen.getByRole('button', { name: '1' }).className).toContain('text-muted');
	});

	it('underlines a question submitted but not solved', async () => {
		await renderEditor({ submits: [WRONG] });
		await submitCode('Wrong Answer');
		await userEvent.click(screen.getByRole('button', { name: '2' }));
		expect(screen.getByRole('button', { name: '1' }).className).toMatch(/(^|\s)underline(\s|$)/);
	});

	it('does not underline a question never submitted', async () => {
		await renderEditor({ submits: [WRONG] });
		await submitCode('Wrong Answer');
		expect(screen.getByRole('button', { name: '3' }).className).not.toMatch(/(^|\s)underline(\s|$)/);
	});

	it('keeps a solved question primary after a later failed submit', async () => {
		await renderEditor({ submits: [ACCEPTED, WRONG] });
		await submitCode('Accepted');
		await submitCode('Wrong Answer');
		await userEvent.click(screen.getByRole('button', { name: '2' }));
		expect(screen.getByRole('button', { name: '1' }).className).toContain('text-primary');
	});

	it('does not color the open question primary when it is not solved', async () => {
		await renderEditor();
		expect(screen.getByRole('button', { name: '1' }).className).not.toContain('text-primary');
	});
});

describe('question panel difficulty', () => {
	it('colors Easy with the primary color', async () => {
		await renderEditor();
		expect(screen.getByText('Easy').className).toContain('text-primary');
	});

	it('colors Medium with the secondary color', async () => {
		await renderEditor();
		await userEvent.click(screen.getByRole('button', { name: '2' }));
		expect((await screen.findByText('Medium')).className).toContain('text-secondary');
	});

	it('colors Hard with the danger color', async () => {
		await renderEditor();
		await userEvent.click(screen.getByRole('button', { name: '3' }));
		expect((await screen.findByText('Hard')).className).toContain('text-danger');
	});

	it('does not use hardcoded green, yellow or red', async () => {
		await renderEditor();
		expect(screen.getByText('Easy').className).not.toMatch(/green|yellow|red/);
	});
});

// The Run and Submit results belong to the question they were for. Before,
// one result was shared by every question, so question 2 showed question 1's
// "Accepted 76 / 76" (and its case colors) after switching.
describe('results belong to their question', () => {
	// Opens question n from the 1 / 2 / 3 navigation and waits for it to load.
	async function openQuestion(n: number) {
		await userEvent.click(screen.getByRole('button', { name: String(n) }));
		await screen.findByRole('heading', { name: new RegExp(`${n}\\. Problem Number ${n}`) });
	}

	it('shows no submission result on a question that was not submitted', async () => {
		await renderEditor({ submits: [ACCEPTED] });
		await submitCode('Accepted');
		await openQuestion(2);
		expect(screen.queryByRole('region', { name: 'Submission result' })).toBeNull();
	});

	it('shows a question\'s own submission result again after coming back to it', async () => {
		await renderEditor({ submits: [ACCEPTED] });
		await submitCode('Accepted');
		await openQuestion(2);
		await openQuestion(1);
		expect(screen.queryByRole('region', { name: 'Submission result' })).not.toBeNull();
	});

	it('shows no run output on a question that was not run', async () => {
		await renderEditor();
		await runCode();
		await openQuestion(2);
		expect(screen.queryByText('Your output')).toBeNull();
	});

	it('shows a question\'s own run output again after coming back to it', async () => {
		await renderEditor();
		await runCode();
		await openQuestion(2);
		await openQuestion(1);
		expect(screen.queryByText('Your output')).not.toBeNull();
	});
});
