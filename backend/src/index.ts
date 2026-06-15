import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRouter from "./routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: "*" // In production, refine this to frontend URL
}));
app.use(express.json());

// API Namespace
app.use("/api", apiRouter);

// Basic health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "CRM Backend" });
});

// Start listening
app.listen(PORT, () => {
  console.log(`CRM Backend Service is running on port ${PORT}`);
});
