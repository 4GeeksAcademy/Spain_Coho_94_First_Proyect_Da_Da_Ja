import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import "../Styles/ClientList.css";

const ClientList = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState("all");
  const [stores, setStores] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: "registrationDate",
    direction: "desc",
  });
  const [activeClient, setActiveClient] = useState(null);

  useEffect(() => {
    // Comprobar la autenticación
    const token = localStorage.getItem("access_token");
    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    setIsAuthenticated(true);

    // Cargar datos de clientes del localStorage
    loadClientsData();
  }, []);

  // Cargar datos de clientes
  const loadClientsData = () => {
    try {
      // Obtener los datos de clientes del localStorage
      const customersData = JSON.parse(
        localStorage.getItem("store_customers") || "{}"
      );

      // Transformar los datos en un array plano de clientes
      let allClients = [];
      let storesFound = new Set();

      // Para cada tienda, añadir sus clientes al array
      Object.entries(customersData).forEach(([storeSlug, storeClients]) => {
        storesFound.add(storeSlug);

        // Añadir clientes con información de su tienda
        const clientsWithStore = storeClients.map((client) => ({
          ...client,
          storeName: storeSlug, // Usamos el slug como nombre de la tienda por simplicidad
        }));

        allClients = [...allClients, ...clientsWithStore];
      });

      // Ordenar clientes por fecha de registro (más reciente primero)
      allClients.sort(
        (a, b) => new Date(b.registrationDate) - new Date(a.registrationDate)
      );

      // Establecer lista de tiendas
      setStores(Array.from(storesFound));

      // Establecer clientes y filtrados
      setClients(allClients);
      setFilteredClients(allClients);
    } catch (error) {
      console.error("Error al cargar datos de clientes:", error);
      setClients([]);
      setFilteredClients([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y ordenar clientes
  useEffect(() => {
    let result = [...clients];

    // Filtrar por tienda
    if (selectedStore !== "all") {
      result = result.filter((client) => client.storeSlug === selectedStore);
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (client) =>
          client.firstname?.toLowerCase().includes(term) ||
          client.lastname?.toLowerCase().includes(term) ||
          client.email?.toLowerCase().includes(term) ||
          client.phone?.toLowerCase().includes(term) ||
          client.address?.toLowerCase().includes(term) ||
          client.city?.toLowerCase().includes(term)
      );
    }

    // Ordenar
    if (sortConfig.key) {
      result.sort((a, b) => {
        // Manejar valores null o undefined
        if (!a[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
        if (!b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;

        // Para fechas
        if (sortConfig.key === "registrationDate") {
          return sortConfig.direction === "asc"
            ? new Date(a[sortConfig.key]) - new Date(b[sortConfig.key])
            : new Date(b[sortConfig.key]) - new Date(a[sortConfig.key]);
        }

        // Para strings
        if (typeof a[sortConfig.key] === "string") {
          return sortConfig.direction === "asc"
            ? a[sortConfig.key].localeCompare(b[sortConfig.key])
            : b[sortConfig.key].localeCompare(a[sortConfig.key]);
        }

        // Para números
        return sortConfig.direction === "asc"
          ? a[sortConfig.key] - b[sortConfig.key]
          : b[sortConfig.key] - a[sortConfig.key];
      });
    }

    setFilteredClients(result);
  }, [clients, searchTerm, selectedStore, sortConfig]);

  // Función para cambiar la ordenación
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Función para mostrar/ocultar detalles de un cliente
  const toggleClientDetails = (clientId) => {
    if (activeClient === clientId) {
      setActiveClient(null);
    } else {
      setActiveClient(clientId);
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "Fecha desconocida";
    }
  };

  // Si no está autenticado, redirigir al login
  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="client-list-container">
      <h1 className="client-list-title">Gestión de Clientes</h1>

      {loading ? (
        <div className="loading-container">Cargando datos de clientes...</div>
      ) : (
        <>
          <div className="client-list-filters">
            <div className="search-container">
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="store-filter">
              <label htmlFor="store-select">Filtrar por tienda:</label>
              <select
                id="store-select"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="store-select"
              >
                <option value="all">Todas las tiendas</option>
                {stores.map((store) => (
                  <option key={store} value={store}>
                    {store}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredClients.length > 0 ? (
            <div className="client-table-container">
              <table className="client-table">
                <thead>
                  <tr>
                    <th
                      onClick={() => requestSort("id")}
                      className={
                        sortConfig.key === "id"
                          ? `sorted-${sortConfig.direction}`
                          : ""
                      }
                    >
                      ID
                    </th>
                    <th
                      onClick={() => requestSort("firstname")}
                      className={
                        sortConfig.key === "firstname"
                          ? `sorted-${sortConfig.direction}`
                          : ""
                      }
                    >
                      Nombre
                    </th>
                    <th
                      onClick={() => requestSort("lastname")}
                      className={
                        sortConfig.key === "lastname"
                          ? `sorted-${sortConfig.direction}`
                          : ""
                      }
                    >
                      Apellido
                    </th>
                    <th
                      onClick={() => requestSort("email")}
                      className={
                        sortConfig.key === "email"
                          ? `sorted-${sortConfig.direction}`
                          : ""
                      }
                    >
                      Email
                    </th>
                    <th
                      onClick={() => requestSort("storeSlug")}
                      className={
                        sortConfig.key === "storeSlug"
                          ? `sorted-${sortConfig.direction}`
                          : ""
                      }
                    >
                      Tienda
                    </th>
                    <th
                      onClick={() => requestSort("registrationDate")}
                      className={
                        sortConfig.key === "registrationDate"
                          ? `sorted-${sortConfig.direction}`
                          : ""
                      }
                    >
                      Fecha de registro
                    </th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <React.Fragment key={client.id}>
                      <tr
                        className={
                          activeClient === client.id ? "active-row" : ""
                        }
                      >
                        <td>{client.id}</td>
                        <td>{client.firstname}</td>
                        <td>{client.lastname}</td>
                        <td>{client.email}</td>
                        <td>{client.storeSlug}</td>
                        <td>{formatDate(client.registrationDate)}</td>
                        <td>
                          <button
                            className="details-btn"
                            onClick={() => toggleClientDetails(client.id)}
                          >
                            {activeClient === client.id
                              ? "Ocultar"
                              : "Ver detalles"}
                          </button>
                        </td>
                      </tr>

                      {activeClient === client.id && (
                        <tr className="details-row">
                          <td colSpan="7">
                            <div className="client-details">
                              <div className="detail-section">
                                <h3>Información personal</h3>
                                <div className="detail-group">
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Nombre completo:
                                    </span>
                                    <span className="detail-value">{`${client.firstname} ${client.lastname}`}</span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">Email:</span>
                                    <span className="detail-value">
                                      {client.email}
                                    </span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Teléfono:
                                    </span>
                                    <span className="detail-value">
                                      {client.phone || "No proporcionado"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="detail-section">
                                <h3>Dirección</h3>
                                <div className="detail-group">
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Dirección:
                                    </span>
                                    <span className="detail-value">
                                      {client.address}
                                    </span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Ciudad:
                                    </span>
                                    <span className="detail-value">
                                      {client.city}
                                    </span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Código postal:
                                    </span>
                                    <span className="detail-value">
                                      {client.zipcode}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="detail-section">
                                <h3>Información de cuenta</h3>
                                <div className="detail-group">
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Tienda:
                                    </span>
                                    <span className="detail-value">
                                      {client.storeSlug}
                                    </span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Fecha de registro:
                                    </span>
                                    <span className="detail-value">
                                      {formatDate(client.registrationDate)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="detail-actions">
                                <button className="contact-btn">
                                  Contactar cliente
                                </button>
                                <button className="orders-btn">
                                  Ver pedidos
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-clients">
              <div className="no-clients-icon">👥</div>
              <h2>No hay clientes registrados</h2>
              <p>
                {searchTerm || selectedStore !== "all"
                  ? "No se encontraron clientes con los filtros aplicados."
                  : "Aún no hay clientes registrados en ninguna de tus tiendas."}
              </p>
              {(searchTerm || selectedStore !== "all") && (
                <button
                  className="clear-filters-btn"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedStore("all");
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          <div className="client-stats">
            <div className="stat-card">
              <h3>Total de clientes</h3>
              <div className="stat-value">{clients.length}</div>
            </div>

            <div className="stat-card">
              <h3>Clientes filtrados</h3>
              <div className="stat-value">{filteredClients.length}</div>
            </div>

            <div className="stat-card">
              <h3>Tiendas</h3>
              <div className="stat-value">{stores.length}</div>
            </div>
          </div>

          <div className="export-section">
            <button className="export-btn">Exportar a Excel</button>
            <button className="export-btn">Exportar a CSV</button>
          </div>
        </>
      )}
    </div>
  );
};

export default ClientList;
