
import { GoogleGenAI, Type } from "@google/genai";
import { FileData, ProcessingResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const processDocument = async (file: FileData): Promise<ProcessingResult> => {
  const model = ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { text: `Analyze the following file named "${file.name}". 
          Extract all text content and format it into a professional, clean Markdown document suitable for a PDF report.
          Include a clear title, structured headers, and logical flow.
          If it's an image, perform OCR and describe visual elements.
          Also provide a 2-sentence executive summary and 3 relevant keywords.` },
          file.base64 ? {
            inlineData: {
              mimeType: file.type,
              data: file.base64
            }
          } : { text: file.content || "" }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          summary: { type: Type.STRING },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "content", "summary", "tags"]
      }
    }
  });

  const response = await model;
  return JSON.parse(response.text);
};

export const suggestFolders = async (fileNames: string[]): Promise<string[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on these filenames: ${fileNames.join(', ')}, suggest 3 logical folder names for organization. Return only a JSON array of strings.`,
    config: {
      responseMimeType: "application/json"
    }
  });
  try {
    return JSON.parse(response.text);
  } catch {
    return ["Documents_OmniPDF", "Archives_IA", "Projets_Cloud"];
  }
};
