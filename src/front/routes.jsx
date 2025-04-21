import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import { Layout } from "./pages/Layout";
import Home from "./pages/Home";
import { Single } from "./pages/Single";
import { Demo } from "./pages/Demo";
import PageRegister from "./pages/PageRegister";
import PageLogin from "./pages/PageLogin";
import Cart from "./pages/Cart";
import InventoryPanel from "./pages/Admin/InventoryPanel"; 
import StoreSettings from "./pages/Admin/StoreSettings"; 
import Profile from "./pages/Admin/Profile";


export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />} errorElement={<h1>Not found!</h1>} >
      <Route path="/" element={<PageRegister />} />
      <Route path="/login" element={<PageLogin />} />
      <Route path="/home" element={<Home />} />
      <Route path="/single/:theId" element={<Single />} /> 
      <Route path="/demo" element={<Demo />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/inventory" element={<InventoryPanel />} /> 
      <Route path="/profile" element={<Profile />} /> 
      <Route path="store-settings" element={<StoreSettings />} /> 
    </Route>
  )
);