import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const lapTimes = pgTable("lap_times", {
  id: serial("id").primaryKey(),
  lapTimeMs: integer("lap_time_ms").notNull(),
  displayTime: text("display_time").notNull(), // Format: "1:23.456"
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLapTimeSchema = createInsertSchema(lapTimes).pick({
  lapTimeMs: true,
  displayTime: true,
});

export type InsertLapTime = z.infer<typeof insertLapTimeSchema>;
export type LapTime = typeof lapTimes.$inferSelect;
