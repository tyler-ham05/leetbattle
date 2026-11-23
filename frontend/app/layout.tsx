import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { DEFAULT_MODE, DEFAULT_SCHEME, themeInitScript } from './theme';
import { AuthProvider } from './login/context';
import { LobbySocketProvider } from './lobby/socket-context';
import { RejoinProvider } from './_shared/rejoin-context';
import ThemeFavicon from './_shared/theme-favicon';

// Self-hosted so builds (local, Docker, Cloud Build) never need to reach Google Fonts.
const onest = localFont({
	src: './_fonts/Onest-Variable.woff2',
	variable: '--font-onest',
	weight: '100 900',
	display: 'swap',
});

const jetbrainsMono = localFont({
	src: './_fonts/JetBrainsMono-Variable.woff2',
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
			<body className="min-h-full flex flex-col">
				{/* The tab icon follows the chosen color scheme (app/icon.svg until it loads). */}
				<ThemeFavicon />
				<AuthProvider>
					{/* US-6-T-8: checks on every route whether the player has a match to rejoin. */}
					<RejoinProvider>
						<LobbySocketProvider>{children}</LobbySocketProvider>
					</RejoinProvider>
				</AuthProvider>
			</body>
		</html>
	);
}