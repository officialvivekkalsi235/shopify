const API_URL = "http://localhost:5000/api";

export const getProducts = async () => {
  const response = await fetch(`${API_URL}/shopify/products`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to load products");
  }

  return data.products;
};