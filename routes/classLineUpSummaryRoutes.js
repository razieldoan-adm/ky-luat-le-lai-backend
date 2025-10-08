import express from "express";
import {
  createRecord,
  getWeeklySummary,
  deleteRecord,
} from "../controllers/classLineUpSummaryController.js";

const router = express.Router();

// POST: Ghi nhận lỗi
router.post("/", createRecord);

// GET: Danh sách vi phạm trong tuần
router.get("/weekly-summary", getWeeklySummary);

// DELETE: Xóa vi phạm
router.delete("/:id", deleteRecord);

export default router;
