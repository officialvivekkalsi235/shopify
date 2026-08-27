# COD Shopify App

A full-stack Shopify Cash on Delivery (COD) application built for
the COD Form assignment. The project provides a customer-facing COD
order form, creates real Shopify orders through the Admin GraphQL API,
prevents duplicate submissions with idempotency, applies basic abuse
protection, validates and normalizes customer data, and includes
merchant-controlled COD pincode settings.

## Project Overview

The application has two main sides:

-   **Storefront / Customer UI** - customers select a product, enter
    delivery details, and place a Cash on Delivery order.
-   **Backend / Merchant Logic** - validates requests, communicates
    securely with Shopify, stores supporting data in MongoDB, handles
    idempotency and rate limiting, and stores merchant settings such as
    blocked COD pincodes.

## Tech Stack

### Frontend

-   React
-   JavaScript
-   CSS
-   Fetch API

### Backend

-   Node.js
-   Express.js
-   MongoDB
-   Mongoose
-   Shopify Admin GraphQL API
-   express-rate-limit
-   dotenv
-   cors

## Main Features Implemented

### 1. Product Loading

Products and variants are loaded from Shopify through the backend
instead of exposing Shopify Admin credentials in the browser.

Typical flow:

React Storefront
      |
      v
Backend /api/shopify/products
      |
      v
Shopify Admin GraphQL API

The customer can select a product/variant of COD form.

### 2. COD Order Form

The COD modal collects:

-   Full name
-   Phone number
-   Address
-   City
-   State
-   Pincode
-   Quantity

Client-side validation is included to prevent obviously invalid
submissions.
 
### 3. Real Shopify Order Creation

After validation and customer creation, the backend creates a real
Shopify order using Shopify Admin GraphQL.

The order contains:

-   Selected variant
-   Quantity
-   Customer association
-   Customer phone
-   Shipping address
-   Billing address
-   PENDING financial status
-   COD-Form tag

This allows submitted COD orders to appear in Shopify Admin.

### 4. Indian Phone Number Normalization

Phone input is normalized before it is sent to Shopify.

Examples:
9876543210
919876543210
+91 98765 43210

are normalized to a canonical value such as:

+919876543210

Invalid Indian phone numbers are rejected by the backend.

### 5. Idempotency / Duplicate Order Protection

The frontend sends an idempotency key in the request header:
X-Idempotency-Key

The backend stores that key in MongoDB with the request state.

Example states:
processing
completed
failed

The expected behavior is:
First request with key ABC
        |
        v
Create idempotency record: processing
        |
        v
Create Shopify order
        |
        v
Update record: completed

If another request arrives with the same key while the first request is
still processing, the backend returns a conflict response instead of
creating another order.

If the same completed key is received again, the stored successful
response can be returned instead of creating a duplicate Shopify order.

This was tested separately with API requests using the same idempotency
key.

### 6. Order Success Handling

After a successful order response, the frontend can pass the result to
`onSuccess(data)` and show a success/congratulations state or popup
instead of leaving the customer on an unchanged form.

The intended customer flow is:
Place Order
    |
    v
Placing order...
    |
    v
Order created successfully
    |
    v
Congratulations / Order placed UI
    |
    v
Close COD modal

### 7. Basic Rate Limiting

Basic rate limiting is applied to the COD order endpoint with
express-rate-limit.

Example configuration:

const codOrderLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: "rate_limited",
    message:
      "Too many order requests. Please wait a minute and try again.",
  },
});

This means one IP address can send a maximum number of requests during
the configured one-minute window.

For testing, the limit can temporarily be changed to `2`. The third
request within the same minute should return HTTP
429 Too Many Requests.

Rate limiting and idempotency solve different problems:

-   **Rate limiting** protects the endpoint from excessive requests.
-   **Idempotency** protects one logical order from accidental duplicate
    creation.

### 8. Merchant COD Pincode Blocklist

A merchant setting was implemented to satisfy the storefront-to-admin
behavior requirement.

The merchant can maintain a list of pincodes where COD should not be
available.

Example:
145001
145025

Settings are stored in MongoDB.

Backend endpoints include:

GET /api/settings
PUT /api/settings/pincodes
GET /api/settings/check-pincode/:pincode

The merchant settings UI allows the merchant to:

-   Add a 6-digit pincode
-   Remove a pincode
-   View the current blocked list
-   Save settings
-   See success/error feedback

### 9. Storefront Behavior From Merchant Settings

When a customer enters a complete 6-digit pincode, the storefront checks
COD availability.

Example:
Merchant blocks 145025
        |
        v
Settings saved in MongoDB
        |
        v
Customer enters 145025
        |
        v
Backend reports COD unavailable
        |
        v
Storefront disables COD order action

The customer sees a message such as: Cash on Delivery is not available for this pincode.

The backend also checks the blocklist before order creation so the
restriction cannot be bypassed by directly calling the order API.

This demonstrates a genuine merchant-setting round trip: changing a
setting in the admin/settings UI changes storefront behavior.

### 10. Security

The project follows these security rules:

-   Shopify Admin credentials remain on the backend.
-   Secrets are loaded from environment variables.
-   Admin credentials are not sent to React.
-   Customer input is validated.
-   Phone numbers are normalized.
-   COD order requests are rate limited.
-   Idempotency prevents duplicate order processing.
-   Merchant pincode restrictions are enforced server-side as well as in
    the UI.

  
## Backend Setup

### 1. Install Dependencies
Open the backend folder:
cd cod-shopify-backend

Install dependencies:
npm install

If needed:
npm install express mongoose cors dotenv express-rate-limit

### 2. Start MongoDB
For a local MongoDB installation, make sure MongoDB is running.
Example local connection:
mongodb://127.0.0.1:27017/cod_shopify

### 3. Create `.env`
Create:
cod-shopify-backend/.env

Use environment variables similar to:
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/cod_shopify

SHOPIFY_STORE=your-store.myshopify.com
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
SHOPIFY_API_VERSION=your_supported_api_version

**Never commit real Shopify credentials to Git.**
If a real secret has ever been committed, posted publicly, or otherwise
exposed, rotate/revoke it in Shopify and replace it with a new
credential.

### 4. `.gitignore`
Your backend .gitignore should include:
node_modules/
.env

### 5. Start Backend
Depending on your scripts:
npm run dev

The backend should run on:
http://localhost:5000

A health route can return:

json
{
  "success": true,
  "message": "COD Shopify Backend is running"
}

## Frontend Setup
Open another terminal:
cd cod-shopify-frontend

Install dependencies:
npm install

Start the frontend:
npm run dev
Open the local URL shown by your React/Vite development server.

## Important API Endpoints

### Products
GET /api/shopify/products
Loads Shopify products and variants.

### Create COD Order
POST /api/shopify/createorder

Example request headers:
Content-Type: application/json
X-Idempotency-Key: <unique-key-for-this-order-attempt>

Example body:
{
  "name": "Test Customer",
  "phone": "9876543210",
  "address": "123 Test Street",
  "city": "Pathankot",
  "state": "Punjab",
  "pincode": "145001",
  "quantity": 1,
  "variantId": "gid://shopify/ProductVariant/..."
}

### Load Merchant Settings
GET /api/settings

### Save Blocked Pincodes
PUT /api/settings/pincodes
Example:
json
{
  "blockedPincodes": ["145001","145025"]
}

### Check COD Availability
GET /api/settings/check-pincode/145025

Example blocked response:
json
{
  "success": true,
  "pincode": "145025",
  "blocked": true,
  "codAvailable": false,
  "message": "Cash on Delivery is not available for this pincode."
}
## How to Test the Complete Application
### Test 1 - Product Loading
1.  Start MongoDB.
2.  Start the backend.
3.  Start the frontend.
4.  Open the storefront.
5.  Confirm Shopify products and variants load.

### Test 2 - Normal COD Order
1.  Select a product/variant.
2.  Open the COD modal.
3.  Enter valid customer details.
4.  Use a new valid phone number if testing Shopify customer creation.
5.  Enter an allowed pincode.
6.  Click **Place Order**.
7.  Confirm the request succeeds.
8.  Confirm the success/congratulations UI appears.
9.  Open Shopify Admin and confirm the order exists.

### Test 3 - Phone Normalization
Test formats such as:
9876543210
919876543210
+91 98765 43210
Verify the backend normalizes them before sending the phone to Shopify.

### Test 4 - Idempotency
Use Postman or another API client.
Send the same request multiple times using exactly the same:
X-Idempotency-Key

Expected behavior:
-   First request starts processing.
-   A duplicate request while processing is rejected/marked as already
    processing.
-   Once completed, another request with the same key must not create
    another Shopify order.

Use a different idempotency key when testing a genuinely new order.

### Test 5 - Rate Limiting
Temporarily configure:
limit: 2
Send three requests quickly from the same IP.

Expected:
Request 1 -> allowed
Request 2 -> allowed
Request 3 -> HTTP 429
After testing, restore the normal limit.

### Test 6 - Merchant Pincode Setting
1.  Open the merchant pincode settings UI.
2.  Add `145025`.
3.  Click **Save Settings**.
4.  Confirm it is stored.
5.  Open the customer COD form.
6.  Enter `145025`.
7.  Confirm COD becomes unavailable.
8.  Remove `145025` from merchant settings and save.
9.  Check the same pincode again.
10. Confirm COD becomes available.

This is the key demonstration of the merchant setting changing
storefront behavior.

### Test 7 - Backend Pincode Protection
Even if the frontend button is disabled, test the API directly with a
blocked pincode.
The backend should reject the order. This proves the merchant
restriction cannot be bypassed through a direct API request.

## Work Completed During Development
The project work included:
-   Shopify product and variant retrieval
-   COD modal UI
-   Customer delivery form
-   Client-side form validation
-   Shopify customer creation
-   Real Shopify order creation
-   Phone normalization
-   Handling Shopify customer validation errors
-   Idempotency key generation on the frontend
-   MongoDB idempotency records
-   Duplicate-request protection
-   Stored successful order response
-   COD order success handling
-   Basic IP-based rate limiting
-   HTTP `429` response handling
-   Merchant settings MongoDB model
-   COD pincode blocklist APIs
-   Merchant add/remove pincode settings UI
-   Improved pincode settings UI
-   Server-side blocked-pincode enforcement
-   Environment-variable configuration

## Assignment Coverage
The current implementation covers or contributes to these assignment
areas:

### Core COD Form
Customer details are collected and a real Shopify order is created.

### Idempotency
Duplicate submissions using the same idempotency key are protected from
creating multiple orders.

### Phone Normalization
Indian phone numbers are normalized into a consistent format.

### Merchant Setting
The COD pincode blocklist is configurable by the merchant and changes
storefront behavior.

### Security and Robustness
Admin credentials stay server-side, input is validated, phones are
normalized, blocked pincodes are enforced by the backend, and basic rate
limiting is applied.
 
