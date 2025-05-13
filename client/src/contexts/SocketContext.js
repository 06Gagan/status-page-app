import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const { user, token, loading: authLoading } = useAuth();
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);

    useEffect(() => {
        // Do nothing if auth is still loading, wait for user/token to be definitive
        if (authLoading) {
            console.log('[SocketContext] Auth is loading, waiting to initialize socket.');
            return;
        }

        if (user && token) {
            // If there's an existing socket, disconnect it first before creating a new one
            // This can happen if user/token changes while a socket is active
            if (socketRef.current) {
                console.log('[SocketContext] User/token changed, disconnecting previous socket.');
                socketRef.current.disconnect();
                socketRef.current.removeAllListeners(); // Clean up old listeners
                socketRef.current = null;
                setIsConnected(false);
            }

            console.log('[SocketContext] User and token found, attempting to connect socket...');
            const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001', {
                auth: { token },
                reconnectionAttempts: 5,
                reconnectionDelay: 3000,
            });

            socketRef.current = newSocket; // Store the new socket instance

            newSocket.on('connect', () => {
                console.log('[SocketContext] Connected successfully! Socket ID:', newSocket.id);
                setIsConnected(true);
            });

            newSocket.on('disconnect', (reason) => {
                console.warn('[SocketContext] Disconnected. Reason:', reason);
                setIsConnected(false);
                // The socket instance is disconnected; its listeners are no longer active.
                // We don't nullify socketRef.current here as the effect cleanup will handle the ref for *this* instance.
            });

            newSocket.on('connect_error', (err) => {
                console.error('[SocketContext] Connection Error:', err.message, err.data || '');
                setIsConnected(false);
                // Similar to 'disconnect', let cleanup manage the ref for this instance.
            });

            newSocket.on('serverEvent', (data) => {
                console.log('[SocketContext] Received serverEvent:', data);
                setLastMessage(data);
            });

            newSocket.on('incidentCreated', (incident) => {
                console.log('[SocketContext] Incident Created:', incident);
            });
            newSocket.on('incidentUpdated', (incident) => {
                console.log('[SocketContext] Incident Updated:', incident);
            });
            newSocket.on('incidentDeleted', (data) => {
                console.log('[SocketContext] Incident Deleted:', data);
            });
            newSocket.on('serviceStatusChanged', (service) => {
                console.log('[SocketContext] Service Status Changed:', service);
            });

            // Cleanup function for *this specific newSocket instance*
            return () => {
                console.log('[SocketContext] useEffect cleanup: Disconnecting socket ID:', newSocket.id);
                newSocket.disconnect();
                newSocket.removeAllListeners(); // Important to remove listeners from this instance
                
                // Only nullify socketRef.current if it's still pointing to this instance
                // This prevents nullifying a newer socket if one was created rapidly
                if (socketRef.current === newSocket) {
                    socketRef.current = null;
                }
                setIsConnected(false); // Ensure connection status is false on cleanup
            };

        } else {
            // No user or token (e.g., logged out, or initial load before auth is ready)
            // If there's an existing socket, disconnect it.
            if (socketRef.current) {
                console.log('[SocketContext] No user/token, disconnecting existing socket.');
                socketRef.current.disconnect();
                socketRef.current.removeAllListeners();
                socketRef.current = null;
                setIsConnected(false);
            }
            console.log('[SocketContext] No user or token, socket connection skipped/closed.');
        }
    }, [user, token, authLoading]); // Dependencies: user, token, and authLoading

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
