import { 
  vnProjects, VnProject, InsertVnProject,
  vnStories, VnStory, InsertVnStory,
  users, User, InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
    const project: VnProject = { ...insertProject, id };
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
    for (const [storyId, story] of this.stories.entries()) {
      if (story.projectId === id) {
        this.stories.delete(storyId);
      }
    }
  }
  
  // VN Story methods
  async getStories(): Promise<VnStory[]> {
    return Array.from(this.stories.values());
  }
  
  async getStory(id: number): Promise<VnStory | undefined> {
    return this.stories.get(id);
  }
  
  async createStory(insertStory: InsertVnStory): Promise<VnStory> {
    const id = this.storyId++;
    const story: VnStory = { ...insertStory, id };
    this.stories.set(id, story);
    return story;
  }
  
  async deleteStory(id: number): Promise<void> {
    this.stories.delete(id);
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
    const [project] = await db
      .insert(vnProjects)
      .values(insertProject)
      .returning();
    return project;
  }

  async updateProject(id: number, projectData: Partial<VnProject>): Promise<VnProject> {
    // Make sure to update the updatedAt timestamp
    const dataToUpdate = {
      ...projectData,
      updatedAt: new Date().toISOString()
    };

    const [updatedProject] = await db
      .update(vnProjects)
      .set(dataToUpdate)
      .where(eq(vnProjects.id, id))
      .returning();

    if (!updatedProject) {
      throw new Error(`Project with id ${id} not found`);
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

  async createStory(insertStory: InsertVnStory): Promise<VnStory> {
    const [story] = await db
      .insert(vnStories)
      .values(insertStory)
      .returning();
    return story;
  }

  async deleteStory(id: number): Promise<void> {
    await db
      .delete(vnStories)
      .where(eq(vnStories.id, id));
  }
}

// Export a singleton instance of the storage
export const storage = new DatabaseStorage();
