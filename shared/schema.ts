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
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  basicData: jsonb("basic_data").notNull(),
  conceptData: jsonb("concept_data"),
  charactersData: jsonb("characters_data"),
  pathsData: jsonb("paths_data"),
  plotData: jsonb("plot_data"),
  generatedActs: jsonb("generated_acts"),
  playerData: jsonb("player_data"),
  currentStep: integer("current_step").notNull().default(1),
});

export const insertVnProjectSchema = createInsertSchema(vnProjects).omit({
  id: true
});

// VN Story schema - stores exported acts for play
export const vnStories = pgTable("vn_stories", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => vnProjects.id),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  createdAt: text("created_at").notNull(),
  actData: jsonb("act_data").notNull(),
  actNumber: integer("act_number").notNull(),
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
