'use client';
import RequireAuth from '../login/protected';
import { SettingsForm } from './components/form';


export default function SettingsPage() {
	return (
		<RequireAuth>
			<div className="flex flex-1 items-center justify-center bg-page p-8 font-sans">
				<SettingsForm />
			</div>
		</RequireAuth>
	);
}
