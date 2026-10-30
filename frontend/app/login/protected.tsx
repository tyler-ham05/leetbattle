'use client';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useAuth } from './context';

export default function RequireAuth({ children }: { children: ReactNode }) {
	const { user, isLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!isLoading && !user) {
			router.replace('/login');
		}
	}, [isLoading, user, router]);

	if (isLoading || !user) {
		return null;
	}

	return <>{children}</>;
}
