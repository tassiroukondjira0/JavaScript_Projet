# TODO - Fix Friends Page & Search Issues ✅ COMPLETE

## Step 1: Update `views/users/search.ejs` ✅
- [x] Load and display friends list on page load via `GET /api/friends/list`
- [x] Added search input to filter friends by name client-side
- [x] Added a separate "Rechercher des utilisateurs" section to search all users
- [x] Show friend status in search results (friend, pending received, pending sent, add friend)
- [x] Removed email display from search results
- [x] Removed unused `isPrivileged` variable

## Step 2: Update `public/js/main.js` ✅
- [x] Hide email in global search dropdown, only show the user's `fullname`
- [x] Removed `@${u.id}` fallback display for non-privileged users

