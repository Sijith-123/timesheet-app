const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all timesheets for logged-in user
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const result = await pool.query(
      'SELECT * FROM timesheets WHERE user_id = $1 ORDER BY week_ending DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get timesheets error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit timesheet
router.post('/', async (req, res) => {
  try {
    const { userId, weekEnding, hours, description } = req.body;

    if (!userId || !weekEnding || !hours) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const result = await pool.query(
      'INSERT INTO timesheets (user_id, week_ending, hours, description, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, weekEnding, hours, description || '', 'pending']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Submit timesheet error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update timesheet
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hours, description } = req.body;

    const result = await pool.query(
      'UPDATE timesheets SET hours = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [hours, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update timesheet error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
