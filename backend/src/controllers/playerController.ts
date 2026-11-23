import type {Request, Response} from "express";
import "multer";
import {db} from "../prisma/db";
import { neon } from "files-sdk/neon";
import {Files} from "files-sdk"

// Criado sob demanda: o adapter da Neon lança erro se as variáveis de storage
// (AWS_ENDPOINT_URL_S3 etc.) não estiverem no .env, o que derrubaria o servidor inteiro.
let files: Files | null = null;
const getFiles = () => (files ??= new Files({ adapter: neon({bucket: "images"}) }));

async function uploadImage(file: Express.Multer.File): Promise<string> {
   const key = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
   await getFiles().upload(key, file.buffer, {contentType: file.mimetype});

   return `${process.env.AWS_ENDPOINT_URL_S3}/images/${key}`;
}


export const getAllPlayers = async (
   _req: Request,
   _res: Response
) => {
   try {
      const players = await db.orm.public.Player.select(
         "id",
         "name",
         "img_url",
         "wins", 
         "losses",
         "created_at"
      ).where({deleted_at: null}).all()

      return _res.status(200).json(players);
   } catch (error) {
      return _res.status(500).json({ error: "Failed to fetch players"});
   }
}



export const createPlayer = async (
   _req: Request,
   _res: Response
) => {
   try {
      const {name} = _req.body;
      const file = _req.file;

      if(typeof name !== "string" || name.trim().length < 3){
         return _res.status(400).json({
            error: "Failed to create player. Name must be at least 3 characters."
         });
      }

      const imageUrl = file ? await uploadImage(file) : null;

      const newPlayer = await db.orm.public.Player.create({
         name: name.trim(),
         img_url: imageUrl ?? "",
         wins: 0,
         losses: 0,
      })

      return _res.status(201).json(newPlayer);
   } catch (error) {
      return _res.status(500).json({ error: "Failed to create Player"})
   }

}

export const editPlayer = async (
   _req: Request,
   _res: Response
) => {
   try {
      const playerId = Number(_req.params.id);

      const {name} = _req.body;
      const file = _req.file;

      if(typeof name !== "string" || name.trim().length < 3){
         return _res.status(400).json({
            error: "Failed to create player. Name must be at least 3 characters."
         });
      }

      if(Number.isNaN(playerId)){
         return _res.status(400).json({error: "Invalid player ID"});
      }

      const existingPlayer = await db.orm.public.Player
         .where({id: playerId})
         .first();

      if(!existingPlayer || existingPlayer.deleted_at != null){
         return _res.status(404).json({error: "Player not found"});
      }

      const imageUrl = file ? await uploadImage(file) : existingPlayer.img_url;

      const updatedPlayer = await db.orm.public.Player
         .where({id: playerId})
         .update({
            ...(typeof name === "string" && name.trim().length >= 3 ? {name: name.trim()} : {}),
            img_url: imageUrl
         });

      return _res.status(200).json(updatedPlayer);
   } catch (error) {
      return _res.status(500).json({error: "Failed to update player"});  
   }
};

export const deletePlayer = async (
   _req: Request,
   _res: Response
) => {
   try {
      const playerId = Number(_req.params.id);

      if(Number.isNaN(playerId)){
         return _res.status(400).json({error: "Invalid player ID."});
      }

      const existingPlayer = await db.orm.public.Player
         .where({id: playerId}).first();

      if(!existingPlayer){
         return _res.status(404).json({error: "Player not found"});
      }

      if(existingPlayer?.deleted_at != null){
         return _res.status(400).json({error: "Player is already deleted."});
      }

      const deletedPlayer = await db.orm.public.Player
         .where({id: playerId})
         .update({
            deleted_at: new Date(),
         });

      return _res.status(200).send();

   } catch (error) {
      console.error(error);
      return _res.status(500).json({ error: "Failed to delete player" });
   }
}