'use client';
import RequireAuth from '../login/protected';
import { SettingsForm } from './components/form';
import PageLoader from '../_shared/page-loader';
import HomeTopBar from '../_home/components/topbar';


export default function SettingsPage() {
	return (
		<RequireAuth>
			<div className="flex flex-1 flex-col bg-page font-sans">
				<PageLoader variant="pen" />
				<HomeTopBar />
				<main className="flex flex-1 items-center justify-center p-8">
					<SettingsForm />
				</main>
			</div>
		</RequireAuth>
	);
}
