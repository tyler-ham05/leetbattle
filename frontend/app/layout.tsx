import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { DEFAULT_MODE, DEFAULT_SCHEME, themeInitScript } from './theme';

// Self-hosted so builds (local, Docker, Cloud Build) never need to reach Google Fonts.
const onest = localFont({
	src: './fonts/Onest-Variable.woff2',
	variable: '--font-onest',
	weight: '100 900',
	display: 'swap',
});

const jetbrainsMono = localFont({
	src: './fonts/JetBrainsMono-Variable.woff2',
	variable: '--font-jetbrains',
	weight: '100 800',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'LeetBattle',
	description: 'Team coding battles: two teams of three solve the same problems in a shared browser IDE.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html
			lang="en"
			data-scheme={DEFAULT_SCHEME}
			data-mode={DEFAULT_MODE}
			className={`${onest.variable} ${jetbrainsMono.variable} h-full antialiased`}
			suppressHydrationWarning
		>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
			</head>
			<body className="min-h-full flex flex-col">{children}</body>
		</html>
	);
}
