'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { getToken } from '../login/controller';
import { useAuth } from '../login/context';

export type TeamId = 'a' | 'b';

export interface LobbyPlayer {
	userId: string;
	displayName: string;
	team: TeamId | null;
	connected: boolean;
}

export interface LobbyState {
	players: LobbyPlayer[];
	playerCount: number;
	readyToStart: boolean;
}

export interface LobbyError {
	code: string;
	message: string;
}

export interface LobbyReadiness {
	lobbyId: 'main';
	players: LobbyPlayer[];
}

interface LobbySocketContextValue {
	socket: Socket | null;
	connected: boolean;
	lobby: LobbyState | null;
	error: LobbyError | null;
	matchReadiness: LobbyReadiness | null;
	connect: () => Socket | null;
	clearError: () => void;
}

const LobbySocketContext = createContext<LobbySocketContextValue | null>(null);
const SOCKET_URL = process.env.NEXT_PUBLIC_LOBBY_URL ?? 'http://localhost:4003';

export function LobbySocketProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [socket, setSocket] = useState<Socket | null>(null);
	const [connected, setConnected] = useState(false);
	const [lobby, setLobby] = useState<LobbyState | null>(null);
	const [error, setError] = useState<LobbyError | null>(null);
	const [matchReadiness, setMatchReadiness] = useState<LobbyReadiness | null>(null);
	const socketRef = useRef<{ userId: string; socket: Socket } | null>(null);

	const connect = useCallback(() => {
		if (!user) return null;
		if (socketRef.current?.userId === user.id) return socketRef.current.socket;

		socketRef.current?.socket.disconnect();
		const token = getToken();
		if (!token) {
			setError({ code: 'missing-token', message: 'Log in again to join the lobby.' });
			return null;
		}

		const nextSocket = io(SOCKET_URL, {
			autoConnect: false,
			auth: {
				token,
				displayName: user.name?.trim() || user.email.split('@')[0],
			},
		});
		nextSocket.on('lobby:state', (nextLobby: LobbyState) => {
			setLobby(nextLobby);
			setMatchReadiness(null);
			setError(null);
		});
		nextSocket.on('lobby:error', (nextError: LobbyError) => setError(nextError));
		nextSocket.on('lobby:ready-for-match', (readiness: LobbyReadiness) => setMatchReadiness(readiness));
		nextSocket.on('connect_error', (connectError: Error) => {
			setError({ code: 'connection-error', message: connectError.message === 'unauthorized'
				? 'Your login session is invalid or expired. Log in again.'
				: 'Could not connect to the lobby service.' });
		});
		nextSocket.on('connect', () => setError(null));
		nextSocket.on('connect', () => setConnected(true));
		nextSocket.on('disconnect', () => setConnected(false));
		socketRef.current = { userId: user.id, socket: nextSocket };
		setSocket(nextSocket);
		setConnected(false);
		nextSocket.connect();
		return nextSocket;
	}, [user]);

	useEffect(() => {
		if (user) return;
		socketRef.current?.socket.disconnect();
		socketRef.current = null;
		setSocket(null);
		setConnected(false);
		setLobby(null);
		setError(null);
		setMatchReadiness(null);
	}, [user]);

	const clearError = useCallback(() => setError(null), []);
	return (
		<LobbySocketContext.Provider value={{ socket, connected, lobby, error, matchReadiness, connect, clearError }}>
			{children}
		</LobbySocketContext.Provider>
	);
}

export function useLobbySocket(): LobbySocketContextValue {
	const context = useContext(LobbySocketContext);
	if (!context) throw new Error('useLobbySocket must be used within LobbySocketProvider');
	return context;
}
