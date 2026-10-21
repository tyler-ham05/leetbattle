'use client';
import Editor from '@monaco-editor/react';

export default function Monaco() {
	return (
		<Editor
			height="100%"
			defaultLanguage="python"
			defaultValue="// start typing"
			theme="vs-dark"
			onChange={(value) => console.log(value)}
			options={{ minimap: { enabled: false }, fontSize: 14 }}
		/>
	);

}
