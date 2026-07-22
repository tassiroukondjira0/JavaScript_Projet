const ejs = require('ejs');
const path = require('path');

(async () => {
  ejs.clearCache();
  try {
    const html = await ejs.renderFile(path.join(__dirname, 'views/profile/index.ejs'), {
      language: 'fr',
      title: 'Profil',
      user: { id: 1, fullname: 'Test', email: 'test@test.com' },
      viewer: { id: 1 },
      currentPath: '/profile',
      t: (k) => k
    }, { views: [path.join(__dirname, 'views')] });
    console.log('PROFILE OK');
    console.log(html.slice(0, 300));
  } catch (e) {
    console.error('PROFILE ERROR:', e.message);
  }
})();