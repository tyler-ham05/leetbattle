import Link from 'next/link';

export default function PracticeCard() {
	return (
		<Link
			href="/editor"
			className="flex w-64 flex-col gap-2 rounded-xl border border-line p-5 transition hover:border-primary"
		>
			<span className="text-lg font-semibold text-ink">Practice</span>
			<span className="text-sm text-muted">Solve problems on your own in the editor.</span>
		</Link>
	);
}
