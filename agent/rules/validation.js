module.exports = async function checkValidation(code, filePath) {
  const hits = ['express-validator', 'validateInput', 'Joi', 'zod', 'yup'].some(k => code.includes(k));
  return hits
    ? { check: 'Input Validation', status: 'pass' }
    : { check: 'Input Validation', status: 'warn', message: 'No validation layer detected' };
};
