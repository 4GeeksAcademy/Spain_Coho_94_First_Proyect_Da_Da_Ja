import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useTheme } from "../Contexts/ThemeContext";
import Footer from "../components/Footer";

export const LayoutClients = () => {
  const { theme } = useTheme();

  // Actualizar el atributo data-theme en el body cuando cambie el tema
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    // También añadir/quitar la clase para estilos específicos
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }, [theme]);

  return (
    <div>
      <main>
        <Outlet />
      </main>
    </div>
  );
};
