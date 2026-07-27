import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { Provider } from "react-redux";
import { store } from "./ReceptionistComponents/IPD/redux/store";

const root = ReactDOM.createRoot(
  document.getElementById("root")
);

root.render(
  <Provider store={store}>
    <>
      <App />

      <ToastContainer
        position="top-right"
        autoClose={4000}
        newestOnTop
        pauseOnHover
        closeOnClick
      />
    </>
  </Provider>
);

serviceWorkerRegistration.register();