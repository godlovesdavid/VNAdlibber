import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useVnData } from "@/hooks/use-vn-data";
import { CreationProgress } from "@/components/creation-progress";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Wand2, Trash, Plus, Image } from "lucide-react";
import { Character } from "@/types/vn";
import { useToast } from "@/hooks/use-toast";
import { useSimpleAutosave } from "@/lib/autosave";
import { apiRequest } from "@/lib/queryClient";
import { json } from "express";

export default function CharactersForm() {
  const [location, setLocation] = useLocation();
  const { projectData, setCharactersData, goToStep, saveProject, hasUnsavedChanges, setConfirmDialogOpen } = useVnContext();
  const {
    generateCharacterData,
    generateMultipleCharactersData,
    isGenerating,
    cancelGeneration,
  } = useVnData();
  const { toast } = useToast();
  
  // Track validation state
  const [isValidating, setIsValidating] = useState(false);

  // Extended Character interface for form usage (includes name separately)
  interface CharacterForm extends Character {
    name: string; // Only used in the form, not stored in the context
  }

  // Form state
  const [characters, setCharacters] = useState<CharacterForm[]>([
    {
      name: "",
      role: "protagonist",
      occupation: "",
      gender: "",
      age: "",
      appearance: "",
      personality: "",
      goals: "",
      relationshipPotential: "",
      conflict: "",
    },
  ]);
  
  // Track which character is being generated
  const [generatingCharacterIndex, setGeneratingCharacterIndex] = useState<number | null>(null);
  
  // Track portrait generation for each character
  const [generatingPortraitIndex, setGeneratingPortraitIndex] = useState<number | null>(null);
  
  // Store character portraits
  const [characterPortraits, setCharacterPortraits] = useState<Record<number, string>>({});
  
  // Autosave indicator state
  const [isAutosaving, setIsAutosaving] = useState(false);

  
  // Function to add a new character card
  const addCharacter = () => {
    if (characters.length >= 5) {
      alert("You can only create up to 5 characters.");
      return;
    }

    setCharacters([
      ...characters,
      {
        name: "",
        role: characters.length === 0 ? "protagonist" : "",
        occupation: "",
        gender: "",
        age: "",
        appearance: "",
        personality: "",
        goals: "",
        relationshipPotential: "",
        conflict: "",
      },
    ]);
  };

  // Remove a character
  const removeCharacter = (index: number) => {
    if (characters.length <= 1) {
      alert("You must have at least one character.");
      return;
    }

    const updatedCharacters = [...characters];
    updatedCharacters.splice(index, 1);
    setCharacters(updatedCharacters);
  };
  
  // Reset all characters with confirmation
  const handleResetForm = () => {
    // Ask for confirmation before clearing
    if (!window.confirm("Are you sure?")) {
      return; // User canceled the reset
    }
    
    // Create a default protagonist character
    const defaultCharacter: CharacterForm = {
      name: "",
      role: "Protagonist",
      occupation: "",
      gender: "",
      age: "",
      appearance: "",
      personality: "",
      goals: "",
      relationshipPotential: "",
      conflict: ""
    };
    
    // Reset to a single empty character form
    setCharacters([defaultCharacter]);
    
    // Save empty data to context
    // setCharactersData({});
    
    // Show toast notification
    toast({
      title: "Form Reset",
      description: "Characters form has been reset.",
      variant: "default"
    });
  };

  //save and return buttons
  useEffect(() => {
    const returnButtonHandler = () => {
        (projectData && hasUnsavedChanges({...projectData, charactersData: saveCharacterData(), currentStep: 3})? setConfirmDialogOpen(true) : setLocation("/")) 
    }
    const saveFormHandler = () => {
      if (projectData) 
        saveProject({...projectData, charactersData: saveCharacterData(true), currentStep: 3});
    }
    document.addEventListener("return", returnButtonHandler);
    document.addEventListener("save", saveFormHandler);

    return () => {
      document.removeEventListener("return", returnButtonHandler);
      document.removeEventListener("save", saveFormHandler);
    };
  }, [characters]);

  
  // Update character field with name uniqueness check
  const updateCharacter = (
    index: number,
    field: string, // Using string type to allow 'name' which isn't in Character
    value: string,
  ) => {
    // Special handling for name field to ensure uniqueness
    if (field === 'name' && value) {
      // Check if this name already exists in another character
      const nameExists = characters.some(
        (character, idx) => idx !== index && character.name === value
      );
      
      if (nameExists) {
        toast({
          title: "Duplicate Name",
          description: "Each character must have a unique name. Please choose a different name.",
          variant: "destructive"
        });
        return; // Don't update if duplicate
      }
    }
    
    const updatedCharacters = [...characters];
    updatedCharacters[index] = {
      ...updatedCharacters[index],
      [field]: value,
    };
    setCharacters(updatedCharacters);
  };

  // Generate character details using AI
  const handleGenerateCharacter = async (index: number) => {
    setGeneratingCharacterIndex(index);

    try {
      const generatedCharacter = await generateCharacterData(
        index,
        characters[index],
      );

      if (generatedCharacter) {
        const updatedCharacters = [...characters];
        updatedCharacters[index] = {
          ...updatedCharacters[index],
          ...generatedCharacter,
        };
        setCharacters(updatedCharacters);
      }
    } catch (error) {
      console.error("Error generating character:", error);
    } finally {
      setGeneratingCharacterIndex(null);
    }
  };
  
  // Generate character portrait using AI
