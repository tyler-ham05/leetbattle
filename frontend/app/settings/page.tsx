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
				<main className="flex flex-1 items-start justify-center px-[clamp(24px,8vw,110px)] py-8 lg:py-12">
					<SettingsForm />
				</main>
			</div>
		</RequireAuth>
	);
}
