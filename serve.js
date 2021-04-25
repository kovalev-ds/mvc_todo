const express = require("express");
const path = require("path");

const app = express();

app.use(express.static(path.resolve(__dirname, "public")));

const PORT = 4200;
app.listen(PORT, () => console.log("app running on port: " + PORT));
