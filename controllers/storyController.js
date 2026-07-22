const Story = require('../models/storyModel');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `story-${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

async function createStory(req, res) {
  try {
    const userId = req.session.user.id;
    const { caption } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Media requis pour la story.' });
    }

    const mediaUrl = file.filename;
    const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';

    const storyId = await Story.create({ userId, mediaUrl, mediaType, caption });
    const story = await Story.findById(storyId);

    res.status(201).json({ message: 'Story publiée avec succès.', story });
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la story.' });
  }
}

async function getStories(req, res) {
  try {
    const userId = req.session.user.id;
    const myStories = await Story.getMyActiveStories(userId);
    const friendsStories = await Story.getFriendsStories(userId);

    // Group stories by user
    const storyGroups = {};
    
    for (const story of myStories) {
      const uid = String(story.user_id);
      if (!storyGroups[uid]) {
        storyGroups[uid] = {
          user_id: uid,
          fullname: story.fullname,
          profile_picture: story.profile_picture,
          stories: []
        };
      }
      storyGroups[uid].stories.push(story);
    }

    for (const story of friendsStories) {
      const uid = String(story.user_id);
      if (!storyGroups[uid]) {
        storyGroups[uid] = {
          user_id: uid,
          fullname: story.fullname,
          profile_picture: story.profile_picture,
          stories: []
        };
      }
      storyGroups[uid].stories.push(story);
    }

    res.json({ ok: true, storyGroups: Object.values(storyGroups) });
  } catch (error) {
    console.error('Error getting stories:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des stories.' });
  }
}

async function viewStory(req, res) {
  try {
    const userId = req.session.user.id;
    const storyId = Number(req.params.storyId);

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story non trouvée ou expirée.' });
    }

    await Story.addView(storyId, userId);
    const viewCount = await Story.getViewCount(storyId);

    res.json({ ok: true, story, viewCount });
  } catch (error) {
    console.error('Error viewing story:', error);
    res.status(500).json({ error: 'Erreur lors de la visualisation.' });
  }
}

async function deleteStory(req, res) {
  try {
    const userId = req.session.user.id;
    const storyId = Number(req.params.storyId);

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story non trouvée.' });
    }

    if (parseInt(story.user_id) !== userId) {
      return res.status(403).json({ error: 'Non autorisé.' });
    }

    await Story.delete(storyId);
    res.json({ ok: true, message: 'Story supprimée.' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
}

module.exports = { upload, createStory, getStories, viewStory, deleteStory };