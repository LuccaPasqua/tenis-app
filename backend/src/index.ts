import express, { type Express } from "express";
import "dotenv/config";
import cors from "cors";

import { playerRouter } from "./routes/playerRouter";
import { matchRouter } from "./routes/matchRouter";
import { eventRouter } from "./routes/eventRouter";

const PORT = process.env.PORT ? process.env.PORT : 3030;

const app: Express = express();

app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());

app.use('/api/v1/players', playerRouter);
app.use('/api/v1/match', matchRouter);
app.use('/api/v1/events', eventRouter);

app.listen(PORT, () => {
   console.log("Server running on port: ", PORT);
});
