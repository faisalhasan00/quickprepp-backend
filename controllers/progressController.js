const Progress = require('../models/UserCourseProgress');

exports.updateProgress = async (req, res) => {
  const { userId, courseId, videoId, watchedDuration, isCompleted } = req.body;

  try {
    let record = await Progress.findOne({ userId, courseId });

    if (!record) {
      record = new Progress({
        userId,
        courseId,
        progress: [{ videoId, watchedDuration, isCompleted }],
        lastWatchedVideoId: videoId,
        completedPercentage: 0
      });
    } else {
      const videoProgress = record.progress.find(v => v.videoId === videoId);
      if (videoProgress) {
        videoProgress.watchedDuration = watchedDuration;
        videoProgress.isCompleted = isCompleted;
      } else {
        record.progress.push({ videoId, watchedDuration, isCompleted });
      }
      record.lastWatchedVideoId = videoId;
    }

    // Optionally update completedPercentage here

    await record.save();
    res.status(200).json(record);
  } catch (err) {
    res.status(500).json({ error: 'Could not update progress' });
  }
};
