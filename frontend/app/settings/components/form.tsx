import { useAuth } from '../../login/context';
import { AuthAPIService } from '../../login/controller';
import { AuthField, AuthMessage, AuthStatus, AuthSubmitButton } from '../../login/components/components';
import BackLink from '../../_shared/back-link';
import ThemeControls from '../../_shared/theme-controls';
import { SubmitEvent, useState } from 'react';


export function SettingsForm() {
	const { user, refresh } = useAuth();
	const [name, setName] = useState(user?.name ?? '');
	const [nameStatus, setNameStatus] = useState<AuthStatus | null>(null);
	const [isSavingName, setIsSavingName] = useState(false);

	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [passwordStatus, setPasswordStatus] = useState<AuthStatus | null>(null);
	const [isSavingPassword, setIsSavingPassword] = useState(false);

	const onSaveName = async (e: SubmitEvent) => {
		e.preventDefault();
		setNameStatus(null);
		setIsSavingName(true);
		try {
			const api = new AuthAPIService();
			await api.updateAccount(name);
			await refresh();
			setNameStatus({ type: 'success', text: 'Name updated.' });
		} catch (err) {
			setNameStatus({ type: 'error', text: err instanceof Error ? err.message : 'failed to update name' });
		} finally {
			setIsSavingName(false);
		}
	};

	const onChangePassword = async (e: SubmitEvent) => {
		e.preventDefault();
		setPasswordStatus(null);
		setIsSavingPassword(true);
		try {
			const api = new AuthAPIService();
			await api.changePassword(currentPassword, newPassword);
			setCurrentPassword('');
			setNewPassword('');
			setPasswordStatus({ type: 'success', text: 'Password changed.' });
		} catch (err) {
			setPasswordStatus({ type: 'error', text: err instanceof Error ? err.message : 'failed to change password' });
		} finally {
			setIsSavingPassword(false);
		}
	};

	return (
		<div className="flex w-full max-w-md flex-col gap-8">
			<div>
				<BackLink label="Back" />
				<h1 className="mt-4 text-xl font-semibold">Account settings</h1>
				<p className="text-sm text-muted">{user?.email}</p>
			</div>

			<form onSubmit={onSaveName} className="flex flex-col gap-3">
				<AuthField
					label="Name"
					type="text"
					required
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<AuthMessage status={nameStatus} />
				<div>
					<AuthSubmitButton pending={isSavingName} pendingLabel="Saving…">
						Save name
					</AuthSubmitButton>
				</div>
			</form>

			<form onSubmit={onChangePassword} className="flex flex-col gap-3">
				<h2 className="text-sm font-semibold">Change password</h2>
				<AuthField
					label="Current password"
					type="password"
					required
					value={currentPassword}
					onChange={(e) => setCurrentPassword(e.target.value)}
				/>
				<AuthField
					label="New password"
					type="password"
					required
					minLength={8}
					value={newPassword}
					onChange={(e) => setNewPassword(e.target.value)}
				/>
				<AuthMessage status={passwordStatus} />
				<div>
					<AuthSubmitButton pending={isSavingPassword} pendingLabel="Saving…">
						Change password
					</AuthSubmitButton>
				</div>
			</form>

			<div className="flex flex-col gap-3">
				<h2 className="text-sm font-semibold">Theme</h2>
				<ThemeControls />
			</div>
		</div>
	);
}