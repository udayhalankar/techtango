module.exports = async function checkErrorLogging(code, filePath) {
  const usesErrorHandler = code.includes('errorHandler') || code.includes('app.use(errorHandler)');
  const usesLogger = code.includes('logger.error') || code.includes('winston') || code.includes('pino');
  if (usesErrorHandler || usesLogger) {
    return { check: 'Error Logging', status: 'pass' };
  }
  return { check: 'Error Logging', status: 'warn', message: 'No centralized error logging detected' };
};
