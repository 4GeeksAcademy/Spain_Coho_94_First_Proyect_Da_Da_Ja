import { useNavigate, Link } from "react-router-dom";
import "./Styles/Navbar.css";
import { useTheme } from '../Contexts/ThemeContext.jsx';
import { useState, useEffect } from "react";

// URLs para los logos según el tema
const LIGHT_THEME_LOGO = "https://github.com/4GeeksAcademy/Spain_Coho_94_First_Proyect_Da_Da_Ja/blob/Dani_Dev2-(img-url)/src/front/assets/Store4Us-Logo.png?raw=true";
const DARK_THEME_LOGO = "https://github.com/4GeeksAcademy/Spain_Coho_94_First_Proyect_Da_Da_Ja/blob/Dani_Dev2-(img-url)/src/front/assets/Store4Us-Dark.png?raw=true";

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("access_token"));
  const [userName, setUserName] = useState("");

  // Logo segun el tema actual
  const currentLogo = theme === "light" ? LIGHT_THEME_LOGO : DARK_THEME_LOGO;

  // Función para obtener el nombre del usuario
  const getUserName = () => {
    try {
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      if (userData.firstname) {
        return userData.firstname;
      }
      return "";
    } catch (error) {
      console.error("Error al obtener el nombre del usuario:", error);
      return "";
    }
  };

  // -----------------------BOTON LOGOUT-------------------------
  const handleLogout = () => {

    const currentTheme = localStorage.getItem('userTheme');

    // Limpiar datos de sesión
    localStorage.removeItem("access_token");
    localStorage.removeItem("userData");

    // Restaurar el tema guardado
    if (currentTheme) {
      localStorage.setItem('userTheme', currentTheme);
    }

    setIsLoggedIn(false);
    navigate("/home");
  };

  useEffect(() => {
    const checkLoginStatus = () => {
      const hasToken = !!localStorage.getItem("access_token");
      setIsLoggedIn(hasToken);

      if (hasToken) {
        setUserName(getUserName());
      } else {
        setUserName("");
      }
    };

    checkLoginStatus();

    // Escuchar eventos de cambio de almacenamiento
    window.addEventListener("storage", checkLoginStatus);
    window.addEventListener("userLoggedIn", checkLoginStatus);
    window.addEventListener("userLoggedOut", checkLoginStatus);

    return () => {
      window.removeEventListener("storage", checkLoginStatus);
      window.removeEventListener("userLoggedIn", checkLoginStatus);
      window.removeEventListener("userLoggedOut", checkLoginStatus);
    };
  }, []);

  return (
    <nav>
      <div className="nav-content">

        {/* el logo */}
        <div className="nav-left">
          <div className="logo-wrapper">
            <img
              src={currentLogo}
              alt="Logo"
              className="logo-img"
            />
          </div>
        </div>

        {/* A la izquierda los botones de navegación */}
        <div className="nav-center">
          <Link to="/home" className="nav-btn">Home</Link>

          <Link to="/inventory" className="nav-btn">Inventario</Link>
          <Link to="/store-settings" className="nav-btn">Datos del Comercio</Link>
          <Link to="/Profile" className="nav-btn">Menu</Link>


        </div>

        {/* A la derecha los botones del usuario */}
        <div className="nav-right">
          <button onClick={toggleTheme} className="nav-btn theme-btn">
            {theme === "light" ? "Oscuro" : "Claro"}
          </button>

          <div className="user-login">
            {!isLoggedIn ? (
              <>
                <Link to="/" className="nav-btn">Register</Link>
                <Link to="/login" className="nav-btn">Login</Link>
              </>
            ) : (
              <div className="user-logout-container">
                {userName && (
                  <span className="welcome-text">¡Hola, {userName}!</span>
                )}
                <button className="nav-btn" onClick={handleLogout}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;