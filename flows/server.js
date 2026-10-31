const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 4001;
const DATA_DIR = path.join(__dirname, "data");

app.use(express.static(path.join(__dirname, "public")));

// GET /api/flows — all apps combined
app.get("/api/flows", (req, res) => {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".js"));
  const apps = files.map((f) => {
    const filePath = path.join(DATA_DIR, f);
    delete require.cache[require.resolve(filePath)];
    return require(filePath);
  });
  res.json({ apps });
});

// GET /api/flows/:app — single app
app.get("/api/flows/:app", (req, res) => {
  const filePath = path.join(DATA_DIR, `${req.params.app}.js`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "App not found" });
  }
  delete require.cache[require.resolve(filePath)];
  res.json(require(filePath));
});

app.listen(PORT, () => {
  console.log(`Flow viewer running at http://localhost:${PORT}`);
});
