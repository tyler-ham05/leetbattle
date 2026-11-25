'use client';
import { useEditor } from '../context';
import OutputBlock, { CaseOutputBlocks, isErrorVerdict } from './output-block';

export default function ResultsPanel() {
	const { submitResult, submitError } = useEditor();

	if (submitError) {
		return <p role="alert" className="border-b border-line px-4 py-2 text-sm text-danger">{submitError}</p>;
	}

	if (!submitResult) {
		return null;
	}

	const accepted = submitResult.verdict === 'Accepted';
	// An error (not a wrong answer) has no output to compare: show its traceback instead.
	const errored = !accepted && isErrorVerdict(submitResult.verdict);
	const failingCase = submitResult.cases?.at(-1);

	return (
		<section aria-label="Submission result" className="max-h-64 shrink-0 overflow-y-auto border-b border-line px-4 py-3 text-sm text-ink">
			<p className={`font-medium ${accepted ? 'text-primary' : 'text-danger'}`}>{submitResult.verdict}</p>
			{/* Submit stops at the first failure, so the case after the passed ones is it. */}
			{!accepted && <p className="mt-1 text-xs text-muted">Failed on case {submitResult.passed + 1} of {submitResult.total}</p>}
			<div className="mt-3 grid grid-cols-2 gap-3">
				<OutputBlock label="Passed">{submitResult.passed} / {submitResult.total}</OutputBlock>
				{submitResult.case !== null && <OutputBlock label="Input">{submitResult.case}</OutputBlock>}
				{!errored && submitResult.expected !== null && <OutputBlock label="Expected">{submitResult.expected}</OutputBlock>}
				{!errored && submitResult.response !== null && <OutputBlock label="Your output">{submitResult.response}</OutputBlock>}
			</div>
			{errored && <OutputBlock label="Error" className="mt-3">{failingCase?.stderr || submitResult.response || ''}</OutputBlock>}
			{/* What the player's code printed on each case that ran (US-8-T-3). */}
			{submitResult.cases?.map((ran, index) => (
				<div key={index} className="mt-4">
					<p className={`text-xs font-medium ${ran.verdict === 'Accepted' ? 'text-primary' : 'text-danger'}`}>Case {index + 1}: {ran.verdict}</p>
					<CaseOutputBlocks stdout={ran.stdout} stderr={ran.stderr} errored={isErrorVerdict(ran.verdict)} />
				</div>
			))}
		</section>
	);
}
