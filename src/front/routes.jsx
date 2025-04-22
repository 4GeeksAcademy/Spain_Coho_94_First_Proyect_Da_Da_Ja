import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import { Layout } from "./pages/Layout";
import { LayoutClients } from "./pages/LayoutClients";
import Home from "./pages/Home";
import { Single } from "./pages/Single";
import { Demo } from "./pages/Demo";
import PageRegister from "./pages/PageRegister";
import PageLogin from "./pages/PageLogin";
import Cart from "./pages/Cart";
import InventoryPanel from "./pages/Admin/InventoryPanel";
import StoreSettings from "./pages/Admin/StoreSettings";
import Profile from "./pages/Admin/Profile";
import ClientList from "./pages/Admin/ClientList";

//----------RUTAS DE LA STORE----------------
import StoreFront from "./pages/Store/StoreFront";
import CartPage from "./pages/Store/CartPage";
import CustomerRegister from "./pages/Store/CustomerRegister";
import CustomerLogin from "./pages/Store/CustomerLogin";
//import Catalog from "./pages/Store/Catalog";
//import ProductView from "./pages/Store/ProductView";
//import CheckoutPage from "./pages/Store/CheckoutPage";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<Layout />} errorElement={<h1>Not found!</h1>}>
        <Route path="/" element={<PageRegister />} />
        <Route path="/login" element={<PageLogin />} />
        <Route path="/home" element={<Home />} />
        <Route path="/single/:theId" element={<Single />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/cart" element={<Cart />} />

        {/* Rutas de administración */}
        <Route path="/inventory" element={<InventoryPanel />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/store-settings" element={<StoreSettings />} />
        <Route path="/clients" element={<ClientList />} />

        {/* Rutas de la tienda */}

        {/* <Route path="/tienda/:storeSlug/catalogo" element={<Catalog />} />
      <Route path="/tienda/:storeSlug/producto/:productId" element={<ProductView />} />
      <Route path="/tienda/:storeSlug/checkout" element={<CheckoutPage />} />*/}
      </Route>

      <Route path="/tienda/:storeSlug" element={<StoreFront />} />
      <Route path="/tienda/:storeSlug/carrito" element={<CartPage />} />
      <Route
        path="/tienda/:storeSlug/registro"
        element={<CustomerRegister />}
      />
      <Route path="/tienda/:storeSlug/login" element={<CustomerLogin />} />
    </>
  )
);
