import express from 'express';

const router = express.Router();

// GET Return all matches
router.get('/', );

// GET Return all matches from a specific player
router.get('/player/:player_id');

// POST Create a match
router.post('/', );

//PUT Update a match
router.put('/:id');

//DELETE Delete an specific match
router.delete('/:id', );

export const matchRouter = router;