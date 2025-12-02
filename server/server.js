const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, "data.sqlite");
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("DB err", err);
    process.exit(1);
  }
});

// Create table if not exists
db.serialize(() => {
  db.run(\`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  \`);
});

// CRUD routes
app.get("/api/products", (req, res) => {
  db.all("SELECT * FROM products ORDER BY name", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/products", (req, res) => {
  const { name, price } = req.body;
  if (!name || price == null) return res.status(400).json({ error: "name & price required" });
  const stmt = db.prepare("INSERT INTO products (name, price) VALUES (?, ?)");
  stmt.run([name, price], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    db.get("SELECT * FROM products WHERE id = ?", [this.lastID], (err, row) => {
      res.status(201).json(row);
    });
  });
});

app.put("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  db.run("UPDATE products SET name = ?, price = ? WHERE id = ?", [name, price, id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
      res.json(row);
    });
  });
});

app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).end();
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(\`API listening on \${PORT}\`));
