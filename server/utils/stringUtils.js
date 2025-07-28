// utils/stringUtils.js
exports.camelToSnake = str =>
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
