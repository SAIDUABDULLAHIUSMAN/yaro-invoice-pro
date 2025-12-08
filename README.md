# YAROTECH Invoice Pro - POS Receipt System

A Progressive Web App (PWA) for creating POS receipts, managing products, tracking inventory, and analyzing sales trends.

## Features

- 🧾 POS Receipt Generation (80mm thermal paper optimized)
- 📦 Product & Inventory Management
- 📊 Sales Analytics (Weekly/Monthly trends)
- 📁 Transaction History with CSV/PDF Export
- 🔐 User Authentication
- 📱 PWA with Offline Support

---

## 🚀 cPanel Deployment Guide

### Prerequisites

- Node.js 18+ installed on your local machine
- Access to cPanel hosting with File Manager
- Domain or subdomain configured

### Step 1: Build the Project Locally

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist` folder containing all the production files.

### Step 2: Prepare Environment Variables

Before building, ensure your `.env` file contains the correct Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

### Step 3: Upload to cPanel

1. **Login to cPanel** and open **File Manager**

2. **Navigate to your domain's root folder:**
   - For main domain: `public_html/`
   - For subdomain: `public_html/subdomain/` or the subdomain's document root

3. **Delete existing files** (if any) except `.htaccess` if you have custom rules

4. **Upload the `dist` folder contents:**
   - Click **Upload** in File Manager
   - Select ALL files and folders from your local `dist/` folder
   - Upload them directly to the document root (not inside a subfolder)

5. **Verify the structure** should look like:
   ```
   public_html/
   ├── .htaccess          (for SPA routing - included in build)
   ├── index.html
   ├── favicon.ico
   ├── robots.txt
   ├── assets/
   │   ├── index-xxxxx.js
   │   ├── index-xxxxx.css
   │   └── ...
   └── ...
   ```

### Step 4: Configure .htaccess for SPA Routing

The `.htaccess` file is automatically included in the build. If it's missing, create it in `public_html/` with this content:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Handle Authorization Header
  RewriteCond %{HTTP:Authorization} .
  RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
  
  # Redirect Trailing Slashes If Not A Folder
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_URI} (.+)/$
  RewriteRule ^ %1 [L,R=301]
  
  # Handle Front Controller - Routes all requests to index.html
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule ^ index.html [L]
</IfModule>

# Enable Gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain
  AddOutputFilterByType DEFLATE text/html
  AddOutputFilterByType DEFLATE text/xml
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE application/xml
  AddOutputFilterByType DEFLATE application/xhtml+xml
  AddOutputFilterByType DEFLATE application/rss+xml
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType image/x-icon "access plus 1 year"
</IfModule>
```

### Step 5: Subdirectory Deployment (Optional)

If deploying to a subdirectory (e.g., `yourdomain.com/app/`), update `vite.config.ts` before building:

```typescript
export default defineConfig({
  base: '/app/', // Add this line with your subdirectory name
  // ... rest of config
});
```

Then rebuild and upload.

### Step 6: SSL Configuration

1. In cPanel, go to **SSL/TLS** or **Let's Encrypt SSL**
2. Install a free SSL certificate for your domain
3. Enable **Force HTTPS Redirect** in cPanel or add to `.htaccess`:

```apache
# Force HTTPS (add at the top of .htaccess)
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## 🔧 Troubleshooting

### Blank Page or 404 Errors
- Ensure `.htaccess` is properly uploaded and has correct permissions (644)
- Check if `mod_rewrite` is enabled on your hosting

### API Connection Issues
- Verify Supabase URL and anon key are correct in the build
- Check CORS settings in your Supabase project
- Ensure your domain is added to Supabase allowed origins

### PWA Not Working
- SSL (HTTPS) is required for PWA features
- Clear browser cache after deployment

### Slow Loading
- Enable Gzip compression via cPanel or `.htaccess`
- Ensure caching headers are set (included in `.htaccess`)

---

## 📁 Build Output Structure

After running `npm run build`, the `dist` folder contains:

```
dist/
├── index.html              # Main entry point
├── .htaccess               # Apache routing rules
├── favicon.ico             # App icon
├── robots.txt              # Search engine rules
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # Service worker
├── workbox-*.js            # Workbox runtime
└── assets/
    ├── index-[hash].js     # Main JavaScript bundle
    ├── index-[hash].css    # Main CSS bundle
    └── [other chunks]      # Code-split chunks
```

---

## 🛠 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📚 Technology Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, shadcn/ui
- **State Management:** TanStack Query
- **Backend:** Supabase (Database, Auth, Storage)
- **Charts:** Recharts
- **PDF Generation:** jsPDF, jspdf-autotable
- **PWA:** vite-plugin-pwa, Workbox

---

## 📄 License

This project is proprietary software for YAROTECH.
