import axios from 'axios';

// Función de logout que puede ser utilizada en cualquier componente
const handleLogout = async () => {
    // Guardar el tema actual antes de cerrar sesión
    const currentTheme = localStorage.getItem('userTheme');

    try {
        const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
        const token = localStorage.getItem('access_token');

        if (token) {
            // Opcionalmente notificar al backend sobre el logout
            await axios.post(`${baseUrl}api/logout`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).catch(error => {
                console.log("Error al notificar logout al servidor:", error);
                // Continuar con el logout aunque falle la comunicación con el servidor
            });
        }
    } catch (error) {
        console.log("Error al notificar logout al servidor:", error);
        // Continuar con el logout aunque falle la comunicación con el servidor
    } finally {
        // Limpiar datos de sesión
        localStorage.removeItem('access_token');
        localStorage.removeItem('userData');
        
        // Restaurar el tema guardado si existe
        if (currentTheme) {
            localStorage.setItem('userTheme', currentTheme);
        }
        
        // Informar a los componentes sobre el cambio
        window.dispatchEvent(new Event('userLoggedOut'));
        
        // Redireccionar al login
        window.location.href = '/login';
    }
};

export default handleLogout;