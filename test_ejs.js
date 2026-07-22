const ejs = require('ejs');
const path = require('path');

async function test() {
  try {
    const html = await ejs.renderFile(path.join(__dirname, 'views/auth/login.ejs'), {
      t: (k) => k,
      language: 'fr',
      user: null
    });
    console.log('LOGIN OK');
  } catch (e) {
    console.error('LOGIN ERROR:', e.message);
  }

  try {
    const html2 = await ejs.renderFile(path.join(__dirname, 'views/auth/otp.ejs'), {
      t: (k) => k,
      purpose: 'LOGIN',
      showCode: true,
      code: '123456'
    });
    console.log('OTP OK');
  } catch (e) {
    console.error('OTP ERROR:', e.message);
  }

  try {
    const html3 = await ejs.renderFile(path.join(__dirname, 'views/auth/register.ejs'), {
      t: (k) => k,
      language: 'fr',
      error: null
    });
    console.log('REGISTER OK');
  } catch (e) {
    console.error('REGISTER ERROR:', e.message);
  }

  try {
    const html4 = await ejs.renderFile(path.join(__dirname, 'views/auth/_authShell.ejs'), {
      language: 'fr',
      title: 'OTP',
      hero: '<h1>Hero</h1>',
      form: '<form>Test</form>',
      scripts: ''
    });
    console.log('AUTH SHELL OK');
  } catch (e) {
    console.error('AUTH SHELL ERROR:', e.message);
  }

  try {
    const html5 = await ejs.renderFile(path.join(__dirname, 'views/partials/appShell.ejs'), {
      language: 'fr',
      title: 'Test',
      user: { id: 1, fullname: 'Test' },
      currentPath: '/profile',
      body: '<main>Hello</main>'
    });
    console.log('APP SHELL OK');
  } catch (e) {
    console.error('APP SHELL ERROR:', e.message);
  }

  try {
    const html6 = await ejs.renderFile(path.join(__dirname, 'views/partials/leftNav.ejs'), {
      user: { id: 1, fullname: 'Test' },
      currentPath: '/profile'
    });
    console.log('LEFT NAV OK');
  } catch (e) {
    console.error('LEFT NAV ERROR:', e.message);
  }

  try {
    const html7 = await ejs.renderFile(path.join(__dirname, 'views/profile/index.ejs'), {
      language: 'fr',
      user: { id: 1, fullname: 'Test', email: 'test@test.com' },
      viewer: { id: 1 },
      currentPath: '/profile',
      t: (k) => k
    }, { views: [path.join(__dirname, 'views')] });
    console.log('PROFILE OK');
  } catch (e) {
    console.error('PROFILE ERROR:', e.message);
  }
}

test();