const express = require('express');
const pool = require('./db');
const { verifyToken, isManagerOrAdmin } = require('./auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get pending entries for manager's team
router.get('/pending', verifyToken, isManagerOrAdmin, async (req, res) => {
  try {
    const managerId = req.user.id;

    // Get all employees under this manager (direct reports)
    const result = await pool.query(
      `SELECT te.*, u.name as employee_name, u.email, p.code, p.name as project_name
       FROM timesheet_entries te
       JOIN users u ON te.user_id = u.id
       JOIN projects p ON te.project_id = p.id
       WHERE u.manager_id = $1 AND te.status = $2
       ORDER BY te.submitted_at DESC`,
      [managerId, 'submitted']
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get pending entries error:', error);
    res.status(500).json({ error: 'Failed to fetch pending entries' });
  }
});

// Get all entries for manager's team (with filtering)
router.get('/team-entries', verifyToken, isManagerOrAdmin, async (req, res) => {
  try {
    const { status, fromDate, toDate, employeeId } = req.query;
    const managerId = req.user.id;

    let query_str = `
      SELECT te.*, u.name as employee_name, u.email, p.code, p.name as project_name
      FROM timesheet_entries te
      JOIN users u ON te.user_id = u.id
      JOIN projects p ON te.project_id = p.id
      WHERE u.manager_id = $1
    `;
    const params = [managerId];

    if (status) {
      query_str += ` AND te.status = $${params.length + 1}`;
      params.push(status);
    }

    if (fromDate) {
      query_str += ` AND te.entry_date >= $${params.length + 1}`;
      params.push(fromDate);
    }

    if (toDate) {
      query_str += ` AND te.entry_date <= $${params.length + 1}`;
      params.push(toDate);
    }

    if (employeeId) {
      query_str += ` AND te.user_id = $${params.length + 1}`;
      params.push(employeeId);
    }

    query_str += ' ORDER BY te.entry_date DESC';

    const result = await pool.query(query_str, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get team entries error:', error);
    res.status(500).json({ error: 'Failed to fetch team entries' });
  }
});

// Get manager's team members
router.get('/team', verifyToken, isManagerOrAdmin, async (req, res) => {
  try {
    const managerId = req.user.id;

    const result = await pool.query(
      'SELECT id, name, email, department FROM users WHERE manager_id = $1 AND status = $2 ORDER BY name',
      [managerId, 'active']
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Approve timesheet entry
router.post('/entries/:id/approve', verifyToken, isManagerOrAdmin, [
  body('comments').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { comments } = req.body;
    const managerId = req.user.id;

    // Get entry
    const entryResult = await pool.query(
      'SELECT te.*, u.manager_id FROM timesheet_entries te JOIN users u ON te.user_id = u.id WHERE te.id = $1',
      [id]
    );

    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = entryResult.rows[0];

    // Check authorization
    if (entry.manager_id !== managerId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (entry.status !== 'submitted') {
      return res.status(400).json({ error: 'Can only approve submitted entries' });
    }

    // Update entry
    const result = await pool.query(
      `UPDATE timesheet_entries 
       SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, reviewer_comments = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING *`,
      ['approved', managerId, comments || 'Approved', id]
    );

    // Log approval
    await pool.query(
      'INSERT INTO approval_logs (entry_id, manager_id, action, comments) VALUES ($1, $2, $3, $4)',
      [id, managerId, 'approved', comments || 'Approved']
    );

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [managerId, 'APPROVE_ENTRY', 'timesheet', id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Approve entry error:', error);
    res.status(500).json({ error: 'Failed to approve entry' });
  }
});

// Reject timesheet entry
router.post('/entries/:id/reject', verifyToken, isManagerOrAdmin, [
  body('comments').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { comments } = req.body;
    const managerId = req.user.id;

    // Get entry
    const entryResult = await pool.query(
      'SELECT te.*, u.manager_id FROM timesheet_entries te JOIN users u ON te.user_id = u.id WHERE te.id = $1',
      [id]
    );

    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = entryResult.rows[0];

    // Check authorization
    if (entry.manager_id !== managerId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (entry.status !== 'submitted') {
      return res.status(400).json({ error: 'Can only reject submitted entries' });
    }

    // Update entry
    const result = await pool.query(
      `UPDATE timesheet_entries 
       SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, reviewer_comments = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING *`,
      ['rejected', managerId, comments, id]
    );

    // Log rejection
    await pool.query(
      'INSERT INTO approval_logs (entry_id, manager_id, action, comments) VALUES ($1, $2, $3, $4)',
      [id, managerId, 'rejected', comments]
    );

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [managerId, 'REJECT_ENTRY', 'timesheet', id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Reject entry error:', error);
    res.status(500).json({ error: 'Failed to reject entry' });
  }
});

module.exports = router;
