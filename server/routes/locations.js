const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const { sequelize } = require('../config/database');
const { Warehouse, Kunchinittu, Variety } = require('../models/Location');
const RiceStockLocation = require('../models/RiceStockLocation');
const RiceVariety = require('../models/RiceVariety');
const Broker = require('../models/Broker');
const User = require('../models/User');

const router = express.Router();

// ===== WAREHOUSES =====

// Get all warehouses
router.get('/warehouses', auth, async (req, res) => {
  try {
    const warehouses = await Warehouse.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'code', 'location'], // Only essential fields
      order: [['name', 'ASC']],
      include: [{
        model: Kunchinittu,
        as: 'kunchinittus',
        attributes: ['id', 'name', 'code'], // Only essential fields
        required: false
      }],
      raw: false,
      nest: true
    });

    // Disable caching to ensure instant updates
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ warehouses });
  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({ error: 'Failed to fetch warehouses' });
  }
});

// Create warehouse (Manager/Admin only)
router.post('/warehouses', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { name, code, location, capacity } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    // Check for duplicate
    const existing = await Warehouse.findOne({
      where: { code }
    });

    if (existing) {
      return res.status(400).json({ error: 'Warehouse code already exists' });
    }

    const warehouse = await Warehouse.create({
      name,
      code,
      location,
      capacity
    });

    res.status(201).json({
      message: 'Warehouse created successfully',
      warehouse
    });
  } catch (error) {
    console.error('Create warehouse error:', error);
    res.status(500).json({ error: 'Failed to create warehouse' });
  }
});

// Update warehouse (Manager/Admin only)
router.put('/warehouses/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    const { name, code, location, capacity } = req.body;

    // Check for duplicate code (excluding current warehouse)
    if (code && code !== warehouse.code) {
      const existing = await Warehouse.findOne({
        where: { code, id: { [require('sequelize').Op.ne]: req.params.id } }
      });
      if (existing) {
        return res.status(400).json({ error: 'Warehouse code already exists' });
      }
    }

    await warehouse.update({ name, code, location, capacity });

    res.json({
      message: 'Warehouse updated successfully',
      warehouse
    });
  } catch (error) {
    console.error('Update warehouse error:', error);
    res.status(500).json({ error: 'Failed to update warehouse' });
  }
});

// Delete warehouse (Manager/Admin only)
router.delete('/warehouses/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    // Soft delete - mark as inactive instead of deleting
    await warehouse.update({ isActive: false });

    res.json({ message: 'Warehouse deleted successfully' });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    res.status(500).json({ error: 'Failed to delete warehouse' });
  }
});

// ===== KUNCHINITTUS =====

// Get all kunchinittus (for dropdowns - excludes closed by default)
router.get('/kunchinittus', auth, async (req, res) => {
  try {
    const { includeClosed } = req.query;

    // By default, exclude closed kunchinittus from dropdown selections
    // Use ?includeClosed=true to get all (for admin views)
    const where = { isActive: true };
    if (includeClosed !== 'true') {
      where.isClosed = false;
    }

    const kunchinittus = await Kunchinittu.findAll({
      where,
      attributes: ['id', 'name', 'code', 'warehouseId', 'varietyId', 'isClosed'], // Include isClosed status
      order: [['name', 'ASC']],
      include: [
        { model: Warehouse, as: 'warehouse', attributes: ['id', 'name', 'code'], required: false },
        { model: Variety, as: 'variety', attributes: ['id', 'name', 'code'], required: false }
      ],
      raw: false,
      nest: true
    });

    // Disable caching to ensure instant updates
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ kunchinittus });
  } catch (error) {
    console.error('Get kunchinittus error:', error);
    res.status(500).json({ error: 'Failed to fetch kunchinittus' });
  }
});

// Create kunchinittu (Manager/Admin only)
router.post('/kunchinittus', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { name, code, warehouseId, varietyId, capacity } = req.body;

    if (!name || !code || !warehouseId) {
      return res.status(400).json({ error: 'Name, code, and warehouseId are required' });
    }

    // Check if warehouse exists
    const warehouse = await Warehouse.findByPk(warehouseId);
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    // Check for duplicate name (must be unique globally)
    const existingName = await Kunchinittu.findOne({
      where: { name }
    });

    if (existingName) {
      return res.status(400).json({
        error: `Kunchinittu name '${name}' already exists. Please use a unique name.`
      });
    }

    // Check for duplicate code (can be same across warehouses, but not within same warehouse)
    const existingCode = await Kunchinittu.findOne({
      where: {
        code,
        warehouseId
      }
    });

    if (existingCode) {
      return res.status(400).json({
        error: `Kunchinittu code '${code}' already exists in this warehouse. You can use the same code in different warehouses.`
      });
    }

    const kunchinittu = await Kunchinittu.create({
      name,
      code,
      warehouseId,
      varietyId: varietyId || null,
      capacity
    });

    // Fetch with warehouse and variety data
    const createdKunchinittu = await Kunchinittu.findByPk(kunchinittu.id, {
      include: [
        { model: Warehouse, as: 'warehouse' },
        { model: Variety, as: 'variety' }
      ]
    });

    res.status(201).json({
      message: 'Kunchinittu created successfully',
      kunchinittu: createdKunchinittu
    });
  } catch (error) {
    console.error('Create kunchinittu error:', error);
    res.status(500).json({ error: 'Failed to create kunchinittu' });
  }
});

// Update kunchinittu (Manager/Admin only)
router.put('/kunchinittus/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const kunchinittu = await Kunchinittu.findByPk(req.params.id);
    if (!kunchinittu) {
      return res.status(404).json({ error: 'Kunchinittu not found' });
    }

    const { name, code, warehouseId, varietyId, capacity } = req.body;

    const { Op } = require('sequelize');

    // Check for duplicate name (excluding current kunchinittu)
    if (name && name !== kunchinittu.name) {
      const existingName = await Kunchinittu.findOne({
        where: {
          name,
          id: { [Op.ne]: req.params.id }
        }
      });
      if (existingName) {
        return res.status(400).json({
          error: `Kunchinittu name '${name}' already exists. Please use a unique name.`
        });
      }
    }

    // Check for duplicate code in the same warehouse (excluding current kunchinittu)
    if ((code && code !== kunchinittu.code) || (warehouseId && warehouseId !== kunchinittu.warehouseId)) {
      const existingCode = await Kunchinittu.findOne({
        where: {
          code: code || kunchinittu.code,
          warehouseId: warehouseId || kunchinittu.warehouseId,
          id: { [Op.ne]: req.params.id }
        }
      });
      if (existingCode) {
        return res.status(400).json({
          error: `Kunchinittu code '${code || kunchinittu.code}' already exists in this warehouse. You can use the same code in different warehouses.`
        });
      }
    }

    await kunchinittu.update({ name, code, warehouseId, varietyId, capacity });

    const updatedKunchinittu = await Kunchinittu.findByPk(kunchinittu.id, {
      include: [
        { model: Warehouse, as: 'warehouse' },
        { model: Variety, as: 'variety' }
      ]
    });

    res.json({
      message: 'Kunchinittu updated successfully',
      kunchinittu: updatedKunchinittu
    });
  } catch (error) {
    console.error('Update kunchinittu error:', error);
    res.status(500).json({ error: 'Failed to update kunchinittu' });
  }
});

// Delete kunchinittu (Manager/Admin only)
router.delete('/kunchinittus/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const kunchinittu = await Kunchinittu.findByPk(req.params.id);
    if (!kunchinittu) {
      return res.status(404).json({ error: 'Kunchinittu not found' });
    }

    // Soft delete
    await kunchinittu.update({ isActive: false });

    res.json({ message: 'Kunchinittu deleted successfully' });
  } catch (error) {
    console.error('Delete kunchinittu error:', error);
    res.status(500).json({ error: 'Failed to delete kunchinittu' });
  }
});

// ===== VARIETIES =====

// Get all varieties
router.get('/varieties', auth, async (req, res) => {
  try {
    const varieties = await Variety.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'code'], // Only essential fields
      order: [['name', 'ASC']],
      raw: true // Faster, returns plain objects
    });

    // Disable caching to ensure instant updates
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ varieties });
  } catch (error) {
    console.error('Get varieties error:', error);
    res.status(500).json({ error: 'Failed to fetch varieties' });
  }
});

// Create variety (Manager/Admin only)
router.post('/varieties', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { name, code, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    // Check for duplicate
    const existing = await Variety.findOne({
      where: { code }
    });

    if (existing) {
      return res.status(400).json({ error: 'Variety code already exists' });
    }

    const variety = await Variety.create({
      name,
      code,
      description
    });

    res.status(201).json({
      message: 'Variety created successfully',
      variety
    });
  } catch (error) {
    console.error('Create variety error:', error);
    res.status(500).json({ error: 'Failed to create variety' });
  }
});

// Update variety (Manager/Admin only)
router.put('/varieties/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const variety = await Variety.findByPk(req.params.id);
    if (!variety) {
      return res.status(404).json({ error: 'Variety not found' });
    }

    const { name, code, description } = req.body;
    const oldName = variety.name; // Store old name for cascade update

    // Check for duplicate code (excluding current variety)
    if (code && code !== variety.code) {
      const { Op } = require('sequelize');
      const existing = await Variety.findOne({
        where: { code, id: { [Op.ne]: req.params.id } }
      });
      if (existing) {
        return res.status(400).json({ error: 'Variety code already exists' });
      }
    }

    await variety.update({ name, code, description });

    // CASCADE UPDATE: If variety name changed, update all Arrivals with the old variety name
    if (name && name.trim().toUpperCase() !== oldName.trim().toUpperCase()) {
      const Arrival = require('../models/Arrival');
      const updatedCount = await Arrival.update(
        { variety: name.trim().toUpperCase() },
        {
          where: {
            variety: oldName.trim().toUpperCase()
          }
        }
      );
      console.log(`✅ Cascade update: Updated ${updatedCount[0]} arrivals from variety "${oldName}" to "${name}"`);
    }

    res.json({
      message: 'Variety updated successfully',
      variety
    });
  } catch (error) {
    console.error('Update variety error:', error);
    res.status(500).json({ error: 'Failed to update variety' });
  }
});

// Delete variety (Manager/Admin only)
router.delete('/varieties/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const variety = await Variety.findByPk(req.params.id);
    if (!variety) {
      return res.status(404).json({ error: 'Variety not found' });
    }

    // Soft delete
    await variety.update({ isActive: false });

    res.json({ message: 'Variety deleted successfully' });
  } catch (error) {
    console.error('Delete variety error:', error);
    res.status(500).json({ error: 'Failed to delete variety' });
  }
});

// ===== RICE STOCK LOCATIONS =====

// Get all rice stock locations
router.get('/rice-stock-locations', auth, async (req, res) => {
  try {
    const { includeInactive } = req.query;

    // Self-healing: Ensure table and columns exist in DB (especially on Render/cloud)
    try {
      const migration84 = require('../migrations/84_fix_rice_stock_locations_columns');
      await migration84.up();
    } catch (tblErr) {
      console.warn('Rice stock locations table check:', tblErr.message);
    }

    const [rows] = await sequelize.query(`SELECT * FROM rice_stock_locations ORDER BY code ASC`);

    // Fetch creators
    const creatorIds = [...new Set(rows.map(r => r.created_by || r.createdBy))].filter(Boolean);
    const creatorMap = {};
    if (creatorIds.length > 0) {
      try {
        const [creators] = await sequelize.query(
          `SELECT id, username FROM users WHERE id IN (:ids)`,
          { replacements: { ids: creatorIds } }
        );
        creators.forEach(c => { creatorMap[c.id] = c.username; });
      } catch (uErr) {
        console.warn('Could not fetch creator usernames:', uErr.message);
      }
    }

    const locations = rows
      .filter(r => {
        const isActive = r.is_active !== undefined ? r.is_active : (r.isActive !== undefined ? r.isActive : true);
        return includeInactive ? true : Boolean(isActive);
      })
      .map(r => {
        const isActive = r.is_active !== undefined ? r.is_active : (r.isActive !== undefined ? r.isActive : true);
        const isDirectLoad = r.is_direct_load !== undefined ? r.is_direct_load : (r.isDirectLoad !== undefined ? r.isDirectLoad : false);
        const createdBy = r.created_by !== undefined ? r.created_by : r.createdBy;
        const createdAt = r.created_at || r.createdAt || new Date();

        return {
          id: r.id,
          code: r.code,
          name: r.name,
          isActive: Boolean(isActive),
          isDirectLoad: Boolean(isDirectLoad),
          createdAt,
          createdBy,
          creator: { username: (createdBy && creatorMap[createdBy]) || 'Unknown' }
        };
      });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ locations });
  } catch (error) {
    console.error('❌ Get rice stock locations error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch rice stock locations' });
  }
});

// Create rice stock location (Manager/Admin only)
router.post('/rice-stock-locations', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { code, name, isDirectLoad } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Location code is required' });
    }

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name && name.trim() ? name.trim() : null;

    // 1. Check duplicate code
    const [existingCode] = await sequelize.query(
      `SELECT id, is_active FROM rice_stock_locations WHERE UPPER(TRIM(code)) = UPPER(TRIM(:code)) LIMIT 1`,
      { replacements: { code: trimmedCode } }
    );

    if (existingCode && existingCode.length > 0) {
      if (existingCode[0].is_active) {
        return res.status(400).json({ error: `Location code '${trimmedCode}' already exists` });
      } else {
        // Reactivate soft-deleted location
        const [reactivated] = await sequelize.query(`
          UPDATE rice_stock_locations 
          SET 
            name = :name,
            is_active = true,
            is_direct_load = :isDirectLoad,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = :id
          RETURNING *
        `, {
          replacements: {
            id: existingCode[0].id,
            name: trimmedName,
            isDirectLoad: Boolean(isDirectLoad)
          }
        });

        return res.status(201).json({
          message: 'Rice stock location created successfully',
          location: reactivated[0]
        });
      }
    }

    // 2. Check duplicate name if provided
    if (trimmedName) {
      const [existingName] = await sequelize.query(
        `SELECT id FROM rice_stock_locations WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name)) AND is_active = true LIMIT 1`,
        { replacements: { name: trimmedName } }
      );
      if (existingName && existingName.length > 0) {
        return res.status(400).json({ error: `Location description '${trimmedName}' already exists` });
      }
    }

    const userId = req.user?.userId || req.user?.id || null;

    const [result] = await sequelize.query(`
      INSERT INTO rice_stock_locations (code, name, is_active, is_direct_load, created_by, created_at, updated_at)
      VALUES (:code, :name, true, :isDirectLoad, :createdBy, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, {
      replacements: {
        code: trimmedCode,
        name: trimmedName,
        isDirectLoad: Boolean(isDirectLoad),
        createdBy: userId
      }
    });

    const created = result[0];
    let username = 'Unknown';
    if (userId) {
      const [u] = await sequelize.query(`SELECT username FROM users WHERE id = :id`, { replacements: { id: userId } });
      if (u.length > 0) username = u[0].username;
    }

    res.status(201).json({
      message: 'Rice stock location created successfully',
      location: {
        id: created.id,
        code: created.code,
        name: created.name,
        isActive: created.is_active,
        isDirectLoad: created.is_direct_load,
        createdAt: created.created_at,
        createdBy: created.created_by,
        creator: { username }
      }
    });
  } catch (error) {
    console.error('❌ Create rice stock location error:', error);
    res.status(500).json({ error: error.message || 'Failed to create rice stock location' });
  }
});

// Update rice stock location (Manager/Admin only)
router.put('/rice-stock-locations/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, isActive, isDirectLoad } = req.body;

    const [existing] = await sequelize.query(
      `SELECT * FROM rice_stock_locations WHERE id = :id`,
      { replacements: { id } }
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Rice stock location not found' });
    }

    const currentLocation = existing[0];
    const newCode = code && code.trim() ? code.trim().toUpperCase() : currentLocation.code;
    const newName = name !== undefined ? (name && name.trim() ? name.trim() : null) : currentLocation.name;

    // Check if new code already exists on another location
    if (newCode !== currentLocation.code) {
      const [dupCode] = await sequelize.query(
        `SELECT id FROM rice_stock_locations WHERE UPPER(TRIM(code)) = UPPER(TRIM(:code)) AND id != :id AND is_active = true LIMIT 1`,
        { replacements: { code: newCode, id } }
      );
      if (dupCode && dupCode.length > 0) {
        return res.status(400).json({ error: `Location code '${newCode}' already exists` });
      }
    }

    // Check if new name already exists on another location
    if (newName && newName !== currentLocation.name) {
      const [dupName] = await sequelize.query(
        `SELECT id FROM rice_stock_locations WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name)) AND id != :id AND is_active = true LIMIT 1`,
        { replacements: { name: newName, id } }
      );
      if (dupName && dupName.length > 0) {
        return res.status(400).json({ error: `Location description '${newName}' already exists` });
      }
    }

    const [result] = await sequelize.query(`
      UPDATE rice_stock_locations 
      SET 
        code = :code,
        name = :name,
        is_active = :isActive,
        is_direct_load = :isDirectLoad,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
      RETURNING *
    `, {
      replacements: {
        id,
        code: newCode,
        name: newName,
        isActive: isActive !== undefined ? isActive : currentLocation.is_active,
        isDirectLoad: isDirectLoad !== undefined ? Boolean(isDirectLoad) : (currentLocation.is_direct_load || false)
      }
    });

    const updated = result[0];
    let username = 'Unknown';
    if (updated.created_by) {
      const [u] = await sequelize.query(`SELECT username FROM users WHERE id = :id`, { replacements: { id: updated.created_by } });
      if (u.length > 0) username = u[0].username;
    }

    res.json({
      message: 'Rice stock location updated successfully',
      location: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        isActive: updated.is_active,
        isDirectLoad: updated.is_direct_load,
        createdAt: updated.created_at,
        createdBy: updated.created_by,
        creator: { username }
      }
    });
  } catch (error) {
    console.error('Update rice stock location error:', error);
    res.status(500).json({ error: error.message || 'Failed to update rice stock location' });
  }
});

// Delete rice stock location (Admin only)
router.delete('/rice-stock-locations/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await sequelize.query(
      `SELECT id FROM rice_stock_locations WHERE id = :id`,
      { replacements: { id } }
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Rice stock location not found' });
    }

    // Soft delete
    await sequelize.query(
      `UPDATE rice_stock_locations SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = :id`,
      { replacements: { id } }
    );

    res.json({ message: 'Rice stock location deleted successfully' });
  } catch (error) {
    console.error('Delete rice stock location error:', error);
    res.status(500).json({ error: 'Failed to delete rice stock location' });
  }
});

// ===== RICE VARIETIES =====

// Get all rice varieties
router.get('/rice-varieties', auth, async (req, res) => {
  try {
    const varieties = await RiceVariety.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'code'],
      order: [['name', 'ASC']],
      raw: true
    });

    // Disable caching to ensure instant updates
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ varieties });
  } catch (error) {
    console.error('Get rice varieties error:', error);
    res.status(500).json({ error: 'Failed to fetch rice varieties' });
  }
});

// Create rice variety (Manager/Admin only)
router.post('/rice-varieties', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    // Check for duplicate
    const existing = await RiceVariety.findOne({
      where: { code: code.trim().toUpperCase() }
    });

    if (existing) {
      return res.status(400).json({ error: 'Rice variety code already exists' });
    }

    const variety = await RiceVariety.create({
      name: name.trim().toUpperCase(),
      code: code.trim().toUpperCase()
    });

    res.status(201).json({
      message: 'Rice variety created successfully',
      variety
    });
  } catch (error) {
    console.error('Create rice variety error:', error);
    res.status(500).json({ error: 'Failed to create rice variety' });
  }
});

// Update rice variety (Manager/Admin only)
router.put('/rice-varieties/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const variety = await RiceVariety.findByPk(req.params.id);
    if (!variety) {
      return res.status(404).json({ error: 'Rice variety not found' });
    }

    const { name, code, isActive } = req.body;

    // Check for duplicate code if changed
    if (code && code.trim().toUpperCase() !== variety.code) {
      const { Op } = require('sequelize');
      const existing = await RiceVariety.findOne({
        where: {
          code: code.trim().toUpperCase(),
          id: { [Op.ne]: req.params.id }
        }
      });
      if (existing) {
        return res.status(400).json({ error: 'Rice variety code already exists' });
      }
    }

    await variety.update({
      name: name ? name.trim().toUpperCase() : variety.name,
      code: code ? code.trim().toUpperCase() : variety.code,
      isActive: isActive !== undefined ? isActive : variety.isActive
    });

    res.json({
      message: 'Rice variety updated successfully',
      variety
    });
  } catch (error) {
    console.error('Update rice variety error:', error);
    res.status(500).json({ error: 'Failed to update rice variety' });
  }
});

// Delete rice variety (Admin only)
router.delete('/rice-varieties/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const variety = await RiceVariety.findByPk(req.params.id);
    if (!variety) {
      return res.status(404).json({ error: 'Rice variety not found' });
    }

    // Soft delete
    await variety.update({ isActive: false });

    res.json({ message: 'Rice variety deleted successfully' });
  } catch (error) {
    console.error('Delete rice variety error:', error);
    res.status(500).json({ error: 'Failed to delete rice variety' });
  }
});

// ===== BROKERS =====

// Get all brokers
router.get('/brokers', auth, async (req, res) => {
  try {
    const brokers = await Broker.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'description'],
      order: [['name', 'ASC']],
      raw: true
    });

    // Disable caching to ensure instant updates
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ brokers });
  } catch (error) {
    console.error('Get brokers error:', error);
    res.status(500).json({ error: 'Failed to fetch brokers' });
  }
});

// Create broker (Manager/Admin only)
router.post('/brokers', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Broker name is required' });
    }

    // Check for duplicate name
    const existingName = await Broker.findOne({
      where: { name: name.trim().toUpperCase() }
    });

    if (existingName) {
      return res.status(400).json({ error: 'Broker name already exists' });
    }

    const broker = await Broker.create({
      name: name.trim().toUpperCase(),
      description: description ? description.trim() : null
    });

    res.status(201).json({
      message: 'Broker created successfully',
      broker
    });
  } catch (error) {
    console.error('Create broker error:', error);
    res.status(500).json({ error: 'Failed to create broker' });
  }
});

// Update broker (Manager/Admin only)
router.put('/brokers/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const broker = await Broker.findByPk(req.params.id);
    if (!broker) {
      return res.status(404).json({ error: 'Broker not found' });
    }

    const { name, description, isActive } = req.body;
    const { Op } = require('sequelize');

    // Check for duplicate name (excluding current broker)
    if (name && name.trim().toUpperCase() !== broker.name) {
      const existingName = await Broker.findOne({
        where: {
          name: name.trim().toUpperCase(),
          id: { [Op.ne]: req.params.id }
        }
      });
      if (existingName) {
        return res.status(400).json({ error: 'Broker name already exists' });
      }
    }

    await broker.update({
      name: name ? name.trim().toUpperCase() : broker.name,
      description: description !== undefined ? (description ? description.trim() : null) : broker.description,
      isActive: isActive !== undefined ? isActive : broker.isActive
    });

    res.json({
      message: 'Broker updated successfully',
      broker
    });
  } catch (error) {
    console.error('Update broker error:', error);
    res.status(500).json({ error: 'Failed to update broker' });
  }
});

// Delete broker (Admin only)
router.delete('/brokers/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const broker = await Broker.findByPk(req.params.id);
    if (!broker) {
      return res.status(404).json({ error: 'Broker not found' });
    }

    // Soft delete
    await broker.update({ isActive: false });

    res.json({ message: 'Broker deleted successfully' });
  } catch (error) {
    console.error('Delete broker error:', error);
    res.status(500).json({ error: 'Failed to delete broker' });
  }
});

module.exports = router;