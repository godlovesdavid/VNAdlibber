import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// VN Project schema - stores the complete visual novel project data
export const vnProjects = pgTable("vn_projects", {
  id: serial("id").primaryKey(),
  // Make userId nullable without using default(null)
  userId: integer("user_id"),
  title: text("title").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  basicData: jsonb("basic_data").notNull().default({}),
  conceptData: jsonb("concept_data").default({}),
  charactersData: jsonb("characters_data").default({}),
  characterPortraitsData: jsonb("character_portraits_data").default({}),
  pathsData: jsonb("paths_data").default({}),
  plotData: jsonb("plot_data").default({}),
  generatedActs: jsonb("generated_acts").default({}),
  playerData: jsonb("player_data").default({}),
  currentStep: integer("current_step").notNull().default(1),
  lastSavedHash: text("last_saved_hash"),
});

export const insertVnProjectSchema = createInsertSchema(vnProjects).omit({
  id: true
});

// For character portraits, we'll use a JSON field in the vnProjects table

// VN Story schema - stores exported acts for play
export const vnStories = pgTable("vn_stories", {
  id: serial("id").primaryKey(),
  // Make foreign keys nullable
  projectId: integer("project_id"),
  userId: integer("user_id"),
  title: text("title").notNull(),
  createdAt: text("created_at").notNull(),
  // Track when the story was last accessed (for expiration)
  lastAccessed: text("last_accessed").notNull().default(new Date().toISOString()),
  actData: jsonb("act_data").notNull(),
  actNumber: integer("act_number").notNull(),
  // Field for sharing stories
  shareId: text("share_id").unique(),
  characterPortraitsData: jsonb("character_portraits_data")
});

export const insertVnStorySchema = createInsertSchema(vnStories).omit({
  id: true
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type VnProject = typeof vnProjects.$inferSelect;
export type InsertVnProject = z.infer<typeof insertVnProjectSchema>;

export type VnStory = typeof vnStories.$inferSelect;
export type InsertVnStory = z.infer<typeof insertVnStorySchema>;
