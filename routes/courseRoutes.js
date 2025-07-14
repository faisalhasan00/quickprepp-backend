const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

// ──────────────────────────────────────────────
// 📚 Course Routes
// ──────────────────────────────────────────────

// Get all courses
router.get('/', courseController.getAllCourses);

// Get a course by ID
router.get('/:id', courseController.getCourseById);

// Create a new course
router.post('/', courseController.createCourse);

// ──────────────────────────────────────────────
// 🎬 Video Routes (Nested under Course)
// ──────────────────────────────────────────────

// Get specific video by courseId and videoId
router.get('/:courseId/videos/:videoId', courseController.getVideoById);

// Get quiz for a specific video
router.get('/:courseId/videos/:videoId/quiz', courseController.getVideoQuiz);

// Generate quiz for a specific video
router.post('/:courseId/videos/:videoId/quiz', courseController.generateVideoQuiz);

module.exports = router;
