# Data Migration Scripts

These scripts help you migrate data from Supabase to MySQL.

## Scripts

### Option 1: Direct Migration (Same Machine)
Use `supabase-to-mysql.php` when you can access both Supabase and MySQL from the same machine.

```bash
# 1. Edit the configuration in supabase-to-mysql.php
# 2. Run the script
php supabase-to-mysql.php
```

### Option 2: Two-Step Migration (Different Machines)
Use this when Supabase access and MySQL are on different machines.

**Step 1: Export from Supabase (run anywhere with internet)**
```bash
# 1. Edit the configuration in export-only.php
# 2. Run the script
php export-only.php
# 3. Copy the exports/ folder to your MySQL server
```

**Step 2: Import to MySQL (run on XAMPP or cPanel)**
```bash
# 1. Place the exports/ folder in the same directory as import-from-json.php
# 2. Edit the MySQL configuration in import-from-json.php
# 3. Run the script
php import-from-json.php
```

## Configuration

### Supabase Credentials
You need your Supabase **Service Role Key** (not the anon key) to export user data.

Find it in:
1. Go to your Supabase Dashboard
2. Settings → API
3. Copy the "service_role" key (keep this secret!)

### MySQL Credentials

**For XAMPP:**
```php
$MYSQL_HOST = 'localhost';
$MYSQL_DB = 'pos_database';
$MYSQL_USER = 'root';
$MYSQL_PASS = '';  // Usually empty for XAMPP
```

**For cPanel:**
```php
$MYSQL_HOST = 'localhost';
$MYSQL_DB = 'username_posdb';  // cPanel prefixes with username
$MYSQL_USER = 'username_posuser';
$MYSQL_PASS = 'your_secure_password';
```

## Important Notes

### Password Migration
Supabase passwords cannot be exported due to security. All migrated users will have the temporary password:

```
ChangeMe123!
```

Users should change their password after first login, or you can implement a password reset feature.

### Data Integrity
- The scripts use `ON DUPLICATE KEY UPDATE` to prevent duplicate errors
- User IDs are preserved to maintain foreign key relationships
- Product and invoice data are migrated with their original IDs

### Prerequisites
- PHP 7.4+ with cURL extension
- MySQL 5.7+ or MariaDB 10.2+
- Database tables created (run `api/schema.sql` first)

## Troubleshooting

### "Failed to connect to MySQL"
- Check if MySQL is running
- Verify credentials are correct
- For cPanel, ensure user has database privileges

### "Supabase API error"
- Verify SUPABASE_URL is correct (no trailing slash)
- Make sure you're using the Service Role Key
- Check if your Supabase project is active

### "Foreign key constraint fails"
- Import users before products and invoices
- Make sure the database schema is created first

### "cURL error"
- Ensure PHP cURL extension is enabled
- Check internet connectivity for Supabase access
