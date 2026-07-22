const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const storyController = require('../controllers/storyController');

router.get('/', requireLogin, storyController.getStories);
router.post('/', requireLogin, storyController.upload.single('media'), storyController.createStory);
router.post('/:storyId/view', requireLogin, storyController.viewStory);
router.delete('/:storyId', requireLogin, storyController.deleteStory);

module.exports = router;