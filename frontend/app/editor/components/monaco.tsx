'use client';
import Editor, { type Monaco as MonacoApi } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';
import { useEditor } from '../context';
import { MONACO_THEME, buildMonacoTheme, readThemeColors } from '../monaco-theme';

// Defines (or redefines) the editor theme from the site's current colors and switches to it.
function applyTheme(monaco: MonacoApi) {
	const root = document.documentElement;
	monaco.editor.defineTheme(MONACO_THEME, buildMonacoTheme(readThemeColors(root), root.getAttribute('data-mode')));
	monaco.editor.setTheme(MONACO_THEME);
}

export default function Monaco() {
	const { code, setCode, readOnly, onRun, onSubmit, isLoading } = useEditor();
	const monacoRef = useRef<MonacoApi | null>(null);
	// Monaco keeps the commands it was given at mount, so they read the
	// latest Run / Submit (and whether they may be used) from here.
	const shortcuts = useRef({ run: onRun, submit: onSubmit, enabled: !readOnly && !isLoading });
	useEffect(() => {
		shortcuts.current = { run: onRun, submit: onSubmit, enabled: !readOnly && !isLoading };
	});

	// Settings changes data-scheme and data-mode on <html>; restyle the editor when it does.
	useEffect(() => {
		const observer = new MutationObserver(() => {
			if (monacoRef.current) {
				applyTheme(monacoRef.current);
			}
		});
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme', 'data-mode'] });
		return () => observer.disconnect();
	}, []);

	return (
		<Editor
			height="100%"
			defaultLanguage="python"
			value={code}
			theme={MONACO_THEME}
			beforeMount={(monaco) => {
				monacoRef.current = monaco;
				applyTheme(monaco);
			}}
			onMount={(editor, monaco) => {
				// Monaco swallows Ctrl/Cmd+Enter itself, so the page-wide shortcuts
				// (see submit-bar.tsx) are registered with the editor too.
				const trigger = (action: 'run' | 'submit') => {
					if (shortcuts.current.enabled) shortcuts.current[action]();
				};
				editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => trigger('run'));
				editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => trigger('submit'));
			}}
			onChange={(value) => setCode(value ?? '')}
			// automaticLayout: the editor follows its pane when a divider is dragged.
			options={{ minimap: { enabled: false }, fontSize: 14, readOnly, automaticLayout: true }}
		/>
	);
}
