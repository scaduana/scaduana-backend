import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./src/config/db.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.send("API ERP SCADUANA funcionando");
  } catch (e) {
    res.status(500).send("DB error");
  }
});

app.listen(process.env.PORT || 4000, () => {
  console.log("Servidor SCADUANA corriendo…");
});
