import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "./src/config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "SCADUANA_FALLBACK_SECRET";

app.use(cors());
app.use(express.json());

// Crear tabla de usuarios si no existe
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(200) UNIQUE NOT NULL,
      password VARCHAR(200) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      creado_en TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log("Tabla users verificada/creada");
}

ensureTables().catch((err) => {
  console.error("Error al crear/verificar tabla users:", err);
});

// Ruta de prueba
app.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.send("API ERP SCADUANA funcionando");
  } catch (e) {
    console.error(e);
    res.status(500).send("Error en conexión a DB");
  }
});

// Registro de usuario
app.post("/api/users/register", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son obligatorios" });
    }

    const existe = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ message: "El usuario ya existe" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role, creado_en",
      [email, hash, role || "admin"]
    );

    res.status(201).json({
      message: "Usuario creado correctamente",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Error en /api/users/register:", err);
    res.status(500).json({ message: "Error interno al registrar usuario" });
  }
});

// Login de usuario
app.post("/api/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son obligatorios" });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const user = result.rows[0];
    const coincide = await bcrypt.compare(password, user.password);

    if (!coincide) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      message: "Login correcto",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Error en /api/users/login:", err);
    res.status(500).json({ message: "Error interno al hacer login" });
  }
});

// Middleware para proteger rutas
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

// Ruta protegida de ejemplo
app.get("/api/users/me", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, role, creado_en FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error en /api/users/me:", err);
    res.status(500).json({ message: "Error interno al obtener perfil" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor SCADUANA escuchando en puerto ${PORT}`);
});
