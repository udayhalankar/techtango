module.exports = async function checkSubscription(code, filePath) {
  const hits = ['checkSubscription', 'requireSubscription'].some(k => code.includes(k));
  return hits
    ? { check: 'Subscription', status: 'pass' }
    : { check: 'Subscription', status: 'fail', message: 'Missing subscription guard (checkSubscription)' };
};
