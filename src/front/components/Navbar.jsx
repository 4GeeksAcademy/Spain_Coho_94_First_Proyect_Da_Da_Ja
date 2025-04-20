import { useNavigate, Link } from "react-router-dom";
import "./Styles/Navbar.css";
import { useTheme } from '../Contexts/ThemeContext.jsx';
import { useState, useEffect } from "react";

const Navbar = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("access_token"));
  const [userName, setUserName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Función de logout
  const handleLogout = () => {
    const currentTheme = localStorage.getItem('userTheme');
    localStorage.removeItem("access_token");
    localStorage.removeItem("userData");
    
    if (currentTheme) {
      localStorage.setItem('userTheme', currentTheme);
    }
    
    setIsLoggedIn(false);
    setSidebarOpen(false);
    navigate("/login");
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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
    <>
      <nav className="navbar">
        <div className="navbar-container">
          {/* Logo en el centro para pantallas pequeñas, a la izquierda para pantallas grandes */}
          <div className="navbar-logo">
            <Link to="/home">
              <img
                src="https://github.com/4GeeksAcademy/Spain_Coho_94_First_Proyect_Da_Da_Ja/blob/Dani_Dev2-(img-url)/src/front/assets/Store4Us-Logo.png?raw=true"
                alt="Logo"
                className="logo-img"
              />
            </Link>
          </div>

          {/* Navegación principal - Home y Carrito son los únicos que permanecen en la barra */}
          <div className="navbar-links">
            <Link to="/home" className="nav-link">Home</Link>
            {isLoggedIn && (
              <Link to="/cart" className="nav-link">Cart</Link>
            )}
          </div>

          {/* Menú de usuario */}
          <div className="navbar-user">
            {!isLoggedIn ? (
              <div className="auth-links">
                <Link to="/" className="nav-link">Register</Link>
                <Link to="/login" className="nav-link">Login</Link>
              </div>
            ) : (
              <div className="user-menu">
                <span className="welcome-text">¡Hola, {userName}!</span>
                <button onClick={toggleSidebar} className="user-menu-button">
                  &#128100; {/* Emoji de usuario */}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Sidebar para opciones de usuario */}
      {isLoggedIn && (
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <span>Menú de Usuario</span>
            <button onClick={toggleSidebar} className="close-button">×</button>
          </div>
          <div className="sidebar-content">
            <Link to="/profile" className="sidebar-link">Datos de Usuario</Link>
            <Link to="/admin/store-settings" className="sidebar-link">Datos de la Tienda</Link>
            <Link to="/inventory" className="sidebar-link">Inventario</Link>
            <div className="sidebar-link">
              <span>Tema: </span>
              <select 
                value={theme} 
                onChange={(e) => {
                  const themeContext = document.querySelector('[data-theme]');
                  if (themeContext) {
                    document.documentElement.setAttribute('data-theme', e.target.value);
                    localStorage.setItem('userTheme', e.target.value);
                  }
                }}
                className="theme-select"
              >
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
              </select>
            </div>
            <button onClick={handleLogout} className="logout-button">
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Overlay para cerrar el sidebar al hacer clic fuera */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
    </>
  );
};

export default Navbar;