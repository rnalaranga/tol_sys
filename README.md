# The Orient Life — Consumer Products Division

A full-featured consumer products management system built with **Node.js**, **React**, and **MySQL**.

---

## 🚀 Getting Started

### 1. Setup MySQL Database

```bash
mysql -u root -p < database/schema.sql
```

Or run the schema.sql manually in MySQL Workbench / phpMyAdmin.

### 2. Configure Server

Edit `server/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tol_cpd
JWT_SECRET=orientlife_jwt_secret_2026_TOL_CPD
```

### 3. Start Backend Server

```bash
cd server
npm start
# Runs on http://localhost:5000
```

### 4. Start Frontend

```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

---

## 🔑 Default Login

| Field    | Value                  |
|----------|------------------------|
| Email    | admin@orientlife.lk    |
| Password | Admin@123              |

---

## 📦 Features

| Module         | Features                                                        |
|----------------|-----------------------------------------------------------------|
| Dashboard      | Revenue trend, category charts, aging receivables, top products |
| Customers      | CRUD, search, outstanding balance, purchase history             |
| Inventory      | Products CRUD, stock in/out, low-stock alerts, warranty config  |
| Invoices       | 4-step wizard, 3/4/6-month plans, down payment, cash option     |
| Payments       | Record payments, installment tracking, overdue alerts           |
| Analytics      | Revenue bars, item movement, slow movers, aging report          |
| Warranty       | Auto-tracking from invoice date, expiry alerts, claim log       |

---

## 🗂 Project Structure

```
TOL_SYS/
├── database/        MySQL schema + seed data
├── server/          Node.js + Express REST API
│   ├── src/
│   │   ├── config/    DB connection pool
│   │   ├── controllers/
│   │   ├── middleware/  JWT auth
│   │   └── routes/
│   └── .env
└── client/          React + Vite frontend
    └── src/
        ├── api/       Axios instance
        ├── components/ Sidebar, Header, Layout
        ├── context/   Auth context
        ├── pages/     All pages
        └── utils/     Helpers, formatters
```

---

## 🎨 Design

- **Background**: White `#ffffff`
- **Header/Buttons**: Blue `#1a56db`
- **Sidebar**: Dark navy `#0f1b3c`
- **Font**: Inter (Google Fonts)
- Style: Professional, premium, micro-animations
