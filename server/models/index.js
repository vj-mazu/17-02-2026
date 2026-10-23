/**
 * Models Index
 * 
 * Initializes all models and sets up associations
 */

const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Broker = require('./Broker');
const Arrival = require('./Arrival');
const BalanceAuditTrail = require('./BalanceAuditTrail');
const ByProduct = require('./ByProduct');
const HamaliEntry = require('./HamaliEntry');
const HamaliRate = require('./HamaliRate');
const { Warehouse, Kunchinittu, Variety } = require('./Location');
const OpeningBalance = require('./OpeningBalance');
const OtherHamaliEntry = require('./OtherHamaliEntry');
const OtherHamaliWork = require('./OtherHamaliWork');
const Outturn = require('./Outturn');
const Packaging = require('./Packaging');
const PaddyHamaliEntry = require('./PaddyHamaliEntry');
const PaddyHamaliRate = require('./PaddyHamaliRate');
const PurchaseRate = require('./PurchaseRate');
const RiceHamaliEntry = require('./RiceHamaliEntry');
const RiceHamaliRate = require('./RiceHamaliRate');
const RiceProduction = require('./RiceProduction');
const RiceStockLocation = require('./RiceStockLocation');
const RiceVariety = require('./RiceVariety');

// Create models object
const models = {
  User,
  Broker,
  Arrival,
  BalanceAuditTrail,
  ByProduct,
  HamaliEntry,
  HamaliRate,
  Warehouse,
  Kunchinittu,
  Variety,
  OpeningBalance,
  OtherHamaliEntry,
  OtherHamaliWork,
  Outturn,
  Packaging,
  PaddyHamaliEntry,
  PaddyHamaliRate,
  PurchaseRate,
  RiceHamaliEntry,
  RiceHamaliRate,
  RiceProduction,
  RiceStockLocation,
  RiceVariety
};

// Initialize associations for all models that have them
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Export models and sequelize
module.exports = {
  sequelize,
  ...models
};
