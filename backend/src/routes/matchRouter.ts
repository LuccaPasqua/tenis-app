import express from 'express';
import {
   getAllMatches,
   getAllMatchesFromPlayer,
   createMatch,
   updateMatch,
   deleteMatch
} from '../controllers/matchController';

const router = express.Router();

// GET Return all matches
router.get('/', getAllMatches);

// GET Return all matches from a specific player
router.get('/:player_id/player', getAllMatchesFromPlayer);

// POST Create a match
router.post('/', createMatch);

// PUT Update a match
router.put('/:id', updateMatch);

// DELETE Delete a specific match
router.delete('/:id', deleteMatch);

export const matchRouter = router;
