import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProductView.css';

const ProductView = () => {
  const { storeSlug, productId } = useParams();
  const navigate = useNavigate();
  
  const [storeData, setStoreData] = useState(null);
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
  
  // Cargar datos del producto y la tienda
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Obtener datos de la tienda
        const storeApiUrl = baseUrl.endsWith('/') 
          ? `${baseUrl}api/store/${storeSlug}` 
          : `${baseUrl}/api/store/${storeSlug}`;
          
        const storeResponse = await axios.get(storeApiUrl);
        
        if (storeResponse.status === 200) {
          setStoreData(storeResponse.data);
          
          // Obtener datos del producto
          const productApiUrl = baseUrl.endsWith('/') 
            ? `${baseUrl}api/store/${storeSlug}/product/${productId}` 
            : `${baseUrl}/api/store/${storeSlug}/product/${productId}`;
            
          const productResponse = await axios.get(productApiUrl);
          
          if (productResponse.status === 200) {
            setProduct(productResponse.data.product);
            setRelatedProducts(productResponse.data.related_products || []);
          }
        }
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError("No se pudo cargar el producto. Por favor, verifica la URL.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [storeSlug, productId, baseUrl]);
  
  // Manejar cambio de cantidad
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (value > 0 && (!product || value <= product.quantity)) {
      setQuantity(value);
    }
  };
  
  // Incrementar cantidad
  const incrementQuantity = () => {
    if (!product || quantity < product.quantity) {
      setQuantity(prevQuantity => prevQuantity + 1);
    }
  };
  
  // Decrementar cantidad
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prevQuantity => prevQuantity - 1);
    }
  };
  
  // Añadir al carrito
  const addToCart = () => {
    // Aquí implementarías la lógica para añadir al carrito
    // Por ahora, solo mostramos un mensaje en consola
    console.log(`Añadido al carrito: ${product.product_name}, cantidad: ${quantity}`);
    
    // Implementación básica usando localStorage
    try {
      // Obtener el carrito actual o crear uno nuevo
      const cartItems = JSON.parse(localStorage.getItem(`cart_${storeSlug}`) || '[]');
      
      // Verificar si el producto ya está en el carrito
      const existingProductIndex = cartItems.findIndex(item => item.id === product.id);
      
      if (existingProductIndex >= 0) {
        // Actualizar cantidad si ya existe
        cartItems[existingProductIndex].quantity += quantity;
      } else {
        // Añadir nuevo producto
        cartItems.push({
          id: product.id,
          name: product.product_name,
          price: product.price_per_unit,
          image: product.image_url,
          quantity: quantity
        });
      }
      
      // Guardar carrito actualizado
      localStorage.setItem(`cart_${storeSlug}`, JSON.stringify(cartItems));
      
      // Mostrar algún tipo de confirmación (esto se puede mejorar con un modal)
      alert('Producto añadido al carrito');
      
      // Opcional: redirigir al carrito
      // navigate(`/tienda/${storeSlug}/carrito`);
    } catch (err) {
      console.error("Error al añadir al carrito:", err);
      alert('Error al añadir al carrito');
    }
  };
  
  // Si hay un error, mostrar mensaje
  if (error) {
    return (
      <div className="store-error-container">
        <div className="store-error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate(`/tienda/${storeSlug}`)} className="return-home-btn">
            Volver a la tienda
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
        <p>Cargando producto...</p>
      </div>
    );
  }
  
  // Si no hay datos de producto o tienda, mostrar mensaje
  if (!product || !storeData) {
    return (
      <div className="store-error-container">
        <div className="store-error-message">
          <h2>Producto no encontrado</h2>
          <p>No pudimos encontrar el producto que buscas.</p>
          <button onClick={() => navigate(`/tienda/${storeSlug}`)} className="return-home-btn">
            Volver a la tienda
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
          <Link to={`/tienda/${storeSlug}`} className="nav-link">
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
      
      {/* Contenido principal - Detalle del producto */}
      <div className="product-view-container">
        <div className="breadcrumbs">
          <Link to={`/tienda/${storeSlug}`}>Inicio</Link> &gt; 
          <Link to={`/tienda/${storeSlug}/catalogo`}>Catálogo</Link> &gt; 
          <span>{product.product_name}</span>
        </div>
        
        <div className="product-detail">
          <div className="product-image-gallery">
            <img 
              src={product.image_url || 'https://placehold.co/600x400/EEE/31343C'} 
              alt={product.product_name}
              className="product-detail-image"
              onError={(e) => {e.target.src = 'https://placehold.co/600x400/EEE/31343C'}}
            />
          </div>
          
          <div className="product-info-panel">
            <h1 className="product-title">{product.product_name}</h1>
            
            <div className="product-price-container">
              <span className="product-price">${product.price_per_unit.toFixed(2)}</span>
              {product.quantity <= 5 && (
                <span className="low-stock-warning">¡Últimas unidades!</span>
              )}
            </div>
            
            <div className="product-description">
              <h3>Descripción</h3>
              <p>{product.description || "No hay descripción disponible para este producto."}</p>
            </div>
            
            <div className="product-actions">
              <div className="quantity-selector">
                <button
                  type="button"
                  className="quantity-btn"
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max={product.quantity}
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="quantity-input"
                />
                <button
                  type="button"
                  className="quantity-btn"
                  onClick={incrementQuantity}
                  disabled={quantity >= product.quantity}
                >
                  +
                </button>
              </div>
              
              <button
                type="button"
                className="add-to-cart-btn"
                onClick={addToCart}
                disabled={product.quantity <= 0}
              >
                {product.quantity <= 0 ? "Agotado" : "Añadir al carrito"}
              </button>
            </div>
            
            <div className="product-meta">
              <p className="stock-info">
                <strong>Disponibilidad:</strong> {product.quantity > 0 ? `${product.quantity} en stock` : 'Agotado'}
              </p>
              <p className="sku-info">
                <strong>SKU:</strong> {product.id}
              </p>
            </div>
          </div>
        </div>
        
        {/* Productos relacionados */}
        {relatedProducts.length > 0 && (
          <div className="related-products">
            <h2 className="section-title">Productos relacionados</h2>
            <div className="products-grid">
              {relatedProducts.map(relatedProduct => (
                <div className="product-card" key={relatedProduct.id}>
                  <div className="product-image-container">
                    <img 
                      src={relatedProduct.image_url || 'https://placehold.co/600x400/EEE/31343C'} 
                      alt={relatedProduct.product_name}
                      className="product-image"
                      onError={(e) => {e.target.src = 'https://placehold.co/600x400/EEE/31343C'}}
                    />
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{relatedProduct.product_name}</h3>
                    <p className="product-price">${relatedProduct.price_per_unit.toFixed(2)}</p>
                    <Link 
                      to={`/tienda/${storeSlug}/producto/${relatedProduct.id}`} 
                      className="view-product-btn"
                    >
                      Ver detalles
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer de la tienda */}
      <footer className="store-footer">
        <p>&copy; {new Date().getFullYear()} {storeData.store_name}. Todos los derechos reservados.</p>
        <p className="powered-by">
          Creado con ❤️ usando la plataforma de comercio electrónico
        </p>
      </footer>
    </div>
  );
};

export default ProductView;