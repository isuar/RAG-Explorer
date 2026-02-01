import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { NextResponse } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const openai = new OpenAI();
const supabase = createClient(url, anonKey);

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    // 1. Generate an embedding for the user's question
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const [{ embedding }] = embeddingResponse.data;

    // 2. Call the RPC function we created in Supabase (Step 3)
    // match_threshold: 0.5 (Higher = more strict)
    // match_count: 5 (Number of chunks to retrieve)
    const { data: documents, error: matchError } = await supabase.rpc(
      "match_documents",
      {
        query_embedding: embedding,
        match_threshold: 0.2,
        match_count: 5,
      },
    );

    // --------------------------- Debugging logs ---------------------------
    console.log("Documents found from DB:", documents?.length);
    console.log(
      "Top result snippet:",
      documents?.[0]?.content?.substring(0, 50),
    );
    // ---------------------------

    if (matchError) {
      console.error("Supabase Error:", matchError); // Also helpful to log the actual error
      throw matchError;
    }

    // 3. Build the context for OpenAI
    const contextText =
      documents
        ?.map(
          (doc: any) =>
            `Document: ${doc.metadata?.file_name}\nContent: ${doc.content}`,
        )
        .join("\n\n---\n\n") || "No relevant context found.";

    console.log("Context sent to AI:", contextText); // This will show you exactly what the AI is reading

    // 4. Ask OpenAI to answer based on the retrieved context
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant. Use the provided context to answer the user's question. 
      If the context contains relevant information, use it to provide a helpful answer. 
      If the information is completely missing, explain what you *can* find in the documents instead.`,
        },
        {
          role: "user",
          content: `Context:\n${contextText}\n\nQuestion: ${query}`,
        },
      ],
    });

    return NextResponse.json({
      answer: response.choices[0].message.content,
      sources: documents,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
