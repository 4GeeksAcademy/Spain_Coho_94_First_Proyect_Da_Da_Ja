import { useNavigate, Link } from "react-router-dom";
import "./Styles/Navbar.css";
import { useTheme } from '../Contexts/ThemeContext.jsx';
import { useState, useEffect } from "react";

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Cambio del boton Login a Logout

  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("access_token"));


  // -----------------------BOTON LOGOUT-------------------------

  const LogoutButton = () => {
    localStorage.removeItem("access_token");
    console.log('Token eliminado:', localStorage.getItem("access_token")); 

    setIsLoggedIn(false);
    navigate("/login");
  };

  // busca en localStorage y actualizar el estado
  useEffect(() => {
    const checkLoginStatus = () => {

      
      setIsLoggedIn(!!localStorage.getItem("access_token"));
    };

    // Inicializa el estado cuando carga o cambia el token
    checkLoginStatus();

    // Listener para avisar de los cambios en localStorage

    window.addEventListener("storage", checkLoginStatus);

    // Limpiar el listener cuando el componente se quita
    return () => {
      window.removeEventListener("storage", checkLoginStatus);
    };
  }, []);

  return (
    <nav>
      <div className="nav-content">
        
        {/* a la izquierda los botones de navegación */}

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
  
        {/* en el centro el logo */}
        <div className="nav-center">
          <img
            src="https://raw.githubusercontent.com/4GeeksAcademy/Spain_Coho_94_First_Proyect_Da_Da_Ja/main/src/front/assets/logo.png"
            alt="Logo"
            className="logo-img"
          />
        </div>
  
        {/* a la derech los botones del usuario */}
        <div className="nav-right">
          <div className="nav_buttons">
            {!isLoggedIn ? (
              <>
                <Link to="/" className="nav-btn">Register</Link>
                <Link to="/login" className="nav-btn">Login</Link>
              </>
            ) : (
              <button className="nav-btn logout-btn" onClick={LogoutButton}>
                Cerrar sesión
              </button>
            )}
  
            {/* Botón de cambio de tema */}
            <button
              onClick={toggleTheme}
              className="nav-btn theme-btn"
              style={{
                backgroundColor: "var(--primary)",
                color: "white",
                borderRadius: "5px",
                padding: "5px 10px",
              }}
            >
              {theme === "light" ? "Oscuro" : "Claro"}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
};  
   export default Navbar;