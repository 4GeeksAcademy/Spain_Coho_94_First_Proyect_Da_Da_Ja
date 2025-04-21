import React, { useEffect, useState } from 'react';
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "./firebase";
import axios from "axios";

const NotificationHandler = () => {
    const [token, setToken] = useState('');

    // Función para enviar token al servidor
    const sendTokenToServer = async (fcmToken) => {
        const userId = localStorage.getItem('user_id');
        const accessToken = localStorage.getItem('access_token');

        try {
            const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
            const apiUrl = baseUrl.endsWith('/')
                ? `${baseUrl}api/register-device-token`
                : `${baseUrl}/api/register-device-token`;

            await axios.post(
                apiUrl,
                { token: fcmToken, user_id: userId },
                {
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            console.log('Token enviado al servidor correctamente');
        } catch (error) {
            console.error('Error al enviar token al servidor:', error);
        }
    };

    useEffect(() => {
        const requestPermissionAndToken = async () => {
            try {
                // Solicitar permiso
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    // Forzar la regeneración del token
                    const currentToken = await getToken(messaging, {
                        vapidKey: 'TU_CLAVE_PUBLICA_VAPID',
                        forceRefresh: true  // Forzar regeneración
                    });

                    if (currentToken) {
                        console.log('Token regenerado:', currentToken);
                        setToken(currentToken);
                        sendTokenToServer(currentToken);
                    }
                }
            } catch (error) {
                console.error('Error:', error);
            }
        };

        requestPermissionAndToken();

        // Configurar manejo de mensajes en primer plano
        const messageHandler = onMessage(messaging, (payload) => {
            console.log('Mensaje recibido en primer plano:', payload);
            // Mostrar notificación personalizada
            const title = payload.notification.title;
            const options = {
                body: payload.notification.body,
                icon: '/logo.png',
            };

            new Notification(title, options);
        });

        // Limpiar el listener al desmontar
        return () => {
            messageHandler();
        };
    }, []);

    return null; // Este componente no renderiza nada
};

export default NotificationHandler;