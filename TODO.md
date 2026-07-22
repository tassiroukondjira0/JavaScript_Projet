# Cleanup Plan - Remove Unnecessary Files

## ✅ Step 1: Delete root test/debug files
- test_all_views.js
- test_all_views_recursive.js
- test_appshell.js
- test_ejs.js
- test_login_exact.js
- test_login_flow.js
- test_posts_compile.js
- test_profile_minimal.js
- test_profile_with_views.js
- posts_test_out.html
- cookies.txt
- reg_test.txt
- TODO_admin_connection_fix.txt

## ✅ Step 2: Delete unused controllers
- controllers/searchController.js

## ✅ Step 3: Delete unused models (class-based duplicates)
- models/User.js
- models/Post.js
- models/Comment.js
- models/Notification.js
- models/Reaction.js

## ✅ Step 4: Delete unused middleware
- middleware/jwtAuthAllowRefresh.js
- middleware/requireLogin.js
- middleware/sessionOrJwtAuth.js

## ✅ Step 5: Delete unused sockets
- sockets/socketHandler.js

## ✅ Step 6: Delete unused config
- config/sessionStore.js

## ✅ Step 7: Delete dev scripts
- scripts/check_css.js
- scripts/create_activity_logs.js
- scripts/create_missing_tables.js
- scripts/create_tables.js
- scripts/reset_json_db.js

## ✅ Step 8: Delete unused public JS files
- public/js/activity.js
- public/js/admin-charts.js
- public/js/admin.js
- public/js/adminDashboard.js
- public/js/auth.js
- public/js/chat.js
- public/js/feed.js
- public/js/friends.js
- public/js/legacy-feed-mount.js
- public/js/notifications.js
- public/js/onboarding.js
- public/js/profile.js
- public/js/reports.js
- public/js/welcome-tour.js
- public/js/welcomeTour.js

## ✅ Step 9: Delete unused views
- views/landing_original_backup.ejs

## ✅ Step 10: Delete unused images
- public/images/default-cover.svg
- public/images/Capture d* (both screenshots)

