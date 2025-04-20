import React from 'react';
import { useTheme } from '../Contexts/ThemeContext';

const Home = () => {
  const { theme } = useTheme();
  
  return (
    <div className="container mt-4">
      <div className="card">
        <h2>Bienvenido a Store4Us</h2>
        <p>Tu plataforma de comercio electrónico todo en uno.</p>
        <p>Tema actual: <strong>{theme === 'light' ? 'Claro' : 'Oscuro'}</strong></p>
        
        <div className="mt-4">
          <h3>Características destacadas</h3>
          <ul>
            <li>Gestión de inventario simplificada</li>
            <li>Panel de administración intuitivo</li>
            <li>Personalización de tienda</li>
            <li>Experiencia de usuario optimizada</li>
          </ul>
        </div>
      </div>
      
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <h3>Gestiona tu inventario</h3>
            <p>Accede a todas las herramientas para administrar tus productos de manera eficiente.</p>
            <button className="btn btn-primary">Ir al inventario</button>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card">
            <h3>Configura tu tienda</h3>
            <p>Personaliza la apariencia y configuración de tu tienda online.</p>
            <button className="btn btn-primary">Configuración</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;