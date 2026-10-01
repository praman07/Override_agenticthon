import { ChatMistralAI } from "@langchain/mistralai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, tool } from "langchain";
import env from "@/lib/env.js";
import Context from "@/models/context.model.js";
import * as z from "zod";
import { extractPagesFromPdf } from "./researchOCR.service.js";
import mammoth from "mammoth";
import { parseOffice } from "officeparser";

const mistralApiKey = env.MISTRALAI_API_KEY;
const geminiApiKey = env.GEMINI_API_KEY;

export function getModelSequence() {
    const activeGeminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || geminiApiKey || "").trim();
    const activeMistralKey = (process.env.MISTRALAI_API_KEY || process.env.MISTRAL_API_KEY || mistralApiKey || "").trim();

    const sequence = [];

    if (activeGeminiKey) {
        const geminiModels = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-flash-lite-latest",
        ];

        for (const modelName of geminiModels) {
            const geminiModel = new ChatGoogleGenerativeAI({
                model: modelName,
                apiKey: activeGeminiKey,
                maxRetries: 1,
            });
            sequence.push({ model: geminiModel, visionModel: geminiModel, provider: `gemini (${modelName})` });
        }
    }

    if (activeMistralKey) {
        const mistralModel = new ChatMistralAI({
            model: "mistral-small-latest",
            apiKey: activeMistralKey,
            maxRetries: 1,
        });
        const mistralVision = new ChatMistralAI({
            model: "pixtral-12b-2409",
            apiKey: activeMistralKey,
            maxRetries: 1,
        });
        sequence.push({ model: mistralModel, visionModel: mistralVision, provider: "mistral" });
    }

    if (sequence.length === 0) {
        throw new Error("No API key configured. Please set GEMINI_API_KEY or MISTRAL_API_KEY in your environment variables.");
    }

    return sequence;
}

export function getModels() {
    return getModelSequence()[0];
}

// Helper: Convert Data URI to Buffer
function dataUrlToBuffer(dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string") {
        return null;
    }
    const parts = dataUrl.split(",");
    if (parts.length < 2) {
        return null;
    }
    return Buffer.from(parts[1], "base64");
}

/**
 * Extracts structured text/content from a document using Mistral OCR API,
 * with fallback to pdf-parse, mammoth, and officeparser.
 */
export async function processDocumentAttachment(attachment) {
    if (!attachment || attachment.type !== "document") {
        return "";
    }

    const fileUrl = attachment.url || attachment.data || "";
    const name = attachment.name || "document";
    const mimeType = attachment.mimeType || "";
    const activeMistralKey = (process.env.MISTRALAI_API_KEY || process.env.MISTRAL_API_KEY || mistralApiKey || "").trim();

    // 1. Attempt Mistral OCR API for PDF / Scanned documents / DOCX / PPTX
    try {
        if (activeMistralKey && fileUrl.startsWith("data:")) {
            const ocrRes = await fetch("https://api.mistral.ai/v1/ocr", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${activeMistralKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "mistral-ocr-latest",
                    document: {
                        type: "document_url",
                        document_url: fileUrl,
                    },
                }),
            });

            if (ocrRes.ok) {
                const ocrData = await ocrRes.json();
                if (ocrData?.pages?.length > 0) {
                    const ocrMarkdown = ocrData.pages
                        .map((page, idx) => `--- Page ${idx + 1} ---\n${page.markdown || ""}`)
                        .join("\n\n")
                        .trim();

                    if (ocrMarkdown) {
                        return ocrMarkdown;
                    }
                }
            }
        }
    } catch (ocrErr) {
        console.warn(`Mistral OCR notice for ${name}:`, ocrErr.message);
    }

    // 2. Fallback: Parse locally using native Node parsers
    const buffer = dataUrlToBuffer(fileUrl);
    if (!buffer) {
        return "";
    }

    try {
        if (mimeType === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
            const parsed = await extractPagesFromPdf(buffer, name);
            const fullText = (parsed?.pages || []).map((p) => p.text).join("\n\n").trim();
            if (fullText) {
                return fullText;
            }
        }

        if (
            mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            name.toLowerCase().endsWith(".docx")
        ) {
            const result = await mammoth.extractRawText({ buffer });
            if (result?.value?.trim()) {
                return result.value.trim();
            }
        }

        if (
            mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
            name.toLowerCase().endsWith(".pptx")
        ) {
            const text = await parseOffice(buffer);
            if (typeof text === "string" && text.trim()) {
                return text.trim();
            }
        }
    } catch (parseErr) {
        console.error(`Local document parser error for ${name}:`, parseErr.message);
    }

    return "";
}

//––––––––––––––––– tools –––––––––––––––

export const readContext = tool(
    async ({ userId }) => {
        const context = await Context.findOne({ user: userId });
        return context ? context.context : "No long-term context saved for this user yet.";
    },
    {
        name: "readContext",
        description: "Reads the context for the current user.",
        schema: z.object({
            userId: z.string().describe("The ID of the user to read the context for."),
        }),
    }
);

export const updateContext = tool(
    async ({ userId, context }) => {
        const updatedContext = await Context.findOneAndUpdate(
            { user: userId },
            { context },
            { new: true, upsert: true }
        );
        return updatedContext.context;
    },
    {
        name: "updateContext",
        description: "Updates the context for the current user.",
        schema: z.object({
            userId: z.string().describe("The ID of the user to update the context for."),
            context: z.string().describe("The new context to save for the user."),
        }),
    }
);

export const webSearch = tool(
    async ({ query }) => {
        try {
            const results = [];
            const images = [];

            // 1. DuckDuckGo Instant Answer API with 3.5s timeout
            try {
                const ddgRes = await fetch(
                    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
                    { signal: AbortSignal.timeout(3500) }
                );
                if (ddgRes.ok) {
                    const ddgData = await ddgRes.json();
                    if (ddgData.AbstractText) {
                        results.push({
                            title: ddgData.Heading || query,
                            snippet: ddgData.AbstractText,
                            url: ddgData.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                        });
                    }
                    if (Array.isArray(ddgData.RelatedTopics)) {
                        for (const topic of ddgData.RelatedTopics) {
                            if (topic.Text && topic.FirstURL && results.length < 5) {
                                results.push({
                                    title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 40),
                                    snippet: topic.Text,
                                    url: topic.FirstURL,
                                });
                            }
                        }
                    }
                }
            } catch (ddgErr) {
                // Handled silently
            }

            // 2. Wikipedia Search API with 3.5s timeout
            try {
                const wikiRes = await fetch(
                    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`,
                    { signal: AbortSignal.timeout(3500) }
                );
                if (wikiRes.ok) {
                    const wikiData = await wikiRes.json();
                    const wikiHits = wikiData?.query?.search || [];
                    for (const item of wikiHits.slice(0, 4)) {
                        const cleanSnippet = item.snippet.replace(/<[^>]+>/g, '').trim();
                        const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`;
                        if (!results.some((r) => r.url === wikiUrl)) {
                            results.push({
                                title: item.title,
                                snippet: cleanSnippet,
                                url: wikiUrl,
                            });
                        }
                    }
                }
            } catch (wikiErr) {
                // Handled silently
            }

            // 3. Wikimedia Commons Image Search with 3.5s timeout
            try {
                const imgUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url|mime&gsrlimit=4&format=json&origin=*`;
                const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(3500) });
                if (imgRes.ok) {
                    const imgData = await imgRes.json();
                    const pages = imgData?.query?.pages || {};
                    for (const pageId in pages) {
                        const info = pages[pageId]?.imageinfo?.[0];
                        if (info && info.url && (info.mime.startsWith('image/jpeg') || info.mime.startsWith('image/png') || info.mime.startsWith('image/webp'))) {
                            images.push({
                                title: pages[pageId].title.replace(/^File:/, ''),
                                url: info.url,
                            });
                        }
                    }
                }
            } catch (imgErr) {
                // Handled silently
            }

            if (!results.length && !images.length) {
                return `Web search could not retrieve current external links for "${query}". Provide answer based on available knowledge.`;
            }

            let output = `Web Search Results for "${query}":\n\n`;

            if (results.length > 0) {
                output += `### Search Links & Snippets:\n`;
                for (const r of results) {
                    output += `- [${r.title}](${r.url})\n  ${r.snippet}\n\n`;
                }
            }

            if (images.length > 0) {
                output += `### Relevant Images:\n`;
                for (const img of images) {
                    output += `![${img.title}](${img.url})\nDirect link: [${img.title}](${img.url})\n\n`;
                }
            }

            return output;
        } catch (err) {
            return `Web search failed: ${err.message}`;
        }
    },
    {
        name: "webSearch",
        description: "Automatically searches the live web for real-time information, news, current events, weather, web links, and relevant images. AUTO-TRIGGER this tool whenever the user asks for news, real-time facts, current events, web links, or relevant images.",
        schema: z.object({
            query: z.string().describe("The search query to look up on the web."),
        }),
    }
);

import { retrieveResearchEvidence } from './researchRetrieval.service.js';

export const getStream = async ({ messages, userId }) => {
    let hasImageAttachment = false;

    // Automatic Vector DB retrieval from user's uploaded documents
    let vectorContextText = "";
    const lastUserMessage = [...messages].reverse().find((m) => m.author === "user");
    const latestQuery = lastUserMessage?.content?.trim() || "";

    if (latestQuery && userId) {
        try {
            const evidence = await retrieveResearchEvidence(latestQuery, {
                userId,
                topK: 4,
                threshold: 0.35,
            });

            if (evidence && evidence.length > 0) {
                console.log(`[RAG Retrieval] Retrieved ${evidence.length} relevant chunks for: "${latestQuery.slice(0, 50)}"`);
                vectorContextText =
                    `\n\n[Retrieved Context from User's Uploaded Documents]:\n` +
                    evidence
                        .map((item, idx) => {
                            const sourceDoc = item.paper?.title || "Document";
                            const pageInfo = item.source?.pageNumber ? ` (Page ${item.source.pageNumber})` : "";
                            return `[Source ${idx + 1}: ${sourceDoc}${pageInfo}]\n${item.text}`;
                        })
                        .join("\n\n") +
                    `\n\n[Instruction: If the user's question relates to the uploaded document context, base your answer on it and briefly mention the document title or page (e.g., [Source: filename, p. X]). If not related, answer normally.]\n\n`;
            }
        } catch (ragErr) {
            console.warn("[RAG Vector Retrieval notice]:", ragErr.message);
        }
    }

    const formattedMessages = messages.map((msg) => {
        const textContent = msg.content || "";
        const attachments = msg.attachments || [];

        const hasImages = attachments.some((att) => att.type === "image");
        if (hasImages) {
            hasImageAttachment = true;
        }

        const docTexts = attachments
            .filter((att) => att.type === "document" && att.extractedText)
            .map((att) => `[Document: ${att.name}]\n${att.extractedText}`)
            .join("\n\n");

        if (msg.author === "user") {
            if (hasImages) {
                const messageContent = [];

                if (textContent || docTexts) {
                    const fullText = [textContent, docTexts].filter(Boolean).join("\n\n");
                    messageContent.push({
                        type: "text",
                        text: fullText || "Examine this image:",
                    });
                }

                for (const att of attachments) {
                    if (att.type === "image" && att.url) {
                        messageContent.push({
                            type: "image_url",
                            image_url: { url: att.url },
                        });
                    }
                }

                return new HumanMessage({ content: messageContent });
            } else {
                const combinedText = [textContent, docTexts].filter(Boolean).join("\n\n");
                return new HumanMessage(combinedText);
            }
        } else {
            return new AIMessage(textContent);
        }
    });

    // Attach system instruction and retrieved vector context to latest user prompt
    const systemPromptText = `[System Instructions: You are Override AI, a powerful, helpful AI assistant. Respond directly, promptly, and concisely. Current Date: ${new Date().toDateString()}]\n\n`;

    const fullMessages = formattedMessages.map((msg, idx) => {
        if (idx === formattedMessages.length - 1 && msg instanceof HumanMessage) {
            const extraContext = vectorContextText ? vectorContextText + "User Question: " : "";
            if (typeof msg.content === "string") {
                return new HumanMessage(systemPromptText + extraContext + msg.content);
            } else if (Array.isArray(msg.content)) {
                return new HumanMessage({
                    content: [
                        { type: "text", text: systemPromptText + extraContext },
                        ...msg.content,
                    ],
                });
            }
        }
        return msg;
    });

    async function* getMultiProviderStream() {
        const sequence = getModelSequence();
        let providerIndex = 0;
        let yieldedAny = false;

        while (providerIndex < sequence.length) {
            const { model, visionModel, provider } = sequence[providerIndex];
            const activeModel = hasImageAttachment ? visionModel : model;

            try {
                const stream = await activeModel.stream(fullMessages);

                for await (const chunk of stream) {
                    yieldedAny = true;
                    yield chunk;
                }

                return;
            } catch (err) {
                console.warn(`[AI Stream] Provider ${provider} notice:`, err.message);
                providerIndex++;

                if (!yieldedAny && providerIndex < sequence.length) {
                    console.log(`[AI Stream] Falling back to provider: ${sequence[providerIndex].provider}`);
                    continue;
                }

                if (yieldedAny) {
                    return;
                }

                throw err;
            }
        }
    }

    return getMultiProviderStream();
};

export const generateTitle = async ({ message, attachments = [] }) => {
    const docNames = attachments.map((a) => a.name).join(", ");
    const promptInput = [message, docNames ? `[Files: ${docNames}]` : ""].filter(Boolean).join(" ");
    const fallbackTitle = message ? message.slice(0, 30).trim() : "New Chat";

    const sequence = getModelSequence();
    for (const { model } of sequence) {
        try {
            const response = await model.invoke([
                new HumanMessage(
                    `Generate a concise, 3-5 word title summarizing this message. Do not use quotes or punctuation: ${promptInput.slice(0, 300)}`
                ),
            ]);
            if (response?.content) {
                return response.content.toString().trim().replace(/^["']|["']$/g, '');
            }
        } catch (err) {
            // Silently attempt next fallback model without throwing
        }
    }

    return fallbackTitle;
};
