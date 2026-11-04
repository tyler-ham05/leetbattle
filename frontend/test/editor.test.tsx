// Editor page should function when loaded
// Editor should be able to display 3 problems
// Editor should have monaco component that allows user to type code
//   - Monaco Component should auto populate the function signature
//   - Monaco Component should save progress on each question after switching
// Editor should display test cases with correct format
// Editor should have run and submit buttons
//  - Editor should correctly foward code to the API when running/submitting
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

import EditorPage from '../app/editor/page';

const CODE_URL = 'http://127.0.0.1:4001';

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
		expect(screen.getByText('Loading question...')).toBeTruthy();
		expect(await screen.findByText('Description for problem 1')).toBeTruthy();
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

	it('saves progress on each question after switching away and back', async () => {
		await renderLoadedEditor();
		const editor = screen.getByTestId('monaco') as HTMLTextAreaElement;
		fireEvent.change(editor, { target: { value: 'my work on q1' } });

		await userEvent.click(screen.getByRole('button', { name: '2' }));
		await waitFor(() => expect(editor.value).toContain('def solve2'));

		await userEvent.click(screen.getByRole('button', { name: '1' }));
		await waitFor(() => expect(editor.value).toBe('my work on q1'));
	});
});

describe('test cases panel', () => {
	it('shows the input and expected output of the first case in a readable format', async () => {
		await renderLoadedEditor();
		expect(screen.getByRole('button', { name: 'Case 1' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Case 2' })).toBeTruthy();
		expect(screen.getByText('Input')).toBeTruthy();
		expect(screen.getByText('Expected Output')).toBeTruthy();
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
					url: `${CODE_URL}/problem`,
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: {
						code: 'code to run',
						cases: [
							{ input: '[1]', expected: '1' },
							{ input: '[2]', expected: '2' },
						],
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
					url: `${CODE_URL}/problem/2`,
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
