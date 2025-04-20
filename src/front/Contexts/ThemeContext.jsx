import React, { createContext, useContext, useState, useEffect } from 'react';

// Creamos el contexto
const ThemeContext = createContext();

// Hook personalizado para usar el contexto
export const useTheme = () => useContext(ThemeContext);

// Proveedor del tema
export const ThemeProvider = ({ children }) => {
  // Intentar obtener el tema guardado, si no existe usar 'light'
  const getSavedTheme = () => {
    const savedTheme = localStorage.getItem('userTheme');
    return savedTheme || 'light';
  };

  const [theme, setTheme] = useState(getSavedTheme());

  // Función para cambiar entre temas
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('userTheme', newTheme);
    
    // Si hay datos de usuario, actualizar también allí
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      userData.theme = newTheme;
      localStorage.setItem('userData', JSON.stringify(userData));
    } catch (error) {
      console.error('Error al actualizar el tema en userData:', error);
    }
  };

  // Aplicar el tema al documento
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // También agregar/quitar la clase .dark-theme al body como alternativa
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [theme]);

  // Escuchar cambios en localStorage (por si se cambia en otra pestaña)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'userTheme') {
        setTheme(e.newValue || 'light');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;