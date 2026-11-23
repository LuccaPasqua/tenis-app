import { Request, Response } from "express";
import {db} from "../prisma/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Soma (delta = 1) ou desfaz (delta = -1) o resultado de uma partida
// nas estatísticas dos jogadores, lendo os valores atuais dentro da transação.
async function applyMatchResult(
   tx: Tx,
   playerAId: number,
   playerBId: number,
   winnerId: number,
   delta: 1 | -1
){
   const loserId = winnerId === playerAId ? playerBId : playerAId;

   const winner = await tx.orm.public.Player.where({id: winnerId}).first();
   const loser = await tx.orm.public.Player.where({id: loserId}).first();

   if(winner){
      await tx.orm.public.Player
         .where({id: winner.id})
         .update({ wins: Math.max(0, winner.wins + delta) });
   }

   if(loser){
      await tx.orm.public.Player
         .where({id: loser.id})
         .update({ losses: Math.max(0, loser.losses + delta) });
   }
}
// import { orm } from "@prisma/orm-postgres/orm-client";


export const getAllMatches = async(
   _req: Request,
   _res: Response
) => {
   try {
      const matches = await db.orm.public.Match.select(
         "id",
         "player_a_id",
         "player_b_id",
         "date",
         "winner_id"
      ).all();

      return _res.status(200).json(matches);
   } catch (error) {
      return _res.status(500).json({error: "Failed to get all matches"});
   }

}

export const getAllMatchesFromPlayer = async(
   _req:Request,
   _res: Response
) => {
   try {
      const playerId = Number(_req.params.player_id);

      if(Number.isNaN(playerId)){
         return _res.status(400).json({error: "Invalid player ID"});
      }

      const player = await db.orm.public.Player
         .where({id: playerId})
         .include("matchesAsA")
         .include("matchesAsB")
         .first();

      if (!player || player.deleted_at != null) {
         return _res.status(404).json({ error: "Player not found" });
      }

      const matches = [...player.matchesAsA, ...player.matchesAsB];

      return _res.status(200).json(matches);
   } catch (error) {
      return _res.status(500).json({error: "Failed to get matches from player."});  
   }
}

export const createMatch = async(
   _req:Request,
   _res: Response
) => {
   try {
      const {
         player_a_id, 
         player_b_id, 
         date,
         set1_player_a,
         set1_player_b,
         set2_player_a,
         set2_player_b,
         set3_player_a,
         set3_player_b,
      } = _req.body;

      const playerAId = Number(player_a_id);
      const playerBId = Number(player_b_id);
      const parsedDate = new Date(date);

      if(
         !date || 
         Number.isNaN(parsedDate.getTime()) ||
         player_a_id == null || 
         player_b_id == null || 
         Number.isNaN(playerAId) ||
         Number.isNaN(playerBId) ||
         set1_player_a == null || String(set1_player_a).trim() === "" ||
         set1_player_b == null || String(set1_player_b).trim() === "" ||
         set2_player_a == null || String(set2_player_a).trim() === "" ||
         set2_player_b == null || String(set2_player_b).trim() === ""
      ){
         return _res.status(400).json({error: "Failed creating a match! Values missing"});
      }

      if(playerAId === playerBId){
         return _res.status(400).json({ error: "A player can't play againt himself"});
      }


      const validMatch:{valid: boolean; winner?: "A" | "B"; error?: string; setsAmmount: number} = validateMatchValues(
         Number(set1_player_a),
         Number(set1_player_b),
         Number(set2_player_a),
         Number(set2_player_b),
         set3_player_a != null && set3_player_a !== "" ? Number(set3_player_a) : null,
         set3_player_b != null && set3_player_b !== "" ? Number(set3_player_b) : null
      );

      if(!validMatch.valid){
         return _res.status(400).json({error: validMatch.error});
      }

      const existPlayerA = await db.orm.public.Player
         .where({id: playerAId}).first();

      if(!existPlayerA || existPlayerA.deleted_at != null){
         return _res.status(400).json({error: "Invalid player A ID"});
      }

      const existPlayerB = await db.orm.public.Player
         .where({id: playerBId})
         .first();

      if(!existPlayerB || existPlayerB.deleted_at != null){
         return _res.status(400).json({error: "Invalid player B ID"});
      }

      const winnerId = validMatch.winner === "A" ? existPlayerA.id : existPlayerB.id;

      const matchArray = [
         Number(set1_player_a),
         Number(set1_player_b),
         Number(set2_player_a),
         Number(set2_player_b),
         Number(set3_player_a ?? 0),
         Number(set3_player_b ?? 0),
      ];

      // Tudo ou nada: se qualquer passo falhar, nada é gravado.
      const { newMatch, createdSets } = await db.transaction(async (tx) => {
         const newMatch = await tx.orm.public.Match.create({
            player_a_id: existPlayerA.id,
            player_b_id: existPlayerB.id,
            date: parsedDate,
            winner_id: winnerId
         });

         await applyMatchResult(tx, existPlayerA.id, existPlayerB.id, winnerId, 1);

         const createdSets = [];
         for(let i = 0; i < validMatch.setsAmmount * 2; i+=2){
            const createdSet = await tx.orm.public.Sets.create({
               match_id: newMatch.id,
               set_number: i / 2 + 1,
               games_player_a: matchArray[i],
               games_player_b: matchArray[i+1]
            });
            createdSets.push(createdSet);
         }

         return { newMatch, createdSets };
      });

      return _res.status(201).json({
         ...newMatch,
         winner: winnerId,
         sets: createdSets,
      });

   } catch (error) {
      console.error(error);
      return _res.status(500).json({ error: "Failed to create match"});
   }
}

export const updateMatch = async(
   _req:Request,
   _res: Response
) => {
   try {
      const {
         player_a_id, 
         player_b_id, 
         date,
         set1_player_a,
         set1_player_b,
         set2_player_a,
         set2_player_b,
         set3_player_a,
         set3_player_b,
      } = _req.body;

      const matchId = Number(_req.params.id);

      const playerAId = Number(player_a_id);
      const playerBId = Number(player_b_id);
      const parsedDate = new Date(date);

      if(
         !matchId ||
         Number.isNaN(matchId) ||
         !date || 
         Number.isNaN(parsedDate.getTime()) ||
         player_a_id == null || 
         player_b_id == null || 
         Number.isNaN(playerAId) ||
         Number.isNaN(playerBId) ||
         set1_player_a == null || String(set1_player_a).trim() === "" ||
         set1_player_b == null || String(set1_player_b).trim() === "" ||
         set2_player_a == null || String(set2_player_a).trim() === "" ||
         set2_player_b == null || String(set2_player_b).trim() === ""
      ){
         return _res.status(400).json({error: "Failed updated a match! Values missing"});
      }

      if(playerAId === playerBId){
         return _res.status(400).json({ error: "A player can't play againt himself"});
      }


      const validMatch:{valid: boolean; winner?: "A" | "B"; error?: string; setsAmmount: number} = validateMatchValues(
         Number(set1_player_a),
         Number(set1_player_b),
         Number(set2_player_a),
         Number(set2_player_b),
         set3_player_a != null && set3_player_a !== "" ? Number(set3_player_a) : null,
         set3_player_b != null && set3_player_b !== "" ? Number(set3_player_b) : null
      );

      if(!validMatch.valid){
         return _res.status(400).json({error: validMatch.error});
      }

      // VERIFICAR JOGADORES
      const existPlayerA = await db.orm.public.Player
         .where({id: playerAId}).first();

      if(!existPlayerA || existPlayerA.deleted_at != null){
         return _res.status(400).json({error: "Invalid player A ID"});
      }

      const existPlayerB = await db.orm.public.Player
         .where({id: playerBId})
         .first();

      if(!existPlayerB || existPlayerB.deleted_at != null){
         return _res.status(400).json({error: "Invalid player B ID"});
      }

      
      // VERIFICAR Match
      const existedMatch = await db.orm.public.Match
         .where({id: matchId}).first();

      if(!existedMatch){
         return _res.status(404).json({error: "Match not found"});
      }

      const winnerId = validMatch.winner === "A" ? existPlayerA.id : existPlayerB.id;

      const matchArray = [
         Number(set1_player_a),
         Number(set1_player_b),
         Number(set2_player_a),
         Number(set2_player_b),
         Number(set3_player_a ?? 0),
         Number(set3_player_b ?? 0),
      ];

      // Tudo ou nada: se qualquer passo falhar, nada é gravado.
      const { updatedMatch, updatedSets } = await db.transaction(async (tx) => {
         // Desfaz o resultado antigo nas estatísticas dos jogadores
         await applyMatchResult(tx, existedMatch.player_a_id, existedMatch.player_b_id, existedMatch.winner_id, -1);

         const updatedMatch = await tx.orm.public.Match
            .where({id: matchId})
            .update({
               player_a_id: existPlayerA.id,
               player_b_id: existPlayerB.id,
               date: parsedDate,
               winner_id: winnerId,
            });

         // Aplica o novo resultado
         await applyMatchResult(tx, existPlayerA.id, existPlayerB.id, winnerId, 1);

         await tx.orm.public.Sets
            .where({match_id: matchId})
            .deleteAll();

         const updatedSets = [];
         for(let i = 0; i < validMatch.setsAmmount * 2; i+=2){
            const createdSet = await tx.orm.public.Sets.create({
               match_id: matchId,
               set_number: i / 2 + 1,
               games_player_a: matchArray[i],
               games_player_b: matchArray[i+1]
            });
            updatedSets.push(createdSet);
         }

         return { updatedMatch, updatedSets };
      });

      return _res.status(200).json({
         ...updatedMatch,
         winner: winnerId,
         sets: updatedSets,
      });

   } catch (error) {
      console.error(error);
      return _res.status(500).json({ error: "Failed to update match"});
   }
}

export const deleteMatch = async(
   _req:Request,
   _res: Response
) => {
   try {
      const matchId = Number(_req.params.id);

      if(Number.isNaN(matchId)){
         return _res.status(400).json({error: "Invalid match ID"});
      }

      const existedMatch = await db.orm.public.Match
         .where({id: matchId}).first();
      
      if(!existedMatch){
         return _res.status(404).json({ error: "Match not found!"});
      } 
      
      await db.transaction(async (tx) => {
         await applyMatchResult(tx, existedMatch.player_a_id, existedMatch.player_b_id, existedMatch.winner_id, -1);

         await tx.orm.public.Sets
            .where({match_id: matchId})
            .deleteAll();
         await tx.orm.public.Match
            .where({ id: matchId })
            .delete();
      });

      return _res.status(204).send();
      
   } catch (error) {
      console.error(error);
      return _res.status(500).json({ error: "Failed to delete match" });
   }
}


function isValidSet(a: number, b: number): boolean{
   if(!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b< 0){
      return false
   }

   const winner = Math.max(a,b);
   const loser = Math.min(a,b);

   if(winner === 6 && loser <= 4){
      return true;
   }

   if(winner === 7 && (loser === 5 || loser === 6)){
      return true;
   }

   return false;
}


function validateMatchValues(
   set1_player_a: number,
   set1_player_b: number,
   set2_player_a: number,
   set2_player_b: number,
   set3_player_a: number | null,
   set3_player_b: number | null
):{valid: boolean; winner?: "A" | "B"; error?: string; setsAmmount: number}{
   const sets = [
      [set1_player_a, set1_player_b],
      [set2_player_a, set2_player_b]
   ];

   const hasThirdSet = 
      set3_player_a != null &&
      set3_player_b != null &&
      !(set3_player_a === 0 && set3_player_b === 0);

   if(hasThirdSet){
      sets.push([set3_player_a, set3_player_b]);
   }

   let setsWonPlayerA = 0;
   let setsWonPlayerB = 0;

   for(let i = 0; i < sets.length; i++){
      if(setsWonPlayerA === 2 || setsWonPlayerB === 2){
         return {
            valid: false,
            error: `Set ${i +1} cannot exist because the match already had a winner.`,
            setsAmmount: setsWonPlayerA + setsWonPlayerB
         };
      }

      const [a,b] = sets[i];

      if(!isValidSet(a,b)){
         return {
            valid: false,
            error: `Set ${i+1} (${a}-${b}) has an invalid tennis score.`,
            setsAmmount: setsWonPlayerA + setsWonPlayerB
         };
      }

      if(a > b){
         setsWonPlayerA++;
      } else {
         setsWonPlayerB++;
      }
   }

   if(setsWonPlayerA < 2 && setsWonPlayerB < 2){
      return {
         valid: false,
         error: "Match is incomplete: neither player won 2 sets.",
         setsAmmount: setsWonPlayerA + setsWonPlayerB
      };
   }

   return {
      valid: true,
      winner: setsWonPlayerA === 2 ? "A" : "B",
      setsAmmount: setsWonPlayerA + setsWonPlayerB
   }
}