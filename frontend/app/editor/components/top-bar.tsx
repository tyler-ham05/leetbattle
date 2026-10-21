'use client';

interface TopBarProps {
	onRun?: () => void;
	onSubmit?: () => void;
}

export default function TopBar({ onRun, onSubmit }: TopBarProps) {
	return (
		<div className="flex items-center justify-end gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800 h-12">
		</div>
	);
}
