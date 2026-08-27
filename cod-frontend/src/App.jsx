import ProductList from "./components/ProductList";
import PincodeSettings from "./components/PincodeSettings";
import "./App.css";
import { useState } from "react";

function App() {
  const [showpincodeSettings, setShowPincodeSettings] = useState(false);
  return (
    <div className="app">
      <header className="header">
        <div>
          <h1 style={{ color: "black" }}>Shopify COD App</h1>
          <p>Select a product and place your order using Cash on Delivery.</p>
        </div>
      </header>

      <button
        style={{
          position: "relative",
          left: "33%",
          backgroundColor: "#008060",
          borderRadius: "8px",
        }}
        onClick={() => setShowPincodeSettings((show) => !show)}
      >
        {showpincodeSettings
          ? "Hide Add/Remove Pin codes"
          : "Show Add/Remove Pin codes"}
      </button>
      {showpincodeSettings && <PincodeSettings />}

      {!showpincodeSettings && (
        <main className="container">
          <ProductList />
        </main>
      )}
    </div>
  );
}

export default App;
