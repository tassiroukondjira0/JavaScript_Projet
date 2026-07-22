const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

(async () => {
  ejs.clearCache();
  const viewsDir = path.join(__dirname, 'views');
  const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.ejs'));
  
  for (const file of files) {
    const filePath = path.join(viewsDir, file);
    try {
      await ejs.renderFile(filePath, {
        language: 'fr',
        title: 'Test',
        user: { id: 1, fullname: 'Test' },
        currentPath: '/test',
        t: (k) => k
      }, { views: [viewsDir] });
      console.log('OK:', file);
    } catch (e) {
      console.error('ERROR:', file, '-', e.message.split('\n')[0]);
    }
  }
})();