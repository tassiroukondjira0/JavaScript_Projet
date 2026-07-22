const ejs = require('ejs');
const path = require('path');

(async () => {
  ejs.clearCache();
  try {
    const html = await ejs.renderFile(path.join(__dirname, 'views/partials/appShell.ejs'), {
      language: 'fr',
      title: 'Test',
      user: { id: 1, fullname: 'Test' },
      currentPath: '/profile',
      body: '<main>Hello</main>'
    });
    console.log('APP SHELL OK');
    console.log(html.slice(0, 200));
  } catch (e) {
    console.error('APP SHELL ERROR:', e.message);
  }
})();