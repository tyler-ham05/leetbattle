'use client';
import { useAuth } from './login/context';
import LandingPage from './_landing/landing-page';
import HomeActions from './_home/components/home-actions';
import HomeTopBar from './_home/components/topbar';

export default function Home() {
	const { user, isLoading } = useAuth();

	if (isLoading) {
		return null;
	}

	if (user) {
		return (
			<div className="flex flex-1 flex-col">
				<HomeTopBar />
				<div className="flex flex-1 items-center justify-center">
					<HomeActions />
				</div>
			</div>
		);
	}

	return <LandingPage />;
}