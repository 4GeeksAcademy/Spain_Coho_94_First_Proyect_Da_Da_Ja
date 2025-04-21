import React, { useEffect, useState } from 'react';
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../firebase";
import axios from "axios";

const NotificationHandler = () => {
  const [token, setToken] = useState('');
  
  useEffect(() => {
    // Solicitar permiso para notificaciones
    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          console.log('Se concedió el permiso de notificación');
          
          // Obtener FCM token
          const currentToken = await getToken(messaging, {
            vapidKey: 'TU_CLAVE_PUBLICA_VAPID'
          });
          
          if (currentToken) {
            console.log('Token actual:', currentToken);
            setToken(currentToken);
            
            // Enviar token al backend
            sendTokenToServer(currentToken);
          } else {
            console.log('No se ha podido obtener token');
          }
        } else {
          console.log('Permiso de notificación denegado');
        }
      } catch (error) {
        console.error('Error al solicitar permiso:', error);
      }
    };
    
    requestPermission();
    
    // Configurar manejo de mensajes en primer plano
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Mensaje recibido en primer plano:', payload);
      // Mostrar notificación personalizada
      const title = payload.notification.title;
      const options = {
        body: payload.notification.body,
        icon: '/logo.png',
      };
      
      new Notification(title, options);
    });
    
    return () => {
      unsubscribe(); // Limpiar el listener al desmontar
    };
  }, []);
  
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
  
  return null; // Este componente no renderiza nada
};

export default NotificationHandler;