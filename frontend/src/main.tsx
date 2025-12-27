import "reflect-metadata";
import React from "react";
import ReactDOM from "react-dom/client";
import { WalletProvider } from "./providers/WalletProvider";
import App from "./App";
import "./cxc-main.css";
import "./cxc-responsive.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>,
);
