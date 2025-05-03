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
      
      // Enhanced character data validation
      if (projectData.charactersData) {
        // Check if we're about to overwrite existing characters with empty data
        if (existingProject.charactersData && 
            Object.keys(existingProject.charactersData).length > 0 && 
            Object.keys(projectData.charactersData).length === 0) {
          console.warn("CRITICAL WARNING: Attempted to overwrite characters with empty data in storage");
          console.log("Preserving existing character data in storage layer");
          projectData.charactersData = existingProject.charactersData;
        } else if (Object.keys(projectData.charactersData).length > 0) {
          // We have new character data - validate it has actual content
          let hasValidCharacters = false;
          for (const character of Object.values(projectData.charactersData)) {
            if (character && typeof character === 'object' && Object.keys(character).length > 0) {
              hasValidCharacters = true;
              break;
            }
          }
          if (!hasValidCharacters) {
            console.warn("WARNING: All incoming characters are empty objects in storage");
            if (existingProject.charactersData && Object.keys(existingProject.charactersData).length > 0) {
              console.log("Using existing character data instead");
              projectData.charactersData = existingProject.charactersData;
            }
          }
        }
      }
      
      // Enhanced concept data validation
      if (projectData.conceptData) {
        const conceptData = projectData.conceptData as { title?: string; tagline?: string; premise?: string };
        // Check if we're about to overwrite existing concept with empty data
        if (existingProject.conceptData && 
            typeof existingProject.conceptData === 'object' &&
            'title' in existingProject.conceptData && existingProject.conceptData.title && 
            'tagline' in existingProject.conceptData && existingProject.conceptData.tagline && 
            'premise' in existingProject.conceptData && existingProject.conceptData.premise && 
            (!conceptData.title || !conceptData.tagline || !conceptData.premise)) {
          console.warn("CRITICAL WARNING: Attempted to overwrite concept with incomplete data in storage");
          console.log("Preserving existing concept data in storage layer");
          projectData.conceptData = existingProject.conceptData;
          // Make sure top-level title matches concept title
          const existingTitle = (existingProject.conceptData as any).title;
          if (existingTitle && projectData.title !== existingTitle) {
            console.log("Updating top-level title to match concept title");
            projectData.title = existingTitle;
          }
        } else if (!conceptData.title && !conceptData.tagline && !conceptData.premise) {
          // The new concept data is completely empty but we have existing data
          if (existingProject.conceptData && typeof existingProject.conceptData === 'object' &&
             (('title' in existingProject.conceptData && existingProject.conceptData.title) || 
              ('tagline' in existingProject.conceptData && existingProject.conceptData.tagline) || 
              ('premise' in existingProject.conceptData && existingProject.conceptData.premise))) {
            console.warn("WARNING: New concept data is empty, preserving existing data");
            projectData.conceptData = existingProject.conceptData;
          }
        }
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
      
      // Log character counts for debugging
      console.log(`Character count before update: ${Object.keys(existingProject.charactersData || {}).length}`);
      console.log(`Character count after update: ${Object.keys(updatedProject.charactersData || {}).length}`);
      
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
