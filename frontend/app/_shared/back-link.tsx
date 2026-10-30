'use client';
import { useRouter } from 'next/navigation';

export default function BackLink({ label = 'Back' }: { label?: string }) {
	const router = useRouter();
	return (
		<button
			type="button"
			onClick={() => router.back()}
			className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
		>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
				<path d="M19 12H5M11 18l-6-6 6-6" />
			</svg>
			{label}
		</button>
	);
}
