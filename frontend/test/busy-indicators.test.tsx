// Sprint 4 polish: anything slow shows a spinner (UI only; the editor context is mocked, no backend)
// Pseudocode: test/sprint4-polish-test-pseudo.md, "Anything slow shows a spinner".
// Loading style 2: while busy, a button's label swaps for a spinner and the
// button keeps its width; screen readers still hear the label.
//  - While Run is running, the Run button should be marked busy
//  - While Run is running, the Run button should show "Running" (US-10-T-9: was a spinner)
//  - While Run is running, the Run button should still be named "Run" for screen readers
//  - While Run is running, the Run button should not show the word "Run" on its own
//  - While Submit is submitting, the Submit button should be marked busy
//  - While Submit is submitting, the Submit button should show "Judging" (US-10-T-9: was a spinner)
//  - While Submit is submitting, the Submit button should not show the word "Submit"
//  - While Submit is submitting, the Run button should not be marked busy
//  - While nothing is running, the Submit button should show the word "Submit"
//  - While nothing is running, no spinner should be shown
//  - A pending form button should be marked busy
//  - A pending form button should show a spinner
//  - A pending form button should be named by its pending label for screen readers
//  - A pending form button should not show any words
//  - A form button that is not pending should show its label
//  - While a question is loading, the question panel should show a spinner
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

// What useEditor returns; each test sets loadingAction / currentQuestion.
const editorMocks = vi.hoisted(() => ({ useEditor: vi.fn() }));
vi.mock('../app/editor/context', () => ({ useEditor: () => editorMocks.useEditor() }));

import SubmitBar from '../app/editor/components/submit-bar';
import QuestionPanel from '../app/editor/components/question-panel';
import { AuthSubmitButton } from '../app/login/components/components';

// The editor while `action` is in flight (null: nothing running).
function configureEditor(action: 'run' | 'submit' | null, extra: Record<string, unknown> = {}) {
	editorMocks.useEditor.mockReturnValue({
		onRun: vi.fn(),
		onSubmit: vi.fn(),
		loadingAction: action,
		isLoading: action !== null,
		currentQuestion: null,
		error: null,
		...extra,
	});
}

const runButton = () => screen.getByRole('button', { name: 'Run' });
const submitButton = () => screen.getByRole('button', { name: 'Submit' });
// Spinners are found by test id: they are decoration, hidden from screen readers.
const spinnerIn = (element: HTMLElement) => within(element).queryByTestId('spinner');

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => cleanup());

describe('Run and Submit while busy', () => {
	it('marks Run busy while running', () => {
		configureEditor('run');
		render(<SubmitBar />);
		expect(runButton().getAttribute('aria-busy')).toBe('true');
	});

	// US-10-T-9: Run and Submit show a word and an edge light instead of a spinner.
	it('shows "Running" in Run while running', () => {
		configureEditor('run');
		render(<SubmitBar />);
		expect(runButton().textContent).toBe('Running');
	});

	it('still names the Run button "Run" while running (getByRole finds it by name)', () => {
		configureEditor('run');
		render(<SubmitBar />);
		expect(runButton()).toBeTruthy();
	});

	it('does not show the word "Run" on its own while running', () => {
		configureEditor('run');
		render(<SubmitBar />);
		expect(runButton().textContent).not.toBe('Run');
	});

	it('marks Submit busy while submitting', () => {
		configureEditor('submit');
		render(<SubmitBar />);
		expect(submitButton().getAttribute('aria-busy')).toBe('true');
	});

	it('shows "Judging" in Submit while submitting', () => {
		configureEditor('submit');
		render(<SubmitBar />);
		expect(submitButton().textContent).toBe('Judging');
	});

	it('does not show the word "Submit" while submitting', () => {
		configureEditor('submit');
		render(<SubmitBar />);
		expect(submitButton().textContent).not.toBe('Submit');
	});

	it('does not mark Run busy while only Submit is running', () => {
		configureEditor('submit');
		render(<SubmitBar />);
		expect(runButton().getAttribute('aria-busy')).not.toBe('true');
	});

	it('shows the word "Submit" while nothing is running', () => {
		configureEditor(null);
		render(<SubmitBar />);
		expect(submitButton().textContent).toBe('Submit');
	});

	it('shows no spinner while nothing is running', () => {
		configureEditor(null);
		render(<SubmitBar />);
		expect(screen.queryByTestId('spinner')).toBeNull();
	});
});

describe('form buttons while pending (log in, sign up, reset, settings)', () => {
	const pendingButton = () => screen.getByRole('button', { name: 'Logging in' });

	it('marks a pending form button busy', () => {
		render(<AuthSubmitButton pending pendingLabel="Logging in">Log in</AuthSubmitButton>);
		expect(pendingButton().getAttribute('aria-busy')).toBe('true');
	});

	it('shows a spinner in a pending form button', () => {
		render(<AuthSubmitButton pending pendingLabel="Logging in">Log in</AuthSubmitButton>);
		expect(spinnerIn(pendingButton())).not.toBeNull();
	});

	it('names a pending form button by its pending label (getByRole finds it by name)', () => {
		render(<AuthSubmitButton pending pendingLabel="Logging in">Log in</AuthSubmitButton>);
		expect(pendingButton()).toBeTruthy();
	});

	it('shows no words in a pending form button', () => {
		render(<AuthSubmitButton pending pendingLabel="Logging in">Log in</AuthSubmitButton>);
		expect(pendingButton().textContent).toBe('');
	});

	it('shows the label of a form button that is not pending', () => {
		render(<AuthSubmitButton pending={false} pendingLabel="Logging in">Log in</AuthSubmitButton>);
		expect(screen.getByRole('button', { name: 'Log in' }).textContent).toBe('Log in');
	});
});

describe('question panel while loading', () => {
	it('shows a spinner while the question loads', () => {
		configureEditor(null);
		render(<QuestionPanel />);
		expect(screen.queryByTestId('spinner')).not.toBeNull();
	});
});
