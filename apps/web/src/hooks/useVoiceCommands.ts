'use client';

/**
 * useVoiceCommands Hook
 *
 * Advanced voice command recognition and parsing for SOAP editor
 *
 * Features:
 * - Command pattern matching
 * - Parameter extraction
 * - Multi-language support (English, Spanish, Portuguese)
 * - Fuzzy matching for robustness
 * - Command history
 * - Confidence scoring
 *
 * Example commands:
 * - "insert template chest pain" → Inserts chest pain template
 * - "add medication aspirin 100mg daily" → Adds medication
 * - "jump to assessment" → Navigates to assessment section
 * - "save and sign" → Saves and signs the note
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface VoiceCommand {
  id: string;
  patterns: string[]; // e.g., ["insert template {name}", "add template {name}"]
  description: string;
  category: 'navigation' | 'content' | 'action' | 'medication' | 'diagnosis';
  handler: (params: Record<string, string>) => void | Promise<void>;
  examples: string[];
  languages: ('en' | 'es' | 'pt')[];
}

export interface ParsedCommand {
  commandId: string;
  params: Record<string, string>;
  confidence: number;
  rawText: string;
  pattern: string;
}

export interface VoiceCommandsState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  lastCommand: ParsedCommand | null;
  error: string | null;
  commandHistory: ParsedCommand[];
}

interface UseVoiceCommandsOptions {
  language?: 'en' | 'es' | 'pt';
  debug?: boolean;
  autoStart?: boolean;
  commands: VoiceCommand[];
  onCommandExecuted?: (command: ParsedCommand) => void;
  onError?: (error: string) => void;
}

// ============================================================================
// Command Parser
// ============================================================================

/**
 * Parse command pattern and extract parameters
 *
 * Example:
 * Pattern: "insert template {name}"
 * Text: "insert template chest pain"
 * Result: { name: "chest pain" }
 */
function parseCommand(
  pattern: string,
  text: string
): { params: Record<string, string>; confidence: number } | null {
  // Normalize text
  const normalizedText = text.toLowerCase().trim();
  const normalizedPattern = pattern.toLowerCase().trim();

  // Extract parameter names from pattern
  const paramRegex = /\{(\w+)\}/g;
  const paramNames: string[] = [];
  let match;

  while ((match = paramRegex.exec(normalizedPattern)) !== null) {
    paramNames.push(match[1]);
  }

  // Convert pattern to regex
  // "insert template {name}" → "insert\s+template\s+(.+)"
  let regexPattern = normalizedPattern
    .replace(/\{(\w+)\}/g, '(.+?)') // Replace {param} with capture group
    .replace(/\s+/g, '\\s+'); // Replace spaces with flexible whitespace

  // Add anchors for exact match
  regexPattern = `^${regexPattern}$`;

  const regex = new RegExp(regexPattern, 'i');
  const textMatch = regex.exec(normalizedText);

  if (!textMatch) {
    return null;
  }

  // Extract parameters
  const params: Record<string, string> = {};
  for (let i = 0; i < paramNames.length; i++) {
    params[paramNames[i]] = textMatch[i + 1].trim();
  }

  // Calculate confidence (simple for now)
  const confidence = 0.9; // High confidence for exact pattern match

  return { params, confidence };
}

/**
 * Find best matching command from registry
 */
function findMatchingCommand(
  text: string,
  commands: VoiceCommand[],
  language: 'en' | 'es' | 'pt'
): ParsedCommand | null {
  let bestMatch: ParsedCommand | null = null;
  let highestConfidence = 0;

  for (const command of commands) {
    // Skip if command doesn't support current language
    if (!command.languages.includes(language)) {
      continue;
    }

    // Try each pattern
    for (const pattern of command.patterns) {
      const result = parseCommand(pattern, text);

      if (result && result.confidence > highestConfidence) {
        highestConfidence = result.confidence;
        bestMatch = {
          commandId: command.id,
          params: result.params,
          confidence: result.confidence,
          rawText: text,
          pattern: pattern,
        };
      }
    }
  }

  // Only return if confidence is above threshold
  if (bestMatch && bestMatch.confidence >= 0.7) {
    return bestMatch;
  }

  return null;
}

// ============================================================================
// Hook
// ============================================================================

export function useVoiceCommands({
  language = 'en',
  debug = false,
  autoStart = false,
  commands,
  onCommandExecuted,
  onError,
}: UseVoiceCommandsOptions) {
  const [state, setState] = useState<VoiceCommandsState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    lastCommand: null,
    error: null,
    commandHistory: [],
  });

  const recognitionRef = useRef<any>(null);
  const commandsRef = useRef<VoiceCommand[]>(commands);

  // Update commands ref when commands change
  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  /**
   * Process transcript and execute command if found
   */
  const processTranscript = useCallback(
    async (transcript: string) => {
      setState((prev) => ({ ...prev, isProcessing: true }));

      try {
        // Find matching command
        const parsedCommand = findMatchingCommand(
          transcript,
          commandsRef.current,
          language
        );

        if (parsedCommand) {
          if (debug) {
            console.log('[Voice Command] Matched:', parsedCommand);
          }

          // Find command handler
          const command = commandsRef.current.find(
            (c) => c.id === parsedCommand.commandId
          );

          if (command) {
            // Execute command
            await command.handler(parsedCommand.params);

            // Update state
            setState((prev) => ({
              ...prev,
              lastCommand: parsedCommand,
              commandHistory: [...prev.commandHistory, parsedCommand].slice(-10), // Keep last 10
              isProcessing: false,
              transcript: '',
              error: null,
            }));

            // Callback
            onCommandExecuted?.(parsedCommand);
          }
        } else {
          // No matching command found
          const error = `Command not recognized: "${transcript}"`;
          if (debug) {
            console.log('[Voice Command]', error);
          }

          setState((prev) => ({
            ...prev,
            error,
            isProcessing: false,
          }));

          onError?.(error);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          isProcessing: false,
        }));

        onError?.(errorMsg);
      }
    },
    [language, debug, onCommandExecuted, onError]
  );

  /**
   * Initialize Web Speech API
   */
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState((prev) => ({
        ...prev,
        error: 'Speech recognition not supported in this browser',
      }));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Single command at a time
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Set language
    const langMap = {
      en: 'en-US',
      es: 'es-ES',
      pt: 'pt-BR',
    };
    recognition.lang = langMap[language];

    recognition.onstart = () => {
      setState((prev) => ({
        ...prev,
        isListening: true,
        error: null,
        transcript: '',
      }));
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece;
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      // Update transcript
      setState((prev) => ({
        ...prev,
        transcript: finalTranscript || interimTranscript,
      }));

      // Process final transcript
      if (finalTranscript) {
        processTranscript(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[Voice Command] Error:', event.error);

      let errorMsg = 'Voice recognition error';
      if (event.error === 'not-allowed') {
        errorMsg = 'Microphone permission denied';
      } else if (event.error === 'no-speech') {
        errorMsg = 'No speech detected';
      } else {
        errorMsg = `Error: ${event.error}`;
      }

      setState((prev) => ({
        ...prev,
        error: errorMsg,
        isListening: false,
        isProcessing: false,
      }));

      onError?.(errorMsg);
    };

    recognition.onend = () => {
      setState((prev) => ({
        ...prev,
        isListening: false,
      }));
    };

    recognitionRef.current = recognition;

    // Auto-start if requested
    if (autoStart) {
      try {
        recognition.start();
      } catch (error) {
        console.error('[Voice Command] Auto-start failed:', error);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, [language, autoStart, processTranscript, onError]);

  /**
   * Start listening
   */
  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('[Voice Command] Start error:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to start voice recognition',
      }));
    }
  }, []);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('[Voice Command] Stop error:', error);
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Get available commands for display
   */
  const getAvailableCommands = useCallback(() => {
    return commands
      .filter((cmd) => cmd.languages.includes(language))
      .map((cmd) => ({
        id: cmd.id,
        description: cmd.description,
        examples: cmd.examples,
        category: cmd.category,
      }));
  }, [commands, language]);

  return {
    ...state,
    startListening,
    stopListening,
    clearError,
    getAvailableCommands,
    isSupported: recognitionRef.current !== null,
  };
}
