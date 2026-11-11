'use client';
import { useEditor } from '../context';

export default function ResultsPanel() {
	const { submitResult } = useEditor();

	if (!submitResult) {
		return null;
	}

	return (
		<div className="border-b border-line px-4 py-2 text-sm font-medium text-ink">
			{submitResult.verdict}
		</div>
	);
}
