import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "../Styles/CustomerRegister.css";

const CustomerRegister = () => {
  const { storeSlug } = useParams();
  const navigate = useNavigate();

  // Estados
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zipcode: "",
    password: "",
    confirmPassword: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState({ status: "", message: "" });

  const baseUrl = import.meta.env.VITE_BACKEND_URL || "";

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
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Limpiar errores al escribir
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Validar formulario
  const validateForm = () => {
    const errors = {};

    // Validar nombre
    if (!formData.firstname.trim()) {
      errors.firstname = "El nombre es obligatorio";
    }

    // Validar apellido
    if (!formData.lastname.trim()) {
      errors.lastname = "El apellido es obligatorio";
    }

    // Validar email
    if (!formData.email.trim()) {
      errors.email = "El email es obligatorio";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email no válido";
    }

    // Validar teléfono (opcional pero debe tener formato correcto si se proporciona)
    if (formData.phone && !/^\d{9,}$/.test(formData.phone.replace(/\s/g, ""))) {
      errors.phone = "Número de teléfono no válido";
    }

    // Validar dirección
    if (!formData.address.trim()) {
      errors.address = "La dirección es obligatoria";
    }

    // Validar ciudad
    if (!formData.city.trim()) {
      errors.city = "La ciudad es obligatoria";
    }

    // Validar código postal
    if (!formData.zipcode.trim()) {
      errors.zipcode = "El código postal es obligatorio";
    } else if (!/^\d{5}$/.test(formData.zipcode.replace(/\s/g, ""))) {
      errors.zipcode = "Código postal no válido";
    }

    // Validar contraseña
    if (!formData.password) {
      errors.password = "La contraseña es obligatoria";
    } else if (formData.password.length < 6) {
      errors.password = "La contraseña debe tener al menos 6 caracteres";
    }

    // Validar confirmación de contraseña
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Las contraseñas no coinciden";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar formulario
    if (!validateForm()) {
      setSubmitStatus({
        status: "error",
        message: "Por favor, corrige los errores en el formulario",
      });
      return;
    }

    setSubmitStatus({ status: "loading", message: "Enviando datos..." });

    try {
      // En un entorno real, esta sería la llamada a la API para registrar al cliente
      // const apiUrl = baseUrl.endsWith('/')
      //  ? `${baseUrl}api/customer/register`
      //  : `${baseUrl}/api/customer/register`;

      // Para la demostración, usaremos localStorage
      const customersData = JSON.parse(
        localStorage.getItem("store_customers") || "{}"
      );

      // Guardar por store_slug
      if (!customersData[storeSlug]) {
        customersData[storeSlug] = [];
      }

      // Crear nuevo cliente
      const newCustomer = {
        id: Date.now(), // Simulamos un ID único
        storeSlug,
        ...formData,
        registrationDate: new Date().toISOString(),
        // No guardar la contraseña en texto plano en un entorno real!
        // Aquí lo hacemos solo para simular el registro
      };

      // Quitar la confirmación de contraseña
      delete newCustomer.confirmPassword;

      // Guardar en el array de clientes de la tienda
      customersData[storeSlug].push(newCustomer);

      // Guardar en localStorage
      localStorage.setItem("store_customers", JSON.stringify(customersData));

      // Respuesta exitosa
      setSubmitStatus({
        status: "success",
        message: "¡Registro exitoso! Ahora puedes iniciar sesión.",
      });

      // Resetear formulario
      setFormData({
        firstname: "",
        lastname: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        zipcode: "",
        password: "",
        confirmPassword: "",
      });

      // Redireccionar al login después de 2 segundos
      setTimeout(() => {
        navigate(`/tienda/${storeSlug}/login`);
      }, 2000);
    } catch (error) {
      console.error("Error al registrar cliente:", error);
      setSubmitStatus({
        status: "error",
        message: "Error al registrar. Por favor, intenta de nuevo.",
      });
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

      {/* Contenido del registro */}
      <div className="customer-register-container">
        <h1 className="register-title">Crear una cuenta</h1>

        <div className="register-content">
          <div className="register-form-container">
            <form onSubmit={handleSubmit} className="register-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstname">Nombre*</label>
                  <input
                    type="text"
                    id="firstname"
                    name="firstname"
                    value={formData.firstname}
                    onChange={handleChange}
                    className={`form-control ${
                      formErrors.firstname ? "is-invalid" : ""
                    }`}
                  />
                  {formErrors.firstname && (
                    <div className="error-message">{formErrors.firstname}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="lastname">Apellido*</label>
                  <input
                    type="text"
                    id="lastname"
                    name="lastname"
                    value={formData.lastname}
                    onChange={handleChange}
                    className={`form-control ${
                      formErrors.lastname ? "is-invalid" : ""
                    }`}
                  />
                  {formErrors.lastname && (
                    <div className="error-message">{formErrors.lastname}</div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email*</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`form-control ${
                      formErrors.email ? "is-invalid" : ""
                    }`}
                  />
                  {formErrors.email && (
                    <div className="error-message">{formErrors.email}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Teléfono</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`form-control ${
                      formErrors.phone ? "is-invalid" : ""
                    }`}
                  />
                  {formErrors.phone && (
                    <div className="error-message">{formErrors.phone}</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">Dirección*</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={`form-control ${
                    formErrors.address ? "is-invalid" : ""
                  }`}
                />
                {formErrors.address && (
                  <div className="error-message">{formErrors.address}</div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">Ciudad*</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className={`form-control ${
                      formErrors.city ? "is-invalid" : ""
                    }`}
                  />
                  {formErrors.city && (
                    <div className="error-message">{formErrors.city}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="zipcode">Código Postal*</label>
                  <input
                    type="text"
                    id="zipcode"
                    name="zipcode"
                    value={formData.zipcode}
                    onChange={handleChange}
                    className={`form-control ${
                      formErrors.zipcode ? "is-invalid" : ""
                    }`}
                  />
                  {formErrors.zipcode && (
                    <div className="error-message">{formErrors.zipcode}</div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">Contraseña*</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`form-control ${
                      formErrors.password ? "is-invalid" : ""
                    }`}
                  />
                  {formErrors.password && (
                    <div className="error-message">{formErrors.password}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirmar Contraseña*</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`form-control ${
                      formErrors.confirmPassword ? "is-invalid" : ""
                    }`}
                  />
                  {formErrors.confirmPassword && (
                    <div className="error-message">
                      {formErrors.confirmPassword}
                    </div>
                  )}
                </div>
              </div>

              {submitStatus.status === "error" && (
                <div className="submit-error">{submitStatus.message}</div>
              )}

              {submitStatus.status === "success" && (
                <div className="submit-success">{submitStatus.message}</div>
              )}

              <div className="form-actions">
                <button
                  type="submit"
                  className="register-button"
                  disabled={submitStatus.status === "loading"}
                >
                  {submitStatus.status === "loading"
                    ? "Registrando..."
                    : "Crear cuenta"}
                </button>
              </div>

              <div className="login-link">
                ¿Ya tienes una cuenta?{" "}
                <Link to={`/tienda/${storeSlug}/login`}>Iniciar sesión</Link>
              </div>
            </form>
          </div>

          <div className="register-benefits">
            <h2>Beneficios de registrarte</h2>
            <ul>
              <li>
                <div className="benefit-icon">🛒</div>
                <div className="benefit-text">
                  <h3>Compras más rápidas</h3>
                  <p>No tendrás que introducir tus datos en cada compra.</p>
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
                <div className="benefit-icon">💰</div>
                <div className="benefit-text">
                  <h3>Ofertas exclusivas</h3>
                  <p>
                    Recibe descuentos y promociones exclusivas para clientes
                    registrados.
                  </p>
                </div>
              </li>
              <li>
                <div className="benefit-icon">❤️</div>
                <div className="benefit-text">
                  <h3>Lista de deseos</h3>
                  <p>Guarda productos para comprarlos más tarde.</p>
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

export default CustomerRegister;
