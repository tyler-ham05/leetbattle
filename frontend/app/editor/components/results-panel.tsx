'use client';
import { useEditor } from '../context';

export default function ResultsPanel() {
	const { submitResult } = useEditor();

	if (!submitResult) {
		return null;
	}

	return (
		<div className="border-b border-line px-4 py-2 text-sm text-ink">
			<p className="font-medium">{submitResult.verdict}</p>
			<p>Passed: {submitResult.passed} / {submitResult.total}</p>
			{submitResult.case !== null && <p>Input: {submitResult.case}</p>}
			{submitResult.expected !== null && <p>Expected: {submitResult.expected}</p>}
		</div>
	);
}
