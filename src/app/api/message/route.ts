import { db } from "@/db";
import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { NextRequest } from "next/server";
import { pinecone } from "@/lib/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { StreamingTextResponse, GoogleGenerativeAIStream } from "ai";
import { genAI } from "@/lib/geminiai";

export const POST = async (req: NextRequest) => {
  const body = await req.json();
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  const { id: userId } = user!;

  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { fileId, message } = SendMessageValidator.parse(body);
  const file = await db.file.findFirst({
    where: {
      id: fileId,
      userId,
    },
  });
  if (!file) return new Response("Not found", { status: 404 });
  await db.message.create({
    data: {
      text: message,
      isUserMessage: true,
      userId,
      fileId,
    },
  });

  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: "embedding-001",
    taskType: TaskType.RETRIEVAL_QUERY,
  });

  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    //@ts-ignore
    pineconeIndex,
    namespace: file.id,
  });

  const results = await vectorStore.similaritySearch(message, 4);

  const prevMessages = await db.message.findMany({
    where: {
      fileId,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 6,
  });

  const formattedPrevMessages = prevMessages.map((msg) => ({
    role: msg.isUserMessage ? ("user" as const) : ("model" as const),
    content: msg.text,
  }));

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const history = formattedPrevMessages.map((message) => {
    return {
      role: message.role,
      parts: message.content,
    };
  });

  const chat = model.startChat({
    history: [],
    generationConfig: {
      maxOutputTokens: 1000,
    },
  });

  const prompt = `Answer the question as detailed as possible from the provided context, make sure to provide all the details, don't makeup and provide wrong answers. Also make sure to answer in well structured sentences and not simple bullt points. Use to context to frame sentences which are human friendly.\n\n
  
  Context: \n ${results.map((r) => r.pageContent).join("\n\n")} \n
  Question: \n ${message} \n
  
  Answer:`;

  const response = await chat.sendMessageStream(prompt);

  const stream = GoogleGenerativeAIStream(response, {
    async onCompletion(completion) {
      await db.message.create({
        data: {
          text: completion,
          isUserMessage: false,
          fileId,
          userId,
        },
      });
    },
  });

  return new StreamingTextResponse(stream);
};
