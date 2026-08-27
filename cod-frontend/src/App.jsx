import ProductList from "./components/ProductList";
import "./App.css";

function App() {
  return (
    <div className="app">
      <header className="header">
        <div>
          <h1 style={{color:"black"}}>Shopify COD App</h1>

          <p>
            Select a product and place your order using
            Cash on Delivery.
          </p>
        </div>
      </header>

      <main className="container">
        <ProductList />
      </main>
    </div>
  );
}

export default App;