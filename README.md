# 🛒 SwiftCart - Full-Stack E-Commerce Website

A beginner-friendly, clean full-stack e-commerce project built using **Node.js**, **Express.js**, **MongoDB Atlas**, and vanilla **HTML5 / CSS3 / JavaScript** (no frontend frameworks).

---

## 📁 Project Structure

```text
ecommerce/
├── config/
│   └── db.js                 # MongoDB connection setup using Mongoose
├── controllers/              # Business logic for API endpoints
│   └── productController.js
├── middleware/               # Custom Express middleware
├── models/                   # Mongoose data schemas
│   └── Product.js
├── routes/                   # Express API routes
│   └── productRoutes.js
├── seeds/                    # Database seed scripts
│   └── productSeeder.js
├── css/
│   └── style.css             # Responsive styling & design tokens
├── js/                       # Vanilla frontend JavaScript modules
│   ├── main.js               # Common utilities (nav, cart badge, auth state)
│   ├── products.js           # Products listing logic
│   ├── product-details.js    # Single product view logic
│   ├── cart.js               # Cart items, quantities & totals
│   ├── auth.js               # Login and registration form handling
│   ├── checkout.js           # Checkout processing
│   └── orders.js             # Order history view logic
├── index.html                # Home page with hero & featured items
├── products.html             # Product catalog page
├── product-details.html      # Individual product view
├── cart.html                 # Shopping cart
├── login.html                # User sign-in page
├── register.html             # New account creation
├── checkout.html             # Shipping & checkout form
├── orders.html               # Customer order history
├── server.js                 # Express server (starts after DB, serves frontend)
├── .env                      # Environment variables (MONGODB_URI, PORT, JWT_SECRET)
├── package.json              # Scripts & dependencies
├── .gitignore                # Ignored files (node_modules, .env)
└── README.md                 # Project documentation
```

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas (Cloud) with Mongoose ODM
- **Authentication:** JSON Web Tokens (`jsonwebtoken`) & password hashing (`bcryptjs`)
- **Environment & Dev:** `dotenv`, `cors`, `nodemon`

---

## 🌐 MongoDB Atlas Setup Guide (Step-by-Step)

Follow these steps to configure your free cloud database on MongoDB Atlas:

### Step 1: Create a MongoDB Atlas Cluster
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and sign in or create a free account.
2. In the dashboard, click **"Create"** or **"Build a Database"**.
3. Choose the **M0 Free** tier (Shared Cluster).
4. Select a cloud provider (AWS, Google Cloud, or Azure) and a region closest to you.
5. Give your cluster a name (e.g., `Cluster0`) and click **"Create Deployment"**.

---

### Step 2: Create a Database User
1. In the left navigation menu, go to **Security** > **Database Access**.
2. Click the green **"Add New Database User"** button.
3. Select **Password** as the authentication method.
4. Enter a **Username** (e.g., `my_app_user`).
5. Enter a **Password** (or click "Autogenerate Secure Password").
   > ⚠️ **Important:** Write down or copy this password safely. Avoid special characters like `@`, `:`, or `/` in your password, or URL-encode them.
6. Under **Database User Privileges**, select **Read and write to any database**.
7. Click **"Add User"**.

---

### Step 3: Allow Your IP Address (Network Access)
By default, MongoDB Atlas blocks all incoming traffic for security.
1. In the left navigation menu, go to **Security** > **Network Access**.
2. Click **"Add IP Address"**.
3. Choose either:
   - **"Add Current IP Address"**: Allows access only from your current internet connection.
   - **"Allow Access from Anywhere"** (`0.0.0.0/0`): Recommended for local development so the connection won't break when your dynamic IP changes.
4. Click **"Confirm"**. Wait ~1 minute until the status shows **Active**.

---

### Step 4: Find Your MongoDB Connection String
1. In the left navigation menu, go to **Deployment** > **Database**.
2. Locate your cluster and click the **"Connect"** button.
3. Under "Connect to your application", select **"Drivers"**.
4. Choose **Node.js** as the driver and version **5.5 or later**.
5. Copy the connection string. It will look like this:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   *(Note: The `xxxxx` is your cluster's unique address automatically assigned by MongoDB Atlas).*

---

### Step 5: Put the Connection String into `.env`
1. Open the file `.env` in the root folder.
2. Paste your copied connection string into the `MONGODB_URI` variable:
   - Replace `<username>` with the username you created in Step 2.
   - Replace `<password>` with the user password you created in Step 2.
   - (Optional) Specify the database name before the `?` query parameter, e.g., `/ecommerce?retryWrites=true&w=majority`.

Your `.env` should look like this:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/ecommerce?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_super_secret_12345
NODE_ENV=development
```

> 🔒 **Security Notice:** `.env` is listed in `.gitignore` and must **never** be committed to GitHub or public repositories.

---

### Step 6: Start the Backend

Make sure your terminal is in the project root directory:

```bash
# Start in development mode with nodemon (auto-reload on code change)
npm run dev

# Or start in standard mode
npm start
```

When MongoDB Atlas connects successfully, you will see in your console:
```text
🔄 Connecting to MongoDB Atlas...
✅ [MongoDB] Connected successfully: cluster0-shard-00-00.xxxxx.mongodb.net
📦 [MongoDB] Database name: ecommerce
🚀 Server successfully running on port 5000
📡 Health Check URL: http://localhost:5000/api/health
🌐 Frontend URL:     http://localhost:5000
```

---

## 🧪 Testing the Server

1. **Health Check Endpoint:**
   Open your browser or run:
   ```bash
   curl http://localhost:5000/api/health
   ```
   **Expected Response:**
   ```json
   {
     "status": "success",
     "message": "API is running",
     "mongodb": "connected",
     "timestamp": "2026-09-20T..."
   }
   ```

2. **Frontend UI:**
   Open `http://localhost:5000` in your browser to view the store homepage, browse products, access the cart, and test user login and registration forms.

---

## 📦 Database Seeding (Sample Products)

The project includes an idempotent seed script with 10 sample products (tech gadgets, apparel, audio, and lifestyle gear) with high-resolution imagery and realistic prices.

### How to Seed Products
Once your MongoDB Atlas connection in `backend/.env` is active:

```bash
npm run seed
```

> **Duplicate Prevention**: The seeder uses an upsert strategy matching each product by its unique `name`. Running `npm run seed` multiple times will update the existing records rather than inserting duplicate products.

### To Reset / Clear the Catalog:
If you ever want to completely wipe the catalog and re-seed from scratch:
```bash
npm run seed:destroy
```

---

## 📡 Product REST API Testing Guide

All product endpoints are exposed under `/api/products`.

### 1. Get All Products
Fetches the entire product catalog. Supports optional query filters (`?category=Electronics`, `?search=headphones`, `?sort=price-asc`).

- **Endpoint:** `GET /api/products`
- **cURL:**
  ```bash
  curl http://localhost:5000/api/products
  ```
- **PowerShell:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:5000/api/products" -Method Get | ConvertTo-Json -Depth 5
  ```

---

### 2. Get Product by ID
Retrieves details for a specific product.

- **Endpoint:** `GET /api/products/:id`
- **Example cURL:**
  ```bash
  curl http://localhost:5000/api/products/<PRODUCT_ID>
  ```
- **PowerShell:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:5000/api/products/<PRODUCT_ID>" -Method Get | ConvertTo-Json -Depth 5
  ```

---

### 3. Create a New Product
Adds a new item to the store catalog.

- **Endpoint:** `POST /api/products`
- **Headers:** `Content-Type: application/json`
- **Payload:**
  ```json
  {
    "name": "Wireless Gaming Headset",
    "description": "Ultra low-latency 2.4GHz wireless gaming headset with 7.1 surround sound.",
    "price": 129.99,
    "category": "Electronics",
    "stock": 20,
    "image": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80"
  }
  ```
- **cURL:**
  ```bash
  curl -X POST http://localhost:5000/api/products \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Wireless Gaming Headset\",\"description\":\"Ultra low-latency 2.4GHz wireless gaming headset with 7.1 surround sound.\",\"price\":129.99,\"category\":\"Electronics\",\"stock\":20}"
  ```
- **PowerShell:**
  ```powershell
  $body = @{
    name = "Wireless Gaming Headset"
    description = "Ultra low-latency 2.4GHz wireless gaming headset with 7.1 surround sound."
    price = 129.99
    category = "Electronics"
    stock = 20
  } | ConvertTo-Json

  Invoke-RestMethod -Uri "http://localhost:5000/api/products" -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json
  ```

---

### 4. Update an Existing Product
Updates one or more fields of an existing product.

- **Endpoint:** `PUT /api/products/:id`
- **Headers:** `Content-Type: application/json`
- **cURL:**
  ```bash
  curl -X PUT http://localhost:5000/api/products/<PRODUCT_ID> \
    -H "Content-Type: application/json" \
    -d "{\"price\":119.99,\"stock\":15}"
  ```
- **PowerShell:**
  ```powershell
  $body = @{
    price = 119.99
    stock = 15
  } | ConvertTo-Json

  Invoke-RestMethod -Uri "http://localhost:5000/api/products/<PRODUCT_ID>" -Method Put -Body $body -ContentType "application/json" | ConvertTo-Json
  ```

---

### 5. Delete a Product
Removes a product from the database.

- **Endpoint:** `DELETE /api/products/:id`
- **cURL:**
  ```bash
  curl -X DELETE http://localhost:5000/api/products/<PRODUCT_ID>
  ```
- **PowerShell:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:5000/api/products/<PRODUCT_ID>" -Method Delete | ConvertTo-Json
  ```
