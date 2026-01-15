# XAMPP & cPanel Deployment Guide

## Local Testing with XAMPP

### 1. Database Setup
1. Start XAMPP (Apache + MySQL)
2. Open phpMyAdmin: `http://localhost/phpmyadmin`
3. Create database: `pos_database`
4. Import `api/schema.sql`

### 2. Backend Setup
1. Copy `api/` folder to `C:\xampp\htdocs\pos\api\`
2. Edit `api/config/config.php`:
   ```php
   $host = 'localhost';
   $db   = 'pos_database';
   $user = 'root';
   $pass = '';
   ```
3. Test: `http://localhost/pos/api/auth/login.php`

### 3. Frontend Setup
1. Create `.env.local`:
   ```
   VITE_API_URL=http://localhost/pos/api
   ```
2. Run: `npm install && npm run dev`
3. Open: `http://localhost:5173`

---

## cPanel Deployment

### 1. Database
1. cPanel → MySQL Databases → Create database
2. Create user with strong password
3. Add user to database with ALL PRIVILEGES
4. phpMyAdmin → Import `api/schema.sql`

### 2. Backend
1. Update `api/config/config.php` with cPanel credentials
2. Upload `api/` to `public_html/api/`
3. Test: `https://yourdomain.com/api/auth/login.php`

### 3. Frontend
1. Update `.env.production`:
   ```
   VITE_API_URL=https://yourdomain.com/api
   ```
2. Build: `npm run build`
3. Upload `dist/` contents to `public_html/`

### 4. Configure `.htaccess` in `public_html/`:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^api/ - [L]
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```
