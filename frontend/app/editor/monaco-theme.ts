// Builds the Monaco editor theme from the site's theme variables (see docs/frontend/theming.md),
// so the code editor follows the color scheme and light or dark mode chosen in Settings.

export const MONACO_THEME = 'leetbattle';

// The --lb-* variables the editor theme is built from.
const VARIABLES = ['surface', 'raised', 'line', 'ink', 'muted', 'primary', 'secondary', 'kw', 'num'] as const;

export type ThemeColors = Record<(typeof VARIABLES)[number], string>;

// "#fff" -> "#ffffff". The CSS build shortens colors like #ffffff, but Monaco
// only takes six-digit colors (and the alpha suffixes below need six digits too).
const fullHex = (color: string) => (/^#[0-9a-f]{3}$/i.test(color) ? `#${[...color.slice(1)].map((digit) => digit + digit).join('')}` : color);

// Reads the current values of the theme variables from the page.
export function readThemeColors(root: HTMLElement): ThemeColors {
	const style = getComputedStyle(root);
	const colors = {} as ThemeColors;
	for (const name of VARIABLES) {
		colors[name] = fullHex(style.getPropertyValue(`--lb-${name}`).trim());
	}
	return colors;
}

// Monaco token rules take colors without the leading "#".
const bare = (color: string) => color.replace('#', '');

export function buildMonacoTheme(colors: ThemeColors, mode: string | null) {
	return {
		base: mode === 'light' ? 'vs' as const : 'vs-dark' as const,
		inherit: true,
		rules: [
			{ token: '', foreground: bare(colors.ink) },
			{ token: 'keyword', foreground: bare(colors.kw) },
			{ token: 'number', foreground: bare(colors.num) },
			{ token: 'string', foreground: bare(colors.secondary) },
			{ token: 'comment', foreground: bare(colors.muted), fontStyle: 'italic' },
			{ token: 'delimiter', foreground: bare(colors.muted) },
		],
		colors: {
			'editor.background': colors.surface,
			'editor.foreground': colors.ink,
			'editor.lineHighlightBackground': colors.raised,
			'editor.lineHighlightBorder': colors.raised,
			'editor.selectionBackground': `${colors.primary}40`,
			'editor.inactiveSelectionBackground': `${colors.primary}26`,
			'editorCursor.foreground': colors.primary,
			'editorLineNumber.foreground': colors.muted,
			'editorLineNumber.activeForeground': colors.ink,
			'editorIndentGuide.background1': colors.line,
			'editorIndentGuide.activeBackground1': colors.muted,
			'editorBracketMatch.background': `${colors.primary}26`,
			'editorBracketMatch.border': colors.primary,
			'editorWidget.background': colors.raised,
			'editorWidget.border': colors.line,
			'scrollbarSlider.background': `${colors.muted}33`,
			'scrollbarSlider.hoverBackground': `${colors.muted}55`,
		},
	};
}
