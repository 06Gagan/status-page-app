// status-page-app/client/src/contexts/SocketContext.js
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext'; // Still needed for auth-specific socket actions if any

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const { token, loading: authLoading } = useAuth(); // Token might be used for authenticated emits later
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null); // Example state for messages

    useEffect(() => {
        // Wait for auth loading to complete before deciding about token-based auth for socket
        if (authLoading) {
            console.log('[SocketContext] Auth is loading, deferring socket connection decision.');
            return;
        }

        // Always attempt to connect. If a token exists, it can be used for authentication.
        // If no token, it will be an unauthenticated connection (server needs to allow this).
        console.log('[SocketContext] Attempting to connect socket...');
        
        // If there's an existing socket, disconnect it first
        if (socketRef.current) {
            console.log('[SocketContext] Disconnecting previous socket before creating a new one.');
            socketRef.current.disconnect();
            socketRef.current.removeAllListeners();
            socketRef.current = null;
            setIsConnected(false);
        }

        const socketOptions = {
            reconnectionAttempts: 5,
            reconnectionDelay: 3000,
        };

        // If a token exists (user is logged in), send it for potential server-side authentication
        if (token) {
            socketOptions.auth = { token };
            console.log('[SocketContext] Connecting with auth token.');
        } else {
            console.log('[SocketContext] Connecting without auth token (for public viewers).');
        }

        const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001', socketOptions);
        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            console.log('[SocketContext] Connected successfully! Socket ID:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.warn('[SocketContext] Disconnected. Reason:', reason);
            setIsConnected(false);
        });

        newSocket.on('connect_error', (err) => {
            console.error('[SocketContext] Connection Error:', err.message, err.data || '');
            setIsConnected(false);
        });
        
        // Example listeners from your original file
        newSocket.on('serverEvent', (data) => {
            console.log('[SocketContext] Received serverEvent:', data);
            setLastMessage(data);
        });
        newSocket.on('incidentCreated', (incident) => console.log('[SocketContext] Incident Created:', incident));
        newSocket.on('incidentUpdated', (incident) => console.log('[SocketContext] Incident Updated:', incident));
        newSocket.on('incidentDeleted', (data) => console.log('[SocketContext] Incident Deleted:', data));
        newSocket.on('serviceStatusChanged', (service) => console.log('[SocketContext] Service Status Changed:', service));
        newSocket.on('serviceCreated', (data) => console.log('[SocketContext] ServiceCreated:', data));
        newSocket.on('serviceDeleted', (data) => console.log('[SocketContext] ServiceDeleted:', data));


        return () => {
            console.log('[SocketContext] useEffect cleanup: Disconnecting socket ID:', newSocket.id);
            newSocket.disconnect();
            newSocket.removeAllListeners();
            if (socketRef.current === newSocket) {
                socketRef.current = null;
            }
            setIsConnected(false);
        };
    }, [token, authLoading]); // Reconnect if token or authLoading state changes

    const sendMessage = (eventName, data) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit(eventName, data);
        } else {
            console.warn('[SocketContext] Socket not connected. Cannot send message:', eventName, data);
        }
    };

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected, sendMessage, lastMessage }}>
            {children}
        </SocketContext.Provider>
    );
};