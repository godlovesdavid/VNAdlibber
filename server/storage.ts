import { 
  vnProjects, VnProject, InsertVnProject,
  vnStories, VnStory, InsertVnStory,
  users, User, InsertUser
} from "@shared/schema";

// Storage interface for the application
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // VN Project methods
  getProjects(): Promise<VnProject[]>;
  getProject(id: number): Promise<VnProject | undefined>;
  createProject(project: InsertVnProject): Promise<VnProject>;
  updateProject(id: number, project: Partial<VnProject>): Promise<VnProject>;
  deleteProject(id: number): Promise<void>;
  
  // VN Story methods
  getStories(): Promise<VnStory[]>;
  getStory(id: number): Promise<VnStory | undefined>;
  createStory(story: InsertVnStory): Promise<VnStory>;
  deleteStory(id: number): Promise<void>;
}

import { db } from "./db";
import { eq } from "drizzle-orm";

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // VN Project methods
  async getProjects(): Promise<VnProject[]> {
    const projects = await db.select().from(vnProjects);
    return projects;
  }
  
  async getProject(id: number): Promise<VnProject | undefined> {
    const [project] = await db.select().from(vnProjects).where(eq(vnProjects.id, id));
    return project;
  }
  
  async createProject(insertProject: InsertVnProject): Promise<VnProject> {
    try {
      // Ensure we have required fields
      if (!insertProject.title) {
        console.log("Adding default title for project");
        let defaultTitle = "Untitled Project";
        
        // Try to get title from concept data if it exists
        if (insertProject.conceptData && typeof insertProject.conceptData === 'object') {
          const conceptData = insertProject.conceptData as Record<string, any>;
          if (conceptData.title && typeof conceptData.title === 'string') {
            defaultTitle = conceptData.title;
          }
        }
        
        insertProject.title = defaultTitle;
      }
      
      if (!insertProject.createdAt) {
        insertProject.createdAt = new Date().toISOString();
      }
      
      if (!insertProject.updatedAt) {
        insertProject.updatedAt = new Date().toISOString();
      }
      
      // Ensure all required fields for VnProject are present
      const projectToInsert = {
        ...insertProject,
        basicData: insertProject.basicData || {},
        conceptData: insertProject.conceptData || {},
        charactersData: insertProject.charactersData || {},
        pathsData: insertProject.pathsData || {},
        plotData: insertProject.plotData || {},
        generatedActs: insertProject.generatedActs || {},
        playerData: insertProject.playerData || {},
        currentStep: insertProject.currentStep || 1
      };
      
      console.log(`Creating new project with title: ${projectToInsert.title}`);
      const [project] = await db.insert(vnProjects).values(projectToInsert).returning();
      console.log(`Project created successfully with ID: ${project.id}`);
      
      return project;
    } catch (error) {
      console.error("Error in createProject:", error);
      throw error;
    }
  }
  
  async updateProject(id: number, projectData: Partial<VnProject>): Promise<VnProject> {
    try {
      console.log(`Updating project with ID: ${id}`);
      
      // Get existing project
      const [existingProject] = await db.select().from(vnProjects).where(eq(vnProjects.id, id));
      
      if (!existingProject) {
        console.error(`Project with id ${id} not found`);
        throw new Error(`Project with id ${id} not found`);
      }
      
      // Make sure we don't lose required fields
      const updatedProject = {
        ...existingProject,
        ...projectData,
        updatedAt: new Date().toISOString()
      };
      
      // Title is required
      if (!updatedProject.title) {
        updatedProject.title = existingProject.title;
      }
      
      console.log(`Updating project with title: ${updatedProject.title}`);
      const [result] = await db
        .update(vnProjects)
        .set(updatedProject)
        .where(eq(vnProjects.id, id))
        .returning();
        
      console.log('Project updated successfully');
      return result;
    } catch (error) {
      console.error("Error in updateProject:", error);
      throw error;
    }
  }
  
  async deleteProject(id: number): Promise<void> {
    // First delete any stories associated with this project
    await db.delete(vnStories).where(eq(vnStories.projectId, id));
    
    // Then delete the project
    await db.delete(vnProjects).where(eq(vnProjects.id, id));
  }
  
  // VN Story methods
  async getStories(): Promise<VnStory[]> {
    return await db.select().from(vnStories);
  }
  
  async getStory(id: number): Promise<VnStory | undefined> {
    const [story] = await db.select().from(vnStories).where(eq(vnStories.id, id));
    return story;
  }
  
  async createStory(insertStory: InsertVnStory): Promise<VnStory> {
    try {
      const [story] = await db.insert(vnStories).values(insertStory).returning();
      console.log(`Story created successfully with ID: ${story.id}`);
      return story;
    } catch (error) {
      console.error("Error in createStory:", error);
      throw error;
    }
  }
  
  async deleteStory(id: number): Promise<void> {
    await db.delete(vnStories).where(eq(vnStories.id, id));
  }
}

// Export a singleton instance of the storage
export const storage = new DatabaseStorage();
