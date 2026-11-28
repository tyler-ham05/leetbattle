'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { getToken } from '../login/controller';
import { useAuth } from '../login/context';

export type QueueMode = '1v1' | '2v2' | '3v3';

// What QueueService says about this player's queue and every queue's size.
export interface QueueState {
	queue: QueueMode | null;
	counts: Record<QueueMode, number>;
}

export interface QueueError {
	code: string;
	message: string;
}

// Sent once GameService has created the match; the page moves to /game/<gameId>.
export interface QueueMatch {
	gameId: string;
}

interface QueueSocketContextValue {
	socket: Socket | null;
	connected: boolean;
	queue: QueueState | null;
	matched: QueueMatch | null;
	error: QueueError | null;
	connect: () => Socket | null;
}

const QueueSocketContext = createContext<QueueSocketContextValue | null>(null);
const QUEUE_URL = process.env.NEXT_PUBLIC_QUEUE_URL ?? 'http://localhost:4005';

export function QueueSocketProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [socket, setSocket] = useState<Socket | null>(null);
	const [connected, setConnected] = useState(false);
	const [queue, setQueue] = useState<QueueState | null>(null);
	const [matched, setMatched] = useState<QueueMatch | null>(null);
	const [error, setError] = useState<QueueError | null>(null);
	const socketRef = useRef<Socket | null>(null);

	const connect = useCallback(() => {
		if (!user) return null;
		if (socketRef.current) return socketRef.current;
		const token = getToken();
		if (!token) {
			setError({ code: 'missing-token', message: 'Log in again to join a queue.' });
			return null;
		}

		const queueSocket = io(QUEUE_URL, {
			autoConnect: false,
			auth: { token, displayName: user.name?.trim() || user.email.split('@')[0] },
		});
		queueSocket.on('connect', () => {
			setConnected(true);
			setError(null);
		});
		queueSocket.on('disconnect', () => setConnected(false));
		queueSocket.on('connect_error', () => setError({ code: 'connection-error', message: 'Could not connect to the ladder.' }));
		queueSocket.on('queue:state', (state: QueueState) => setQueue(state));
		queueSocket.on('queue:matched', (match: QueueMatch) => setMatched(match));
		queueSocket.on('queue:error', (queueError: QueueError) => setError(queueError));
		socketRef.current = queueSocket;
		setSocket(queueSocket);
		queueSocket.connect();
		return queueSocket;
	}, [user]);

	// Leaving the Ladder (or signing out) closes the socket, which takes the
	// player out of their queue.
	useEffect(() => () => {
		socketRef.current?.disconnect();
		socketRef.current = null;
	}, [user]);

	return (
		<QueueSocketContext.Provider value={{ socket, connected, queue, matched, error, connect }}>
			{children}
		</QueueSocketContext.Provider>
	);
}

export function useQueueSocket(): QueueSocketContextValue {
	const context = useContext(QueueSocketContext);
	if (!context) throw new Error('useQueueSocket must be used within QueueSocketProvider');
	return context;
}
