const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

(async () => {
  ejs.clearCache();
  const viewsDir = path.join(__dirname, 'views');

  function getEjsFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getEjsFiles(filePath));
      } else if (file.endsWith('.ejs')) {
        results.push(filePath);
      }
    }
    return results;
  }

  const files = getEjsFiles(viewsDir);
  console.log('Found', files.length, 'EJS files');

  for (const filePath of files) {
    const rel = path.relative(viewsDir, filePath);
    try {
      await ejs.renderFile(filePath, {
        language: 'fr',
        title: 'Test',
        user: { id: 1, fullname: 'Test', email: 'test@test.com', role: 'USER', is_admin: false, is_super_admin: false, profile_picture: null, preferred_theme: 'dark' },
        currentPath: '/test',
        posts: [],
        viewer: { id: 1, fullname: 'Test', email: 'test@test.com', role: 'USER', is_admin: false, is_super_admin: false, profile_picture: null, preferred_theme: 'dark' },
        profileUser: { id: 1, fullname: 'Test', email: 'test@test.com', role: 'USER', is_admin: false, is_super_admin: false, profile_picture: null, preferred_theme: 'dark' },
        stats: { users: 1, posts: 1, comments: 1, reports: 1, notifications: 1 },
        recentActivity: [],
        body: '<p>test body</p>',
        t: (k) => k
      }, { views: [viewsDir] });
      console.log('OK:', rel);
    } catch (e) {
      console.error('ERROR:', rel, '-', e.message.split('\n')[0]);
    }
  }
})();