const express = require('express');
const pool = require('./db');
const { verifyToken, requireRole } = require('./auth');
const { body, validationResult, query } = require('express-validator');

const router = express.Router();

// Get all entries for an employee (own entries)
router.get('/entries', verifyToken, [
  query('status').optional().isIn(['draft', 'submitted', 'approved', 'rejected']),
  query('fromDate').optional().isISO8601(),
  query('toDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, fromDate, toDate } = req.query;
    const userId = req.user.id;

    let query_str = 'SELECT te.*, p.code, p.name as project_name FROM timesheet_entries te JOIN projects p ON te.project_id = p.id WHERE te.user_id = $1';
    const params = [userId];

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

    query_str += ' ORDER BY te.entry_date DESC';

    const result = await pool.query(query_str, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get entries error:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Get single entry
router.get('/entries/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT te.*, p.code, p.name as project_name, u.name as manager_name 
       FROM timesheet_entries te 
       LEFT JOIN projects p ON te.project_id = p.id 
       LEFT JOIN users u ON te.reviewed_by = u.id
       WHERE te.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = result.rows[0];

    // Check authorization
    if (req.user.role === 'employee' && entry.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Get entry error:', error);
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

// Create timesheet entry
router.post('/entries', verifyToken, requireRole('employee'), [
  body('projectId').isInt(),
  body('entryDate').isISO8601(),
  body('hours').isFloat({ min: 0.25, max: 24 }),
  body('description').isLength({ min: 10 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, entryDate, hours, description } = req.body;
    const userId = req.user.id;

    // Check if project is assigned to user
    const projectCheck = await pool.query(
      'SELECT p.id FROM projects p JOIN project_assignments pa ON p.id = pa.project_id WHERE p.id = $1 AND pa.user_id = $2',
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Project not assigned to you' });
    }

    // Create entry
    const result = await pool.query(
      `INSERT INTO timesheet_entries (user_id, project_id, entry_date, hours, description, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, projectId, entryDate, hours, description, 'draft']
    );

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'CREATE_ENTRY', 'timesheet', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Entry for this date and project already exists' });
    }
    console.error('Create entry error:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// Update timesheet entry (draft only)
router.put('/entries/:id', verifyToken, requireRole('employee'), [
  body('projectId').optional().isInt(),
  body('hours').optional().isFloat({ min: 0.25, max: 24 }),
  body('description').optional().isLength({ min: 10 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { projectId, hours, description } = req.body;
    const userId = req.user.id;

    // Get entry
    const entryResult = await pool.query('SELECT * FROM timesheet_entries WHERE id = $1', [id]);
    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = entryResult.rows[0];

    // Check authorization and status
    if (entry.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (entry.status !== 'draft' && entry.status !== 'rejected') {
      return res.status(400).json({ error: 'Can only edit draft or rejected entries' });
    }

    // Update entry
    const updateParams = [];
    const updateFields = [];
    let paramCount = 1;

    if (projectId !== undefined) updateFields.push(`project_id = $${paramCount++}`), updateParams.push(projectId);
    if (hours !== undefined) updateFields.push(`hours = $${paramCount++}`), updateParams.push(hours);
    if (description !== undefined) updateFields.push(`description = $${paramCount++}`), updateParams.push(description);

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateParams.push(id);

    const result = await pool.query(
      `UPDATE timesheet_entries SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      updateParams
    );

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, 'UPDATE_ENTRY', 'timesheet', id, JSON.stringify(entry), JSON.stringify(result.rows[0])]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update entry error:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// Submit timesheet entry
router.post('/entries/:id/submit', verifyToken, requireRole('employee'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get entry
    const entryResult = await pool.query('SELECT * FROM timesheet_entries WHERE id = $1', [id]);
    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = entryResult.rows[0];

    // Check authorization and status
    if (entry.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (entry.status !== 'draft' && entry.status !== 'rejected') {
      return res.status(400).json({ error: 'Can only submit draft or rejected entries' });
    }

    // Update to submitted
    const result = await pool.query(
      `UPDATE timesheet_entries SET status = $1, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      ['submitted', id]
    );

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [userId, 'SUBMIT_ENTRY', 'timesheet', id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Submit entry error:', error);
    res.status(500).json({ error: 'Failed to submit entry' });
  }
});

// Delete timesheet entry (draft only)
router.delete('/entries/:id', verifyToken, requireRole('employee'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get entry
    const entryResult = await pool.query('SELECT * FROM timesheet_entries WHERE id = $1', [id]);
    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = entryResult.rows[0];

    // Check authorization and status
    if (entry.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (entry.status !== 'draft') {
      return res.status(400).json({ error: 'Can only delete draft entries' });
    }

    // Delete entry
    await pool.query('DELETE FROM timesheet_entries WHERE id = $1', [id]);

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'DELETE_ENTRY', 'timesheet', id, JSON.stringify(entry)]
    );

    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;
