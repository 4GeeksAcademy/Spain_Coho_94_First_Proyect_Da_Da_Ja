import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Styles/Register.css";
import ErrorMessage1 from "../components/ErrorMessage1";
import ErrorMessage2 from "../components/ErrorMessage2";

function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [shopname, setShopname] = useState("");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    const navigate = useNavigate();

    // redireccionar al registro
    const handleLoginClick = (e) => {
        e.preventDefault();
        navigate('/login');
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        if (!email || !password || !firstname || !lastname || !shopname) {
            setMessage("Por favor, completa todos los campos.");
            setMessageType("error2");
            return;
        }

        const requestData = { email, password, firstname, lastname, shopname };
        console.log("Datos enviados al backend:", requestData);

        try {
            // Verificar URL del backend
            const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
            const apiUrl = backendUrl.endsWith('/') ? `${backendUrl}api/signup` : `${backendUrl}/api/signup`;
            console.log("URL de registro:", apiUrl);

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestData)
            });

            // Intenta obtener la respuesta JSON
            let data;
            try {
                data = await response.json();
                console.log("Respuesta del servidor:", data);
            } catch (jsonError) {
                console.error("Error al parsear JSON:", jsonError);
                data = { error: "Formato de respuesta inválido" };
            }

            if (response.ok) {
                // Guardar token y datos del usuario
                localStorage.setItem("access_token", data.access_token);

                // Preparar y guardar los datos del usuario
                const userData = {
                    firstname: firstname,
                    lastname: lastname,
                    shopname: shopname,
                    email: email,
                    // Usar datos adicionales si están disponibles en la respuesta
                    ...(data.user || {})
                };

                localStorage.setItem("userData", JSON.stringify(userData));

                // Notificar a otros componentes
                window.dispatchEvent(new Event('userLoggedIn'));

                // Disparar evento de storage para notificar cambios
                window.dispatchEvent(new StorageEvent('storage', {
                    key: 'userData',
                    newValue: JSON.stringify(userData)
                }));

                navigate("/home"); 
            } else {
                console.error("Error en respuesta:", {
                    status: response.status,
                    statusText: response.statusText,
                    data: data
                });

                if (response.status === 403) {
                    setMessage("El usuario ya existe");
                } else if (response.status === 400) {
                    setMessage(data.msg || "La solicitud es incorrecta");
                } else if (response.status === 500) {
                    setMessage(data.msg || "Error interno del servidor");
                } else {
                    setMessage(data.error || data.msg || "Hubo un problema con el registro");
                }
                setMessageType("error");
            }
        } catch (error) {
            console.error("Error detallado:", error);
            setMessage(`Error de conexión: ${error.message}`);
            setMessageType("error");
        }
    };

    const handleMessageClose = () => {
        setMessage("");
        setMessageType("");
    };

    return (
        <div className="register">
            {message && (
                <div className={`reg-message-box ${messageType}`}>
                    {messageType === "error" && <ErrorMessage1 text={message} onClose={handleMessageClose} />}
                    {messageType === "error2" && <ErrorMessage2 text={message} onClose={handleMessageClose} />}
                </div>
            )}

            <form onSubmit={handleRegister} className="reg-form-content">
                <h2 className="reg-title">Crear cuenta</h2>

                <div className="reg-field">
                    <input
                        type="text"
                        id="firstname"
                        value={firstname}
                        onChange={(e) => setFirstname(e.target.value)}
                        required
                    />
                    <label htmlFor="firstname">Nombre</label>
                </div>

                <div className="reg-field">
                    <input
                        type="text"
                        id="lastname"
                        value={lastname}
                        onChange={(e) => setLastname(e.target.value)}
                        required
                    />
                    <label htmlFor="lastname">Apellido</label>
                </div>

                <div className="reg-field">
                    <input
                        type="text"
                        id="shopname"
                        value={shopname}
                        onChange={(e) => setShopname(e.target.value)}
                        required
                    />
                    <label htmlFor="shopname">Nombre de la tienda</label>
                </div>

                <div className="reg-field">
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <label htmlFor="email">Correo electrónico</label>
                </div>

                <div className="reg-field">
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <label htmlFor="password">Contraseña</label>
                </div>

                <button type="submit" className="reg-btn">Registrarse</button>
                
                <div className="login-link">
                    <p>
                        ¿Ya tienes cuenta? <a href="#" onClick={handleLoginClick}>Entra aquí</a>
                    </p>
                </div>
            </form>
        </div>
    );
}

export default Register;