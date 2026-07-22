const ejs = require('ejs');
const path = require('path');

(async () => {
  ejs.clearCache();
  try {
    // Simulate EXACTLY what the route /auth/otp?purpose=LOGIN does
    const html = await ejs.renderFile(path.join(__dirname, 'views/auth/otp.ejs'), {
      t: (k) => k,
      purpose: 'LOGIN',
      showCode: true,
      code: '123456'
    }, { views: [path.join(__dirname, 'views')] });
    console.log('LOGIN EXACT OK');
    console.log(html.substring(0, 500));
  } catch (e) {
    console.error('LOGIN EXACT ERROR:', e.message);
    console.error('Stack:', e.stack);
  }
})();