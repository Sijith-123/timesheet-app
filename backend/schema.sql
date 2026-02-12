-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create timesheets table
CREATE TABLE IF NOT EXISTS timesheets (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  week_ending DATE NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  approved_by INT,
  approval_date TIMESTAMP,
  rejection_reason TEXT,
  rejection_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_timesheets_user_id ON timesheets(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password, name, role)
VALUES ('admin@timesheet.com', '$2a$10$YuBDHMQoXJb6YYEeUPKaFOm3N8eSB7TvvqpCa6KxXF6vvVCdFqJzS', 'Admin User', 'admin')
ON CONFLICT DO NOTHING;

-- Insert sample manager user (password: manager123)
INSERT INTO users (email, password, name, role)
VALUES ('manager@timesheet.com', '$2a$10$Z1qR8XvT2VzYhF0D5Qg8Ju4e7KpLmNoPqRsWxAbCdEfGhIjKlMnO', 'Manager User', 'manager')
ON CONFLICT DO NOTHING;

-- Insert sample employee user (password: employee123)
INSERT INTO users (email, password, name, role)
VALUES ('employee@timesheet.com', '$2a$10$bJ7sN9qK2vL4hM5eR8xC9oP1dT3fG6jA2bL4mN6pQ8rS1uV2wX3', 'Employee User', 'employee')
ON CONFLICT DO NOTHING;
