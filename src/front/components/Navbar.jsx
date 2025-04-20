import { useNavigate, Link } from "react-router-dom";
import "./Styles/Navbar.css"; 
import { useTheme } from '../Contexts/ThemeContext.jsx';
import { useState, useEffect } from "react";

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("access_token"));


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
  const LogoutButton = () => {
    localStorage.removeItem("access_token");
    console.log('Token eliminado:', localStorage.getItem("access_token"));
    setIsLoggedIn(false);
    navigate("/login");
  };

  useEffect(() => {
    const checkLoginStatus = () => {
      setIsLoggedIn(!!localStorage.getItem("access_token"));
    };

    checkLoginStatus();
    window.addEventListener("storage", checkLoginStatus);

    return () => {
      window.removeEventListener("storage", checkLoginStatus);
    };
  }, []);

  return (
    <nav>
      <div className="nav-content">

        {/* A la izquierda los botones de navegación */}
        <div className="nav-left">
          <Link to="/home" className="nav-btn">Home</Link>
          {isLoggedIn && (
            <>
              <Link to="/inventory" className="nav-btn">Inventario</Link>
              <Link to="/admin/store-settings" className="nav-btn">Datos del Comercio</Link>
              <Link to="/cart" className="nav-btn">Cart</Link>
            </>
          )}
        </div>

        {/* En el centro el logo */}
        <div className="nav-center">
          <div className="logo-wrapper">
            <img
              src="https://github.com/4GeeksAcademy/Spain_Coho_94_First_Proyect_Da_Da_Ja/blob/Dani_Dev2-(img-url)/src/front/assets/Store4Us-Logo.png?raw=true"
              alt="Logo"
              className="logo-img"
            />
          </div>
        </div>

        {/* A la derecha los botones del usuario */}

        <div className="nav-right">
    
            <span className="wellcome-text">Hola, Dani</span>
          

            <button onClick={toggleTheme} className="nav-theme">
              {theme === "light" ? "Oscuro" : "Claro"}
            </button>

              <div className="user-login">
              {!isLoggedIn ? (
                <>
                  <Link to="/" className="nav-btn">Register</Link>
                  <Link to="/login" className="nav-btn">Login</Link>
                </>
              ) : (
                <button className="nav-btn" onClick={LogoutButton}>
                  Cerrar sesión
                </button>
              )}
              </div>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
