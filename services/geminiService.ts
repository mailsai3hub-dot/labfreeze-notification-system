import { GoogleGenAI } from "@google/genai";

export const editMedicalImage = async (base64Image: string, prompt: string) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      // Return a graceful error instead of crashing if key is missing
      console.warn("Gemini API Key is missing. Skipping AI processing.");
      return { success: false, error: "API Key Missing" };
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Using gemini-2.5-flash-image for image generation/editing tasks
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1], // Remove prefix
              mimeType: 'image/jpeg',
            },
          },
          {
            text: `As a medical image assistant, please process this lab sample/report image: ${prompt}. If the user asks for a filter or change, generate the edited image.`,
          },
        ],
      },
    });

    let generatedImageUrl = null;
    let responseText = "";

    // Correctly handle candidates and parts to extract text or image results
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
        } else if (part.text) {
          responseText = part.text;
        }
      }
    } else {
      responseText = response.text || "";
    }

    return { success: true, imageUrl: generatedImageUrl, text: responseText };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { success: false, error: String(error) };
  }
};