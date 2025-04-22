import axios from "axios";
import "../Styles/InventoryPanel.css";
import { Navigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import ErrorMessage2 from "../../components/ErrorMessage2";

const InventoryPanel = () => {
  // Estado para mensajes y errores
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Estado para productos y operaciones
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Estado para añadir un nuevo producto
  const [newProduct, setNewProduct] = useState({
    product_name: "",
    price_per_unit: 0,
    description: "",
    quantity: 0,
    image_url: ""
  });
  const [addingProduct, setAddingProduct] = useState(false);

  // Estado para edición de productos
  const [editingProduct, setEditingProduct] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [formData, setFormData] = useState({
    product_name: "",
    price_per_unit: 0,
    description: "",
    quantity: 0,
    image_url: ""
  });

  // Estado para upload de inventario
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [currentInventory, setCurrentInventory] = useState(null);

  // Estado para gestión de vistas
  const [activeTab, setActiveTab] = useState("productos"); // productos, uploadInventario, downloadInventario, addProduct, editProduct

  const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
  const token = localStorage.getItem("access_token");

  // Verificar autenticación y cargar productos al inicio
  useEffect(() => {
    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    setIsAuthenticated(true);
    fetchProducts();
  }, []);

  //---------TRAER PRODUCTOS DEL INVENTARIO-----------
  const fetchProducts = async () => {
    try {
      setLoading(true);

      // Obtener productos
      const apiUrl = baseUrl.endsWith('/')
        ? `${baseUrl}upload/get-user-products`
        : `${baseUrl}/upload/get-user-products`;

      const productsResponse = await axios.get(apiUrl, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (productsResponse.data && productsResponse.data.productos) {
        setProducts(productsResponse.data.productos);

        // Obtener información del inventario actual
        try {
          const inventoryApiUrl = baseUrl.endsWith('/')
            ? `${baseUrl}upload/current-inventory-info`
            : `${baseUrl}/upload/current-inventory-info`;

          const inventoryResponse = await axios.get(inventoryApiUrl, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });

          if (inventoryResponse.data && inventoryResponse.data.inventory_info) {
            setCurrentInventory(inventoryResponse.data.inventory_info);
          }
        } catch (inventoryError) {
          console.log("No se pudo obtener información del inventario actual", inventoryError);
        }
      }
    } catch (error) {
      console.error("Error al cargar los productos:", error);
      setError("No se pudieron cargar los productos. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  //-------MANEJO DE FORMULARIOS Y CAMPOS--------
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Convertir a número si el campo es numérico
    if (name === "price_per_unit" || name === "quantity") {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setErrorMessage(null); // Limpiar mensajes de error cuando se selecciona un archivo
  };

  // Función modificada para iniciar la edición y cambiar a la pestaña de edición
  const startEditing = (product) => {
    setEditingProduct(product.id);
    setFormData({
      product_name: product.product_name,
      price_per_unit: product.price_per_unit,
      description: product.description || "",
      quantity: product.quantity,
      image_url: product.image_url || ""
    });
    // Cambiar a la pestaña de edición
    setActiveTab("editProduct");
  };

  const cancelEditing = () => {
    setEditingProduct(null);
    setFormData({
      product_name: "",
      price_per_unit: 0,
      description: "",
      quantity: 0,
      image_url: ""
    });
    // Volver a la pestaña de productos
    setActiveTab("productos");
  };

  //---------------ELIMINAR PRODUCTOS------------------

  // Función para mostrar el modal de confirmación de eliminación
  const confirmDelete = (productId) => {
    setProductToDelete(productId);
    setShowDeleteConfirm(true);
  };

  // Función para cancelar la eliminación
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };

  // Función para eliminar un producto
  const deleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const apiUrl = baseUrl.endsWith('/')
        ? `${baseUrl}upload/delete-product/${productToDelete}`
        : `${baseUrl}/upload/delete-product/${productToDelete}`;

      const response = await axios.delete(
        apiUrl,
        {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );

      if (response.status === 200) {
        // Eliminar el producto de la lista local
        setProducts(products.filter(product => product.id !== productToDelete));

        // Mostrar mensaje de éxito
        setSuccessMessage("Producto eliminado correctamente");
        setTimeout(() => setSuccessMessage(null), 3000);

        // Cerrar el modal de confirmación
        setShowDeleteConfirm(false);
        setProductToDelete(null);
      }
    } catch (error) {
      console.error("Error al eliminar el producto:", error);

      if (error.response && error.response.status === 403) {
        setErrorMessage("No tienes permiso para eliminar este producto");
      } else {
        setErrorMessage("Error al eliminar el producto. Intenta de nuevo.");
      }

      // Cerrar el modal de confirmación
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    }
  };

  //--------ACTUALIZAR PRODUCTOS-------------
  const saveProduct = async () => {
    try {
      if (!editingProduct) return;

      const apiUrl = baseUrl.endsWith('/')
        ? `${baseUrl}upload/update-product/${editingProduct}`
        : `${baseUrl}/upload/update-product/${editingProduct}`;

      const response = await axios.put(
        apiUrl,
        formData,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.status === 200) {
        // Actualizar la lista de productos
        setProducts(products.map(product =>
          product.id === editingProduct ? { ...product, ...formData } : product
        ));

        // Mostrar mensaje de éxito
        setSuccessMessage("Producto actualizado correctamente");
        setTimeout(() => setSuccessMessage(null), 3000);

        // Volver a la pestaña de productos
        cancelEditing();
      }
    } catch (error) {
      console.error("Error al actualizar el producto:", error);
      setErrorMessage("Error al actualizar el producto. Intenta de nuevo.");
    }
  };

  //--------SUBIR NUEVO INVENTARIO EXCEL--------------
  const handleUploadInventory = async (event) => {
    event.preventDefault();
    if (!file) {
      setErrorMessage("Selecciona un archivo primero.");
      return;
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMessage("Por favor, selecciona un archivo Excel válido (.xlsx o .xls)");
      return;
    }

    setUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const apiUrl = baseUrl.endsWith('/')
        ? `${baseUrl}upload/inventory`
        : `${baseUrl}/upload/inventory`;

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

      setSuccessMessage(response.data.message);
      // Recargar productos después de subir el inventario
      fetchProducts();
      setFile(null);

      // Cambiar a la pestaña de productos automáticamente
      setActiveTab("productos");
    } catch (error) {
      console.error("Error al subir archivo:", error);
      let errorMessage = "Error desconocido";

      if (error.response && error.response.data) {
        errorMessage = error.response.data.error || error.message;
      } else {
        errorMessage = error.message;
      }

      setErrorMessage("Error al subir archivo: " + errorMessage);
    } finally {
      setUploading(false);
    }
  };

  //--------ACTUALIZAR INVENTARIO EXISTENTE--------------
  const handleUpdateInventory = async (event) => {
    event.preventDefault();
    if (!file) {
      setErrorMessage("Selecciona un archivo primero.");
      return;
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMessage("Por favor, selecciona un archivo Excel válido (.xlsx o .xls)");
      return;
    }

    setUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const apiUrl = baseUrl.endsWith('/')
        ? `${baseUrl}upload/update_inventory`
        : `${baseUrl}/upload/update_inventory`;

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

      setSuccessMessage(response.data.message);
      // Recargar después de actualizar el inventario
      fetchProducts();
      setFile(null);

      // Cambiar a la pestaña de productos automáticamente
      setActiveTab("productos");
    } catch (error) {
      console.error("Error al actualizar inventario:", error);
      let errorMessage = "Error desconocido";

      if (error.response && error.response.data) {
        errorMessage = error.response.data.error || error.message;
      } else {
        errorMessage = error.message;
      }

      setErrorMessage("Error al actualizar inventario: " + errorMessage);
    } finally {
      setUploading(false);
    }
  };

  //--------DESCARGAR INVENTARIO ACTUAL--------------
  const handleDownloadInventory = async () => {
    try {
      setDownloading(true);

      const apiUrl = baseUrl.endsWith('/')
        ? `${baseUrl}upload/download_inventory`
        : `${baseUrl}/upload/download_inventory`;

      const response = await axios.get(apiUrl, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        responseType: 'blob',
      });

      // Crear un objeto URL para el blob
      const url = window.URL.createObjectURL(new Blob([response.data]));

      // Crear elemento de descarga
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'mi_inventario.xlsx');
      document.body.appendChild(link);
      link.click();

      // Limpiar después de la descarga
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      setSuccessMessage("Inventario descargado correctamente");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Error al descargar inventario:", error);
      setErrorMessage("Error al descargar el inventario. Intenta de nuevo.");
    } finally {
      setDownloading(false);
    }
  };

  //--------DESCARGAR PLANTILLA DE INVENTARIO--------------
  const handleDownloadTemplate = async () => {
    try {
      setDownloading(true);

      const apiUrl = baseUrl.endsWith('/')
        ? `${baseUrl}upload/download_template`
        : `${baseUrl}/upload/download_template`;

      const response = await axios.get(apiUrl, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'plantilla_inventario.xlsx');
      document.body.appendChild(link);
      link.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      setSuccessMessage("Plantilla descargada correctamente");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Error al descargar plantilla:", error);
      setErrorMessage("Error al descargar la plantilla. Intenta de nuevo.");
    } finally {
      setDownloading(false);
    }
  };

  // Redirigir si no está autenticado
  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (loading) {
    return <div className="loading-container">Cargando...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  //--------------SUBIR NUEVO PRODUCTO DESDE EL FORMULARIO-----------------

  const handleNewProductChange = (e) => {
    const { name, value } = e.target;

    // Convertir a número si el campo es numérico
    if (name === "price_per_unit" || name === "quantity") {
      setNewProduct({
        ...newProduct,
        [name]: parseFloat(value) || 0
      });
    } else {
      setNewProduct({
        ...newProduct,
        [name]: value
      });
    }
  };

  // Función para manejar la subida de imágenes para el nuevo producto
  const handleProductImageUpload = async (e, isEditing = false) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!allowed_file(file.name)) {
      setErrorMessage("Tipo de archivo no permitido. Solo se aceptan imágenes (png, jpg, jpeg, gif)");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      setAddingProduct(true);

      const apiUrl = baseUrl.endsWith('/')
        ? `${baseUrl}upload/upload-product-image`
        : `${baseUrl}/upload/upload-product-image`;

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

      if (response.status === 200 && response.data.url) {
        if (isEditing) {
          // Si estamos editando, actualiza formData
          setFormData({
            ...formData,
            image_url: response.data.url
          });
        } else {
          // Si estamos añadiendo un nuevo producto
          setNewProduct({
            ...newProduct,
            image_url: response.data.url
          });
        }
        setSuccessMessage("Imagen subida correctamente");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      setErrorMessage("Error al subir la imagen. Intenta de nuevo.");
    } finally {
      setAddingProduct(false);
    }
  };

  // enviar el formulario del nuevo producto
  const handleAddProduct = async (e) => {
    e.preventDefault();

    // Validación básica
    if (!newProduct.product_name || newProduct.price_per_unit <= 0) {
      setErrorMessage("El nombre y el precio son obligatorios");
      return;
    }

    try {
      setAddingProduct(true);

      const apiUrl = baseUrl.endsWith('/')
        ? `${baseUrl}upload/add-product`
        : `${baseUrl}/upload/add-product`;

      const response = await axios.post(
        apiUrl,
        newProduct,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.status === 201 || response.status === 200) {
        // Añadir el nuevo producto a la lista
        setProducts([...products, response.data.product]);

        // Limpiar el formulario
        setNewProduct({
          product_name: "",
          price_per_unit: 0,
          description: "",
          quantity: 0,
          image_url: ""
        });

        // Mensaje de éxito
        setSuccessMessage("Producto añadido correctamente");
        setTimeout(() => setSuccessMessage(null), 3000);

        // Cambiar a la pestaña de productos
        setActiveTab("productos");
      }
    } catch (error) {
      console.error("Error al añadir el producto:", error);

      if (error.response && error.response.data && error.response.data.error) {
        setErrorMessage(error.response.data.error);
      } else {
        setErrorMessage("Error al añadir el producto. Intenta de nuevo.");
      }
    } finally {
      setAddingProduct(false);
    }
  };

  const allowed_file = (filename) => {
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif'];
    const extension = filename.split('.').pop().toLowerCase();
    return allowedExtensions.includes(extension);
  };

  // ----------------------RENDERIZAR COMPONENTE------------------------

  return (
    <div className="inventory-panel">
      <h1 className="panel-title">Gestión de Inventario</h1>

      {/* Mensajes de error y éxito */}
      {errorMessage && (
        <ErrorMessage2
          text={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}

      {successMessage && (
        <ErrorMessage2
          text={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {/* Modal de confirmación para eliminar producto */}
      {showDeleteConfirm && (
        <div className="overlay">
          <div className="message-box-error">
            <p>¿Estás seguro de que deseas eliminar este producto?</p>
            <div className="confirm-buttons">
              <button type="button" className="box-btn-2" onClick={cancelDelete}>
                Cancelar
              </button>
              <button type="button" className="box-btn-1" onClick={deleteProduct}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pestañas de navegación - Ahora ocultamos la pestaña de edición cuando no estamos editando */}
      <div className="inventory-tabs">
        <button
          className={`tab-button ${activeTab === 'productos' ? 'active' : ''}`}
          onClick={() => setActiveTab('productos')}
        >
          Productos
        </button>

        <button
          className={`tab-button ${activeTab === 'addProduct' ? 'active' : ''}`}
          onClick={() => setActiveTab('addProduct')}
        >
          Añadir Producto
        </button>

        {editingProduct && (
          <button
            className={`tab-button ${activeTab === 'editProduct' ? 'active' : ''}`}
            onClick={() => setActiveTab('editProduct')}
          >
            Editar Producto
          </button>
        )}

        <button
          className={`tab-button ${activeTab === 'uploadInventario' ? 'active' : ''}`}
          onClick={() => setActiveTab('uploadInventario')}
        >
          Cargar Inventario
        </button>
        <button
          className={`tab-button ${activeTab === 'downloadInventario' ? 'active' : ''}`}
          onClick={() => setActiveTab('downloadInventario')}
        >
          Descargar Inventario
        </button>
      </div>

      {/*  inventario actual - visible en todas las pestañas */}
      <div className="inventory-info">
        {currentInventory ? (
          <div className="current-inventory-info">
            <span className="inventory-label">Inventario actual: </span>
            <span className="inventory-name">{currentInventory.name}</span>
            {currentInventory.last_updated && (
              <span className="inventory-date">
                (Última actualización: {new Date(currentInventory.last_updated).toLocaleDateString()})
              </span>
            )}
          </div>
        ) : products.length > 0 ? (
          <span className="inventory-label">Inventario activo (sin archivo asociado)</span>
        ) : (
          <span className="inventory-label">No hay inventario activo</span>
        )}
      </div>

      {/* -------------------------PESTAÑA PRODUCTOS----------------------------- */}
      {activeTab === 'productos' && (
        <div className="tab-content">
          <div className="table-container">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Imagen</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.length > 0 ? (
                  products.map(product => (
                    <tr key={product.id}>
                      <td>{product.id}</td>
                      <td>{product.product_name}</td>
                      <td>${product.price_per_unit.toFixed(2)}</td>
                      <td>{product.description}</td>
                      <td>{product.quantity}</td>
                      <td>
                        <img
                          src={product.image_url}
                          alt={product.product_name}
                          className="product-thumbnail"
                          onError={(e) => { e.target.src = "https://placehold.co/600x400/EEE/31343C" }}
                        />
                      </td>
                      <td>
                        <div className="btn-group">
                          <button
                            className="edit-btn"
                            onClick={() => startEditing(product)}
                          >
                            Editar
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => confirmDelete(product.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="no-products">
                      No hay productos en el inventario.
                      <br />
                      <button
                        className="empty-state-btn"
                        onClick={() => setActiveTab('uploadInventario')}
                      >
                        Subir archivo Excel para empezar
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------PESTAÑA CARGAR INVENTARIO-------------------- */}
      {activeTab === 'uploadInventario' && (
        <div className="tab-content upload-tab">
          <div className="upload-container">
            <h2>Subir Inventario</h2>

            <div className="upload-instructions">
              <p>Sube un archivo Excel con las siguientes columnas:</p>
              <ul>
                <li><strong>nombre_del_producto</strong> - Nombre del producto</li>
                <li><strong>precio_por_unidad</strong> - Precio (sólo números, usar punto para decimales)</li>
                <li><strong>descripción</strong> - Descripción del producto</li>
                <li><strong>unidades</strong> - Cantidad disponible (número entero)</li>
              </ul>
              <p><strong>¿No tienes un archivo de inventario?</strong> Descarga nuestra <button
                className="template-link"
                onClick={handleDownloadTemplate}
                disabled={downloading}
              >
                plantilla de inventario
              </button></p>
            </div>

            <div className="file-selector">
              <div className="file-input-container">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  disabled={uploading}
                  id="fileInput"
                />
                <label htmlFor="fileInput" className="file-label">
                  {file ? file.name : "Seleccionar archivo Excel"}
                </label>
              </div>

              {file && (
                <div className="file-actions">
                  <h3>¿Cómo quieres procesar este archivo?</h3>

                  <div className="action-buttons">
                    <button
                      onClick={handleUpdateInventory}
                      disabled={uploading}
                      className="action-button update-btn"
                    >
                      {uploading ? "Procesando..." : "Actualizar inventario existente"}
                    </button>

                    <button
                      onClick={handleUploadInventory}
                      disabled={uploading}
                      className="action-button replace-btn"
                    >
                      {uploading ? "Procesando..." : "Reemplazar inventario completo"}
                    </button>
                  </div>

                  <div className="action-description">
                    <p><strong>Actualizar inventario:</strong> Modifica productos existentes y añade nuevos sin eliminar productos que no estén en el archivo.</p>
                    <p><strong>Reemplazar inventario:</strong> Elimina todo el inventario anterior y lo reemplaza con el contenido del archivo.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/*----------------------------- PESTAÑA DESCARGAR INVENTARIO------------------- */}
      {activeTab === 'downloadInventario' && (
        <div className="tab-content download-tab">
          <div className="download-container">
            <h2>Opciones de Exportación</h2>

            <div className="download-options">
              <div className="download-option">
                <h3>Descargar inventario actual</h3>
                <p>Obtén un archivo Excel con todos los productos actualmente en tu inventario.</p>
                <button
                  onClick={handleDownloadInventory}
                  disabled={downloading || products.length === 0}
                  className="action-button download-btn"
                >
                  {downloading ? "Descargando..." : "Descargar inventario completo"}
                </button>
                {products.length === 0 && (
                  <p className="empty-notice">No hay productos que descargar</p>
                )}
              </div>

              <div className="download-option">
                <h3>Descargar plantilla vacía</h3>
                <p>Obtén una plantilla Excel vacía con las columnas correctas para crear tu inventario.</p>
                <button
                  onClick={handleDownloadTemplate}
                  disabled={downloading}
                  className="action-button template-btn"
                >
                  {downloading ? "Descargando..." : "Descargar plantilla"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*------------- PESTAÑA DE AÑADIR PRODUCTO--------------- */}
      {activeTab === 'addProduct' && (
        <div className="tab-content add-product-tab">
          <div className="add-product-container">
            <h2>Añadir Nuevo Producto</h2>
            
            <form onSubmit={handleAddProduct} className="add-product-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="product_name">Nombre del producto*</label>
                  <input
                    type="text"
                    id="product_name"
                    name="product_name"
                    value={newProduct.product_name}
                    onChange={handleNewProductChange}
                    required
                    className="form-input"
                    placeholder="Ej: Camiseta de algodón"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="price_per_unit">Precio por unidad*</label>
                  <input
                    type="number"
                    id="price_per_unit"
                    name="price_per_unit"
                    value={newProduct.price_per_unit}
                    onChange={handleNewProductChange}
                    required
                    min="0"
                    step="0.01"
                    className="form-input"
                    placeholder="Ej: 19.99"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Descripción</label>
                <textarea
                  id="description"
                  name="description"
                  value={newProduct.description}
                  onChange={handleNewProductChange}
                  className="form-input"
                  rows="3"
                  placeholder="Describe el producto..."
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="quantity">Cantidad disponible*</label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={newProduct.quantity}
                    onChange={handleNewProductChange}
                    required
                    min="0"
                    className="form-input"
                    placeholder="Ej: 100"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="image_url">URL de imagen</label>
                  <div className="input-with-clear">
                    <input
                      type="text"
                      id="image_url"
                      name="image_url"
                      value={newProduct.image_url}
                      onChange={handleNewProductChange}
                      className="form-input"
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div className="image-upload-container">
                    <p>O sube una imagen:</p>
                    <div className="file-input-wrapper">
                      <input
                        type="file"
                        accept=".png, .jpg, .jpeg, .gif"
                        onChange={(e) => handleProductImageUpload(e, false)}
                        id="productImageUpload"
                        className="file-input"
                      />
                      <label htmlFor="productImageUpload" className="file-input-label">
                        {newProduct.image_url ? "Cambiar imagen" : "Seleccionar imagen"}
                      </label>
                      {newProduct.image_url && (
                        <button 
                          type="button" 
                          className="clear-upload-btn" 
                          onClick={() => setNewProduct({...newProduct, image_url: ""})}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {newProduct.image_url && (
                <div className="image-preview">
                  <div className="preview-header">
                    <p>Vista previa:</p>
                    <button 
                      type="button" 
                      className="remove-preview-btn" 
                      onClick={() => setNewProduct({...newProduct, image_url: ""})}
                    >
                      Eliminar imagen
                    </button>
                  </div>
                  <div className="preview-container">
                    <img
                      src={newProduct.image_url}
                      alt="Vista previa"
                      className="preview-img"
                      onError={(e) => {e.target.src = "https://placehold.co/600x400/EEE/31343C"}}
                    />
                  </div>
                </div>
              )}
              
              <div className="form-actions">
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={addingProduct}
                >
                  {addingProduct ? "Guardando..." : "Añadir Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/*------------- PESTAÑA DE EDITAR PRODUCTO (NUEVO) --------------- */}
      {activeTab === 'editProduct' && editingProduct && (
        <div className="tab-content edit-product-tab">
          <div className="edit-product-container">
            <h2>Editar Producto</h2>
            
            <form className="edit-product-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit_product_name">Nombre del producto*</label>
                  <input
                    type="text"
                    id="edit_product_name"
                    name="product_name"
                    value={formData.product_name}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                    placeholder="Nombre del producto"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit_price_per_unit">Precio por unidad*</label>
                  <input
                    type="number"
                    id="edit_price_per_unit"
                    name="price_per_unit"
                    value={formData.price_per_unit}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="form-input"
                    placeholder="Precio"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="edit_description">Descripción</label>
                <textarea
                  id="edit_description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="form-input"
                  rows="3"
                  placeholder="Descripción del producto"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit_quantity">Cantidad disponible*</label>
                  <input
                    type="number"
                    id="edit_quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="form-input"
                    placeholder="Cantidad"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit_image_url">URL de imagen</label>
                  <div className="input-with-clear">
                    <input
                      type="text"
                      id="edit_image_url"
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div className="image-upload-container">
                    <p>O sube una nueva imagen:</p>
                    <div className="file-input-wrapper">
                      <input
                        type="file"
                        accept=".png, .jpg, .jpeg, .gif"
                        onChange={(e) => handleProductImageUpload(e, true)}
                        id="editProductImageUpload"
                        className="file-input"
                      />
                      <label htmlFor="editProductImageUpload" className="file-input-label">
                        {formData.image_url ? "Cambiar imagen" : "Seleccionar imagen"}
                      </label>
                      {formData.image_url && (
                        <button 
                          type="button" 
                          className="clear-upload-btn" 
                          onClick={() => setFormData({...formData, image_url: ""})}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {formData.image_url && (
                <div className="image-preview">
                  <div className="preview-header">
                    <p>Vista previa:</p>
                    <button 
                      type="button" 
                      className="remove-preview-btn" 
                      onClick={() => setFormData({...formData, image_url: ""})}
                    >
                      Eliminar imagen
                    </button>
                  </div>
                  <div className="preview-container">
                    <img
                      src={formData.image_url}
                      alt="Vista previa"
                      className="preview-img"
                      onError={(e) => {e.target.src = "https://placehold.co/600x400/EEE/31343C"}}
                    />
                  </div>
                </div>
              )}
              
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={cancelEditing}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="save-btn"
                  onClick={saveProduct}
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPanel;