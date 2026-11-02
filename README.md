# BLOOD BANK SYSTEM

Developed by Group 5 (WAD1 FINALS)
  > Agustin, Rilen Nicole
  > Del Rosario, Dan Carlo
  > Galang, Maria Trifina
  > Santiago, Krizel Jasmine
  > Urbano, Nathaniel

php -S localhost:8000
http://localhost:8000/config/setup_db.php
http://localhost:8000/backend/read.php?what=data

# Blood Bank System

A Blood Donation Inventory System for tracking donors and donated blood bags.

## Project Description

Blood Bank is a web-based system that helps staff record, track, and monitor donated blood in one place, so the right blood is ready when patients need it. After logging in as an admin, staff can:

- View a **dashboard** with current stock by blood type, the total number of bags collected, and bags per component (red cells, plasma, platelets).
- Manage **donors** and **blood bags** in a database view with full create, read, update, and delete operations. Each bag is linked to its donor through `donor_id`.
- Search, filter, sort, and export records as CSV.

Bags are automatically marked as Expired once their shelf life passes (red cells: 35 days, plasma: 1 year, platelets: 5 days). Deleted records are soft-deleted rather than removed from the database.

**Built with:** HTML, CSS, and vanilla JavaScript (frontend); PHP (backend); SQLite (database).

## Group Members

**Group 5 (WAD1 Finals)**

- Agustin, Rilen Nicole
- Del Rosario, Dan Carlo
- Galang, Maria Trifina
- Santiago, Krizel Jasmine
- Urbano, Nathaniel

## Running the Project

### Requirements

- PHP 7.4 or newer with the `pdo_sqlite` extension enabled (check with `php -m`)
- A modern web browser

No separate database server is needed. The SQLite database file is created automatically.

### Steps

1. **Open a terminal in the project folder** (the folder that contains `index.html`).

2. **Start the PHP built-in server:**

   ```bash
   php -S localhost:8000
   ```

3. **Set up the database (run once).** Open this URL in your browser:

   ```
   http://localhost:8000/config/setup_db.php
   ```

   This creates `database.sqlite`, the tables, the admin account, and some sample data. You should see the message "Database ready."

   > **Warning:** Running this script again deletes all existing data. It only works from `localhost`.

4. **Open the system:**

   ```
   http://localhost:8000/
   ```

5. **Log in** with the default admin account:

   | Username | Password          |
   |----------|-------------------|
   | `admin`  | `bloodbank.admin` |

   To use a different password, edit `$adminPassword` in `config/setup_db.php` before running step 3.

### Troubleshooting

- **"Could not reach the server":** make sure `php -S localhost:8000` is still running in your terminal.
- **"Database connection failed" or "could not find driver":** enable the `pdo_sqlite` extension in your `php.ini`.
- **"Forbidden" on the setup page:** open it through `localhost` on the same computer that runs the server.
- **Port 8000 is already in use:** start the server on another port (for example `php -S localhost:8080`) and use that port in the URLs above.

## Project Structure

```
blood-management-system/
├── index.html            # Single-page frontend (login, dashboard, database, about)
├── database.sqlite       # Created by config/setup_db.php
├── assets/
│   ├── images/
│   └── js/               # about.js, dashboard.js, database.js
├── backend/
│   ├── create.php        # CREATE: new bag (and new donor if needed)
│   ├── read.php          # READ: donors, bags, and dashboard statistics
│   ├── update.php        # UPDATE: edit a donor or a bag
│   ├── delete.php        # DELETE: soft-delete a donor or a bag
│   ├── bootstrap.php     # Shared setup, validation, and helpers
│   ├── login_action.php  # Admin log in
│   ├── logout.php        # Admin log out
│   └── check_session.php # Checks whether the admin is logged in
└── config/
    ├── db_connect.php    # Database connection
    └── setup_db.php      # Creates tables, admin account, and sample data
```