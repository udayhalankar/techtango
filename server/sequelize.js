// server/sequelize.js
// Side-effect–free Sequelize wiring. Only initializes when you call createSequelize().
// Gated by USE_SEQUELIZE env var.

const path = require('path');
require('dotenv').config(); // safe if already loaded elsewhere

const { Sequelize } = require('sequelize');

const isEnabled = () =>
  String(process.env.USE_SEQUELIZE || 'false').toLowerCase() === 'true';

// Try loading sequelize-auto.json (optional)
function readAutoConf() {
  try {
    return require(path.join(process.cwd(), 'sequelize-auto.json'));
  } catch {
    return {};
  }
}

function buildSequelizeConfig() {
  const auto = readAutoConf();

  const database = process.env.DB_NAME     || auto.database;
  const username = process.env.DB_USER     || auto.username;
  const password = process.env.DB_PASSWORD || auto.password;
  const host     = process.env.DB_HOST     || auto.host || 'localhost';
  const port     = Number(process.env.DB_PORT || auto.port || 5432);
  const useSSL   = String(process.env.DB_SSL || auto.ssl || 'false').toLowerCase() === 'true';

  return {
    database, username, password, host, port, useSSL,
  };
}

function tryInitModels(sequelize) {
  let initModels = null;
  try {
    // prefer auto-generated
    initModels = require('./models/autogen/init-models');
  } catch {
    try {
      initModels = require('./models/init-models');
    } catch {
      initModels = null;
    }
  }
  return initModels ? initModels(sequelize) : {};
}

/**
 * Create a Sequelize instance lazily.
 * No connections/logs happen until you call this.
 * Returns { sequelize, models } or null if disabled.
 */
function createSequelize(options = {}) {
  if (!isEnabled()) return null;

  const { database, username, password, host, port, useSSL } = buildSequelizeConfig();

  const sequelize = new Sequelize(database, username, password, {
    host,
    port,
    dialect: 'postgres',
    logging: process.env.SEQ_LOG === 'true' ? console.log : false,
    dialectOptions: useSSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    pool: { max: 10, min: 0, idle: 10_000, acquire: 30_000 },
    define: { underscored: true },
    ...options, // allow caller overrides
  });

  const models = tryInitModels(sequelize);

  return { sequelize, models };
}

/** Simple connectivity check you can call after createSequelize() */
async function testSequelize(sequelize) {
  if (!sequelize) return false;
  await sequelize.authenticate();
  return true;
}

// Legacy-friendly exports (no eager init, no side effects)
module.exports = {
  isEnabled,
  createSequelize,
  testSequelize,
  // soft placeholders for old imports that expect these names:
  sequelize: null,
  models: {},
};
