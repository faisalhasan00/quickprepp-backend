// controllers/courseController.js
const Course = require('../models/Course');
const UserCourseProgress = require('../models/UserCourseProgress');
const generateQuizWithFallback = require('../services/generateQuizWithFallback');

/* -------------------------------------------------------------------------- */
/*  GET ALL COURSES                                                           */
/* -------------------------------------------------------------------------- */
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    console.error('getAllCourses:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/* -------------------------------------------------------------------------- */
/*  GET COURSE BY ID                                                          */
/* -------------------------------------------------------------------------- */
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (err) {
    console.error('getCourseById:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/* -------------------------------------------------------------------------- */
/*  CREATE NEW COURSE – mark FIRST video of FIRST section as freePreview      */
/* -------------------------------------------------------------------------- */
exports.createCourse = async (req, res) => {
  try {
    const courseData = req.body;

    if (
      courseData.videoSections?.length > 0 &&
      courseData.videoSections[0].videos?.length > 0
    ) {
      courseData.videoSections[0].videos[0].freePreview = true;
    }

    const newCourse = new Course(courseData);
    await newCourse.save();
    res.status(201).json(newCourse);
  } catch (err) {
    console.error('createCourse:', err);
    res.status(400).json({ error: 'Invalid course data' });
  }
};

/* -------------------------------------------------------------------------- */
/*  GET QUIZ FOR A VIDEO                                                      */
/* -------------------------------------------------------------------------- */
exports.getVideoQuiz = async (req, res) => {
  const { courseId, videoId } = req.params;

  try {
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    for (const section of course.videoSections) {
      const video = section.videos.id(videoId);
      if (video?.quiz) return res.json(video.quiz);
    }

    res.status(404).json({ error: 'Quiz not found for this video' });
  } catch (err) {
    console.error('getVideoQuiz:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/* -------------------------------------------------------------------------- */
/*  GENERATE QUIZ FOR A VIDEO (AI fallback)                                   */
/* -------------------------------------------------------------------------- */
exports.generateVideoQuiz = async (req, res) => {
  const { courseId, videoId } = req.params;

  try {
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    for (const section of course.videoSections) {
      const video = section.videos.id(videoId);
      if (video) {
        const quiz = await generateQuizWithFallback(video.title);
        video.quiz = { ...quiz, triggerTime: 60 };
        await course.save();
        return res.json({ message: 'Quiz generated successfully', quiz });
      }
    }

    res.status(404).json({ error: 'Video not found' });
  } catch (err) {
    console.error('generateVideoQuiz:', err);
    res.status(500).json({ error: 'AI quiz generation failed' });
  }
};

/* -------------------------------------------------------------------------- */
/*  GET VIDEO BY ID – return { video, hasAccess }                             */
/* -------------------------------------------------------------------------- */
exports.getVideoById = async (req, res) => {
  const { courseId, videoId } = req.params;
  const userId = req.user?.id; // assumes auth middleware sets req.user

  try {
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    for (const section of course.videoSections) {
      const video = section.videos.id(videoId);
      if (video) {
        /* ----------- Check if user is enrolled ----------- */
        let hasAccess = false;
        if (userId) {
          const progress = await UserCourseProgress.findOne({ userId, courseId });
          hasAccess = !!progress;
        }

        return res.json({
          video: {
            _id:         video._id,
            title:       video.title,
            description: video.description,
            url:         video.url,
            freePreview: video.freePreview || false,
          },
          hasAccess,
        });
      }
    }

    res.status(404).json({ error: 'Video not found' });
  } catch (err) {
    console.error('getVideoById:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
