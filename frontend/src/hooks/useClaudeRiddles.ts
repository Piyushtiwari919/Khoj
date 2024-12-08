import { useState } from "react";
import Anthropic from "@anthropic-ai/sdk";

export interface Riddle {
  riddle: string;
  answer: string;
  hint: string;
}

export function useClaudeRiddles(huntId: any) {
  const [riddles, setRiddles] = useState<Riddle[] | null>(() => {
    // Initialize from localStorage if available
    const stored = localStorage.getItem(`hunt_riddles_${huntId}`);
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRiddles = async (clues: any, huntId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch hunt data from your backend
      // const response = await fetch(`/api/hunts/${huntId}/data`);
      // if (!response.ok) {
      //   throw new Error("Failed to fetch hunt data");
      // }
      // const huntData = await response.json();

      //   localStorage.clear();
      console.log(clues.decryptedData);
      const huntData = {
        locations: clues.decryptedData.map(
          (location: any) => location.description
        ),
        themes: ["Tech", "web3", "easy"],
      };

      console.log(huntData);

      // 2. Generate riddles using Claude
      const anthropic = new Anthropic({
        apiKey: import.meta.env.VITE_PUBLIC_NEXT_PUBLIC_ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true,
      });

      const prompt = `You are riddlemaker who generates json responses.Generate a treasure hunt with ${
        huntData.locations.length
      } riddles in strict JSON format. 
      Each riddle should lead to one of these locations: ${huntData.locations.join(
        ", "
      )}.
      The riddles should incorporate these themes: ${huntData.themes.join(
        ", "
      )}.

      Return the response in this exact JSON format, make sure you dont include names of locationns in the riddles:
      [
        {
          "riddle": "Cryptic riddle text describing the location",
          "hint": "A subtle hint that helps but doesn't give away the answer"
        }
      ]`;

      const aiResponse = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });

      console.log(aiResponse);

      const extractJSON = (text: string) => {
        const jsonMatch = text.match(/\[.*\]/s);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      };

      // Add type assertion or check to handle the content type
      if ("text" in aiResponse.content[0]) {
        const content = aiResponse.content[0].text;
        const parsedRiddles = extractJSON(content);

        console.log(content);
        console.log(parsedRiddles);

        // Store riddles with hunt ID
        const storageKey = `hunt_riddles_${huntId}`;
        localStorage.setItem(storageKey, JSON.stringify(parsedRiddles));
        setRiddles(parsedRiddles);
      } else {
        throw new Error("Unexpected response format from Claude");
      }
    } catch (err) {
      console.error("Riddle Generation Error:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchRiddles,
    riddles,
    isLoading,
    error,
  };
}
