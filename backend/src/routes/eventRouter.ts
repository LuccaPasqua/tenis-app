import express from "express";
import { getAllEvents, getAllPlayersFromEvent, createEvent, addPlayerToEvent, updateEvent, deleteEvent} from "../controllers/eventController";

const router = express.Router();


// GET Return all events
router.get('/', getAllEvents);


// GET Return all players from an event
router.get('/:id/players', getAllPlayersFromEvent)

// POST Create a event
router.post('/', createEvent)

// POST Add player to an event
router.post('/:id/add-player', addPlayerToEvent)

// PUT Edit an existing event
router.patch('/:id', updateEvent)


// DELETE Delete an existing event
router.delete('/:id', deleteEvent)

export const eventRouter = router;