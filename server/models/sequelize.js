// server/models/sequelize.js
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    logging: false,
  }
);

// Resolve autogen path (created by sequelize-auto)
const autogenDir = path.join(__dirname, 'autogen');
const initPath   = path.join(autogenDir, 'init-models.js');

if (!fs.existsSync(autogenDir)) {
  console.error('[sequelize-loader] Missing directory:', autogenDir);
}
if (!fs.existsSync(initPath)) {
  console.error('[sequelize-loader] Missing file:', initPath);
  try { console.error('[sequelize-loader] autogen contents:', fs.readdirSync(autogenDir)); } catch {}
}

// Load init-models (handles CJS/ESM export styles)
let initModels;
try {
  const mod = require(initPath);
  initModels = mod.initModels || mod.default || mod;
} catch (e) {
  console.error('[sequelize-loader] require(init-models) failed:', e.message);
}

const models = initModels ? initModels(sequelize, DataTypes) : {};

console.log('[sequelize-loader] Models loaded:', Object.keys(models));

module.exports = { sequelize, models };
