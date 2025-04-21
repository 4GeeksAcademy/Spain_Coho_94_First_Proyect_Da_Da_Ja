import React, { useEffect, useState } from 'react';
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "./firebase";
import axios from "axios";

const NotificationHandler = () => {
    const [token, setToken] = useState('');

    const sendTokenToServer = async (fcmToken) => {
        const accessToken = localStorage.getItem('access_token');

        try {
            const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
            const apiUrl = baseUrl.endsWith('/')
                ? `${baseUrl}api/register-device-token`
                : `${baseUrl}/api/register-device-token`;

            await axios.post(apiUrl, { token: fcmToken }, {
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                }
            });

            console.log('Token enviado al servidor correctamente');
            localStorage.setItem('fcm_token_registered', 'true');
        } catch (error) {
            console.error('Error al enviar token al servidor:', error);
            if (error.response?.status >= 500 || !error.response) {
                setTimeout(() => sendTokenToServer(fcmToken), 60000);
            }
        }
    };

    useEffect(() => {
        const requestPermissionAndToken = async () => {
            if (!('Notification' in window)) {
                console.log('Este navegador no soporta notificaciones');
                return;
            }

            if (Notification.permission === 'denied') {
                console.log('El usuario ha denegado los permisos de notificación');
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('Permiso de notificaciones no concedido');
                return;
            }

            try {
                const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

                const currentToken = await getToken(messaging, {
                    vapidKey: vapidKey,
                    forceRefresh: true
                });

                if (currentToken) {
                    console.log('Token FCM obtenido:', currentToken);
                    setToken(currentToken);

                    if (localStorage.getItem('access_token')) {
                        sendTokenToServer(currentToken);
                    } else {
                        localStorage.setItem('pending_fcm_token', currentToken);
                        console.log('Token guardado para envío después del login');
                    }
                } else {
                    console.log('No se pudo obtener el token.');
                }
            } catch (error) {
                console.error('Error al obtener token FCM:', error);
            }
        };

        const tokenRegistered = localStorage.getItem('fcm_token_registered');
        if (!tokenRegistered) {
            requestPermissionAndToken();
        }

        let messageHandler;
        try {
            messageHandler = onMessage(messaging, (payload) => {
                console.log('Mensaje recibido en primer plano:', payload);
                try {
                    if (payload.notification) {
                        const title = payload.notification.title || 'Nueva notificación';
                        const options = {
                            body: payload.notification.body || '',
                            icon: '/logo.png',
                            data: payload.data || {},
                            actions: [{ action: 'view', title: 'Ver' }],
                            requireInteraction: true,
                            silent: false
                        };

                        const notification = new Notification(title, options);
                        notification.onclick = (event) => {
                            event.preventDefault();
                            window.focus();
                            notification.close();
                            if (payload.data?.url) {
                                window.location.href = payload.data.url;
                            }
                        };
                    }
                } catch (notifError) {
                    console.error('Error al mostrar notificación:', notifError);
                }
            });
        } catch (listenerError) {
            console.error('Error al configurar el listener de mensajes:', listenerError);
        }

        return () => {
            if (messageHandler) messageHandler();
        };
    }, []);

    useEffect(() => {
        const checkPendingToken = () => {
            const pendingToken = localStorage.getItem('pending_fcm_token');
            const isLoggedIn = localStorage.getItem('access_token');

            if (pendingToken && isLoggedIn) {
                console.log('Enviando token pendiente al servidor después del login');
                sendTokenToServer(pendingToken);
                localStorage.removeItem('pending_fcm_token');
            }
        };

        checkPendingToken();
        window.addEventListener('userLoggedIn', checkPendingToken);
        window.addEventListener('storage', checkPendingToken);

        return () => {
            window.removeEventListener('userLoggedIn', checkPendingToken);
            window.removeEventListener('storage', checkPendingToken);
        };
    }, []);

    return null;
};

export default NotificationHandler;
