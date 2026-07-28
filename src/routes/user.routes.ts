import { Router } from "express";
import {
  createUser,
  getAllUsers,
  getUserByEmail,
  updateUserInfo,
  updateUserRole,
} from "../controllers/user.controller";

const router = Router();

router.get("/", getAllUsers);
router.patch("/role", updateUserRole);
router.patch("/info", updateUserInfo);
router.get("/:email", getUserByEmail);
router.post("/", createUser);

export default router;
