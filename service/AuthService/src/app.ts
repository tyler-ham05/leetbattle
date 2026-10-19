import express from "express";
import { getRoot} from "./service";

const app = express();

app.use(express.json());

app.get("/", getRoot);

export default app;
