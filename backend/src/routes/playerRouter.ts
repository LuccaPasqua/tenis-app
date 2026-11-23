import express from "express";
import multer from "multer";
import { createPlayer, deletePlayer, getAllPlayers, editPlayer } from "../controllers/playerController";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET Return all players
router.get('/', getAllPlayers);

// POST Create a player (multipart/form-data: name, image?)
router.post('/', upload.single("image"), createPlayer);

// PUT Edit an existing player (multipart/form-data: name?, image?)
router.put('/:id', upload.single("image"), editPlayer);

// DELETE Delete an existing player
router.delete('/:id', deletePlayer);

export const playerRouter = router;
