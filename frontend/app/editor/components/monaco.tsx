'use client';
import Editor from '@monaco-editor/react';

const DRAFT_STORAGE_KEY = 'leetbattle:editor:draft:two-sum';

export default function Monaco() {
	return (
		<Editor
			height="100%"
			defaultLanguage="javascript"
			defaultValue="// start typing"
			theme="vs-dark"
			onMount={(editor) => {
				const savedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);

				if (savedDraft !== null) {
					editor.setValue(savedDraft);
				}
			}}
			onChange={(value) => {
				if (value !== undefined) {
					window.localStorage.setItem(DRAFT_STORAGE_KEY, value);
				}
			}}
			options={{ minimap: { enabled: false }, fontSize: 14 }}
		/>
	);

}
