import React, { useState, useEffect } from 'react';
import '../Styles/Profile.css';

const Profile = () => {
  const [userData, setUserData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    shopname: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({...userData});
  const [message, setMessage] = useState({ text: '', type: '' });

  // Cargar datos del usuario
  useEffect(() => {
    try {
      const storedData = JSON.parse(localStorage.getItem('userData') || '{}');
      if (storedData) {
        setUserData({
          firstname: storedData.firstname || '',
          lastname: storedData.lastname || '',
          email: storedData.email || '',
          shopname: storedData.shopname || ''
        });
        setFormData({
          firstname: storedData.firstname || '',
          lastname: storedData.lastname || '',
          email: storedData.email || '',
          shopname: storedData.shopname || ''
        });
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Aquí irá la lógica para actualizar los datos en el backend
      // Por ahora solo actualizamos localmente
      
      // Actualizar localStorage
      const storedData = JSON.parse(localStorage.getItem('userData') || '{}');
      const updatedData = { ...storedData, ...formData };
      localStorage.setItem('userData', JSON.stringify(updatedData));
      
      // Actualizar estado
      setUserData(formData);
      setIsEditing(false);
      
      setMessage({
        text: 'Datos actualizados correctamente',
        type: 'success'
      });
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
      
    } catch (error) {
      console.error('Error al actualizar datos:', error);
      setMessage({
        text: 'Error al actualizar los datos',
        type: 'error'
      });
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2>Perfil de Usuario</h2>
        
        {message.text && (
          <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {message.text}
          </div>
        )}
        
        {!isEditing ? (
          <div className="profile-details">
            <div className="detail-group">
              <label>Nombre:</label>
              <p>{userData.firstname}</p>
            </div>
            
            <div className="detail-group">
              <label>Apellido:</label>
              <p>{userData.lastname}</p>
            </div>
            
            <div className="detail-group">
              <label>Email:</label>
              <p>{userData.email}</p>
            </div>
            
            <div className="detail-group">
              <label>Nombre de tienda:</label>
              <p>{userData.shopname}</p>
            </div>
            
            <button 
              className="btn btn-primary" 
              onClick={() => setIsEditing(true)}
            >
              Editar perfil
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label htmlFor="firstname">Nombre</label>
              <input
                type="text"
                id="firstname"
                name="firstname"
                value={formData.firstname}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="lastname">Apellido</label>
              <input
                type="text"
                id="lastname"
                name="lastname"
                value={formData.lastname}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="shopname">Nombre de tienda</label>
              <input
                type="text"
                id="shopname"
                name="shopname"
                value={formData.shopname}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-buttons">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setIsEditing(false);
                  setFormData({...userData});
                }}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Guardar cambios
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;