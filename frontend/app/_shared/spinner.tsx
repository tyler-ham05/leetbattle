// A spinning ring for anything that is in progress (sprint 4 polish). It is
// decoration: whatever it sits in names the action for screen readers.
export default function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
	return <span data-testid="spinner" aria-hidden="true" className={`lb-spin inline-block shrink-0 rounded-full border-2 border-current border-t-transparent ${className}`} />;
}
