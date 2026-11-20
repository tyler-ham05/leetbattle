'use client';
import { useAuth } from './login/context';
import LandingPage from './_landing/landing-page';
import HomeActions from './_home/components/home-actions';
import UserMenu from './_home/components/user-menu';
import PageLoader from './_shared/page-loader';
import ThemeToggle from './_shared/theme-toggle';

export default function Home() {
	const { user, isLoading } = useAuth();

	if (isLoading) {
		return null;
	}

	if (user) {
		return (
			<div className="relative flex flex-1 flex-col">
				<PageLoader variant="katana" />
				<div className="absolute top-3 right-4 z-10 flex items-center gap-2">
					<ThemeToggle />
					<UserMenu />
				</div>
				<HomeActions />
			</div>
		);
	}

	return <LandingPage />;
}