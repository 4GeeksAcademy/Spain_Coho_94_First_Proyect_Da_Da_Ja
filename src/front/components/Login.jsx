import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Styles/Login.css';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const baseUrl = import.meta.env.VITE_BACKEND_URL || '';

    // Verificar si ya hay sesión activa
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            navigate('/home');
        }
    }, [navigate]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Realizar petición de login
            const response = await axios.post(`${baseUrl}api/login`, formData);
            
            // Guardar token
            localStorage.setItem('access_token', response.data.access_token);
            
            // Preservar el tema actual si existe
            const currentTheme = localStorage.getItem('userTheme');
            
            // Inicializar userData con los datos de usuario de la respuesta
            let userData = response.data.user || {};
            
            // Conservar el tema si existe
            if (currentTheme) {
                userData.theme = currentTheme;
            }
            
            // Intentar extraer más información del token si es necesario
            try {
                const token = response.data.access_token;
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                
                const tokenData = JSON.parse(jsonPayload);
                
                // Si se encuentran claves adicionales en el token, guardarlas
                if (tokenData) {
                    // No sobrescribir datos que ya están en userData
                    if (!userData.email && tokenData.email) userData.email = tokenData.email;
                    if (!userData.firstname && tokenData.firstname) userData.firstname = tokenData.firstname;
                    if (!userData.lastname && tokenData.lastname) userData.lastname = tokenData.lastname;
                    if (!userData.shopname && tokenData.shopname) userData.shopname = tokenData.shopname;
                }
            } catch (error) {
                console.error("Error decodificando token:", error);
            }
            
            // Guardar en localStorage
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Asegurarse de que el tema también se guarde en userTheme
            if (userData.theme) {
                localStorage.setItem('userTheme', userData.theme);
            }
            
            // Disparar eventos para actualizar la UI
            window.dispatchEvent(new Event('userLoggedIn'));
            
            // Disparar evento de storage para notificar cambios
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'userData',
                newValue: JSON.stringify(userData)
            }));
            
            // Redirigir al home
            navigate('/home');
            
        } catch (error) {
            console.error('Error de login:', error);
            
            // Mostrar mensaje de error adecuado
            if (error.response && error.response.data && error.response.data.error) {
                setError(error.response.data.error);
            } else if (error.message === 'Network Error') {
                setError('Error de conexión con el servidor. Verifica tu conexión e inténtalo de nuevo.');
            } else {
                setError('Error al iniciar sesión. Inténtalo de nuevo.');
            }
            
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-form">
                <h2>Iniciar Sesión</h2>
                
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </form>
                
                <div className="register-link">
                    <p>
                        ¿No tienes cuenta? <a href="/">Regístrate aquí</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;