const express = require('express');
const pool = require('./db');
const { verifyToken, isAdmin, hashPassword } = require('./auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// ==================== USER MANAGEMENT ====================

// Get all users
router.get('/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const { role, status } = req.query;

    let query_str = 'SELECT id, name, email, role, department, manager_id, status, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query_str += ` AND role = $${params.length + 1}`;
      params.push(role);
    }

    if (status) {
      query_str += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query_str += ' ORDER BY created_at DESC';

    const result = await pool.query(query_str, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/users/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, name, email, role, department, manager_id, status, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user
router.post('/users', verifyToken, isAdmin, [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['employee', 'manager', 'admin']),
  body('department').optional(),
  body('managerId').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, department, managerId } = req.body;

    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, department, manager_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, department, manager_id, status`,
      [name, email, hashedPassword, role, department || null, managerId || null, 'active']
    );

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'CREATE_USER', 'user', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/users/:id', verifyToken, isAdmin, [
  body('name').optional().notEmpty(),
  body('email').optional().isEmail(),
  body('role').optional().isIn(['employee', 'manager', 'admin']),
  body('department').optional(),
  body('managerId').optional().isInt(),
  body('status').optional().isIn(['active', 'inactive'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, email, role, department, managerId, status } = req.body;

    // Check if user exists
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldUser = userResult.rows[0];

    // Build update query
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      params.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      params.push(email);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      params.push(role);
    }
    if (department !== undefined) {
      updates.push(`department = $${paramCount++}`);
      params.push(department);
    }
    if (managerId !== undefined) {
      updates.push(`manager_id = $${paramCount++}`);
      params.push(managerId);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    if (updates.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, name, email, role, department, manager_id, status`,
      params
    );

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, 'UPDATE_USER', 'user', id, JSON.stringify(oldUser), JSON.stringify(result.rows[0])]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (deactivate)
router.delete('/users/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting own account
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const result = await pool.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
      ['inactive', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'DEACTIVATE_USER', 'user', id]
    );

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// ==================== PROJECT MANAGEMENT ====================

// Get all projects
router.get('/projects', verifyToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    let query_str = 'SELECT * FROM projects WHERE 1=1';
    const params = [];

    if (status) {
      query_str += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query_str += ' ORDER BY created_at DESC';

    const result = await pool.query(query_str, params);

    // Get assignments for each project
    const projectsWithAssignments = await Promise.all(
      result.rows.map(async (project) => {
        const assignResult = await pool.query(
          'SELECT user_id FROM project_assignments WHERE project_id = $1',
          [project.id]
        );
        return { ...project, assigned_to: assignResult.rows.map(r => r.user_id) };
      })
    );

    res.json(projectsWithAssignments);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
router.get('/projects/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = result.rows[0];

    // Get assignments
    const assignResult = await pool.query(
      'SELECT user_id FROM project_assignments WHERE project_id = $1',
      [id]
    );

    res.json({ ...project, assigned_to: assignResult.rows.map(r => r.user_id) });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/projects', verifyToken, isAdmin, [
  body('code').notEmpty(),
  body('name').notEmpty(),
  body('description').optional(),
  body('billingRate').isFloat({ min: 0 }),
  body('assignedTo').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, name, description, billingRate, assignedTo } = req.body;

    // Create project
    const result = await pool.query(
      `INSERT INTO projects (code, name, description, billing_rate, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [code, name, description || null, billingRate, 'active']
    );

    const projectId = result.rows[0].id;

    // Assign to employees
    if (assignedTo && assignedTo.length > 0) {
      for (const userId of assignedTo) {
        await pool.query(
          'INSERT INTO project_assignments (project_id, user_id) VALUES ($1, $2)',
          [projectId, userId]
        );
      }
    }

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'CREATE_PROJECT', 'project', projectId, JSON.stringify(result.rows[0])]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/projects/:id', verifyToken, isAdmin, [
  body('name').optional().notEmpty(),
  body('description').optional(),
  body('billingRate').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['active', 'inactive']),
  body('assignedTo').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, billingRate, status, assignedTo } = req.body;

    // Check if project exists
    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Update project
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      params.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(description);
    }
    if (billingRate !== undefined) {
      updates.push(`billing_rate = $${paramCount++}`);
      params.push(billingRate);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    // Update assignments if provided
    if (assignedTo && Array.isArray(assignedTo)) {
      // Delete existing assignments
      await pool.query('DELETE FROM project_assignments WHERE project_id = $1', [id]);

      // Add new assignments
      for (const userId of assignedTo) {
        await pool.query(
          'INSERT INTO project_assignments (project_id, user_id) VALUES ($1, $2)',
          [id, userId]
        );
      }
    }

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, 'UPDATE_PROJECT', 'project', id, JSON.stringify(projectResult.rows[0]), JSON.stringify(result.rows[0])]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/projects/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'DELETE_PROJECT', 'project', id]
    );

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ==================== SYSTEM SETTINGS ====================

// Get system settings
router.get('/settings', verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update system settings
router.put('/settings', verifyToken, isAdmin, [
  body('*.key').notEmpty(),
  body('*.value').notEmpty()
], async (req, res) => {
  try {
    const settings = req.body;

    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value) 
         VALUES ($1, $2) 
         ON CONFLICT (setting_key) 
         DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
    }

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, new_values) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'UPDATE_SETTINGS', 'system', JSON.stringify(settings)]
    );

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
