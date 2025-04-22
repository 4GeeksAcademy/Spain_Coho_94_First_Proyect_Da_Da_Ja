import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../Styles/CartPage.css";

const CartPage = () => {
  const { storeSlug } = useParams();
  const navigate = useNavigate();

  // Estados
  const [storeData, setStoreData] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");

  const baseUrl = import.meta.env.VITE_BACKEND_URL || "";

  // Obtener datos de la tienda y del carrito al cargar el componente
  useEffect(() => {
    fetchStoreData();
    fetchCartItems();
  }, [storeSlug]);

  // Función para obtener datos de la tienda
  const fetchStoreData = async () => {
    try {
      setLoading(true);

      // Obtener datos de la tienda
      const storeApiUrl = baseUrl.endsWith("/")
        ? `${baseUrl}api/store/${storeSlug}`
        : `${baseUrl}/api/store/${storeSlug}`;

      const storeResponse = await axios.get(storeApiUrl);

      if (storeResponse.status === 200) {
        setStoreData(storeResponse.data.store);
      }
    } catch (err) {
      console.error("Error al cargar datos de la tienda:", err);
      setError("No se pudo cargar la tienda. Por favor, verifica la URL.");
    } finally {
      setLoading(false);
    }
  };

  // Obtener los items del carrito desde la API
  const fetchCartItems = async () => {
    try {
      // Verificar si el usuario está autenticado
      const token = localStorage.getItem("access_token");

      if (!token) {
        // Si no está autenticado, cargar carrito del localStorage
        loadCartFromLocalStorage();
        return;
      }

      // Si está autenticado, obtener carrito de la API
      const cartApiUrl = baseUrl.endsWith("/")
        ? `${baseUrl}api/customer/cart`
        : `${baseUrl}/api/customer/cart`;

      const response = await axios.get(cartApiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        // Transformar los datos de la API al formato que usa el componente
        const formattedItems = response.data.cart_items.map((item) => ({
          id: item.cart_item_id,
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price_per_unit,
          image: item.product.image_url,
          quantity: item.quantity,
          stock: item.product.quantity,
        }));

        setCartItems(formattedItems);
      }
    } catch (err) {
      console.error("Error al cargar el carrito desde la API:", err);
      // Si hay un error con la API, intentar cargar desde localStorage como respaldo
      loadCartFromLocalStorage();
    }
  };

  // Cargar items del carrito desde el localStorage
  const loadCartFromLocalStorage = () => {
    try {
      const savedCart = localStorage.getItem(`cart_${storeSlug}`);
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
    } catch (err) {
      console.error("Error al cargar el carrito del localStorage:", err);
      setCartItems([]);
    }
  };

  // Guardar carrito en localStorage
  const saveCartToStorage = (cart) => {
    localStorage.setItem(`cart_${storeSlug}`, JSON.stringify(cart));
  };

  // Actualizar cantidad de un item
  const updateItemQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    // Verificar si el usuario está autenticado
    const token = localStorage.getItem("access_token");

    if (token) {
      try {
        // Actualizar en la API
        const updateUrl = baseUrl.endsWith("/")
          ? `${baseUrl}api/customer/cart/update/${itemId}`
          : `${baseUrl}/api/customer/cart/update/${itemId}`;

        const response = await axios.put(
          updateUrl,
          { quantity: newQuantity },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 200) {
          // Actualizar el estado con los datos más recientes
          fetchCartItems();
        }
      } catch (err) {
        console.error("Error al actualizar la cantidad en la API:", err);

        // Mostrar error si no hay stock suficiente
        if (err.response && err.response.status === 400) {
          setError(
            err.response.data.error || "No hay suficiente stock disponible"
          );
          setTimeout(() => setError(null), 3000);
          return;
        }

        // Actualizar localmente si falla la API
        updateLocalCart(itemId, newQuantity);
      }
    } else {
      // Si no está autenticado, actualizar en localStorage
      updateLocalCart(itemId, newQuantity);
    }
  };

  // Actualizar carrito local
  const updateLocalCart = (itemId, newQuantity) => {
    const updatedCart = cartItems.map((item) =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );

    setCartItems(updatedCart);
    saveCartToStorage(updatedCart);
  };

  // Eliminar un item del carrito
  const removeItem = async (itemId) => {
    // Verificar si el usuario está autenticado
    const token = localStorage.getItem("access_token");

    if (token) {
      try {
        // En este caso, actualizamos la cantidad a 0 para simular eliminación
        // Alternativamente, podrías crear un endpoint DELETE específico
        const updateUrl = baseUrl.endsWith("/")
          ? `${baseUrl}api/customer/cart/update/${itemId}`
          : `${baseUrl}/api/customer/cart/update/${itemId}`;

        await axios.put(
          updateUrl,
          { quantity: 0 }, // Cantidad 0 para "eliminar"
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        // Actualizar el estado con los datos más recientes
        fetchCartItems();
      } catch (err) {
        console.error("Error al eliminar item de la API:", err);

        // Eliminar localmente si falla la API
        removeLocalItem(itemId);
      }
    } else {
      // Si no está autenticado, eliminar del localStorage
      removeLocalItem(itemId);
    }
  };

  // Eliminar item localmente
  const removeLocalItem = (itemId) => {
    const updatedCart = cartItems.filter((item) => item.id !== itemId);
    setCartItems(updatedCart);
    saveCartToStorage(updatedCart);
  };

  // Vaciar el carrito completamente
  const clearCart = () => {
    // Por simplicidad, solo vaciaremos el carrito local
    // En una implementación completa, se debería añadir una llamada a la API para vaciar el carrito
    setCartItems([]);
    saveCartToStorage([]);
  };

  // Aplicar un cupón de descuento (simulado)
  const applyCoupon = () => {
    setCouponError("");

    // Simulación de cupones
    const coupons = {
      WELCOME10: 10,
      SUMMER20: 20,
      STORE50: 50,
    };

    if (appliedCoupon.trim() === "") {
      setCouponError("Ingresa un código de cupón");
      return;
    }

    const discount = coupons[appliedCoupon.toUpperCase()];

    if (discount) {
      setCouponDiscount(discount);
      setCouponError("");
    } else {
      setCouponDiscount(0);
      setCouponError("Cupón no válido");
    }
  };

  // Proceder al checkout
  const proceedToCheckout = () => {
    // Verificar si el usuario está autenticado
    const token = localStorage.getItem("access_token");

    if (!token) {
      // Si no está autenticado, mostrar modal de login
      setShowLoginModal(true);
    } else {
      // Si está autenticado, sincronizar carrito y redirigir al checkout
      syncCartAndCheckout();
    }
  };

  // Sincronizar carrito local con la API antes de checkout
  const syncCartAndCheckout = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setShowLoginModal(true);
      return;
    }

    try {
      // En una implementación real, aquí se enviaría el carrito local al servidor
      // para sincronizarlo antes de ir al checkout

      // Luego redirigir al checkout
      navigate(`/tienda/${storeSlug}/checkout`);
    } catch (err) {
      console.error("Error al sincronizar el carrito:", err);
      setError("No se pudo procesar el carrito. Inténtalo nuevamente.");
    }
  };

  // Calcular subtotal
  const calculateSubtotal = () => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  // Calcular descuento
  const calculateDiscount = () => {
    return (calculateSubtotal() * couponDiscount) / 100;
  };

  // Calcular total
  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  // Modal de login
  const LoginModal = () => (
    <div className="modal-overlay">
      <div className="login-modal">
        <h2>Iniciar sesión</h2>
        <p>
          Para completar tu compra, debes iniciar sesión o crear una cuenta.
        </p>

        <div className="modal-buttons">
          <button onClick={() => navigate("/login")} className="primary-button">
            Iniciar sesión
          </button>
          <button
            onClick={() => navigate("/register")}
            className="secondary-button"
          >
            Registrarse
          </button>
          <button
            onClick={() => setShowLoginModal(false)}
            className="tertiary-button"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );

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
          <Link to={`/tienda/${storeSlug}`} className="nav-link">
            Inicio
          </Link>
          <Link
            to={`/tienda/${storeSlug}/carrito`}
            className="nav-link cart-link active"
          >
            <span className="cart-icon">🛒</span>
            <span className="cart-text">Carrito</span>
            {cartItems.length > 0 && (
              <span className="cart-count">{cartItems.length}</span>
            )}
          </Link>
        </nav>
      </header>

      {/* Contenido del carrito */}
      <div className="cart-container">
        <h1 className="cart-title">Tu Carrito</h1>

        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h2>Tu carrito está vacío</h2>
            <p>Parece que aún no has agregado productos a tu carrito.</p>
            <Link
              to={`/tienda/${storeSlug}/catalogo`}
              className="continue-shopping-btn"
            >
              Explorar productos
            </Link>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items-container">
              <div className="cart-header">
                <div className="cart-header-product">Producto</div>
                <div className="cart-header-price">Precio</div>
                <div className="cart-header-quantity">Cantidad</div>
                <div className="cart-header-total">Total</div>
                <div className="cart-header-actions">Acciones</div>
              </div>

              {cartItems.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-product">
                    <div className="cart-item-image-container">
                      <img
                        src={
                          item.image ||
                          "https://placehold.co/600x400/EEE/31343C"
                        }
                        alt={item.name}
                        className="cart-item-image"
                        onError={(e) => {
                          e.target.src =
                            "https://placehold.co/600x400/EEE/31343C";
                        }}
                      />
                    </div>
                    <div className="cart-item-details">
                      <h3 className="cart-item-name">{item.name}</h3>
                      {item.stock < 5 && (
                        <p className="stock-warning">
                          ¡Quedan solo {item.stock} unidades!
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="cart-item-price">
                    ${item.price.toFixed(2)}
                  </div>

                  <div className="cart-item-quantity">
                    <div className="quantity-control">
                      <button
                        onClick={() =>
                          updateItemQuantity(item.id, item.quantity - 1)
                        }
                        className="quantity-btn"
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>
                      <span className="quantity-value">{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateItemQuantity(item.id, item.quantity + 1)
                        }
                        className="quantity-btn"
                        disabled={item.stock && item.quantity >= item.stock}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="cart-item-total">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>

                  <div className="cart-item-actions">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="remove-item-btn"
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              <div className="cart-actions">
                <Link
                  to={`/tienda/${storeSlug}`}
                  className="continue-shopping-btn"
                >
                  Seguir comprando
                </Link>
                <button onClick={clearCart} className="clear-cart-btn">
                  Vaciar carrito
                </button>
              </div>
            </div>

            <div className="cart-summary">
              <h2 className="summary-title">Resumen del pedido</h2>

              <div className="coupon-section">
                <h3>¿Tienes un cupón?</h3>
                <div className="coupon-form">
                  <input
                    type="text"
                    value={appliedCoupon}
                    onChange={(e) => setAppliedCoupon(e.target.value)}
                    placeholder="Código de cupón"
                    className="coupon-input"
                  />
                  <button onClick={applyCoupon} className="apply-coupon-btn">
                    Aplicar
                  </button>
                </div>
                {couponError && <p className="coupon-error">{couponError}</p>}
                {couponDiscount > 0 && (
                  <p className="coupon-success">
                    Cupón aplicado: {couponDiscount}% de descuento
                  </p>
                )}
              </div>

              <div className="summary-details">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>

                {couponDiscount > 0 && (
                  <div className="summary-row discount">
                    <span>Descuento ({couponDiscount}%)</span>
                    <span>-${calculateDiscount().toFixed(2)}</span>
                  </div>
                )}

                <div className="summary-row">
                  <span>Envío</span>
                  <span>Gratis</span>
                </div>

                <div className="summary-row total">
                  <span>Total</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <button onClick={proceedToCheckout} className="checkout-btn">
                Proceder al pago
              </button>

              <div className="payment-methods">
                <p>Métodos de pago aceptados:</p>
                <div className="payment-icons">
                  <span className="payment-icon">💳</span>
                  <span className="payment-icon">💸</span>
                  <span className="payment-icon">🏦</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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

      {/* Modal de login */}
      {showLoginModal && <LoginModal />}
    </div>
  );
};

export default CartPage;
