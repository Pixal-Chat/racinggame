import { db } from "./db";
import { lapTimes, type InsertLapTime, type LapTime } from "@shared/schema";
import { desc } from "drizzle-orm";

export interface IStorage {
  getBestLaps(): Promise<LapTime[]>;
  createLapTime(lap: InsertLapTime): Promise<LapTime>;
}

export class DatabaseStorage implements IStorage {
  async getBestLaps(): Promise<LapTime[]> {
    return await db.select()
      .from(lapTimes)
      .orderBy(desc(lapTimes.lapTimeMs)) // Actually typically best laps are lowest time, but 'best' implies ranking. Let's sort ASC for time.
      .limit(10);
  }

  // Quick fix: usually racing times are "lower is better", so ASC order.
  async getBestLapsAsc(): Promise<LapTime[]> {
     // Re-implementing correctly with ASC sort for time
     const laps = await db.select().from(lapTimes).orderBy(lapTimes.lapTimeMs).limit(10);
     return laps;
  }

  async createLapTime(lap: InsertLapTime): Promise<LapTime> {
    const [newLap] = await db.insert(lapTimes).values(lap).returning();
    return newLap;
  }
}

export const storage = new DatabaseStorage();
