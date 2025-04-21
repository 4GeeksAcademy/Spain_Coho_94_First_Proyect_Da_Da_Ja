import { createContext, useContext, useState, useEffect } from "react";
import "../components/Styles/theme-variables.css";

const ThemeContext = createContext();

export const useTheme = () => {
  return useContext(ThemeContext);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

 
    useEffect(() => {
      // Guardar en localStorage
      localStorage.setItem('userTheme', theme);
      
      // Aplicar clase al body
      if (theme === 'dark') {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
      }
    }, [theme]);


  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");
  

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
