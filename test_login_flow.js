const ejs = require('ejs');
const path = require('path');

(async () => {
  ejs.clearCache();
  try {
    // Simulate the login success redirect to OTP page
    const html = await ejs.renderFile(path.join(__dirname, 'views/auth/otp.ejs'), {
      t: (k) => k,
      purpose: 'LOGIN',
      showCode: true,
      code: '123456'
    });
    console.log('LOGIN FLOW OK');
    console.log('OTP page rendered successfully');
  } catch (e) {
    console.error('LOGIN FLOW ERROR:', e.message);
    console.error('Stack:', e.stack);
  }
})();