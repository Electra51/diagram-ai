// // Gemini API handler
// import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";
// import { GenerateRequest, GenerateResponse } from "@/lib/types";
// import { sanitizeDiagram } from "@/lib/utils";
// import { GoogleGenAI } from "@google/genai";
// import { NextRequest, NextResponse } from "next/server";

// const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// export async function POST(req: NextRequest) {
//   try {
//     const body: GenerateRequest = await req.json();
//     const { prompt, mode, existingDiagram } = body;

//     if (!prompt?.trim()) {
//       return NextResponse.json<GenerateResponse>(
//         { success: false, error: "Prompt is required" },
//         { status: 400 },
//       );
//     }

//     if (!process.env.GEMINI_API_KEY) {
//       return NextResponse.json<GenerateResponse>(
//         { success: false, error: "GEMINI_API_KEY not configured" },
//         { status: 500 },
//       );
//     }

//     const userPrompt = buildUserPrompt(prompt, existingDiagram);

//     const result = await genAI.models.generateContent({
//       model: "gemini-2.0-flash-lite",
//       contents: userPrompt,
//       config: {
//         systemInstruction: buildSystemPrompt(mode),
//         temperature: 0.7,
//         topK: 40,
//         topP: 0.95,
//         maxOutputTokens: 4096,
//       },
//     });

//     const text = result.text ?? "";

//     // Parse JSON from response (handle possible markdown fences)
//     let jsonText = text.trim();
//     if (jsonText.startsWith("```")) {
//       jsonText = jsonText
//         .replace(/^```(?:json)?\n?/, "")
//         .replace(/\n?```$/, "");
//     }

//     let parsed: unknown;
//     try {
//       parsed = JSON.parse(jsonText);
//     } catch {
//       // Try extracting JSON block
//       const match = jsonText.match(/\{[\s\S]*\}/);
//       if (match) {
//         parsed = JSON.parse(match[0]);
//       } else {
//         throw new Error("Failed to parse Gemini response as JSON");
//       }
//     }

//     const parsedObj = parsed as Record<string, unknown>;
//     const diagram = sanitizeDiagram(parsed);
//     if (!diagram) {
//       return NextResponse.json<GenerateResponse>(
//         { success: false, error: "Invalid diagram structure from AI" },
//         { status: 422 },
//       );
//     }

//     return NextResponse.json<GenerateResponse>({
//       success: true,
//       diagram,
//       explanation:
//         typeof parsedObj.explanation === "string"
//           ? parsedObj.explanation
//           : undefined,
//     });
//   } catch (error) {
//     console.error("Gemini API error:", error);
//     const message =
//       error instanceof Error ? error.message : "Unknown error occurred";
//     return NextResponse.json<GenerateResponse>(
//       { success: false, error: message },
//       { status: 500 },
//     );
//   }
// }

// Groq API handler
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import { GenerateRequest, GenerateResponse } from "@/lib/types";
import { sanitizeDiagram } from "@/lib/utils";
import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const { prompt, mode, existingDiagram } = body;

    if (!prompt?.trim()) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: "Prompt is required" },
        { status: 400 },
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: "GROQ_API_KEY not configured" },
        { status: 500 },
      );
    }

    const userPrompt = buildUserPrompt(prompt, existingDiagram);

    const result = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: buildSystemPrompt(mode) },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.7,
      top_p: 0.95,
    });

    const text = result.choices[0]?.message?.content ?? "";

    // Parse JSON from response (handle possible markdown fences)
    let jsonText = text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // Try extracting JSON block
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse Groq response as JSON");
      }
    }

    const parsedObj = parsed as Record<string, unknown>;
    const diagram = sanitizeDiagram(parsed);
    if (!diagram) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: "Invalid diagram structure from AI" },
        { status: 422 },
      );
    }

    return NextResponse.json<GenerateResponse>({
      success: true,
      diagram,
      explanation:
        typeof parsedObj.explanation === "string"
          ? parsedObj.explanation
          : undefined,
    });
  } catch (error) {
    console.error("Groq API error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json<GenerateResponse>(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
