import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import { BrowserRouter } from "react-router";
import { Toaster } from "react-hot-toast";

import { Provider } from "react-redux";
import { store } from "./utils/store.ts";
import { CartProvider } from "./components/context/CartContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <CartProvider>
          <Toaster
            position="top-left"
            reverseOrder={false}
            gutter={12}
            toastOptions={{
              duration: 3000,
              loading: {
                style: {
                  background: "#3b82f6",
                  color: "#fff",
                },
              },
            }}
          />

          <App />
        </CartProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>
);