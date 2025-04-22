import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import '../Styles/StoreSettings.css';

const StoreSettings = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [storeData, setStoreData] = useState({
    store_name: '',
    store_description: '',
    bank_account: '',
    store_slug: '',
    contact_email: '',
    contact_phone: '',
    logo_url: '',
    theme: 'default'
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
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    try {
      // Construir la URL correctamente
      const apiUrl = baseUrl.endsWith('/') 
        ? `${baseUrl}api/store-info` 
        : `${baseUrl}/api/store-info`;

      const response = await axios.get(apiUrl, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.data) {
        setStoreData(response.data);
      }
    } catch (error) {
      console.error("Error al cargar datos de la tienda:", error);
      // Si la API no está implementada aún, usamos datos de ejemplo
      setStoreData({
        store_name: 'Mi Tienda Online',
        store_description: 'Descripción de mi tienda online',
        bank_account: 'ES76 2100 0418 4012 3456 7890',
        store_slug: 'mi-tienda-online',
        contact_email: 'contacto@mitienda.com',
        contact_phone: '123456789',
        logo_url: '',
        theme: 'default'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStoreData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      // Construir la URL correctamente
      const apiUrl = baseUrl.endsWith('/') 
        ? `${baseUrl}api/store-info` 
        : `${baseUrl}/api/store-info`;
      
      const response = await axios.put(
        apiUrl,
        storeData,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.status === 200) {
        setMessage({ 
          text: 'Datos del comercio actualizados correctamente', 
          type: 'success' 
        });
        
        // Si la API devuelve el nuevo slug, actualizamos
        if (response.data && response.data.store_slug) {
          setStoreData(prev => ({
            ...prev,
            store_slug: response.data.store_slug
          }));
        }
      }
    } catch (error) {
      console.error("Error al guardar los datos:", error);
      setMessage({ 
        text: error.response?.data?.error || 'Error al guardar los datos. Intenta de nuevo.', 
        type: 'error' 
      });
    } finally {
      setSaving(false);
      
      // Limpiar el mensaje después de 5 segundos
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 5000);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Verificar el tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ 
        text: 'Solo se permiten archivos de imagen (JPG, PNG, GIF)', 
        type: 'error' 
      });
      return;
    }
    
    // Verificar el tamaño del archivo (máximo 1MB)
    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      setMessage({ 
        text: 'El archivo es demasiado grande. El tamaño máximo permitido es 1MB', 
        type: 'error' 
      });
      return;
    }
    
    try {
      setUploadingLogo(true);
      
      // Crear FormData para enviar el archivo
      const formData = new FormData();
      formData.append('logo', file);
      
      // Usa siempre la ruta correcta con /api/store/upload-logo
      const apiUrl = baseUrl.endsWith('/') 
        ? `${baseUrl}store/upload-logo` 
        : `${baseUrl}/store/upload-logo`;
        
      const response = await axios.post(
        apiUrl,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      
      if (response.status === 200 && response.data.logo_url) {
        // Actualizar el estado con la nueva URL del logo
        setStoreData({
          ...storeData,
          logo_url: response.data.logo_url
        });
        
        // Mostrar mensaje de éxito
        setMessage({ 
          text: 'Logo subido correctamente', 
          type: 'success' 
        });
        
        // Limpiar el mensaje después de 5 segundos
        setTimeout(() => {
          setMessage({ text: '', type: '' });
        }, 5000);
      }
    } catch (error) {
      console.error("Error al subir el logo:", error);
      
      setMessage({ 
        text: error.response?.data?.error || 'Error al subir el logo. Intenta de nuevo.', 
        type: 'error' 
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      setUploadingLogo(true);
      
      // Construir la URL correctamente - asegúrate de que coincida con tu backend
      const apiUrl = baseUrl.endsWith('/') 
        ? `${baseUrl}api/remove-logo` 
        : `${baseUrl}/api/remove-logo`;
        
      const response = await axios.delete(
        apiUrl,
        {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );
      
      if (response.status === 200) {
        // Actualizar el estado removiendo la URL del logo
        setStoreData({
          ...storeData,
          logo_url: ''
        });
        
        // Mostrar mensaje de éxito
        setMessage({ 
          text: 'Logo eliminado correctamente', 
          type: 'success' 
        });
        
        // Limpiar el mensaje después de 5 segundos
        setTimeout(() => {
          setMessage({ text: '', type: '' });
        }, 5000);
      }
    } catch (error) {
      console.error("Error al eliminar el logo:", error);
      
      setMessage({ 
        text: error.response?.data?.error || 'Error al eliminar el logo. Intenta de nuevo.', 
        type: 'error' 
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleThemeChange = (theme) => {
    setStoreData(prev => ({
      ...prev,
      theme: theme
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

  return (
    <div className="store-settings-container">
      <h1 className="settings-title">Datos del Comercio</h1>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="settings-form">
        <div className="form-section">
          <h2 className="section-title">Información Básica</h2>
          
          <div className="form-group">
            <label htmlFor="store_name">Nombre del Comercio</label>
            <input
              type="text"
              id="store_name"
              name="store_name"
              value={storeData.store_name}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>
          
          {storeData.store_slug && (
            <div className="store-url-preview">
              URL de tu tienda: <strong>{window.location.origin}/tienda/{storeData.store_slug}</strong>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="store_description">Descripción</label>
            <textarea
              id="store_description"
              name="store_description"
              value={storeData.store_description}
              onChange={handleChange}
              className="form-control"
              rows={4}
            />
          </div>
        </div>
        
        <div className="form-section">
          <h2 className="section-title">Información de Contacto</h2>
          
          <div className="form-group">
            <label htmlFor="contact_email">Email de Contacto</label>
            <input
              type="email"
              id="contact_email"
              name="contact_email"
              value={storeData.contact_email}
              onChange={handleChange}
              className="form-control"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="contact_phone">Teléfono de Contacto</label>
            <input
              type="text"
              id="contact_phone"
              name="contact_phone"
              value={storeData.contact_phone}
              onChange={handleChange}
              className="form-control"
            />
          </div>
        </div>
        
        <div className="form-section">
          <h2 className="section-title">Información Bancaria</h2>
          
          <div className="form-group">
            <label htmlFor="bank_account">Cuenta Bancaria (para recibir pagos)</label>
            <input
              type="text"
              id="bank_account"
              name="bank_account"
              value={storeData.bank_account}
              onChange={handleChange}
              className="form-control"
            />
            <small className="form-text">Esta información es solo para demostración y no se utilizará realmente.</small>
          </div>
        </div>
        
        <div className="form-section">
          <h2 className="section-title">Personalización</h2>
          
          <div className="logo-preview-container">
            {storeData.logo_url ? (
              <div className="logo-with-actions">
                <img 
                  src={storeData.logo_url} 
                  alt="Logo del comercio" 
                  className="logo-preview" 
                />
                <div className="logo-actions">
                  <button 
                    type="button" 
                    className="change-logo-btn" 
                    onClick={() => document.getElementById('logo-upload').click()}
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
                  onClick={() => document.getElementById('logo-upload').click()}
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
                className={`theme-option ${storeData.theme === 'default' ? 'selected' : ''}`}
                onClick={() => handleThemeChange('default')}
              >
                <div className="theme-preview default-theme"></div>
                <span>Predeterminado</span>
              </div>
              
              <div 
                className={`theme-option ${storeData.theme === 'dark' ? 'selected' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <div className="theme-preview dark-theme"></div>
                <span>Oscuro</span>
              </div>
              
              <div 
                className={`theme-option ${storeData.theme === 'colorful' ? 'selected' : ''}`}
                onClick={() => handleThemeChange('colorful')}
              >
                <div className="theme-preview colorful-theme"></div>
                <span>Colorido</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="save-button"
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StoreSettings;