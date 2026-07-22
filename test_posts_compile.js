const ejs = require('ejs');
const path = require('path');

(async () => {
  ejs.clearCache();
  try {
    const html = await ejs.renderFile(path.join(__dirname, 'views/posts/index.ejs'), {
      language: 'fr',
      title: 'Publications',
      user: { id: 1, fullname: 'Test' },
      currentPath: '/posts',
      posts: [],
      t: (k) => k
    }, { views: [path.join(__dirname, 'views')] });
    console.log('POSTS INDEX OK');
  } catch (e) {
    console.error('POSTS INDEX ERROR:', e.message);
  }

  try {
    const html = await ejs.renderFile(path.join(__dirname, 'views/posts/search.ejs'), {
      language: 'fr',
      title: 'Recherche publications',
      user: { id: 1, fullname: 'Test' },
      currentPath: '/posts/search',
      t: (k) => k
    }, { views: [path.join(__dirname, 'views')] });
    console.log('POSTS SEARCH OK');
  } catch (e) {
    console.error('POSTS SEARCH ERROR:', e.message);
  }
})();