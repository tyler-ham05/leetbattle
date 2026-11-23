'use client';
import { useEditor } from '../context';
import OutputBlock from './output-block';

export default function ResultsPanel() {
	const { submitResult, submitError } = useEditor();

	if (submitError) {
		return <p role="alert" className="border-b border-line px-4 py-2 text-sm text-danger">{submitError}</p>;
	}

	if (!submitResult) {
		return null;
	}

	const accepted = submitResult.verdict === 'Accepted';

	return (
		<section aria-label="Submission result" className="max-h-64 shrink-0 overflow-y-auto border-b border-line px-4 py-3 text-sm text-ink">
			<p className={`font-medium ${accepted ? 'text-primary' : 'text-danger'}`}>{submitResult.verdict}</p>
			<div className="mt-3 grid grid-cols-2 gap-3">
				<OutputBlock label="Passed">{submitResult.passed} / {submitResult.total}</OutputBlock>
				{submitResult.case !== null && <OutputBlock label="Input">{submitResult.case}</OutputBlock>}
				{submitResult.expected !== null && <OutputBlock label="Expected">{submitResult.expected}</OutputBlock>}
				{submitResult.response !== null && <OutputBlock label="Your output">{submitResult.response}</OutputBlock>}
			</div>
		</section>
	);
}
