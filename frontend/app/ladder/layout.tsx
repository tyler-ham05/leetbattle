import type { ReactNode } from 'react';
import { QueueSocketProvider } from './socket-context';

export default function LadderLayout({ children }: { children: ReactNode }) {
	return <QueueSocketProvider>{children}</QueueSocketProvider>;
}
