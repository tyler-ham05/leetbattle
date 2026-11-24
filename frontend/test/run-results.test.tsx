// US-8-T-3 Clear Run/Submit results with each test case's output
// (CodeService and the match's submit are mocked; no test calls a backend service.)
//
// Submit verdict in words and colour (AC1)
//  - After an Accepted Submit, the result panel should show the words "Accepted"
//  - After an Accepted Submit, the verdict should be in the primary color
//  - After a Wrong Answer Submit, the result panel should show the words "Wrong Answer"
//  - After a Wrong Answer Submit, the verdict should be in the danger (red) color
//  - After a Runtime Error Submit, the verdict should be in the danger color
//  - After a Time Limit Exceeded Submit, the verdict should be in the danger color
// A failed Submit says which case failed (AC2)
//  - After a Wrong Answer Submit that passed 1 of 3, the result panel should say "Failed on case 2 of 3"
//  - After a Wrong Answer Submit, the "Expected" block should show the failing case's expected output
//  - After a Wrong Answer Submit, the "Your output" block should show the player's actual output
// Run shows errors in their own block (AC3)
//  - After Run, a case with a runtime error should show an "Error" block
//  - After Run, the "Error" block should show the error message (e.g. "ZeroDivisionError: division by zero")
//  - After Run, a case with a runtime error should not show "Your output"
// Stdout and stderr for each test case (AC4)
//  - After Run, the selected case should show a "Stdout" block with what the player printed
//  - After Run, the selected case should show a "Stderr" block with what the player's code wrote to stderr
//  - After Run, switching to Case 2 should show Case 2's stdout, not Case 1's
//  - After Run, a case that printed nothing should say "No output" under "Stdout"
//  - After Submit, the result panel should show a "Stdout" block for each case that ran
//  - After a match Submit (through the game socket), the result panel should show the "Stdout" block from the grading
// Output Limit Exceeded (AC6)
//  - After an Output Limit Exceeded Submit, the result panel should show the words "Output Limit Exceeded"
//  - After an Output Limit Exceeded Submit, the verdict should be in the danger color
//  - After Run, a case with "Output Limit Exceeded" should have its tab in the danger color
// Long output scrolls (AC7)
//  - An output block should have a maximum height
//  - An output block should scroll vertically inside itself (overflow-y auto)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser, jsonResponse, makeProblem, stubFetch, threeProblems } from './helpers';

// Monaco needs a real browser; a textarea with the same contract stands in.
vi.mock('@monaco-editor/react', () => ({
	default: ({ value, onChange }: { value: string; onChange: (_v: string) => void }) => (
		<textarea data-testid="monaco" value={value} onChange={(e) => onChange(e.target.value)} />
	),
}));
vi.mock('socket.io-client', () => ({
	io: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn(), connect: vi.fn(), disconnect: vi.fn() }),
}));
vi.mock('../app/login/context', () => ({ useAuth: () => ({ user: fakeUser, isLoading: false }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('../app/editor/match-context', async (importOriginal) => ({
	...(await importOriginal<typeof import('../app/editor/match-context')>()),
	useMatch: () => ({ scores: { a: 0, b: 0 }, secondsLeft: 0, submissions: [] }),
}));

import EditorPage from '../app/editor/page';
import EditorLayout from '../app/editor/components/editor-layout';
import OutputBlock from '../app/editor/components/output-block';
import { EditorProvider } from '../app/editor/context';

const CODE_URL = 'http://127.0.0.1:4001';

// What CodeService's Run answers for the two visible cases of a test problem.
const RUN_WITH_OUTPUT = [
	{ verdict: 'Accepted', expected: '1', response: '1', stdout: 'printed on case 1', stderr: 'warned on case 1' },
	{ verdict: 'Accepted', expected: '2', response: '2', stdout: 'printed on case 2', stderr: '' },
];
const RUN_SILENT = [
	{ verdict: 'Accepted', expected: '1', response: '1', stdout: '', stderr: '' },
	{ verdict: 'Accepted', expected: '2', response: '2', stdout: '', stderr: '' },
];
const RUN_RUNTIME_ERROR = [
	{ verdict: 'Runtime Error', expected: '1', response: 'ZeroDivisionError: division by zero', stdout: '', stderr: 'Traceback (most recent call last):\nZeroDivisionError: division by zero' },
	{ verdict: 'Runtime Error', expected: '2', response: 'ZeroDivisionError: division by zero', stdout: '', stderr: 'Traceback (most recent call last):\nZeroDivisionError: division by zero' },
];
const RUN_OUTPUT_LIMIT = [
	{ verdict: 'Output Limit Exceeded', expected: '1', response: '1', stdout: 'x'.repeat(100), stderr: '' },
	{ verdict: 'Accepted', expected: '2', response: '2', stdout: '', stderr: '' },
];

// What CodeService's Submit answers: the existing fields plus each case that ran.
function submitResult(verdict: string, overrides: Record<string, unknown> = {}) {
	const failed = verdict !== 'Accepted';
	return {
		verdict,
		passed: failed ? 1 : 3,
		total: 3,
		case: failed ? '[2]' : null,
		expected: failed ? '2' : null,
		response: failed ? '5' : null,
		cases: failed
			? [{ verdict: 'Accepted', stdout: 'first case print', stderr: '' }, { verdict, stdout: 'second case print', stderr: '' }]
			: [1, 2, 3].map(() => ({ verdict: 'Accepted', stdout: '', stderr: '' })),
		...overrides,
	};
}

// Stands in for CodeService: the problem list, then whatever Run and Submit should answer.
function stubCodeService({ run = RUN_WITH_OUTPUT, submit = submitResult('Accepted') }: { run?: unknown; submit?: unknown } = {}) {
	return stubFetch((url) => {
		if (url === `${CODE_URL}/solution`) return jsonResponse(run);
		if (url.startsWith(`${CODE_URL}/solution/`)) return jsonResponse(submit);
		return jsonResponse(threeProblems);
	});
}

async function renderEditor(options: Parameters<typeof stubCodeService>[0] = {}) {
	stubCodeService(options);
	render(<EditorPage />);
	await screen.findByRole('heading', { name: /1\. Problem Number 1/ });
}

// Clicks Run and waits for the first case's verdict to appear in the panel.
async function runCode() {
	await userEvent.click(screen.getByRole('button', { name: 'Run' }));
	await screen.findByRole('button', { name: 'Case 1' });
	await screen.findAllByText(/Accepted|Runtime Error|Output Limit Exceeded/);
}

// Clicks Submit and resolves with the result panel.
async function submitCode() {
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
	return screen.findByRole('region', { name: 'Submission result' });
}

// The verdict text in the result panel (its exact words).
const verdictIn = (panel: HTMLElement, verdict: string) => within(panel).getByText(verdict, { selector: 'p' });

// The block under a label such as "Stdout": OutputBlock renders the label, then the block.
const blockUnder = (label: HTMLElement) => label.nextElementSibling as HTMLElement;

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => cleanup());

describe('US-8-T-3 Submit verdict in words and colour', () => {
	it('US-8-T-3 shows the words "Accepted" after an Accepted Submit', async () => {
		await renderEditor({ submit: submitResult('Accepted') });
		const panel = await submitCode();
		expect(within(panel).getByText('Accepted', { selector: 'p' })).toBeTruthy();
	});

	it('US-8-T-3 shows an Accepted verdict in the primary color', async () => {
		await renderEditor({ submit: submitResult('Accepted') });
		const panel = await submitCode();
		expect(verdictIn(panel, 'Accepted').className).toContain('text-primary');
	});

	it('US-8-T-3 shows the words "Wrong Answer" after a Wrong Answer Submit', async () => {
		await renderEditor({ submit: submitResult('Wrong Answer') });
		const panel = await submitCode();
		expect(within(panel).getByText('Wrong Answer', { selector: 'p' })).toBeTruthy();
	});

	it('US-8-T-3 shows a Wrong Answer verdict in the danger color', async () => {
		await renderEditor({ submit: submitResult('Wrong Answer') });
		const panel = await submitCode();
		expect(verdictIn(panel, 'Wrong Answer').className).toContain('text-danger');
	});

	it('US-8-T-3 shows a Runtime Error verdict in the danger color', async () => {
		await renderEditor({ submit: submitResult('Runtime Error') });
		const panel = await submitCode();
		expect(verdictIn(panel, 'Runtime Error').className).toContain('text-danger');
	});

	it('US-8-T-3 shows a Time Limit Exceeded verdict in the danger color', async () => {
		await renderEditor({ submit: submitResult('Time Limit Exceeded') });
		const panel = await submitCode();
		expect(verdictIn(panel, 'Time Limit Exceeded').className).toContain('text-danger');
	});
});

describe('US-8-T-3 a failed Submit says which case failed', () => {
	// 1 of 3 passed, so the second case is the one that failed.
	it('US-8-T-3 says "Failed on case 2 of 3" after a Wrong Answer Submit that passed 1 of 3', async () => {
		await renderEditor({ submit: submitResult('Wrong Answer') });
		const panel = await submitCode();
		expect(within(panel).getByText('Failed on case 2 of 3')).toBeTruthy();
	});

	it('US-8-T-3 shows the failing case\'s expected output under "Expected"', async () => {
		await renderEditor({ submit: submitResult('Wrong Answer') });
		const panel = await submitCode();
		expect(blockUnder(within(panel).getByText('Expected')).textContent).toBe('2');
	});

	it('US-8-T-3 shows the player\'s actual output under "Your output"', async () => {
		await renderEditor({ submit: submitResult('Wrong Answer') });
		const panel = await submitCode();
		expect(blockUnder(within(panel).getByText('Your output')).textContent).toBe('5');
	});
});

describe('US-8-T-3 Run shows errors in their own block', () => {
	it('US-8-T-3 shows an "Error" block for a case with a runtime error', async () => {
		await renderEditor({ run: RUN_RUNTIME_ERROR });
		await runCode();
		expect(screen.getByText('Error')).toBeTruthy();
	});

	it('US-8-T-3 shows the error message in the "Error" block', async () => {
		await renderEditor({ run: RUN_RUNTIME_ERROR });
		await runCode();
		expect(blockUnder(screen.getByText('Error')).textContent).toContain('ZeroDivisionError: division by zero');
	});

	it('US-8-T-3 does not show "Your output" for a case with a runtime error', async () => {
		await renderEditor({ run: RUN_RUNTIME_ERROR });
		await runCode();
		expect(screen.queryByText('Your output')).toBeNull();
	});
});

describe('US-8-T-3 stdout and stderr for each test case', () => {
	it('US-8-T-3 shows what the player printed under "Stdout" after Run', async () => {
		await renderEditor({ run: RUN_WITH_OUTPUT });
		await runCode();
		expect(blockUnder(screen.getByText('Stdout')).textContent).toBe('printed on case 1');
	});

	it('US-8-T-3 shows what the player wrote to stderr under "Stderr" after Run', async () => {
		await renderEditor({ run: RUN_WITH_OUTPUT });
		await runCode();
		expect(blockUnder(screen.getByText('Stderr')).textContent).toBe('warned on case 1');
	});

	it('US-8-T-3 shows Case 2\'s own stdout after switching to Case 2', async () => {
		await renderEditor({ run: RUN_WITH_OUTPUT });
		await runCode();
		await userEvent.click(screen.getByRole('button', { name: 'Case 2' }));
		expect(blockUnder(screen.getByText('Stdout')).textContent).toBe('printed on case 2');
	});

	it('US-8-T-3 says "No output" under "Stdout" when a case printed nothing', async () => {
		await renderEditor({ run: RUN_SILENT });
		await runCode();
		expect(blockUnder(screen.getByText('Stdout')).textContent).toBe('No output');
	});

	// The Wrong Answer result ran two cases: the passing one, then the failing one.
	it('US-8-T-3 shows a "Stdout" block for each case that ran after Submit', async () => {
		await renderEditor({ submit: submitResult('Wrong Answer') });
		const panel = await submitCode();
		expect(within(panel).getAllByText('Stdout')).toHaveLength(2);
	});

	// In a match the grading comes back over the game socket, not from CodeService.
	it('US-8-T-3 shows the "Stdout" block from a match Submit\'s grading', async () => {
		stubFetch((url) => jsonResponse(makeProblem(Number(url.split('/').pop()), 'Easy')));
		const matchSubmit = vi.fn().mockResolvedValue(submitResult('Wrong Answer'));
		render(<EditorProvider questionIds={[1]} submit={matchSubmit} shareCode={vi.fn()}><EditorLayout /></EditorProvider>);
		await screen.findByRole('heading', { name: /Problem Number 1/ });
		const panel = await submitCode();
		expect(blockUnder(within(panel).getAllByText('Stdout')[1]).textContent).toBe('second case print');
	});
});

describe('US-8-T-3 Output Limit Exceeded', () => {
	it('US-8-T-3 shows the words "Output Limit Exceeded" after an Output Limit Exceeded Submit', async () => {
		await renderEditor({ submit: submitResult('Output Limit Exceeded') });
		const panel = await submitCode();
		expect(within(panel).getByText('Output Limit Exceeded', { selector: 'p' })).toBeTruthy();
	});

	it('US-8-T-3 shows an Output Limit Exceeded verdict in the danger color', async () => {
		await renderEditor({ submit: submitResult('Output Limit Exceeded') });
		const panel = await submitCode();
		expect(verdictIn(panel, 'Output Limit Exceeded').className).toContain('text-danger');
	});

	it('US-8-T-3 colors the tab of an Output Limit Exceeded Run case red', async () => {
		await renderEditor({ run: RUN_OUTPUT_LIMIT });
		await runCode();
		expect(screen.getByRole('button', { name: 'Case 1' }).className).toContain('text-danger');
	});
});

describe('US-8-T-3 long output scrolls', () => {
	// jsdom doesn't lay pages out, so the block's classes stand in for its size.
	it('US-8-T-3 gives an output block a maximum height', () => {
		render(<OutputBlock label="Stdout">{'line\n'.repeat(500)}</OutputBlock>);
		expect(blockUnder(screen.getByText('Stdout')).className).toMatch(/max-h-/);
	});

	it('US-8-T-3 lets an output block scroll vertically inside itself', () => {
		render(<OutputBlock label="Stdout">{'line\n'.repeat(500)}</OutputBlock>);
		expect(blockUnder(screen.getByText('Stdout')).className).toContain('overflow-y-auto');
	});
});
