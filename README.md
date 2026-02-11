# Company Timesheet Management System

A modern, full-stack web application for managing employee timesheets with approval workflows, built with React, Node.js, and PostgreSQL.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-16%2B-green)
![PostgreSQL](https://img.shields.io/badge/postgres-12%2B-blue)
![React](https://img.shields.io/badge/react-18%2B-cyan)

---

## 🎯 Features

### For Employees
- ✅ User-friendly timesheet entry interface
- ✅ Project assignment and viewing
- ✅ Submit timesheets for manager approval
- ✅ Track approval status in real-time
- ✅ Edit and resubmit rejected entries

### For Managers
- ✅ Review team member timesheets
- ✅ Approve or reject with comments
- ✅ View team performance metrics
- ✅ Track pending approvals

### For Admins
- ✅ Complete user management system
- ✅ Project configuration and assignment
- ✅ Billing rate management
- ✅ System settings configuration
- ✅ Audit logs and reporting

### Security & Compliance
- ✅ Role-based access control (RBAC)
- ✅ JWT authentication
- ✅ Password hashing with bcrypt
- ✅ Audit trail logging
- ✅ HTTPS/SSL ready
- ✅ GDPR compliant design

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ ([Download](https://nodejs.org/))
- PostgreSQL 12+ ([Download](https://www.postgresql.org/download/))
- npm or yarn package manager
- Git

### Installation (5 minutes)

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/timesheet-app.git
cd timesheet-app
```

#### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your database credentials
nano .env

# The .env file should contain:
DB_HOST=localhost
DB_PORT=5432
DB_USER=timesheet_user
DB_PASSWORD=your_secure_password
DB_NAME=timesheet_db
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_random_secret_key_here
```

#### 3. Setup PostgreSQL Database

```bash
# Create database and user
createuser timesheet_user
createdb -O timesheet_user timesheet_db

# Or using psql:
psql -U postgres
# Then in psql prompt:
CREATE ROLE timesheet_user WITH LOGIN PASSWORD 'your_secure_password';
CREATE DATABASE timesheet_db OWNER timesheet_user;
\q
```

#### 4. Initialize Database Schema
```bash
# From backend directory
npm run migrate
# This creates all tables and indexes
```

#### 5. Start Backend Server
```bash
# From backend directory
npm run dev
# Server starts on http://localhost:5000
```

#### 6. Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# Start development server
npm start
# App opens on http://localhost:3000
```

---

## 📝 Sample User Accounts

Create these users for testing (Admin panel):

### Employee Account
```
Email: emp@company.com
Password: password123
Role: employee
```

### Manager Account
```
Email: mgr@company.com
Password: password123
Role: manager
Manager ID: (leave empty)
```

### Admin Account
```
Email: admin@company.com
Password: password123
Role: admin
```

---

## 📚 Project Structure

```
timesheet-app/
├── backend/
│   ├── routes/
│   │   ├── auth.js           # Authentication endpoints
│   │   ├── timesheets.js     # Timesheet CRUD operations
│   │   ├── approvals.js      # Approval workflow
│   │   └── admin.js          # Admin management
│   ├── server.js             # Express server setup
│   ├── db.js                 # Database connection
│   ├── schema.js             # Database schema & initialization
│   ├── auth.js               # Authentication utilities
│   ├── package.json
│   └── .env.example          # Environment template
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginPage.jsx     # Login interface
│   │   │   ├── Dashboard.jsx     # Role-based dashboard
│   │   │   ├── TimesheetForm.jsx # Entry creation
│   │   │   └── ApprovalPanel.jsx # Manager approvals
│   │   ├── api.js            # API client configuration
│   │   └── App.jsx           # Main app component
│   ├── package.json
│   ├── public/
│   └── .env.example
│
├── DEPLOYMENT_GUIDE.md       # Full deployment instructions
├── README.md                 # This file
└── API_DOCUMENTATION.md      # API reference (optional)
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/login              - User login
POST   /api/auth/register           - Create user (Admin only)
POST   /api/auth/change-password    - Change password
GET    /api/auth/me                 - Get current user
POST   /api/auth/logout             - Logout (optional)
```

### Timesheets (Employee)
```
GET    /api/timesheets/entries                 - Get own entries
GET    /api/timesheets/entries/:id             - Get single entry
POST   /api/timesheets/entries                 - Create entry
PUT    /api/timesheets/entries/:id             - Update entry
POST   /api/timesheets/entries/:id/submit      - Submit for approval
DELETE /api/timesheets/entries/:id             - Delete draft entry
```

### Approvals (Manager)
```
GET    /api/approvals/pending                  - Get pending entries
GET    /api/approvals/team-entries             - Get team's entries
GET    /api/approvals/team                     - Get team members
POST   /api/approvals/entries/:id/approve      - Approve entry
POST   /api/approvals/entries/:id/reject       - Reject entry
```

### Admin Management
```
GET    /api/admin/users                        - List users
POST   /api/admin/users                        - Create user
PUT    /api/admin/users/:id                    - Update user
DELETE /api/admin/users/:id                    - Deactivate user

GET    /api/admin/projects                     - List projects
POST   /api/admin/projects                     - Create project
PUT    /api/admin/projects/:id                 - Update project
DELETE /api/admin/projects/:id                 - Delete project

GET    /api/admin/settings                     - Get system settings
PUT    /api/admin/settings                     - Update settings
```

---

## 🔐 Security Features

### Implemented
- ✅ **Password Hashing**: bcryptjs (10 rounds)
- ✅ **JWT Authentication**: 24-hour token expiration
- ✅ **CORS Protection**: Configured origins
- ✅ **RBAC**: Role-based access control
- ✅ **Input Validation**: express-validator on all endpoints
- ✅ **Audit Logging**: All critical actions logged
- ✅ **SQL Injection Prevention**: Parameterized queries
- ✅ **XSS Protection**: Helmet.js security headers

### Recommended for Production
- 🔒 Enable HTTPS/SSL (Let's Encrypt)
- 🔒 Use environment variables for secrets
- 🔒 Set up rate limiting on API endpoints
- 🔒 Enable database encryption
- 🔒 Configure firewall rules
- 🔒 Regular security audits
- 🔒 Data backup strategy

---

## 📊 Database Schema

### Core Tables
- **users**: User accounts and roles
- **projects**: Project definitions
- **project_assignments**: Employee-to-project mapping
- **timesheet_entries**: Actual timesheet records
- **approval_logs**: Approval workflow history
- **system_settings**: Configuration parameters
- **audit_logs**: Complete action history
- **billing_rate_history**: Billing rate tracking

### Key Relationships
```
users (1) ──→ (∞) timesheet_entries
users (1) ──→ (∞) project_assignments
projects (1) ──→ (∞) project_assignments
projects (1) ──→ (∞) timesheet_entries
users (1) ──→ (∞) approval_logs
```

---

## 🧪 Testing

### Backend
```bash
# Run tests (if configured)
npm test

# Check logs
npm run dev
```

### Frontend
```bash
# Run in development
npm start

# Build for production
npm run build

# Test build
npm run build && serve -s build
```

### Manual Testing Checklist
- [ ] Login with different roles
- [ ] Create timesheet entry
- [ ] Submit for approval
- [ ] Approve/reject as manager
- [ ] Edit rejected entry
- [ ] View approval history
- [ ] Admin user management
- [ ] Admin project assignment
- [ ] Admin settings configuration

---

## 🚀 Deployment

### Quick Deploy (Heroku - 5 minutes)

```bash
# Backend
cd backend
heroku create your-timesheet-api
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set JWT_SECRET=your_secret NODE_ENV=production
git push heroku main

# Frontend
cd ../frontend
npm install -g vercel
vercel env add REACT_APP_API_URL=your-api-url
vercel --prod
```

### Full Deployment Guide
See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for:
- DigitalOcean setup
- AWS deployment
- Docker containerization
- Domain configuration
- SSL/TLS setup
- Monitoring & backups

---

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Verify credentials in .env
# Check if database exists
psql -l
```

### "JWT authentication failed"
```bash
# Ensure JWT_SECRET is set in .env
# Check token is being sent in requests
# Verify token hasn't expired (24h default)
```

### "CORS errors"
```bash
# Check FRONTEND_URL in backend .env
# Ensure backend server is running
# Check browser console for detailed error
```

### "Database migrations failed"
```bash
# Connect to database
psql -U timesheet_user -d timesheet_db

# Check existing tables
\dt

# Manually run initialization
npm run migrate
```

---

## 📈 Performance Optimization

### Database
- ✅ Indexed frequently queried columns
- ✅ Optimized queries with JOINs
- ✅ Connection pooling configured

### Backend
- ✅ Gzip compression enabled
- ✅ Helmet security headers
- ✅ CORS optimized
- ✅ Request validation

### Frontend
- ✅ Code splitting ready
- ✅ Lazy loading configured
- ✅ Minification enabled
- ✅ CSS optimization

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 📧 Support

For issues and questions:
- Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- Review API endpoints documentation
- Check troubleshooting section
- Open an issue on GitHub

---

## 🎓 Learning Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)

---

## ✅ Checklist for Production

- [ ] Database backed up daily
- [ ] SSL certificate installed
- [ ] Environment variables configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Monitoring set up
- [ ] Error logging configured
- [ ] Disaster recovery plan ready
- [ ] Documentation updated
- [ ] Security audit completed

---

**Built with ❤️ for modern time management**

Last Updated: February 2026
Version: 1.0.0
