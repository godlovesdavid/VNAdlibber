import { 
  vnProjects, VnProject, InsertVnProject,
  vnStories, VnStory, InsertVnStory,
  users, User, InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

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
  getStoryByShareId(shareId: string): Promise<VnStory | undefined>;
  createStory(story: InsertVnStory): Promise<VnStory>;
  updateStoryLastAccessed(id: number): Promise<void>;
  deleteStory(id: number): Promise<void>;
  deleteExpiredStories(days: number): Promise<number>; // Returns number of deleted stories
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, VnProject>;
  private stories: Map<number, VnStory>;
  
  private userId: number;
  private projectId: number;
  private storyId: number;
  
  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.stories = new Map();
    
    this.userId = 1;
    this.projectId = 1;
    this.storyId = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }
  
  private initializeSampleData() {
    // Create a sample user
    const user: User = {
      id: this.userId++,
      username: "demo",
      password: "password"
    };
    this.users.set(user.id, user);
    
    // Create a sample project
    const now = new Date().toISOString();
    const sampleProject: VnProject = {
      id: this.projectId++,
      userId: user.id,
      title: "Echoes of Tomorrow",
      createdAt: now,
      updatedAt: now,
      lastSavedHash: null,
      basicData: {
        theme: "identity",
        tone: "melancholic",
        genre: "cyberpunk"
      },
      conceptData: {
        title: "Echoes of Tomorrow",
        tagline: "In a world where memories are currency, the truth comes at the highest price.",
        premise: "In Neo-Kyoto, a city where memories can be traded like currency, Aki Nakamura, a memory archivist, discovers a forbidden memory that reveals a conspiracy at the heart of society. As they navigate a web of deception involving the powerful Sato Corporation, they must choose between exposing the truth or protecting those they love."
      },
      // Add empty objects for the required fields
      charactersData: {},
      pathsData: {},
      plotData: {},
      generatedActs: {},
      playerData: {
        relationships: {},
        inventory: {},
        skills: {}
      },
      currentStep: 2
    };
    this.projects.set(sampleProject.id, sampleProject);
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // VN Project methods
  async getProjects(): Promise<VnProject[]> {
    return Array.from(this.projects.values());
  }
  
  async getProject(id: number): Promise<VnProject | undefined> {
    return this.projects.get(id);
  }
  
  async createProject(insertProject: InsertVnProject): Promise<VnProject> {
    const id = this.projectId++;
    
    // Ensure all required fields are present with proper defaults
    const project: VnProject = { 
      ...insertProject, 
      id,
      userId: insertProject.userId || null,
      basicData: insertProject.basicData || {},
      conceptData: insertProject.conceptData || {},
      charactersData: insertProject.charactersData || {},
      pathsData: insertProject.pathsData || {},
      plotData: insertProject.plotData || {},
      generatedActs: insertProject.generatedActs || {},
      playerData: insertProject.playerData || {
        relationships: {},
        inventory: {},
        skills: {}
      },
      currentStep: insertProject.currentStep || 1,
      lastSavedHash: insertProject.lastSavedHash || null
    };
    
    this.projects.set(id, project);
    return project;
  }
  
  async updateProject(id: number, projectData: Partial<VnProject>): Promise<VnProject> {
    const existingProject = this.projects.get(id);
    
    if (!existingProject) {
      throw new Error(`Project with id ${id} not found`);
    }
    
    const updatedProject: VnProject = {
      ...existingProject,
      ...projectData,
      id,
      updatedAt: new Date().toISOString()
    };
    
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  async deleteProject(id: number): Promise<void> {
    this.projects.delete(id);
    
    // Also delete any associated stories
    // Convert Map.entries() to Array first to avoid TypeScript iteration issues
    Array.from(this.stories.entries()).forEach(([storyId, story]) => {
      if (story.projectId === id) {
        this.stories.delete(storyId);
      }
    });
  }
  
  // VN Story methods
  async getStories(): Promise<VnStory[]> {
    return Array.from(this.stories.values());
  }
  
  async getStory(id: number): Promise<VnStory | undefined> {
    return this.stories.get(id);
  }
  
  async getStoryByShareId(shareId: string): Promise<VnStory | undefined> {
    return Array.from(this.stories.values()).find(
      (story) => story.shareId === shareId
    );
  }
  
  async createStory(insertStory: InsertVnStory): Promise<VnStory> {
    const id = this.storyId++;
    
    // Ensure nullable fields are handled properly
    // And make sure lastAccessed is always set
    const story: VnStory = { 
      ...insertStory, 
      id,
      userId: insertStory.userId || null,
      projectId: insertStory.projectId || null,
      shareId: insertStory.shareId || null,
      lastAccessed: insertStory.lastAccessed || new Date().toISOString()
    };
    
    this.stories.set(id, story);
    return story;
  }
  
  async deleteStory(id: number): Promise<void> {
    this.stories.delete(id);
  }
  
  async updateStoryLastAccessed(id: number): Promise<void> {
    // Update the lastAccessed timestamp for the story
    const story = this.stories.get(id);
    if (story) {
      story.lastAccessed = new Date().toISOString();
      this.stories.set(id, story);
    }
  }
  
  async deleteExpiredStories(days: number): Promise<number> {
    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Find and delete expired stories
    let deletedCount = 0;
    
    // Convert to array to avoid modifying during iteration
    const storiesToCheck = Array.from(this.stories.entries());
    
    for (const [id, story] of storiesToCheck) {
      if (story.lastAccessed) {
        const lastAccessedDate = new Date(story.lastAccessed);
        if (lastAccessedDate < cutoffDate) {
          this.stories.delete(id);
          deletedCount++;
        }
      }
    }
    
    return deletedCount;
  }
}

// Database Storage implementation using PostgreSQL
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getProjects(): Promise<VnProject[]> {
    return await db.select().from(vnProjects);
  }

  async getProject(id: number): Promise<VnProject | undefined> {
    const [project] = await db.select().from(vnProjects).where(eq(vnProjects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertVnProject): Promise<VnProject> {
    // Ensure all required fields are present with proper defaults
    const projectToInsert = {
      ...insertProject,
      // Use explicit type assertions to handle potential undefined values
      basicData: insertProject.basicData || {},
      conceptData: insertProject.conceptData || {},
      charactersData: insertProject.charactersData || {},
      pathsData: insertProject.pathsData || {},
      plotData: insertProject.plotData || {},
      playerData: insertProject.playerData || {
        relationships: {},
        inventory: {},
        skills: {}
      },
      currentStep: insertProject.currentStep || 1,
      // Make sure userId is null if undefined
      userId: insertProject.userId || null,
      // Make sure lastSavedHash is null if undefined
      lastSavedHash: insertProject.lastSavedHash || null
    };

    // Insert the project
    const [project] = await db
      .insert(vnProjects)
      .values(projectToInsert)
      .returning();
    
    return project;
  }

  async updateProject(id: number, projectData: Partial<VnProject>): Promise<VnProject> {
    // Make sure to update the updatedAt timestamp
    const dataToUpdate = {
      ...projectData,
      updatedAt: new Date().toISOString()
    };

    // Get the existing project first to ensure we properly handle null fields
    const existingProject = await this.getProject(id);
    if (!existingProject) {
      throw new Error(`Project with id ${id} not found`);
    }

    // Merge with existing data to ensure all required fields are present
    const mergedData = {
      ...existingProject,
      ...dataToUpdate
    };

    // Perform the update
    const [updatedProject] = await db
      .update(vnProjects)
      .set(mergedData)
      .where(eq(vnProjects.id, id))
      .returning();

    if (!updatedProject) {
      throw new Error(`Update failed for project with id ${id}`);
    }

    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    // First delete any associated stories
    await db
      .delete(vnStories)
      .where(eq(vnStories.projectId, id));

    // Then delete the project
    await db
      .delete(vnProjects)
      .where(eq(vnProjects.id, id));
  }

  async getStories(): Promise<VnStory[]> {
    return await db.select().from(vnStories);
  }

  async getStory(id: number): Promise<VnStory | undefined> {
    const [story] = await db.select().from(vnStories).where(eq(vnStories.id, id));
    return story || undefined;
  }

  async getStoryByShareId(shareId: string): Promise<VnStory | undefined> {
    const [story] = await db.select().from(vnStories).where(eq(vnStories.shareId, shareId));
    return story || undefined;
  }

  async createStory(insertStory: InsertVnStory): Promise<VnStory> {
    // Ensure all required fields have proper defaults and nullable fields are handled
    const storyToInsert = {
      ...insertStory,
      // Make sure foreign keys are null if undefined
      userId: insertStory.userId || null,
      projectId: insertStory.projectId || null,
      shareId: insertStory.shareId || null,
      // Make sure lastAccessed is set (for link expiration tracking)
      lastAccessed: insertStory.lastAccessed || new Date().toISOString()
    };
    
    const [story] = await db
      .insert(vnStories)
      .values(storyToInsert)
      .returning();
    return story;
  }

  async deleteStory(id: number): Promise<void> {
    await db
      .delete(vnStories)
      .where(eq(vnStories.id, id));
  }
  
  async updateStoryLastAccessed(id: number): Promise<void> {
    // Update the lastAccessed timestamp to the current time
    await db
      .update(vnStories)
      .set({ lastAccessed: new Date().toISOString() })
      .where(eq(vnStories.id, id));
  }
  
  async deleteExpiredStories(days: number): Promise<number> {
    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateString = cutoffDate.toISOString();
    
    // Get expired stories for count
    const expiredStories = await db
      .select()
      .from(vnStories)
      .where(sql`${vnStories.lastAccessed} < ${cutoffDateString}`);
    
    // Delete stories older than the cutoff date
    if (expiredStories.length > 0) {
      await db
        .delete(vnStories)
        .where(sql`${vnStories.lastAccessed} < ${cutoffDateString}`);
    }
    
    return expiredStories.length;
  }
}

// Export a singleton instance of the storage
export const storage = new DatabaseStorage();
