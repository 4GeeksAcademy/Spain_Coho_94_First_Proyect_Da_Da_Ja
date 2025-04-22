import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import "../Styles/CustomerLogin.css";

const CustomerLogin = () => {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Estados
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [formError, setFormError] = useState("");
  const [submitStatus, setSubmitStatus] = useState({ status: "", message: "" });

  const baseUrl = import.meta.env.VITE_BACKEND_URL || "";

  // Obtener la redirección después del login (si existe)
  const redirectPath =
    new URLSearchParams(location.search).get("redirect") || "";

  // Cargar datos de la tienda
  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        setLoading(true);

        // Obtener datos de la tienda por su slug
        const storeApiUrl = baseUrl.endsWith("/")
          ? `${baseUrl}api/store/${storeSlug}`
          : `${baseUrl}/api/store/${storeSlug}`;

        const storeResponse = await axios.get(storeApiUrl);

        if (storeResponse.status === 200) {
          setStoreData(storeResponse.data);
        }
      } catch (err) {
        console.error("Error al cargar datos de la tienda:", err);
        setError("No se pudo cargar la tienda. Por favor, verifica la URL.");
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [storeSlug, baseUrl]);

  // Manejar cambios en los campos del formulario
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Limpiar error al escribir
    if (formError) {
      setFormError("");
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación básica
    if (!formData.email || !formData.password) {
      setFormError("Por favor, ingresa tu email y contraseña");
      return;
    }

    setSubmitStatus({ status: "loading", message: "Iniciando sesión..." });

    try {
      // En un entorno real, esta sería la llamada a la API para iniciar sesión
      // const apiUrl = baseUrl.endsWith('/')
      //  ? `${baseUrl}api/customer/login`
      //  : `${baseUrl}/api/customer/login`;

      // Para la demostración, verificaremos contra localStorage
      const customersData = JSON.parse(
        localStorage.getItem("store_customers") || "{}"
      );
      const storeCustomers = customersData[storeSlug] || [];

      // Buscar el cliente por email y contraseña
      const customer = storeCustomers.find(
        (c) => c.email === formData.email && c.password === formData.password
      );

      if (!customer) {
        setFormError("Email o contraseña incorrectos");
        setSubmitStatus({ status: "", message: "" });
        return;
      }

      // Simular un token de autenticación y guardarlo en localStorage
      const customerAuthData = {
        customerId: customer.id,
        customerName: `${customer.firstname} ${customer.lastname}`,
        customerEmail: customer.email,
        isLoggedIn: true,
        storeSlug,
      };

      // Guardar auth data en localStorage
      localStorage.setItem(
        `customer_auth_${storeSlug}`,
        JSON.stringify(customerAuthData)
      );

      // Respuesta exitosa
      setSubmitStatus({
        status: "success",
        message: `¡Bienvenido de nuevo, ${customer.firstname}!`,
      });

      // Redireccionar a la página correspondiente
      setTimeout(() => {
        if (redirectPath) {
          navigate(redirectPath);
        } else {
          navigate(`/tienda/${storeSlug}`);
        }
      }, 1000);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setFormError("Error al iniciar sesión. Por favor, intenta de nuevo.");
      setSubmitStatus({ status: "", message: "" });
    }
  };

  // Si hay un error, mostrar mensaje
  if (error) {
    return (
      <div className="store-error-container">
        <div className="store-error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button
            onClick={() => navigate(`/tienda/${storeSlug}`)}
            className="return-home-btn"
          >
            Volver a la tienda
          </button>
        </div>
      </div>
    );
  }

  // Si está cargando, mostrar spinner
  if (loading && !storeData) {
    return (
      <div className="store-loading-container">
        <div className="store-loading-spinner"></div>
        <p>Cargando tienda...</p>
      </div>
    );
  }

  // Si no hay datos de tienda, mostrar mensaje
  if (!storeData) {
    return (
      <div className="store-error-container">
        <div className="store-error-message">
          <h2>Tienda no disponible</h2>
          <p>No pudimos encontrar la tienda que buscas.</p>
          <button onClick={() => navigate("/")} className="return-home-btn">
            Volver a la página principal
          </button>
        </div>
      </div>
    );
  }

  // Aplicar el tema de la tienda
  const theme = storeData.theme || "default";

  return (
    <div className={`store-container theme-${theme}`}>
      {/* Header de la tienda */}
      <header className="store-header">
        <div className="store-branding">
          {storeData.logo_url ? (
            <img
              src={storeData.logo_url}
              alt={`Logo de ${storeData.store_name}`}
              className="store-logo"
            />
          ) : (
            <div className="store-logo-placeholder">
              {storeData.store_name?.substring(0, 2).toUpperCase() || "ST"}
            </div>
          )}
          <h1 className="store-name">{storeData.store_name}</h1>
        </div>

        <nav className="store-nav">
          <Link to={`/tienda/${storeSlug}`} className="nav-link">
            Inicio
          </Link>
          <Link to={`/tienda/${storeSlug}/catalogo`} className="nav-link">
            Catálogo
          </Link>
          <Link
            to={`/tienda/${storeSlug}/carrito`}
            className="nav-link cart-link"
          >
            <span className="cart-icon">🛒</span>
            <span className="cart-text">Carrito</span>
          </Link>
        </nav>
      </header>

      {/* Contenido del login */}
      <div className="customer-login-container">
        <h1 className="login-title">Iniciar sesión</h1>

        <div className="login-content">
          <div className="login-form-container">
            <form onSubmit={handleSubmit} className="login-form">
              {formError && <div className="form-error">{formError}</div>}

              {submitStatus.status === "success" && (
                <div className="form-success">{submitStatus.message}</div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-control"
                  autoComplete="email"
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
                  className="form-control"
                  autoComplete="current-password"
                />
              </div>

              <div className="form-check">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="form-check-input"
                />
                <label htmlFor="rememberMe" className="form-check-label">
                  Recordarme
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="login-button"
                  disabled={submitStatus.status === "loading"}
                >
                  {submitStatus.status === "loading"
                    ? "Iniciando sesión..."
                    : "Iniciar sesión"}
                </button>
              </div>

              <div className="forgot-password">
                <Link to={`/tienda/${storeSlug}/recuperar-password`}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <div className="register-link">
                ¿No tienes una cuenta?{" "}
                <Link to={`/tienda/${storeSlug}/registro`}>Regístrate</Link>
              </div>
            </form>
          </div>

          <div className="login-benefits">
            <h2>Beneficios de iniciar sesión</h2>
            <ul>
              <li>
                <div className="benefit-icon">⚡</div>
                <div className="benefit-text">
                  <h3>Compra más rápido</h3>
                  <p>Finaliza tus compras sin introducir tus datos cada vez.</p>
                </div>
              </li>
              <li>
                <div className="benefit-icon">📦</div>
                <div className="benefit-text">
                  <h3>Seguimiento de pedidos</h3>
                  <p>Consulta el estado de tus pedidos en cualquier momento.</p>
                </div>
              </li>
              <li>
                <div className="benefit-icon">📋</div>
                <div className="benefit-text">
                  <h3>Historial de compras</h3>
                  <p>Accede a todas tus compras anteriores.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer de la tienda */}
      <footer className="store-footer">
        <p>
          &copy; {new Date().getFullYear()} {storeData.store_name}. Todos los
          derechos reservados.
        </p>
        <p className="powered-by">
          Creado con ❤️ usando la plataforma de comercio electrónico
        </p>
      </footer>
    </div>
  );
};

export default CustomerLogin;
