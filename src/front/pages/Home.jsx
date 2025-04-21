import React from 'react';
import { useTheme } from '../Contexts/ThemeContext';
import './Styles/Home.css';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

    // Boton al menu del inventario
    const handleRegisterClick = (e) => {
      e.preventDefault();
      navigate('/'); 
  };
  
  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className='home-title'>Store4Us</h1> 
        <p className='home-text-color'>Tu plataforma de comercio electrónico todo en uno.</p>
       
        <div className="home-explication">
          <h4>¿Y que te ofrecemos?</h4>
        
          <ul>
            <li>Una gestión de inventario simplificada</li>
            <li>Un panel de administración intuitivo</li>
            <li>Personalización de tu tienda</li>
            <li>Una experiencia de usuario optimizada</li>
          </ul>
        </div>
      </div>
      
      <div className="home-access">    

        <h2 className="home-text2">Comienza ya!</h2>

          <div className="home-card">
            <h3>Gestiona tu inventario</h3>
            <p>Accede a todas las herramientas para administrar tus productos de manera eficiente.</p>
            <button className="home-btn" onClick={handleRegisterClick}>Ir al inventario </button>
          </div>
       
          <div className="home-card">
            <h3>Configura tu tienda</h3>
            <p>Personaliza la apariencia y configuración de tu tienda online.</p>
            <button className="home-btn" onClick={handleRegisterClick}>Configuración</button>

        </div>
        
      </div>
    </div>
  );
};

export default Home;