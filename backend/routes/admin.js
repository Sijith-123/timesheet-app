const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');

// Get all users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user
router.post('/users', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [email, hashedPassword, name, role || 'employee']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user role
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const usersResult = await pool.query('SELECT COUNT(*) as total FROM users');
    const timesheetsResult = await pool.query('SELECT COUNT(*) as total FROM timesheets');
    const pendingResult = await pool.query('SELECT COUNT(*) as total FROM timesheets WHERE status = \'pending\'');

    res.json({
      totalUsers: parseInt(usersResult.rows[0].total),
      totalTimesheets: parseInt(timesheetsResult.rows[0].total),
      pendingApprovals: parseInt(pendingResult.rows[0].total)
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
