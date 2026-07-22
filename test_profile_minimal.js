const ejs = require('ejs');
const path = require('path');

async function test() {
  // Clear EJS cache
  ejs.clearCache();
  
  try {
    const html = await ejs.renderFile(path.join(__dirname, 'views/profile/index.ejs'), {
      language: 'fr',
      user: { id: 1, fullname: 'Test', email: 'test@test.com' },
      viewer: { id: 1 },
      t: (k) => k
    });
    console.log('PROFILE MINIMAL OK');
    console.log('HTML length:', html.length);
  } catch (e) {
    console.error('PROFILE MINIMAL ERROR:', e.message);
    console.error('Stack:', e.stack);
  }
}

test();