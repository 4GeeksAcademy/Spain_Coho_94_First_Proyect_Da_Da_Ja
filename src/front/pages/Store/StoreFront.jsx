import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../Styles/StoreFront.css'; // Asegúrate de tener un archivo CSS para estilos

const StoreFront = () => {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  
  const [storeData, setStoreData] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
  
  // Cargar datos de la tienda
  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        setLoading(true);
        
        // Obtener datos de la tienda por su slug
        const storeApiUrl = baseUrl.endsWith('/') 
          ? `${baseUrl}api/store/${storeSlug}` 
          : `${baseUrl}/api/store/${storeSlug}`;
          
        const storeResponse = await axios.get(storeApiUrl);
        
        if (storeResponse.status === 200) {
          setStoreData(storeResponse.data);
          
          // Cargar productos destacados de esta tienda
          const productsApiUrl = baseUrl.endsWith('/') 
            ? `${baseUrl}api/store/${storeSlug}/featured-products` 
            : `${baseUrl}/api/store/${storeSlug}/featured-products`;
            
          const productsResponse = await axios.get(productsApiUrl);
          
          if (productsResponse.status === 200) {
            setFeaturedProducts(productsResponse.data.products || []);
          }
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
  
  // Si hay un error, mostrar mensaje
  if (error) {
    return (
      <div className="store-error-container">
        <div className="store-error-message">
          <h2>Tienda no encontrada</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="return-home-btn">
            Volver a la página principal
          </button>
        </div>
      </div>
    );
  }
  
  // Si está cargando, mostrar spinner
  if (loading) {
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
          <button onClick={() => navigate('/')} className="return-home-btn">
            Volver a la página principal
          </button>
        </div>
      </div>
    );
  }
  
  // Aplicar el tema de la tienda
  const theme = storeData.theme || 'default';
  
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
              {storeData.store_name?.substring(0, 2).toUpperCase() || 'ST'}
            </div>
          )}
          <h1 className="store-name">{storeData.store_name}</h1>
        </div>
        
        <nav className="store-nav">
          <Link to={`/tienda/${storeSlug}`} className="nav-link active">
            Inicio
          </Link>
          <Link to={`/tienda/${storeSlug}/catalogo`} className="nav-link">
            Catálogo
          </Link>
          <Link to={`/tienda/${storeSlug}/carrito`} className="nav-link cart-link">
            <span className="cart-icon">🛒</span>
            <span className="cart-text">Carrito</span>
          </Link>
        </nav>
      </header>
      
      {/* Banner principal */}
      <section className="store-banner">
        <div className="banner-content">
          <h2>Bienvenido a nuestra tienda online</h2>
          <p>{storeData.store_description || 'Explora nuestros productos y encuentra lo que necesitas.'}</p>
          <Link to={`/tienda/${storeSlug}/catalogo`} className="banner-btn">
            Ver productos
          </Link>
        </div>
      </section>
      
      {/* Productos destacados */}
      <section className="featured-products">
        <h2 className="section-title">Productos destacados</h2>
        
        {featuredProducts.length > 0 ? (
          <div className="products-grid">
            {featuredProducts.map(product => (
              <div className="product-card" key={product.id}>
                <div className="product-image-container">
                  <img 
                    src={product.image_url || 'https://placehold.co/600x400/EEE/31343C'} 
                    alt={product.product_name}
                    className="product-image"
                    onError={(e) => {e.target.src = 'https://placehold.co/600x400/EEE/31343C'}}
                  />
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.product_name}</h3>
                  <p className="product-price">${product.price_per_unit.toFixed(2)}</p>
                  <Link 
                    to={`/tienda/${storeSlug}/producto/${product.id}`} 
                    className="view-product-btn"
                  >
                    Ver detalles
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-products-message">
            <p>No hay productos destacados disponibles.</p>
            <Link to={`/tienda/${storeSlug}/catalogo`} className="view-all-btn">
              Ver todos los productos
            </Link>
          </div>
        )}
      </section>
      
      {/* Información de contacto */}
      <section className="store-contact">
        <h2 className="section-title">Contacto</h2>
        <div className="contact-info">
          {storeData.contact_email && (
            <div className="contact-item">
              <span className="contact-icon">✉️</span>
              <p>{storeData.contact_email}</p>
            </div>
          )}
          
          {storeData.contact_phone && (
            <div className="contact-item">
              <span className="contact-icon">📞</span>
              <p>{storeData.contact_phone}</p>
            </div>
          )}
        </div>
      </section>
      
      {/* Footer de la tienda */}
      <footer className="store-footer">
        <p>&copy; {new Date().getFullYear()} {storeData.store_name}. Todos los derechos reservados.</p>
        <p className="powered-by">
          Creado con amor usando la plataforma de comercio electrónico
        </p>
      </footer>
    </div>
  );
};

export default StoreFront;