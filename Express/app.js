import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import client from "prom-client";
import { createLogger, transports, format } from "winston";
import LokiTransport from "winston-loki";

dotenv.config();
const app = express();

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new LokiTransport({
      host: "http://loki-server:3100", // use Docker service name
      labels: { app: "express-backend" },
      json: true,
      replaceTimestamp: true
    }),
    new transports.Console() // also log to console
  ]
});

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost",
  credentials: true
}));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register, timeout: 5000 });

const httpRequestHistogram = new client.Histogram({
  name: "http_express_req_res_time_ms",
  help: "Time taken during HTTP requests in ms",
  labelNames: ["method", "route", "status_code"],
  buckets: [1, 10, 50, 100, 200, 400, 500, 800, 1000, 2000]
});

app.use((req, res, next) => {
  const end = httpRequestHistogram.startTimer();
  
  res.on("finish", () => {
    const route = req.route ? req.route.path : req.url;
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode
    };

    end(labels);

    logger.info("HTTP Request Completed", labels);
  });

  next();
});

app.get("/", (req, res) => {
  logger.info("Root route visited");
  res.send("Server is up and running");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/slow", async (req, res) => {
  const delay = Math.floor(Math.random() * 500) + 100; // 100–600 ms
  await new Promise(resolve => setTimeout(resolve, delay));

  const random = Math.random();
  if (random < 0.3) {
    logger.error("Simulated error on /slow route");
    return res.status(500).json({ error: "Something went wrong!" });
  }

  res.json({
    message: `Success after ${delay} ms!`,
    delay: `${delay} ms`
  });
});

app.get("/metrics", async (req, res) => {
  res.setHeader('Content-Type', client.register.contentType);
  const metrics = await client.register.metrics();
  res.send(metrics);
});

app.use((err, req, res, next) => {
  logger.error("Unhandled Express Error", { error: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;

if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    logger.info(`Express server running on port ${PORT}`);
  });
}
