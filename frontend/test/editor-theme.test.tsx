// Pseudocode
// The code editor should use the colors chosen in Settings
//   - The editor background should be the theme's surface color
//   - Keywords should use the theme's keyword color
//   - The cursor should use the theme's primary color
//   - In light mode the editor theme should be based on Monaco's light theme
//   - In dark mode the editor theme should be based on Monaco's dark theme
//   - The theme colors should be read from the --lb-* variables on the page
//   - A short color like "#fff" (the CSS build shortens #ffffff) should be read as "#ffffff",
//     since Monaco rejects 3-digit colors and the practice page crashed in light mode
// The question tabs should match the theme
//   - The question tabs should not have a colored bottom border
//   - The tab of the open question should be marked as current
//   - The number of the open question should use the theme's primary color

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { buildMonacoTheme, readThemeColors, type ThemeColors } from '../app/editor/monaco-theme';

const editorMocks = vi.hoisted(() => ({ useEditor: vi.fn() }));
vi.mock('../app/editor/context', () => ({ useEditor: () => editorMocks.useEditor() }));

import QuestionNavigation from '../app/editor/components/question-navigation';

// The emerald dark scheme from globals.css.
const colors: ThemeColors = {
	surface: '#111a17',
	raised: '#18231f',
	line: '#24312c',
	ink: '#e6eeea',
	muted: '#94a69e',
	primary: '#34d399',
	secondary: '#f2c14e',
	kw: '#7fc8a9',
	num: '#f2c14e',
};

afterEach(() => cleanup());

describe('code editor theme', () => {
	it('uses the surface color as the editor background', () => {
		expect(buildMonacoTheme(colors, 'dark').colors['editor.background']).toBe('#111a17');
	});

	it('uses the keyword color for keywords', () => {
		const rule = buildMonacoTheme(colors, 'dark').rules.find((entry) => entry.token === 'keyword');

		// Monaco token rules take the color without the leading "#".
		expect(rule?.foreground).toBe('7fc8a9');
	});

	it('uses the primary color for the cursor', () => {
		expect(buildMonacoTheme(colors, 'dark').colors['editorCursor.foreground']).toBe('#34d399');
	});

	it('is based on the light Monaco theme in light mode', () => {
		expect(buildMonacoTheme(colors, 'light').base).toBe('vs');
	});

	it('is based on the dark Monaco theme in dark mode', () => {
		expect(buildMonacoTheme(colors, 'dark').base).toBe('vs-dark');
	});

	it('reads the colors from the theme variables on the page', () => {
		const root = document.createElement('div');
		root.style.setProperty('--lb-primary', ' #b8f53d');

		// Surrounding whitespace in the variable is dropped.
		expect(readThemeColors(root).primary).toBe('#b8f53d');
	});

	it('reads a short #fff as the full #ffffff', () => {
		const root = document.createElement('div');
		root.style.setProperty('--lb-surface', '#fff');

		expect(readThemeColors(root).surface).toBe('#ffffff');
	});
});

describe('question tabs', () => {
	const questions = [
		{ question_id: 20, difficulty: 'Easy' },
		{ question_id: 21, difficulty: 'Medium' },
		{ question_id: 22, difficulty: 'Unknown' },
	];

	it('does not put a colored bottom border on the tabs', () => {
		editorMocks.useEditor.mockReturnValue({ questions, currentQuestion: questions[0], setCurrentQuestion: vi.fn() });
		const { container } = render(<QuestionNavigation />);

		expect(container.querySelectorAll('[class*="border-b-"]')).toHaveLength(0);
	});

	it('marks the tab of the open question as current', () => {
		editorMocks.useEditor.mockReturnValue({ questions, currentQuestion: questions[1], setCurrentQuestion: vi.fn() });
		render(<QuestionNavigation />);

		expect(screen.getByRole('button', { name: '2' }).getAttribute('aria-current')).toBe('true');
	});

	// US-5-T-23: the primary color now marks a solved question, so the open
	// question is shown raised instead (like the other selected tabs).
	it('raises the tab of the open question', () => {
		editorMocks.useEditor.mockReturnValue({ questions, currentQuestion: questions[1], setCurrentQuestion: vi.fn() });
		render(<QuestionNavigation />);

		expect(screen.getByRole('button', { name: '2' }).className).toContain('bg-raised');
	});
});
