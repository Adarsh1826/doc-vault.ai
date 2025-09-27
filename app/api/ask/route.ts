import { NextResponse } from "next/server";

interface DocumentData {
  id: number;
  name: string;
  text: string;
  expiryDate?: string | null;
  createdAt?: string | number;
}

export async function POST(req: Request) {
  try {
    const { question, documents } = (await req.json()) as {
      question: string;
      documents: DocumentData[];
    };

    if (!documents || documents.length === 0) {
      return NextResponse.json({ answer: "No uploaded documents found." });
    }

    const combinedText = documents
      .map((d) => `${d.name}:\n${d.text}`)
      .join("\n\n");

    const prompt = `
You are a helpful assistant that answers questions based ONLY on the following PDF content.

PDF Content:
${combinedText}

Question: ${question}

If the answer is not present in the PDFs, say "I couldn't find that in your documents."
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();

    const answer =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't find that in your documents.";

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Gemini error:", err);
    return NextResponse.json({
      answer:
        "Error generating answer. Please check your Gemini API key or model name.",
    });
  }
}
