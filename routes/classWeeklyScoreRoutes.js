const express = require("express");
const router = express.Router();
const classWeeklyScoreController = require("../controllers/classWeeklyScoreController");

router.get("/", classWeeklyScoreController.getWeeklyScores);
router.get("/temp/:weekNumber", classWeeklyScoreController.getTempWeeklyScores);
router.post("/save", classWeeklyScoreController.saveWeeklyScores);
router.put("/update/:weekNumber", classWeeklyScoreController.updateWeeklyScores);

module.exports = router;
