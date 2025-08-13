import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Add CORS and security headers for Shopify embedded apps
app.use((req, res, next) => {
  // Allow embedding in Shopify admin
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com");
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Environment variables (you'll need to set these)
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_inventory,write_inventory';
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://becoming-quail-reasonably.ngrok-free.app/auth/callback';

// Debug environment variables
console.log('Environment variables loaded:');
console.log('SHOPIFY_CLIENT_ID:', SHOPIFY_CLIENT_ID ? '***' : 'undefined');
console.log('SHOPIFY_CLIENT_SECRET:', SHOPIFY_CLIENT_SECRET ? '***' : 'undefined');
console.log('SHOPIFY_SCOPES:', SHOPIFY_SCOPES);
console.log('REDIRECT_URI:', REDIRECT_URI);

// OAuth initiation endpoint
app.get('/auth', (req, res) => {
  const { shop } = req.query;
  
  if (!shop) {
    return res.status(400).json({ error: 'Shop parameter is required' });
  }

  // Redirect to Shopify OAuth
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=${SHOPIFY_SCOPES}&redirect_uri=${REDIRECT_URI}`;
  res.redirect(authUrl);
});

// OAuth callback endpoint
app.get('/auth/callback', async (req, res) => {
  const { shop, code } = req.query;
  
  if (!shop || !code) {
    return res.status(400).json({ error: 'Shop and code parameters are required' });
  }

  try {
    console.log('OAuth callback received:', { shop, code });
    console.log('Using credentials:', { 
      client_id: SHOPIFY_CLIENT_ID, 
      client_secret: SHOPIFY_CLIENT_SECRET ? '***' : 'undefined' 
    });

    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code
      })
    });

    console.log('Token response status:', tokenResponse.status);
    console.log('Token response headers:', Object.fromEntries(tokenResponse.headers.entries()));

    // Check if response is JSON
    const contentType = tokenResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await tokenResponse.text();
      console.error('Non-JSON response received:', text.substring(0, 500));
      throw new Error(`Expected JSON response, got ${contentType}. Response: ${text.substring(0, 200)}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token data received:', { ...tokenData, access_token: tokenData.access_token ? '***' : 'undefined' });

    if (!tokenData.access_token) {
      throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
    }

    console.log('OAuth successful! Access token obtained.');
    console.log('Note: Token storage is handled by shopify-connector for other Lambda functions.');

    // Redirect to the app with shop context
    res.redirect(`/?shop=${shop}&installed=true`);

  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: 'OAuth failed', details: error.message });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
