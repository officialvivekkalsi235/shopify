const getShopifyAccessToken = async () => {
    const response = await fetch(
      `https://${process.env.SHOPIFY_STORE}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
  
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: process.env.SHOPIFY_CLIENT_ID,
          client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        }),
      }
    );
  
    const data = await response.json();
  
    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }
  
    return data.access_token;
  };
  
  const shopifyGraphQL = async (query, variables = {}) => {
    const accessToken = await getShopifyAccessToken();
  
    const response = await fetch(
      `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
  
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
  
        body: JSON.stringify({
          query,
          variables,
        }),
      }
    );
  
    const data = await response.json();
  
    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }
  
    if (data.errors) {
      throw new Error(JSON.stringify(data.errors));
    }
  
    return data;
  };
  
  module.exports = {
    getShopifyAccessToken,
    shopifyGraphQL,
  };