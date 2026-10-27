'use client';
import Editor from '@monaco-editor/react';
import { useEditor } from '../context';

export default function Monaco() {
	const { code, setCode } = useEditor();

	return (
		<Editor
			height="100%"
			defaultLanguage="python"
			value={code}
			theme="vs-dark"
			onChange={(value) => setCode(value ?? '')}
			options={{ minimap: { enabled: false }, fontSize: 14 }}
		/>
	);
}
