import axios from 'axios';


const handleLogout = async () => {

    const currentTheme = localStorage.getItem('userTheme');

    try {
        const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
        const token = localStorage.getItem('access_token');

        if (token) {

            await axios.post(`${baseUrl}api/logout`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).catch(error => {
                console.log("Error al notificar logout al servidor:", error);

            });
        }
    } catch (error) {
        console.log("Error al notificar logout al servidor:", error);

    } finally {

        localStorage.removeItem('access_token');
        localStorage.removeItem('userData');


        if (currentTheme) {
            localStorage.setItem('userTheme', currentTheme);
        }


        window.dispatchEvent(new Event('userLoggedOut'));


        window.location.href = '/login';
    }
};

export default handleLogout;