import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.laps.list.path, async (req, res) => {
    // We want the lowest times (fastest laps)
    const laps = await storage.getBestLapsAsc(); 
    res.json(laps);
  });

  app.post(api.laps.create.path, async (req, res) => {
    try {
      const input = api.laps.create.input.parse(req.body);
      const lap = await storage.createLapTime(input);
      res.status(201).json(lap);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  return httpServer;
}
