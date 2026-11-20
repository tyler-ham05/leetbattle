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
	const [failedPasswordChanges, setFailedPasswordChanges] = useState(0);

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
			setFailedPasswordChanges((count) => count + 1);
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

			{/* Each section sits under a divider with a heading a step above the
			    field labels, so "Change password" doesn't read as another label. */}
			<section aria-labelledby="settings-password" className="flex flex-col gap-4 border-t border-line pt-8">
				<h2 id="settings-password" className="text-base font-semibold">Change password</h2>
				<form onSubmit={onChangePassword} className="flex flex-col gap-3">
					<AuthField
						label="Current password"
						type="password"
						required
						value={currentPassword}
						onChange={(e) => setCurrentPassword(e.target.value)}
						invalid={passwordStatus?.type === 'error'}
						shake={failedPasswordChanges}
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
			</section>

			<section aria-labelledby="settings-theme" className="flex flex-col gap-4 border-t border-line pt-8">
				<h2 id="settings-theme" className="text-base font-semibold">Theme</h2>
				<ThemeControls />
			</section>
		</div>
	);
}