import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Catalog.css';

const Catalog = () => {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Obtener parámetros de la URL
  const queryParams = new URLSearchParams(location.search);
  const initialPage = parseInt(queryParams.get('page') || '1');
  const initialSearch = queryParams.get('search') || '';
  const initialSortBy = queryParams.get('sort_by') || 'id';
  const initialSortOrder = queryParams.get('sort_order') || 'asc';
  
  // Estados
  const [storeData, setStoreData] = useState(null);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: initialPage,
    totalPages: 1,
    totalItems: 0,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  
  const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
  
  // Función para actualizar la URL con los parámetros actuales
  const updateQueryParams = (page, searchTerm, sortByValue, sortOrderValue) => {
    const params = new URLSearchParams();
    
    if (page > 1) params.set('page', page.toString());
    if (searchTerm) params.set('search', searchTerm);
    if (sortByValue !== 'id') params.set('sort_by', sortByValue);
    if (sortOrderValue !== 'asc') params.set('sort_order', sortOrderValue);
    
    const newSearch = params.toString() ? `?${params.toString()}` : '';
    navigate(`/tienda/${storeSlug}/catalogo${newSearch}`, { replace: true });
  };
  
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
  
  // Cargar productos con paginación y filtros
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Construir la URL con los parámetros de paginación y filtros
        const productsApiUrl = baseUrl.endsWith('/') 
          ? `${baseUrl}api/store/${storeSlug}/products` 
          : `${baseUrl}/api/store/${storeSlug}/products`;
          
        const params = {
          page: pagination.currentPage,
          per_page: 12,
          search: search,
          sort_by: sortBy,
          sort_order: sortOrder
        };
        
        const productsResponse = await axios.get(productsApiUrl, { params });
        
        if (productsResponse.status === 200) {
          setProducts(productsResponse.data.products || []);
          setPagination(productsResponse.data.pagination || pagination);
        }
      } catch (err) {
        console.error("Error al cargar productos:", err);
        if (!error) {
          setError("Error al cargar los productos. Intenta refrescar la página.");
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (storeData) {
      fetchProducts();
      updateQueryParams(pagination.currentPage, search, sortBy, sortOrder);
    }
  }, [storeData, pagination.currentPage, search, sortBy, sortOrder]);
  
  // Manejar cambio de página
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({
        ...pagination,
        currentPage: newPage
      });
    }
  };
  
  // Manejar búsqueda
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination({
      ...pagination,
      currentPage: 1 // Resetear a la primera página al buscar
    });
  };
  
  // Manejar cambio de ordenamiento
  const handleSortChange = (e) => {
    const value = e.target.value;
    const [newSortBy, newSortOrder] = value.split('-');
    
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPagination({
      ...pagination,
      currentPage: 1 // Resetear a la primera página al cambiar el orden
    });
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
  
  // Si está cargando inicialmente, mostrar spinner
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
          <Link to={`/tienda/${storeSlug}`} className="nav-link">
            Inicio
          </Link>
          <Link to={`/tienda/${storeSlug}/catalogo`} className="nav-link active">
            Catálogo
          </Link>
          <Link to={`/tienda/${storeSlug}/carrito`} className="nav-link cart-link">
            <span className="cart-icon">🛒</span>
            <span className="cart-text">Carrito</span>
          </Link>
        </nav>
      </header>
      
      {/* Contenido principal - Catálogo */}
      <div className="catalog-container">
        <h1 className="catalog-title">Catálogo de Productos</h1>
        
        {/* Barra de búsqueda y filtros */}
        <div className="catalog-controls">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos..."
              className="search-input"
            />
            <button type="submit" className="search-button">Buscar</button>
          </form>
          
          <div className="sort-filter">
            <label htmlFor="sort-select">Ordenar por:</label>
            <select 
              id="sort-select" 
              value={`${sortBy}-${sortOrder}`}
              onChange={handleSortChange}
              className="sort-select"
            >
              <option value="id-asc">Más antiguos</option>
              <option value="id-desc">Más recientes</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
              <option value="name-asc">Nombre: A-Z</option>
              <option value="name-desc">Nombre: Z-A</option>
            </select>
          </div>
        </div>
        
        {/* Resultados */}
        {loading && storeData ? (
          <div className="loading-products">
            <div className="store-loading-spinner"></div>
            <p>Cargando productos...</p>
          </div>
        ) : (
          <>
            {/* Contador de resultados */}
            <div className="results-counter">
              Mostrando {products.length} de {pagination.totalItems} productos
            </div>
            
            {/* Grid de productos */}
            {products.length > 0 ? (
              <div className="products-grid">
                {products.map(product => (
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
                <p>No se encontraron productos que coincidan con tu búsqueda.</p>
                {search && (
                  <button 
                    onClick={() => setSearch('')}
                    className="clear-search-btn"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            )}
            
            {/* Paginación */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => handlePageChange(1)}
                  disabled={!pagination.hasPrev}
                  className="page-button"
                >
                  «
                </button>
                <button 
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="page-button"
                >
                  ‹
                </button>
                
                <div className="page-info">
                  Página {pagination.currentPage} de {pagination.totalPages}
                </div>
                
                <button 
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="page-button"
                >
                  ›
                </button>
                <button 
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={!pagination.hasNext}
                  className="page-button"
                >
                  »
                </button>
              </div>
            )}
          </>
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

export default Catalog;