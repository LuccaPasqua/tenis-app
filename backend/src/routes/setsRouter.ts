import express from 'express';

const router = express.Router();

// GET Return all sets
router.get('/', );

// GET Return all sets from a specific match match
router.get('/match/:match_id');

// POST Create a set
router.post('/', );

//PUT Update a set
router.put('/:id');


export const setsRouter = router;