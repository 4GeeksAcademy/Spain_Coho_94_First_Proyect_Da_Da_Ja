import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../Styles/StoreFront.css"; // Mantenemos el CSS original para la estructura general

const StoreFront = () => {
  const { storeSlug } = useParams();
  const navigate = useNavigate();

  const [storeData, setStoreData] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedToCart, setAddedToCart] = useState(null); // Para la notificación de añadido al carrito

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

          // Cargar productos destacados de esta tienda
          const productsApiUrl = baseUrl.endsWith("/")
            ? `${baseUrl}api/store/${storeSlug}`
            : `${baseUrl}/api/store/${storeSlug}`;

          const productsResponse = await axios.get(productsApiUrl);

          if (productsResponse.status === 200) {
            setStoreData(productsResponse.data.store);
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

  // Añadir producto al carrito (copiado del componente Catalog)
  const addToCart = (product) => {
    try {
      // Obtener el carrito actual del localStorage
      const cartKey = `cart_${storeSlug}`;
      const currentCart = JSON.parse(localStorage.getItem(cartKey) || "[]");

      // Verificar si el producto ya está en el carrito
      const existingItemIndex = currentCart.findIndex(
        (item) => item.id === product.id
      );

      if (existingItemIndex >= 0) {
        // Si el producto ya existe, incrementar cantidad
        currentCart[existingItemIndex].quantity += 1;
      } else {
        // Si no existe, añadir nuevo producto
        currentCart.push({
          id: product.id,
          productId: product.id,
          name: product.product_name,
          price: product.price_per_unit,
          image: product.image_url,
          quantity: 1,
          stock: product.quantity,
        });
      }

      // Guardar el carrito actualizado
      localStorage.setItem(cartKey, JSON.stringify(currentCart));

      // Mostrar confirmación
      setAddedToCart(product.product_name);

      // Limpiar mensaje después de 2 segundos
      setTimeout(() => {
        setAddedToCart(null);
      }, 2000);
    } catch (error) {
      console.error("Error al añadir producto al carrito:", error);
    }
  };

  // Obtener cantidad de productos en carrito para badge
  const getCartItemsCount = () => {
    try {
      const cartKey = `cart_${storeSlug}`;
      const currentCart = JSON.parse(localStorage.getItem(cartKey) || "[]");
      return currentCart.length;
    } catch (error) {
      return 0;
    }
  };

  // Si hay un error, mostrar mensaje
  if (error) {
    return (
      <div className="store-error-container">
        <div className="store-error-message">
          <h2>Tienda no encontrada</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/")} className="return-home-btn">
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
          {storeData.logourl ? (
            <img
              src={storeData.logourl}
              alt={`Logo de ${storeData.storename}`}
              className="store-logo"
            />
          ) : (
            <div className="store-logo-placeholder">
              {storeData.storename?.substring(0, 2).toUpperCase() || "ST"}
            </div>
          )}
          <h1 className="store-name">{storeData.storename}</h1>
        </div>

        <nav className="store-nav">
          <Link
            to={`/tienda/${storeSlug}/carrito`}
            className="nav-link cart-link"
          >
            <span className="cart-icon">🛒</span>
            <span className="cart-text">Carrito</span>
            {getCartItemsCount() > 0 && (
              <span className="cart-count">{getCartItemsCount()}</span>
            )}
          </Link>
        </nav>
      </header>

      {/* Mensaje de añadido al carrito */}
      {addedToCart && (
        <div className="add-to-cart-notification">
          <div className="notification-content">
            <span className="notification-icon">✓</span>
            <span className="notification-text">
              {addedToCart} añadido al carrito
            </span>
          </div>
        </div>
      )}

      {/* Banner principal */}
      <section className="store-banner">
        <div className="banner-content">
          <h2>Bienvenido a nuestra tienda online</h2>
          <p>
            {storeData.description ||
              "Explora nuestros productos y encuentra lo que necesitas."}
          </p>
        </div>
      </section>

      {/* Productos destacados */}
      <section className="featured-products">
        <h2 className="section-title">Productos:</h2>

        {featuredProducts.length > 0 ? (
          <div className="products-grid">
            {featuredProducts.map((product) => (
              <div className="product-card" key={product.id}>
                <div className="product-image-container">
                  <img
                    src={
                      product.image_url ||
                      "https://placehold.co/600x400/EEE/31343C"
                    }
                    alt={product.product_name}
                    className="product-image"
                    onError={(e) => {
                      e.target.src = "https://placehold.co/600x400/EEE/31343C";
                    }}
                  />
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.product_name}</h3>
                  <p className="product-price">
                    ${product.price_per_unit.toFixed(2)}
                  </p>
                  <div className="product-actions">
                    <Link
                      to={`/tienda/${storeSlug}/producto/${product.id}`}
                      className="view-product-btn"
                    >
                      Ver detalles
                    </Link>
                    <button
                      onClick={() => addToCart(product)}
                      className="add-to-cart-button"
                      disabled={product.quantity <= 0}
                    >
                      {product.quantity <= 0 ? "Agotado" : "Añadir al carrito"}
                    </button>
                  </div>
                  {product.quantity <= 5 && product.quantity > 0 && (
                    <p className="stock-warning">
                      ¡Quedan solo {product.quantity} unidades!
                    </p>
                  )}
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

          {storeData.phone && (
            <div className="contact-item">
              <span className="contact-icon">📞</span>
              <p>{storeData.phone}</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer de la tienda */}
      <footer className="store-footer">
        <p>
          &copy; {new Date().getFullYear()} {storeData.storename}. Todos los
          derechos reservados.
        </p>
        <p className="powered-by">
          Creado con amor usando la plataforma de comercio electrónico
        </p>
      </footer>
    </div>
  );
};

export default StoreFront;
