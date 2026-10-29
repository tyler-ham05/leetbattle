'use client';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { AuthAPIService, User } from './controller';

export interface AuthContextValue {
	user: User | null;
	isLoading: boolean;
	error: string | null;
	signup: (_email: string, _password: string, _name: string) => Promise<void>;
	login: (_email: string, _password: string) => Promise<void>;
	logout: () => Promise<void>;
	refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		const api = new AuthAPIService();
		try {
			const current = await api.me();
			setUser(current);
		} catch (err) {
			setUser(null);
			setError(err instanceof Error ? err.message : 'failed to load account');
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const signup = async (email: string, password: string, name: string) => {
		setError(null);
		const api = new AuthAPIService();
		const current = await api.signup(email, password, name);
		setUser(current);
	};

	const login = async (email: string, password: string) => {
		setError(null);
		const api = new AuthAPIService();
		const current = await api.login(email, password);
		setUser(current);
	};

	const logout = async () => {
		const api = new AuthAPIService();
		await api.logout();
		setUser(null);
	};

	return (
		<AuthContext.Provider value={{ user, isLoading, error, signup, login, logout, refresh }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
