# Timesheet Management System - Backend

Complete Node.js/Express backend with PostgreSQL database for timesheet management.

## Features

✅ User authentication (Login/Register)
✅ Timesheet submission and management
✅ Manager approvals and rejections
✅ Admin user management
✅ JWT token-based security
✅ PostgreSQL database
✅ CORS enabled for frontend integration

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

Create a PostgreSQL database and run the schema:

```bash
psql -U postgres -d timesheet_db -f schema.sql
```

### 3. Setup Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=timesheet_db
JWT_SECRET=your_secret_key_here
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Start Server

```bash
npm start
```

Server runs on: `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user
- `GET /api/auth/verify` - Verify JWT token

### Timesheets
- `GET /api/timesheets` - Get user's timesheets
- `POST /api/timesheets` - Submit timesheet
- `PUT /api/timesheets/:id` - Update timesheet

### Approvals
- `GET /api/approvals` - Get pending timesheets
- `POST /api/approvals/:id/approve` - Approve timesheet
- `POST /api/approvals/:id/reject` - Reject timesheet

### Admin
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/stats` - Get statistics

## Default Users

| Email | Password | Role |
|-------|----------|------|
| admin@timesheet.com | admin123 | Admin |
| manager@timesheet.com | manager123 | Manager |
| employee@timesheet.com | employee123 | Employee |

## Database Schema

### Users Table
- id (PK)
- email (UNIQUE)
- password (hashed)
- name
- role (employee/manager/admin)
- created_at
- updated_at

### Timesheets Table
- id (PK)
- user_id (FK)
- week_ending (DATE)
- hours (DECIMAL)
- description
- status (pending/approved/rejected)
- approved_by
- approval_date
- rejection_reason
- rejection_date
- notes
- created_at
- updated_at

## Development

With nodemon:

```bash
npm run dev
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Set proper database credentials
4. Configure `FRONTEND_URL` to production domain
5. Deploy to hosting platform (Heroku, Railway, Render, etc.)

## Notes

- All passwords are hashed with bcryptjs
- JWTs expire after 24 hours
- CORS is configured for frontend communication
- Database uses PostgreSQL 12+
- Includes request logging with Morgan
- Security headers with Helmet
