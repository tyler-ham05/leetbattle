// US-7-T-5: the 8 preset profile icons. The keys match AuthService's ICONS
// (service/AuthService/src/utils/profile.ts); an unknown key draws the katana.
export const PROFILE_ICONS = {
	katana: { label: 'Katana', path: 'M19 5L8 16 M15 5h4v4 M7 13l4 4 M3 21l3.5-3.5' },
	brackets: { label: 'Brackets', path: 'M8 7l-5 5 5 5 M16 7l5 5-5 5 M13.5 5l-3 14' },
	terminal: { label: 'Terminal', path: 'M4 6l6 6-6 6 M12 18h8' },
	bolt: { label: 'Bolt', path: 'M13 3L5 14h6l-1 7 8-11h-6l1-7z' },
	flame: { label: 'Flame', path: 'M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z' },
	crown: { label: 'Crown', path: 'M4 18h16 M4 18L3 8l5 4 4-6 4 6 5-4-1 10' },
	cube: { label: 'Cube', path: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z M4 7.5l8 4.5 8-4.5 M12 12v9' },
	moon: { label: 'Moon', path: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z' },
} as const;

export type ProfileIconKey = keyof typeof PROFILE_ICONS;

export const PROFILE_ICON_KEYS = Object.keys(PROFILE_ICONS) as ProfileIconKey[];

function isIconKey(key: string | undefined): key is ProfileIconKey {
	return !!key && key in PROFILE_ICONS;
}

// One icon as a line drawing in the current text colour.
export function ProfileIcon({ icon, className }: { icon?: string; className?: string }) {
	const key = isIconKey(icon) ? icon : 'katana';
	return (
		<svg
			data-icon={key}
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d={PROFILE_ICONS[key].path} />
		</svg>
	);
}
