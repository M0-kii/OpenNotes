import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
import "@fontsource-variable/geist";
import "@fontsource-variable/heebo";
import "@fontsource-variable/lora";
import "@fontsource-variable/fraunces";
import "./styles/fonts.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
