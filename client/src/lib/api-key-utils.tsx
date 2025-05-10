import React from 'react';
import { Toast, ToastActionElement } from '@/components/ui/toast';
import { toast as showToast } from '@/hooks/use-toast';

/**
 * Checks if an error message indicates an API key related issue
 */
export function isApiKeyError(errorMessage: string): boolean {
  if (!errorMessage) return false;
  
  // Check for common API key related error messages
  const apiKeyErrorPatterns = [
    "api key",
    "apikey",
    "authentication",
    "auth",
    "unauthorized",
    "401",
    "403",
    "invalid key",
    "key not valid",
    "credential"
  ];
  
  const lowerCaseMsg = errorMessage.toLowerCase();
  return apiKeyErrorPatterns.some(pattern => 
    lowerCaseMsg.includes(pattern.toLowerCase())
  );
}

/**
 * Shows a helpful message directing the user to the settings page to add an API key
 */
export function showApiKeyRequiredToast() {
  showToast({
    title: "API Key Required",
    description: (
      <div>
        <p>This request requires a valid Gemini API key.</p>
        <p className="mt-2">
          <a 
            href="/settings" 
            className="font-medium underline cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/settings';
            }}
          >
            Go to Settings to add your API key
          </a>
        </p>
      </div>
    ),
    variant: "destructive",
    duration: 10000,
  });
}

/**
 * Helper function to check for API key related errors and show appropriate message
 * Returns true if this was an API key error and was handled
 */
export function handleApiKeyError(errorMessage: string): boolean {
  if (isApiKeyError(errorMessage)) {
    showApiKeyRequiredToast();
    return true;
  }
  return false;
}