import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./AppPro.jsx";
import "./styles.css";
import "./light-theme.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
