import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import LandingPage from "./LandingPage";
import "./styles.css";
import "./landing.css";

const isAppRoute = window.location.pathname === "/app" || window.location.pathname.startsWith("/app/");
document.body.classList.toggle("landing-page-body", !isAppRoute);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isAppRoute ? <App /> : <LandingPage />}
  </React.StrictMode>,
);
