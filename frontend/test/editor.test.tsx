// Editor page should function when loaded
// Editor should be able to display 3 problems
// Editor should have monaco component that allows user to type code
//   - Monaco Component should auto populate the function signature
//   - Monaco Component should save progress on each question after switching
// Editor should display test cases with correct format
// Editor should have run and submit buttons
//  - Editor should correctly foward code to the API when running/submitting

// Submit should display its result (all following tests should be done by taking a fake POST /solution/:questionId)
//  - After Submit returns Accepted the page shows "Accepted" between the monaco editor and the Case 1, Case 2, Case 3 tabs
//  - After Submit returns Wrong Answer, the page shows "Wrong Answer" between the monaco editor and the Case 1, Case 2, Case 3 tabs
//  - After Submit, the page shows how many tests passed out of the total between the monaco editor and the Case 1, Case 2, Case 3 tabs
//  - After a failed Submit the page shows the test case that failed 
//  - After a failed Submit the page shows the expected value
//  - After a failed Submit the page shows the users's output
// Run should display its result (all following tests should be done by taking a fake POST /solution)
//	- The page shows one verdict for each test case in its respective Case 1, Case 2, Case 3 tabs. 
// US-6-T-6: The practice editor should keep working outside a match
//  - Opening /editor should still load random practice problems


import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser, jsonResponse, requestsOf, stubFetch, threeProblems } from './helpers';

// Monaco needs a real browser; swap it for a textarea with the same contract
// (controlled `value`, `onChange(value)`), which is all the app relies on.
vi.mock('@monaco-editor/react', () => ({
	default: ({ value, onChange }: { value: string; onChange: (_v: string) => void }) => (
		<textarea data-testid="monaco" value={value} onChange={(e) => onChange(e.target.value)} />
	),
}));

// The editor page is wrapped in RequireAuth; present a logged-in user.
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: fakeUser, isLoading: false }),
}));
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// The scoreboard has its own tests (scoreboard.test.tsx). Here it gets an empty
// match so its submission verdicts ("Accepted") do not collide with the
// editor's own verdict text that these tests look up.
vi.mock('../app/editor/match-context', async (importOriginal) => ({
	...(await importOriginal<typeof import('../app/editor/match-context')>()),
	useMatch: () => ({ scores: { a: 0, b: 0 }, secondsLeft: 0, submissions: [] }),
}));

import EditorPage from '../app/editor/page';

const CODE_URL = 'http://127.0.0.1:4001';

// US-5-T-23: the submission result shows each value as a label over a block;
// this is the block under `label` in the result.
async function resultBlock(label: string) {
	const result = await screen.findByRole('region', { name: 'Submission result' });
	return within(result).getByText(label).nextElementSibling?.textContent;
}

// Serves the 3 problems on GET /problem; run/submit return canned verdicts.
function stubCodeService() {
	return stubFetch((url, init) => {
		if (url === `${CODE_URL}/problem` && (!init || init.method === 'GET')) {
			return jsonResponse(threeProblems);
		}
		if (url === `${CODE_URL}/problem` && init?.method === 'POST') {
			return jsonResponse({ verdict: 'Accepted', cases: [], responses: [] });
		}
		return jsonResponse({ verdict: 'Accepted', passed: 2, case: null, response: null });
	});
}

async function renderLoadedEditor() {
	const fetchMock = stubCodeService();
	render(<EditorPage />);
	// The editor is "loaded" once the first problem's title replaces the placeholder.
	await screen.findByRole('heading', { name: /1\. Problem Number 1/ });
	return fetchMock;
}

beforeEach(() => {
	vi.unstubAllGlobals();
});
afterEach(() => {
	cleanup();
});

describe('editor page', () => {
	it('shows a loading state, then the first problem, once loaded', async () => {
		stubCodeService();
		render(<EditorPage />);
		expect(screen.getByText('Loading question…')).toBeTruthy();
		expect(await screen.findByText('Description for problem 1')).toBeTruthy();
	});

	it('US-6-T-6 still loads random practice problems from GET /problem', async () => {
		const fetchMock = await renderLoadedEditor();
		// Practice asks CodeService for a random set, not for specific question_ids.
		expect(requestsOf(fetchMock)[0].url).toBe(`${CODE_URL}/problem`);
	});

	it('shows an error message when problems fail to load', async () => {
		stubFetch(() => jsonResponse({}, 500));
		render(<EditorPage />);
		expect(await screen.findByText(/Failed to load question/)).toBeTruthy();
	});

	it('offers navigation buttons for exactly 3 problems', async () => {
		await renderLoadedEditor();
		// Navigation buttons are numbered 1..3; Run/Submit/Case buttons have text labels.
		for (const n of ['1', '2', '3']) {
			expect(screen.getByRole('button', { name: n })).toBeTruthy();
		}
		expect(screen.queryByRole('button', { name: '4' })).toBeNull();
	});

	it('switches the displayed problem when a navigation button is clicked', async () => {
		await renderLoadedEditor();
		await userEvent.click(screen.getByRole('button', { name: '3' }));
		expect(await screen.findByText('Description for problem 3')).toBeTruthy();
		expect(screen.getByText('Hard')).toBeTruthy();
	});
});

describe('monaco editor', () => {
	it('auto-populates the starter function signature with real newlines', async () => {
		await renderLoadedEditor();
		const editor = screen.getByTestId('monaco') as HTMLTextAreaElement;
		await waitFor(() =>
			expect(editor.value).toBe('class Solution:\n    def solve1(self, x):\n        pass'),
		);
	});

	it('lets the user type code', async () => {
		await renderLoadedEditor();
		const editor = screen.getByTestId('monaco') as HTMLTextAreaElement;
		fireEvent.change(editor, { target: { value: 'print("hi")' } });
		expect(editor.value).toBe('print("hi")');
	});

	it('loads the new problem\'s starter code when switching questions', async () => {
		await renderLoadedEditor();
		await userEvent.click(screen.getByRole('button', { name: '2' }));
		const editor = screen.getByTestId('monaco') as HTMLTextAreaElement;
		await waitFor(() => expect(editor.value).toContain('def solve2'));
	});

	// it('saves progress on each question after switching away and back', async () => {
	// 	await renderLoadedEditor();
	// 	const editor = screen.getByTestId('monaco') as HTMLTextAreaElement;
	// 	fireEvent.change(editor, { target: { value: 'my work on q1' } });

	// 	await userEvent.click(screen.getByRole('button', { name: '2' }));
	// 	await waitFor(() => expect(editor.value).toContain('def solve2'));

	// 	await userEvent.click(screen.getByRole('button', { name: '1' }));
	// 	await waitFor(() => expect(editor.value).toBe('my work on q1'));
	// });
});

describe('test cases panel', () => {
	it('shows the input and expected output of the first case in a readable format', async () => {
		await renderLoadedEditor();
		expect(screen.getByRole('button', { name: 'Case 1' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Case 2' })).toBeTruthy();
		expect(screen.getByText('Input')).toBeTruthy();
		expect(screen.getByText('Expected output')).toBeTruthy();
		expect(screen.getByText('[1]')).toBeTruthy();
	});

	it('shows the second case when its tab is clicked', async () => {
		await renderLoadedEditor();
		await userEvent.click(screen.getByRole('button', { name: 'Case 2' }));
		expect(screen.getByText('[2]')).toBeTruthy();
	});
});

describe('run and submit', () => {
	it('renders Run and Submit buttons', async () => {
		await renderLoadedEditor();
		expect(screen.getByRole('button', { name: 'Run' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
	});

	it('forwards the current code and test cases to the API on Run', async () => {
		const fetchMock = await renderLoadedEditor();
		fireEvent.change(screen.getByTestId('monaco'), { target: { value: 'code to run' } });
		await userEvent.click(screen.getByRole('button', { name: 'Run' }));

		await waitFor(() => {
			expect(requestsOf(fetchMock).filter((r) => r.method === 'POST')).toEqual([
				{
					url: `${CODE_URL}/solution`,
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: {
						code: 'code to run',
						cases: [
							{ input: '[1]', expected: '1' },
							{ input: '[2]', expected: '2' },
						],
						questionId: 1,
					},
				},
			]);
		});
	});

	it('forwards the current code to the question-specific endpoint on Submit', async () => {
		const fetchMock = await renderLoadedEditor();
		await userEvent.click(screen.getByRole('button', { name: '2' }));
		await screen.findByText('Description for problem 2');
		fireEvent.change(screen.getByTestId('monaco'), { target: { value: 'code to submit' } });
		await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

		await waitFor(() => {
			expect(requestsOf(fetchMock).filter((r) => r.method === 'POST')).toEqual([
				{
					url: `${CODE_URL}/solution/2`,
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: { code: 'code to submit' },
				},
			]);
		});
	});

	it('disables both buttons while a request is in flight', async () => {
		let release!: () => void;
		stubFetch((url, init) => {
			if (init?.method === 'POST') {
				return new Promise<Response>((resolve) => {
					release = () => resolve(jsonResponse({ verdict: 'Accepted', cases: [], responses: [] }));
				});
			}
			return jsonResponse(threeProblems);
		});
		render(<EditorPage />);
		await screen.findByText('Description for problem 1');

		await userEvent.click(screen.getByRole('button', { name: 'Run' }));
		expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(true);

		release();
		await waitFor(() =>
			expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(false),
		);
	});
});


// Pseudocode: "After Submit returns Wrong Answer, the page shows "Wrong Answer"
// between the monaco editor and the Case 1, Case 2, Case 3 tabs"
it('US-4-T-2 shows "Wrong Answer" between the editor and the Case tabs after a Wrong Answer Submit', async () => {
	// Arrange: serve the 3 problems, and make the judge answer Wrong Answer for question 1.
	// The response has the same shape CodeService returns for a judged submission.
	stubFetch((url) => {
		if (url === `${CODE_URL}/solution/1`) {
			return jsonResponse({
				verdict: 'Wrong Answer',
				passed: 1,
				total: 3,
				case: '[1]',
				expected: '1',
				response: '2',
			});
		}
		return jsonResponse(threeProblems);
	});
	render(<EditorPage />);
	await screen.findByRole('heading', { name: /1\. Problem Number 1/ });

	// Act: click Submit.
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

	// Find the three things we are comparing positions of. `findByText` waits for the
	// verdict to appear and throws "Unable to find an element with the text" if it never does,
	// which is the failure we expect until the result is displayed.
	const verdict = await screen.findByText('Wrong Answer');
	const editor = screen.getByTestId('monaco');
	const firstCaseTab = screen.getByRole('button', { name: 'Case 1' });

	// Assert (one expect): in page order the verdict comes after the editor AND before the tabs.
	// compareDocumentPosition returns a bitmask; DOCUMENT_POSITION_FOLLOWING means
	// "the argument comes later in the page than the element it is called on".
	const afterEditor = editor.compareDocumentPosition(verdict) & Node.DOCUMENT_POSITION_FOLLOWING;
	const beforeTabs = verdict.compareDocumentPosition(firstCaseTab) & Node.DOCUMENT_POSITION_FOLLOWING;
	expect(Boolean(afterEditor && beforeTabs)).toBe(true);
});

// NOTE: kept as its own test on purpose, separate from the "Wrong Answer" test above.
// The setup and the position check are almost identical, and that repetition is
// intentional: one pseudocode line = one test. Do not merge the two or extract a shared helper.
// Pseudocode: "After Submit returns Accepted the page shows "Accepted"
// between the monaco editor and the Case 1, Case 2, Case 3 tabs"
it('US-4-T-2 shows "Accepted" between the editor and the Case tabs after an Accepted Submit', async () => {
	// Arrange: serve the 3 problems, and make the judge answer Accepted for question 1.
	// All 3 tests passed, so there is no failing case, expected value or response.
	stubFetch((url) => {
		if (url === `${CODE_URL}/solution/1`) {
			return jsonResponse({
				verdict: 'Accepted',
				passed: 3,
				total: 3,
				case: null,
				expected: null,
				response: null,
			});
		}
		return jsonResponse(threeProblems);
	});
	render(<EditorPage />);
	await screen.findByRole('heading', { name: /1\. Problem Number 1/ });

	// Act: click Submit.
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

	// Find the three things we are comparing positions of. `findByText` waits for the
	// verdict and throws "Unable to find an element with the text" if it never appears.
	const verdict = await screen.findByText('Accepted');
	const editor = screen.getByTestId('monaco');
	const firstCaseTab = screen.getByRole('button', { name: 'Case 1' });

	// Assert (one expect): in page order the verdict comes after the editor AND before the tabs.
	// compareDocumentPosition returns a bitmask; DOCUMENT_POSITION_FOLLOWING means
	// "the argument comes later in the page than the element it is called on".
	const afterEditor = editor.compareDocumentPosition(verdict) & Node.DOCUMENT_POSITION_FOLLOWING;
	const beforeTabs = verdict.compareDocumentPosition(firstCaseTab) & Node.DOCUMENT_POSITION_FOLLOWING;
	expect(Boolean(afterEditor && beforeTabs)).toBe(true);
});

// Pseudocode: "After Submit, the page shows how many tests passed out of the total
// between the monaco editor and the Case 1, Case 2, Case 3 tabs"
it('US-4-T-2 shows the passed count "1 / 3" between the editor and the Case tabs after a Submit', async () => {
	// Arrange: serve the 3 problems, and make the judge answer for question 1 with
	// passed: 1 and total: 3. The response has every field CodeService returns.
	stubFetch((url) => {
		if (url === `${CODE_URL}/solution/1`) {
			return jsonResponse({
				verdict: 'Wrong Answer',
				passed: 1,
				total: 3,
				case: '[1]',
				expected: '1',
				response: '2',
			});
		}
		return jsonResponse(threeProblems);
	});
	render(<EditorPage />);
	await screen.findByRole('heading', { name: /1\. Problem Number 1/ });

	// Act: click Submit.
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

	// Find the three things we are comparing positions of. `findByText` waits for the
	// passed count and throws "Unable to find an element with the text" if it never appears,
	// which is the failure expected until the passed count is displayed.
	const passed = await screen.findByText('1 / 3');
	const editor = screen.getByTestId('monaco');
	const firstCaseTab = screen.getByRole('button', { name: 'Case 1' });

	// Assert (one expect): in page order the passed count comes after the editor AND before the tabs.
	// compareDocumentPosition returns a bitmask; DOCUMENT_POSITION_FOLLOWING means
	// "the argument comes later in the page than the element it is called on".
	const afterEditor = editor.compareDocumentPosition(passed) & Node.DOCUMENT_POSITION_FOLLOWING;
	const beforeTabs = passed.compareDocumentPosition(firstCaseTab) & Node.DOCUMENT_POSITION_FOLLOWING;
	expect(Boolean(afterEditor && beforeTabs)).toBe(true);
});

// Pseudocode: "After a failed Submit the page shows the test case that failed"
it('US-4-T-2 shows Input "[1]" after a failed Submit', async () => {
	// Arrange: serve the 3 problems, and make the judge answer Wrong Answer for question 1
	// with the failing test case `case: '[1]'`. The response has every field CodeService returns.
	stubFetch((url) => {
		if (url === `${CODE_URL}/solution/1`) {
			return jsonResponse({
				verdict: 'Wrong Answer',
				passed: 1,
				total: 3,
				case: '[1]',
				expected: '1',
				response: '2',
			});
		}
		return jsonResponse(threeProblems);
	});
	render(<EditorPage />);
	await screen.findByRole('heading', { name: /1\. Problem Number 1/ });

	// Act: click Submit.
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

	// Assert (one expect): the failing test case is in the block under the "Input" label.
	// `findByText` waits for it and throws "Unable to find an element with the text" if it never
	// appears, which is the failure expected until the failing test case is displayed.
	expect(await resultBlock('Input')).toBe('[1]');
});

// Pseudocode: "After a failed Submit the page shows the expected value"
it('US-4-T-2 shows Expected "1" after a failed Submit', async () => {
	// Arrange: serve the 3 problems, and make the judge answer Wrong Answer for question 1
	// with the expected value `expected: '1'`. The response has every field CodeService returns.
	stubFetch((url) => {
		if (url === `${CODE_URL}/solution/1`) {
			return jsonResponse({
				verdict: 'Wrong Answer',
				passed: 1,
				total: 3,
				case: '[1]',
				expected: '1',
				response: '2',
			});
		}
		return jsonResponse(threeProblems);
	});
	render(<EditorPage />);
	await screen.findByRole('heading', { name: /1\. Problem Number 1/ });

	// Act: click Submit.
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

	// Assert (one expect): the expected value is in the block under the "Expected" label.
	// `findByText` waits for it and throws "Unable to find an element with the text" if it never
	// appears, which is the failure expected until the expected value is displayed.
	expect(await resultBlock('Expected')).toBe('1');
});

// Pseudocode: "After a failed Submit the page shows the user's output"
it('US-4-T-2 shows Your output "2" after a failed Submit', async () => {
	// Arrange: serve the 3 problems, and make the judge answer Wrong Answer for question 1
	// with the user's output `response: '2'`. The response has every field CodeService returns.
	stubFetch((url) => {
		if (url === `${CODE_URL}/solution/1`) {
			return jsonResponse({
				verdict: 'Wrong Answer',
				passed: 1,
				total: 3,
				case: '[1]',
				expected: '1',
				response: '2',
			});
		}
		return jsonResponse(threeProblems);
	});
	render(<EditorPage />);
	await screen.findByRole('heading', { name: /1\. Problem Number 1/ });

	// Act: click Submit.
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

	// Assert (one expect): the user's output is in the block under the "Your output" label.
	// `findByText` waits for it and throws "Unable to find an element with the text" if it never
	// appears, which is the failure expected until the user's output is displayed.
	expect(await resultBlock('Your output')).toBe('2');
});

// Pseudocode: "The page shows one verdict for each test case in its respective Case 1, Case 2, Case 3 tabs."
it('US-4-T-2 shows each Case tab its own verdict after Run', async () => {
	// Arrange: serve the 3 problems, and make the judge answer Run with a list of two verdicts that
	// DIFFER: item 1 (Case 1) is Accepted and item 2 (Case 2) is Wrong Answer. Run is
	// POST /solution (no question id) and returns one { verdict, expected, response } per case.
	// If the page showed the first item's verdict on every tab, Case 2 would not show "Wrong Answer".
	stubFetch((url) => {
		if (url === `${CODE_URL}/solution`) {
			return jsonResponse([
				{ verdict: 'Accepted', expected: '1', response: '1' },
				{ verdict: 'Wrong Answer', expected: '2', response: '3' },
			]);
		}
		return jsonResponse(threeProblems);
	});
	render(<EditorPage />);
	await screen.findByRole('heading', { name: /1\. Problem Number 1/ });

	// Act: click Run, then select the Case 2 tab.
	await userEvent.click(screen.getByRole('button', { name: 'Run' }));
	await userEvent.click(screen.getByRole('button', { name: 'Case 2' }));

	// Assert (one expect): Case 2's own verdict is shown.
	// `findByText` waits for it and throws "Unable to find an element with the text" if it never
	// appears, which is the failure expected until Run results are displayed in the Case tabs.
	expect(await screen.findByText('Wrong Answer')).toBeTruthy();
});
