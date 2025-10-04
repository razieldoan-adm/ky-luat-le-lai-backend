const express = require("express");
const router = express.Router();
const classHygieneController = require("../controllers/classHygieneScoreController");

router.post("/", classHygieneController.saveClassHygieneScores);
router.get("/by-week", classHygieneController.getByWeek);
router.get("/by-week-and-class", classHygieneController.getByWeekAndClass);
router.get("/summary", classHygieneController.getSummaryByWeek);

module.exports = router;
