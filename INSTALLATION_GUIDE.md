# Campus App - Installation Guide

## Overview
This document outlines the complete setup process for the Campus App system, which uses Laravel, React/TypeScript, and MySQL within a Laragon environment.

## Prerequisites
- **Laragon** installed and running
- **Node.js** and **npm** installed
- **PHP 8.4.1** (via Laragon)
- **MySQL 8.4.3** (via Laragon)
- **Composer** installed globally

## System Stack
- **Backend**: Laravel 12.37.0
- **Frontend**: React with TypeScript
- **Build Tool**: Vite
- **Database**: MySQL (via Laragon)
- **Testing**: Pest with PHPUnit

---

## Installation Steps

### Step 1: Clone Repository
```powershell
cd c:\laragon\www
git clone <repository-url> campusapp
cd campusapp
```

### Step 2: Install PHP Dependencies
```powershell
composer install --ignore-platform-req=ext-fileinfo
```

**Note**: The `--ignore-platform-req=ext-fileinfo` flag is necessary because the fileinfo extension may not be properly detected by Composer even though it's available in the system.

### Step 3: Install Node.js Dependencies
```powershell
npm install
```

### Step 4: Create Environment Configuration File
```powershell
copy .env.example .env
```

### Step 5: Configure MySQL Database

Edit the `.env` file and update the database configuration:

**Original (.env.example)**:
```dotenv
DB_CONNECTION=sqlite
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=laravel
# DB_USERNAME=root
# DB_PASSWORD=
```

**Updated (.env)**:
```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=campusapp
DB_USERNAME=root
DB_PASSWORD=
```

### Step 6: Create MySQL Database
```powershell
& "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe" -h 127.0.0.1 -u root --protocol=tcp -e "CREATE DATABASE IF NOT EXISTS campusapp"
```

**Note**: Ensure MySQL is running in Laragon before executing this command.

### Step 7: Generate Application Encryption Key
```powershell
php artisan key:generate
```

### Step 8: Run Database Migrations
```powershell
php -d extension=pdo_mysql artisan migrate
```

**Note**: The `-d extension=pdo_mysql` flag is required to explicitly load the PDO MySQL extension. See [Error #1: PDO MySQL Driver Not Loaded](#error-1-pdo-mysql-driver-not-loaded) for details.

---

## Running the Application

### Terminal 1: Start Laravel Development Server
```powershell
cd c:\laragon\www\campusapp
php artisan serve
```
- Backend API available at: `http://localhost:8000`

### Terminal 2: Start Frontend Development Server
```powershell
cd c:\laragon\www\campusapp
npm run dev
```
- Frontend with hot reload available at: `http://localhost:5173`

Alternatively, you can use Laragon's built-in server and configure a virtual host.

### Build for Production
```powershell
npm run build
```

---

## Errors Encountered and Solutions

### Error #1: PDO MySQL Driver Not Loaded

**Error Message**:
```
Illuminate\Database\QueryException
could not find driver (Connection: mysql, SQL: select exists...)
PDOException::("could not find driver")
```

**Root Cause**: The PHP `pdo_mysql` extension was not automatically loaded by PHP, even though it was enabled in `php.ini`.

**Solution**: 
- Explicitly load the extension when running artisan commands:
  ```powershell
  php -d extension=pdo_mysql artisan migrate
  ```

**Permanent Fix** (optional): 
Ensure the following is in your `php.ini` (typically at `C:\laragon\bin\php\php-8.4.1\php.ini`):
```ini
extension=pdo_mysql
```

---

### Error #2: PHP Extension `ext-fileinfo` Missing

**Error Message** (during `composer install`):
```
Problem 1
  - league/flysystem-local is locked to version 3.30.0 and an update of this package was not requested.
  - league/flysystem-local 3.30.0 requires ext-fileinfo * -> it is missing from your system. Install or enable PHP's fileinfo extension.
```

**Root Cause**: The `fileinfo` extension was not being detected by Composer's platform requirements check, even though it was available in the PHP installation.

**Solution**: 
Use the `--ignore-platform-req` flag when installing Composer dependencies:
```powershell
composer install --ignore-platform-req=ext-fileinfo
```

This allows Composer to proceed with installation while PHP can still access the extension at runtime.

---

### Error #3: SQLite Driver Not Available

**Error Message** (when using SQLite):
```
WARN  The SQLite database configured for this application does not exist: C:\laragon\www\campusapp\database\database.sqlite.

Illuminate\Database\QueryException
could not find driver (Connection: sqlite, SQL: select exists...)
```

**Root Cause**: The system was configured to use SQLite by default (in `.env.example`), but the SQLite extension wasn't properly enabled or the database driver wasn't available.

**Solution**: 
Switch to MySQL, which is readily available in Laragon:
1. Update database connection in `.env` from `sqlite` to `mysql` (see Step 5)
2. Create the database in MySQL
3. Run migrations with the MySQL connection

---

### Error #4: MySQL Connection Refused

**Error Message**:
```
ERROR 2003 (HY000): Can't connect to MySQL server on 'localhost:3306' (10061)
```

**Root Cause**: MySQL service was not running in Laragon, or the connection protocol wasn't specified.

**Solution**:
1. Ensure Laragon is running and MySQL is started
2. Use explicit TCP protocol when connecting:
   ```powershell
   & "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe" -h 127.0.0.1 -u root --protocol=tcp -e "CREATE DATABASE IF NOT EXISTS campusapp"
   ```

---

## Troubleshooting

### Issue: npm packages show vulnerabilities
```
2 moderate severity vulnerabilities detected
```

**Solution** (if needed):
```powershell
npm audit fix
```

Note: For a development environment, vulnerabilities in dev dependencies are usually non-critical.

### Issue: Migrations fail with "table already exists"
**Solution**: The migrations have already been run. Check your database with:
```powershell
php artisan migrate:status
```

### Issue: Frontend not updating (hot reload not working)
**Solution**: 
1. Ensure `npm run dev` is running in a separate terminal
2. Check that your browser can access `http://localhost:5173`
3. Clear browser cache (Ctrl+Shift+Delete)

### Issue: CORS errors in browser console
**Solution**: This is typical for local development with separate frontend/backend servers. Ensure Laravel's CORS middleware is properly configured in `config/cors.php`.

---

## Database Migrations

The following migrations were successfully applied:

1. **0001_01_01_000000_create_users_table** - Creates users table with authentication fields
2. **0001_01_01_000001_create_cache_table** - Creates cache table for application caching
3. **0001_01_01_000002_create_jobs_table** - Creates jobs table for queue management
4. **2025_08_26_100418_add_two_factor_columns_to_users_table** - Adds two-factor authentication columns

Run `php artisan migrate:status` to view migration status.

---

## Project Structure

```
campusapp/
├── app/                    # Laravel application code
│   ├── Actions/           # Business logic actions
│   ├── Http/              # Controllers and middleware
│   ├── Models/            # Database models
│   └── Providers/         # Service providers
├── resources/
│   ├── css/               # Stylesheets
│   ├── js/                # React components and TypeScript
│   └── views/             # Blade templates
├── database/
│   ├── migrations/        # Database schema migrations
│   ├── seeders/           # Database seeders
│   └── factories/         # Model factories for testing
├── config/                # Configuration files
├── routes/                # Route definitions
├── storage/               # Application storage (logs, cache, sessions)
├── public/                # Publicly accessible files
├── .env                   # Environment configuration (not in git)
├── .env.example           # Example environment file
├── package.json           # Node.js dependencies
├── composer.json          # PHP dependencies
├── vite.config.ts         # Vite build configuration
└── tsconfig.json          # TypeScript configuration
```

---

## Environment Variables (.env)

Key environment variables for the application:

```dotenv
APP_NAME=Laravel              # Application name
APP_ENV=local                 # Environment (local, production, etc.)
APP_DEBUG=true                # Enable debug mode (false in production)
APP_URL=http://localhost      # Application URL

DB_CONNECTION=mysql           # Database driver
DB_HOST=127.0.0.1             # Database host
DB_PORT=3306                  # Database port
DB_DATABASE=campusapp         # Database name
DB_USERNAME=root              # Database username
DB_PASSWORD=                  # Database password

SESSION_DRIVER=database       # Session storage driver
CACHE_STORE=database          # Cache storage driver
QUEUE_CONNECTION=database     # Queue driver

MAIL_MAILER=log               # Mail driver (log for development)
```

---

## Development Commands

### Laravel Artisan Commands
```powershell
php artisan migrate              # Run all pending migrations
php artisan migrate:rollback     # Rollback the last migration
php artisan migrate:refresh      # Rollback and re-run all migrations
php artisan tinker               # Interactive shell
php artisan serve                # Start development server
```

### npm Commands
```powershell
npm run dev                      # Start development server with hot reload
npm run build                    # Build for production
npm run lint                     # Run ESLint
npm test                         # Run tests
```

### Composer Commands
```powershell
composer install                 # Install dependencies
composer update                  # Update dependencies
composer dump-autoload           # Regenerate autoloader
```

---

## Additional Resources

- [Laravel Documentation](https://laravel.com/docs)
- [Inertia.js Documentation](https://inertiajs.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [Laragon Documentation](https://laragon.org/)

---

## Support

For issues or questions:
1. Check this installation guide first
2. Review the [Troubleshooting](#troubleshooting) section
3. Check application logs in `storage/logs/`
4. Contact the development team

---

**Last Updated**: November 28, 2025
**System Version**: Campus App v1.0
**PHP Version**: 8.4.1
**MySQL Version**: 8.4.3
**Node.js**: Latest LTS
