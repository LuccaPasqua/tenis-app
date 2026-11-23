import { Request, Response } from "express";
import { db} from "../prisma/db"

export const getAllEvents = async(
   _req: Request,
   _res: Response
) => {
   try {
      const events = await db.orm.public.Event
         .select(
            "id",
            "name",
            "date",
            "created_at"
         ).all()

      return _res.status(200).json(events);

   } catch (error) {
      return _res.status(500).json({error: "Failed to fetch events."});
   }
}

export const getAllPlayersFromEvent = async(
   _req: Request,
   _res: Response
) => {
   try {
      const eventId = Number(_req.params.id);

      if(Number.isNaN(eventId)){
         return _res.status(400).json({ error: "Invalid event ID"});
      }

      const existedEvent = await db.orm.public.Event
         .where({id: eventId}).first();

      if(!existedEvent){
         return _res.status(404).json({ error: "Event not found"});
      }

      const eventPlayers = await db.orm.public.EventPlayer
         .where({ event_id: eventId })
         .include("player")
         .all();

      const players = eventPlayers.map((ep) => ep.player).filter((player) => player.deleted_at == null);
      
      return _res.status(200).json(players);
   } catch (error) {
      return _res.status(500).json({error: "Failed to fetch players from event."});
   }
}

export const createEvent = async(
   _req: Request,
   _res: Response
) => {
   try {
      const {name, date} = _req.body;
      const parsedDate = new Date(date);

      if(typeof name !== "string"||!name || name == null || name.length < 3 ){
         return _res.status(400).json({error: "Failed to create event. Event name must be at least 3 characters"})
      }

      if(!date  || Number.isNaN(parsedDate.getTime()) || parsedDate < new Date){
         return _res.status(400).json({error: "Failed to create event. Date must be in the future."})
      }

      const newEvent = await db.orm.public.Event.create({
         name,
         date: parsedDate
      });

      return _res.status(201).json(newEvent);


   } catch (error) {
      return _res.status(500).json({error: "Failed to create Event"});
   }
}


export const addPlayerToEvent = async(
   _req: Request,
   _res: Response
) => {
   try {
      const eventId = Number(_req.params.id);
      const { player_id } = _req.body;
      const playerId = Number(player_id);

      if(!playerId || playerId == null || Number.isNaN(playerId)){
         return _res.status(400).json({error: "Invalide player ID"});
      }

      if(Number.isNaN(eventId)){
         return _res.status(400).json({error: "Invalid event ID"});
      }

      const existedEvent = await db.orm.public.Event
         .where({ id: eventId}).first();

      if(!existedEvent){
         return _res.status(404).json({ error: "Event not found"});
      }

      const existedPlayer = await db.orm.public.Player
         .where({id: playerId}).first();

      if(!existedPlayer || existedPlayer.deleted_at != null){
         return _res.status(404).json({error: "Player not found"});    
      }

      const existedEventPlayer = await db.orm.public.EventPlayer
         .where({event_id: eventId, player_id: playerId}).first();

      if(existedEventPlayer){
         return _res.status(409).json({error: "This player is already in this event"});
      }

      const newEventPlayer = await db.orm.public.EventPlayer
         .create({
            event_id: eventId,
            player_id: playerId
         });

      return _res.status(201).json(newEventPlayer);
   } catch (error) {
      return _res.status(500).json({error: "Failed to add player to an event"});
   }
}

export const updateEvent = async(
   _req: Request,
   _res: Response
) => {
   try {       
      const {name, date} = _req.body;
      const eventId = Number(_req.params.id);
      const parsedDate = new Date(date);

      if(!name || name == null || name.length < 3 ){
         return _res.status(400).json({error: "Failed to create event. Event name must be at least 3 characters"})
      }

      if(!date ||Number.isNaN(parsedDate.getTime())){
         return _res.status(400).json({error: "Failed to update event. "})
      }

      if(Number.isNaN(eventId)){
         return _res.status(400).json({error: "Invalid event ID"});
      }

      const existedEvent = await db.orm.public.Event
         .where({ id: eventId}).first();

      if(!existedEvent){
         return _res.status(404).json({ error: "Event not found"});
      }

      const updatedEvent = await db.orm.public.Event
         .where({id: eventId}).update({
            name, 
            date: parsedDate
         });

      return _res.status(200).json(updatedEvent);
   } catch (error) {
      return _res.status(500).json({error: "Failed to update event"});
   }

}

export const deleteEvent = async(
   _req: Request,
   _res: Response
) => {
   try {
      const eventId = Number(_req.params.id);

      if(Number.isNaN(eventId)){
         return _res.status(400).json({error: "Invalid event ID"});
      }

      const existedEvent = await db.orm.public.Event
         .where({id: eventId}).first();

      if(!existedEvent){
         return _res.status(404).json({error: "Event not fount"});
      }

      await db.transaction(async (tx) => {
         await tx.orm.public.EventPlayer
            .where({event_id: eventId})
            .deleteAll();

         await tx.orm.public.Event
            .where({id: eventId})
            .delete();
      });

      return _res.status(204).send();
   } catch (error) {
      console.error(error);
      return _res.status(500).json({error: "Failed to delete event"});
   }
}