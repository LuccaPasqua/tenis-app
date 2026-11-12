import express, {type Express} from "express";
import "dotenv/config";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";

import { playerRouter } from "./routes/playerRouter";
import { matchRouter } from "./routes/matchRouter";
import { setsRouter } from "./routes/setsRouter";


const PORT = process.env.PORT ? process.env.PORT : 3030;

const app: Express = express();

app.use('/api/v1/players', playerRouter);
app.use('/api/v1/match', matchRouter);





app.listen(PORT,() => {
   console.log("Server running on port: ", PORT);
});