const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get pending timesheets for approval
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.name, u.email FROM timesheets t
       JOIN users u ON t.user_id = u.id
       WHERE t.status = 'pending'
       ORDER BY t.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve timesheet
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const result = await pool.query(
      `UPDATE timesheets 
       SET status = 'approved', approved_by = $1, approval_date = NOW(), notes = $2
       WHERE id = $3 RETURNING *`,
      [req.body.managerId || 1, notes || '', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    res.json({ message: 'Approved', timesheet: result.rows[0] });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject timesheet
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const result = await pool.query(
      `UPDATE timesheets 
       SET status = 'rejected', rejection_reason = $1, rejection_date = NOW()
       WHERE id = $2 RETURNING *`,
      [notes || 'No reason provided', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    res.json({ message: 'Rejected', timesheet: result.rows[0] });
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
