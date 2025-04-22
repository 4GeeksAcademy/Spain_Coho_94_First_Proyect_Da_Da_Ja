import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import "../Styles/StoreSettings.css";

const StoreSettings = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isNewStore, setIsNewStore] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [storeData, setStoreData] = useState({
    storename: "",
    description: "",
    bankaccount: "",
    shopurl: "",
    storeemail: "",
    phone: "",
    theme: "default",
    logourl: "",
  });

  const baseUrl = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    // Verificar si el usuario está autenticado
    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    setIsAuthenticated(true);
    checkExistingStore();
  }, []);

  const checkExistingStore = async () => {
    try {
      const apiUrl = baseUrl.endsWith("/")
        ? `${baseUrl}api/store/store-info`
        : `${baseUrl}/api/store/store-info`;

      const response = await axios.get(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data) {
        // Si la tienda ya existe, cargar sus datos
        setStoreData({
          storename: response.data.storename || "",
          description: response.data.description || "",
          bankaccount: response.data.bankaccount || "",
          shopurl: response.data.shopurl || "",
          storeemail: response.data.storeemail || "",
          phone: response.data.phone || "",
          theme: response.data.theme || "default",
          logourl: response.data.logourl || "",
        });
        setIsNewStore(false);
      } else {
        setIsNewStore(true);
      }
    } catch (error) {
      console.error("Error al verificar la tienda:", error);
      // Si hay un error, asumir que es una nueva tienda
      setIsNewStore(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStoreData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const generateShopUrl = (storename) => {
    return storename
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-") // Reemplaza espacios con guiones
      .replace(/[^\w\-]/g, ""); // Elimina caracteres especiales
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      // Generar shopurl si no existe
      const shopUrl = storeData.shopurl || generateShopUrl(storeData.storename);

      // Preparar los datos a enviar
      const dataToSend = {
        storename: storeData.storename,
        description: storeData.description,
        bankaccount: storeData.bankaccount,
        shopurl: shopUrl,
        storeemail: storeData.storeemail,
        phone: storeData.phone,
        theme: storeData.theme,
        logourl: storeData.logourl,
      };

      // Construir la URL correctamente
      const apiUrl = baseUrl.endsWith("/")
        ? `${baseUrl}api/store/${isNewStore ? "create-store" : "update-store"}`
        : `${baseUrl}/api/store/${
            isNewStore ? "create-store" : "update-store"
          }`;

      const response = await axios.post(apiUrl, dataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 201 || response.status === 200) {
        // Actualizar datos de tienda y estado
        setStoreData((prev) => ({
          ...prev,
          shopurl: response.data.store.shopurl || shopUrl,
        }));

        // Actualizar estado de tienda
        setIsNewStore(false);

        // Actualizar datos de usuario en localStorage
        const userData = JSON.parse(localStorage.getItem("userData") || "{}");
        userData.shopname = storeData.storename;
        localStorage.setItem("userData", JSON.stringify(userData));

        setMessage({
          text: isNewStore
            ? "Tienda creada correctamente"
            : "Datos del comercio actualizados correctamente",
          type: "success",
        });
      }
    } catch (error) {
      console.error("Error al guardar los datos:", error);

      setMessage({
        text:
          error.response?.data?.error ||
          "Error al guardar los datos del comercio",
        type: "error",
      });
    } finally {
      setSaving(false);

      // Limpiar el mensaje después de 5 segundos
      setTimeout(() => {
        setMessage({ text: "", type: "" });
      }, 5000);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Verificar el tipo de archivo
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      setMessage({
        text: "Solo se permiten archivos de imagen (JPG, PNG, GIF)",
        type: "error",
      });
      return;
    }

    // Verificar el tamaño del archivo (máximo 1MB)
    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      setMessage({
        text: "El archivo es demasiado grande. El tamaño máximo permitido es 1MB",
        type: "error",
      });
      return;
    }

    try {
      setUploadingLogo(true);

      // Crear FormData para enviar el archivo
      const formData = new FormData();

      // Cambiamos la clave del archivo para que coincida con la esperada por la API
      formData.append("image", file);

      // Usar la misma ruta que funciona para subir imágenes en el inventario
      const apiUrl = baseUrl.endsWith("/")
        ? `${baseUrl}upload/upload-product-image`
        : `${baseUrl}/upload/upload-product-image`;

      const response = await axios.post(apiUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      // Si la respuesta es exitosa, actualizar el logourl con la URL devuelta
      if (response.status === 200 && response.data.url) {
        // Actualizar el estado con la nueva URL del logo
        setStoreData({
          ...storeData,
          logourl: response.data.url,
        });

        // Mostrar mensaje de éxito
        setMessage({
          text: "Logo subido correctamente",
          type: "success",
        });

        // Limpiar el mensaje después de 5 segundos
        setTimeout(() => {
          setMessage({ text: "", type: "" });
        }, 5000);
      }
    } catch (error) {
      console.error("Error al subir el logo:", error);

      setMessage({
        text:
          error.response?.data?.error ||
          "Error al subir el logo. Intenta de nuevo.",
        type: "error",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    // Por ahora, simplemente limpiaremos la URL del logo sin hacer llamadas al backend
    setStoreData({
      ...storeData,
      logourl: "",
    });

    setMessage({
      text: "Logo eliminado correctamente",
      type: "success",
    });

    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  const handleThemeChange = (theme) => {
    setStoreData((prev) => ({
      ...prev,
      theme: theme,
    }));
  };

  // Redirigir si no está autenticado
  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return <div className="loading-container">Cargando...</div>;
  }

  // Función para abrir la tienda en una nueva ventana
  const openStore = () => {
    if (storeData.store_slug) {
      window.open(`/tienda/${storeData.store_slug}`, "_blank");
    }
  };

  // Componente de URL de tienda reutilizable
  const StoreUrlPreview = () => {
    const openStore = () => {
      if (storeData.shopurl) {
        window.open(`/tienda/${storeData.shopurl}`, "_blank");
      }
    };

    return storeData.shopurl ? (
      <div className="store-url-preview-container">
        <div className="store-url-preview">
          <div className="store-url-text">
            URL de tu tienda:{" "}
            <strong>
              {window.location.origin}/tienda/{storeData.shopurl}
            </strong>
          </div>
          <button type="button" className="view-store-btn" onClick={openStore}>
            Ver tienda
          </button>
        </div>
      </div>
    ) : null;
  };

  return (
    <div className="store-settings-container">
      <h1 className="settings-title">Datos del Comercio</h1>

      {message.text && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="form-section">
          <h2 className="section-title">Información Básica</h2>

          <div className="form-group">
            <label htmlFor="storename">Nombre del Comercio</label>
            <input
              type="text"
              id="storename"
              name="storename"
              value={storeData.storename}
              onChange={handleChange}
              className="form-control"
              required
              placeholder="Ingresa el nombre de tu comercio"
            />
            <small className="form-text">
              Este nombre se utilizará para generar la URL única de tu tienda.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="description">Descripción</label>
            <textarea
              id="description"
              name="description"
              value={storeData.description}
              onChange={handleChange}
              className="form-control"
              rows={4}
              placeholder="Describe brevemente tu comercio"
            />
          </div>
        </div>

        <div className="form-section">
          <h2 className="section-title">Información de Contacto</h2>

          <div className="form-group">
            <label htmlFor="storeemail">Email de Contacto</label>
            <input
              type="email"
              id="storeemail"
              name="storeemail"
              value={storeData.storeemail}
              onChange={handleChange}
              className="form-control"
              required
              disabled={!isNewStore}
            />
            <small className="form-text">
              {isNewStore
                ? "Email asociado a tu cuenta de usuario"
                : "Email de contacto de tu tienda"}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="contact_phone">Teléfono de Contacto</label>
            <input
              type="text"
              id="contact_phone"
              name="phone"
              value={storeData.phone}
              onChange={handleChange}
              className="form-control"
            />
          </div>
        </div>

        <div className="form-section">
          <h2 className="section-title">Información Bancaria</h2>

          <div className="form-group">
            <label htmlFor="bank_account">
              Cuenta Bancaria (para recibir pagos)
            </label>
            <input
              type="text"
              id="bankaccount"
              name="bankaccount"
              value={storeData.bankaccount}
              onChange={handleChange}
              className="form-control"
            />
            <small className="form-text">
              Esta información es solo para demostración y no se utilizará
              realmente.
            </small>
          </div>
        </div>

        <div className="form-section">
          <h2 className="section-title">Personalización</h2>

          <div className="logo-preview-container">
            {storeData.logourl ? (
              <div className="logo-with-actions">
                <img
                  src={storeData.logourl}
                  alt="Logo del comercio"
                  className="logo-preview"
                />
                <div className="logo-actions">
                  <button
                    type="button"
                    className="change-logo-btn"
                    onClick={() =>
                      document.getElementById("logo-upload").click()
                    }
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? "Subiendo..." : "Cambiar logo"}
                  </button>
                  <button
                    type="button"
                    className="remove-logo-btn"
                    onClick={handleRemoveLogo}
                    disabled={uploadingLogo || saving}
                  >
                    Eliminar logo
                  </button>
                </div>
              </div>
            ) : (
              <div className="no-logo">
                <div className="no-logo-placeholder">
                  <span>Sin logo</span>
                </div>
                <button
                  type="button"
                  className="upload-logo-btn"
                  onClick={() => document.getElementById("logo-upload").click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? "Subiendo..." : "Subir logo"}
                </button>
              </div>
            )}

            <div className="logo-upload">
              <input
                type="file"
                id="logo-upload"
                accept=".jpg,.jpeg,.png,.gif"
                className="file-input"
                onChange={handleLogoUpload}
                disabled={uploadingLogo || saving}
              />
              <small className="form-text">
                Formatos permitidos: JPG, PNG, GIF. Tamaño máximo: 1MB
              </small>
            </div>
          </div>

          <div className="form-group theme-selector">
            <label>Tema de la Tienda</label>
            <div className="theme-options">
              <div
                className={`theme-option ${
                  storeData.theme === "default" ? "selected" : ""
                }`}
                onClick={() => handleThemeChange("default")}
              >
                <div className="theme-preview default-theme"></div>
                <span>Predeterminado</span>
              </div>

              <div
                className={`theme-option ${
                  storeData.theme === "dark" ? "selected" : ""
                }`}
                onClick={() => handleThemeChange("dark")}
              >
                <div className="theme-preview dark-theme"></div>
                <span>Oscuro</span>
              </div>

              <div
                className={`theme-option ${
                  storeData.theme === "colorful" ? "selected" : ""
                }`}
                onClick={() => handleThemeChange("colorful")}
              >
                <div className="theme-preview colorful-theme"></div>
                <span>Colorido</span>
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="save-button" disabled={saving}>
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>

      {/* URL de tienda en la parte inferior (después de guardar) */}
      <StoreUrlPreview id="bottom-store-url" />
    </div>
  );
};

export default StoreSettings;
