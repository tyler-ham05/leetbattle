'use client';
import { FormEvent, useState } from 'react';
import RequireAuth from '../auth/protected';
import { useAuth } from '../auth/context';
import { AuthAPIService } from '../auth/controller';
import { AuthField, AuthMessage, AuthSubmitButton } from '../auth/components';

function SettingsForm() {
	const { user, refresh } = useAuth();
	const [name, setName] = useState(user?.name ?? '');
	const [nameMessage, setNameMessage] = useState<string | null>(null);
	const [nameError, setNameError] = useState<string | null>(null);
	const [isSavingName, setIsSavingName] = useState(false);

	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [isSavingPassword, setIsSavingPassword] = useState(false);

	const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

	const onSaveName = async (e: FormEvent) => {
		e.preventDefault();
		setNameError(null);
		setNameMessage(null);
		setIsSavingName(true);
		try {
			const api = new AuthAPIService();
			await api.updateAccount(name);
			await refresh();
			setNameMessage('Name updated.');
		} catch (err) {
			setNameError(err instanceof Error ? err.message : 'failed to update name');
		} finally {
			setIsSavingName(false);
		}
	};

	const onChangePassword = async (e: FormEvent) => {
		e.preventDefault();
		setPasswordError(null);
		setPasswordMessage(null);
		setIsSavingPassword(true);
		try {
			const api = new AuthAPIService();
			await api.changePassword(currentPassword, newPassword);
			setCurrentPassword('');
			setNewPassword('');
			setPasswordMessage('Password changed.');
		} catch (err) {
			setPasswordError(err instanceof Error ? err.message : 'failed to change password');
		} finally {
			setIsSavingPassword(false);
		}
	};

	const onResendVerification = async () => {
		setVerificationMessage(null);
		try {
			const api = new AuthAPIService();
			await api.resendVerification();
			setVerificationMessage('Verification email sent.');
		} catch (err) {
			setVerificationMessage(err instanceof Error ? err.message : 'failed to send verification email');
		}
	};

	return (
		<div className="flex w-full max-w-md flex-col gap-8">
			<div>
				<h1 className="text-xl font-semibold">Account settings</h1>
				<p className="text-sm text-zinc-500">{user?.email}</p>
				{!user?.emailVerified && (
					<button onClick={onResendVerification} className="mt-1 text-sm underline">
						Email not verified — resend verification
					</button>
				)}
				{verificationMessage && <p className="text-sm text-zinc-500">{verificationMessage}</p>}
			</div>

			<form onSubmit={onSaveName} className="flex flex-col gap-3">
				<AuthField
					label="Name"
					type="text"
					required
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<AuthMessage error={nameError} success={nameMessage} />
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
				<AuthMessage error={passwordError} success={passwordMessage} />
				<div>
					<AuthSubmitButton pending={isSavingPassword} pendingLabel="Saving…">
						Change password
					</AuthSubmitButton>
				</div>
			</form>
		</div>
	);
}

export default function SettingsPage() {
	return (
		<RequireAuth>
			<div className="flex flex-1 items-center justify-center bg-zinc-50 p-8 font-sans dark:bg-black">
				<SettingsForm />
			</div>
		</RequireAuth>
	);
}
