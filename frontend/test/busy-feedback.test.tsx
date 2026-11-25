// US-10-T-9: Run and Submit busy feedback (app/editor/components/submit-bar.tsx).
// Pseudocode: test/ladder-busy-test-pseudo.md, the "Run and Submit" sections.
// While busy, the label becomes "Running" / "Judging" and a light runs around
// the button's edge (no spinner). When the result comes back it lands on the
// button for 1.5 seconds: a pass nods with a check mark, a fail shakes.
// The editor context is mocked; each test re-renders with the context the
// editor would give before and after the request, so nothing talks to a backend.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RunResult, SubmitResult } from '../app/editor/controller';

const editorMocks = vi.hoisted(() => ({ useEditor: vi.fn(), onRun: vi.fn(), onSubmit: vi.fn() }));
vi.mock('../app/editor/context', () => ({ useEditor: () => editorMocks.useEditor() }));

import SubmitBar from '../app/editor/components/submit-bar';

interface EditorState {
	runResult?: RunResult | null;
	submitResult?: SubmitResult | null;
}

// The editor while `action` is in flight (null: nothing running).
function configureEditor(action: 'run' | 'submit' | null, { runResult = null, submitResult = null }: EditorState = {}) {
	editorMocks.useEditor.mockReturnValue({
		onRun: editorMocks.onRun,
		onSubmit: editorMocks.onSubmit,
		loadingAction: action,
		isLoading: action !== null,
		readOnly: false,
		runResult,
		submitResult,
	});
}

const runButton = () => screen.getByRole('button', { name: 'Run' });
const submitButton = () => screen.getByRole('button', { name: 'Submit' });

function submitResult(verdict: string): SubmitResult {
	return { verdict, passed: verdict === 'Accepted' ? 3 : 1, total: 3, case: null, expected: null, response: null };
}

// One Run result per case: `failed` of the three cases come back Wrong Answer.
function runResult(failed: number): RunResult {
	return [0, 1, 2].map((index) => ({ verdict: index < failed ? 'Wrong Answer' : 'Accepted', expected: '1', response: '1' }));
}

// `action` runs and comes back with `after` (what the editor holds once the
// request is done). `before` is what it held while the request was in flight.
function land(action: 'run' | 'submit', after: EditorState, before: EditorState = {}) {
	configureEditor(action, before);
	const view = render(<SubmitBar />);
	configureEditor(null, after);
	view.rerender(<SubmitBar />);
	return view;
}

beforeEach(() => {
	vi.clearAllMocks();
	configureEditor(null);
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('US-10-T-9 Run and Submit while busy', () => {
	it('US-10-T-9 shows "Running" in Run while running', () => {
		configureEditor('run');
		render(<SubmitBar />);
		expect(runButton().textContent).toBe('Running');
	});

	it('US-10-T-9 still names Run "Run" while running (getByRole finds it by name)', () => {
		configureEditor('run');
		render(<SubmitBar />);
		expect(runButton()).toBeTruthy();
	});

	it('US-10-T-9 marks Run busy while running', () => {
		configureEditor('run');
		render(<SubmitBar />);
		expect(runButton().getAttribute('aria-busy')).toBe('true');
	});

	it('US-10-T-9 puts the edge light on Run while running', () => {
		configureEditor('run');
		render(<SubmitBar />);
		expect(runButton().classList.contains('lb-trace')).toBe(true);
	});

	it('US-10-T-9 shows no spinner in Run while running', () => {
		configureEditor('run');
		render(<SubmitBar />);
		expect(within(runButton()).queryByTestId('spinner')).toBeNull();
	});

	it('US-10-T-9 shows "Judging" in Submit while submitting', () => {
		configureEditor('submit');
		render(<SubmitBar />);
		expect(submitButton().textContent).toBe('Judging');
	});

	it('US-10-T-9 still names Submit "Submit" while submitting', () => {
		configureEditor('submit');
		render(<SubmitBar />);
		expect(submitButton()).toBeTruthy();
	});

	it('US-10-T-9 puts the edge light on Submit while submitting', () => {
		configureEditor('submit');
		render(<SubmitBar />);
		expect(submitButton().classList.contains('lb-trace')).toBe(true);
	});

	it('US-10-T-9 shows no spinner in Submit while submitting', () => {
		configureEditor('submit');
		render(<SubmitBar />);
		expect(within(submitButton()).queryByTestId('spinner')).toBeNull();
	});

	it('US-10-T-9 disables Run while submitting', () => {
		configureEditor('submit');
		render(<SubmitBar />);
		expect((runButton() as HTMLButtonElement).disabled).toBe(true);
	});
});

describe('US-10-T-9 the result lands on the button', () => {
	it('US-10-T-9 shows "Accepted" on Submit after an Accepted submit', () => {
		land('submit', { submitResult: submitResult('Accepted') });
		expect(submitButton().textContent).toBe('Accepted');
	});

	it('US-10-T-9 nods Submit after an Accepted submit', () => {
		land('submit', { submitResult: submitResult('Accepted') });
		expect(submitButton().classList.contains('lb-nod')).toBe(true);
	});

	it('US-10-T-9 shows a check mark on Submit after an Accepted submit', () => {
		land('submit', { submitResult: submitResult('Accepted') });
		expect(submitButton().querySelector('svg.lb-check')).not.toBeNull();
	});

	it('US-10-T-9 shows "Wrong" on Submit after a Wrong Answer', () => {
		land('submit', { submitResult: submitResult('Wrong Answer') });
		expect(submitButton().textContent).toBe('Wrong');
	});

	it('US-10-T-9 shakes Submit after a Wrong Answer', () => {
		land('submit', { submitResult: submitResult('Wrong Answer') });
		expect(submitButton().classList.contains('lb-shake')).toBe(true);
	});

	it('US-10-T-9 shows "Error" on Submit after a Runtime Error', () => {
		land('submit', { submitResult: submitResult('Runtime Error') });
		expect(submitButton().textContent).toBe('Error');
	});

	it('US-10-T-9 shows "Passed" on Run when every case is Accepted', () => {
		land('run', { runResult: runResult(0) });
		expect(runButton().textContent).toBe('Passed');
	});

	it('US-10-T-9 shows "2 failed" on Run when 2 cases fail', () => {
		land('run', { runResult: runResult(2) });
		expect(runButton().textContent).toBe('2 failed');
	});

	it('US-10-T-9 shakes Run when 2 cases fail', () => {
		land('run', { runResult: runResult(2) });
		expect(runButton().classList.contains('lb-shake')).toBe(true);
	});

	it('US-10-T-9 marks Submit as showing a pass while "Accepted" is on it', () => {
		land('submit', { submitResult: submitResult('Accepted') });
		expect(submitButton().dataset.result).toBe('pass');
	});

	it('US-10-T-9 marks Submit as showing a fail while "Wrong" is on it', () => {
		land('submit', { submitResult: submitResult('Wrong Answer') });
		expect(submitButton().dataset.result).toBe('fail');
	});

	it('US-10-T-9 shows "Submit" again 1.5 seconds after the result', () => {
		vi.useFakeTimers();
		land('submit', { submitResult: submitResult('Accepted') });
		act(() => {
			vi.advanceTimersByTime(1500);
		});
		expect(submitButton().textContent).toBe('Submit');
	});

	it('US-10-T-9 stops marking Submit as showing a result after 1.5 seconds', () => {
		vi.useFakeTimers();
		land('submit', { submitResult: submitResult('Accepted') });
		act(() => {
			vi.advanceTimersByTime(1500);
		});
		expect(submitButton().dataset.result).toBeUndefined();
	});

	it('US-10-T-9 starts a run straight away when Run is clicked while Submit shows "Accepted"', async () => {
		land('submit', { submitResult: submitResult('Accepted') });
		await userEvent.click(runButton());
		expect(editorMocks.onRun).toHaveBeenCalled();
	});

	it('US-10-T-9 goes straight back to "Submit" when the submit request itself fails', () => {
		// The request failed, so the editor still holds the previous result object.
		const previous = submitResult('Accepted');
		land('submit', { submitResult: previous }, { submitResult: previous });
		expect(submitButton().textContent).toBe('Submit');
	});

	it('US-10-T-9 does not nod or shake when the submit request itself fails', () => {
		const previous = submitResult('Wrong Answer');
		land('submit', { submitResult: previous }, { submitResult: previous });
		expect(submitButton().dataset.result).toBeUndefined();
	});
});
