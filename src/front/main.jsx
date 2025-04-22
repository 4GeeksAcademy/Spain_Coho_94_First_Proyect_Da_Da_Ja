import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css' 
import { RouterProvider } from "react-router-dom";  
import { router } from "./routes";  
import { StoreProvider } from './hooks/useGlobalReducer';  
import { BackendURL } from './components/BackendURL';
import { ThemeProvider } from '../front/Contexts/ThemeContext.jsx';


const Main = () => {

    if (! import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_BACKEND_URL == "") return (
        <React.StrictMode>
            <BackendURL />
        </React.StrictMode>
    );
    return (
        <React.StrictMode>
            <StoreProvider>
                <ThemeProvider>
                
                    <RouterProvider router={router} />
                </ThemeProvider>
            </StoreProvider>
        </React.StrictMode>
    );
}

// Render the Main component into the root DOM element.
ReactDOM.createRoot(document.getElementById('root')).render(<Main />)
