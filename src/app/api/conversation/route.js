import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import ConversationModel from '@/models/conversation.model.js';
import MessageModel from '@/models/message.model.js';
import { getStream, processDocumentAttachment } from '@/services/ai.service.js';
import { retrieveResearchEvidence } from '@/services/researchRetrieval.service.js';
import { getAuthenticatedUser } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const ALLOWED_DOC_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/msword",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function validateAndSanitizeAttachments(rawAttachments = []) {
    const processed = [];

    for (const att of rawAttachments) {
        if (!att || typeof att !== "object") {
            continue;
        }

        const type = att.type;
        const name = (att.name || "file").replace(/[^a-zA-Z0-9_.\- ]/g, "");
        const mimeType = (att.mimeType || "").toLowerCase();
        const url = att.url || att.data || "";

        if (!type || !url) {
            throw new Error(`Invalid attachment format for ${name}`);
        }

        if (url.startsWith("data:")) {
            const base64Length = url.split(",")[1]?.length || 0;
            const approxBytes = Math.round((base64Length * 3) / 4);
            if (approxBytes > MAX_FILE_SIZE_BYTES) {
                throw new Error(`File ${name} exceeds maximum size limit of 10MB`);
            }
        }

        if (type === "image") {
            const isImageMime = ALLOWED_IMAGE_TYPES.includes(mimeType) || /\.(png|jpe?g|webp)$/i.test(name);
            if (!isImageMime) {
                throw new Error(`Unsupported image type for ${name}. Allowed: PNG, JPEG, JPG, WEBP`);
            }
        } else if (type === "document") {
            const isDocMime = ALLOWED_DOC_TYPES.includes(mimeType) || /\.(pdf|docx|pptx)$/i.test(name);
            if (!isDocMime) {
                throw new Error(`Unsupported document type for ${name}. Allowed: PDF, DOCX, PPTX`);
            }
        } else {
            throw new Error(`Unsupported attachment type: ${type}`);
        }

        processed.push({
            type,
            name,
            mimeType: mimeType || (type === "image" ? "image/png" : "application/pdf"),
            url,
            extractedText: "",
        });
    }

    return processed;
}

export async function GET(request) {
    try {
        const authUser = getAuthenticatedUser(request);
        if (!authUser) {
            return NextResponse.json(
                { success: false, message: 'Not authorized. Please login.' },
                { status: 401 }
            );
        }

        await connectDB();

        const conversations = await ConversationModel.find({ user: authUser.id })
            .sort({ isPinned: -1, updatedAt: -1 })
            .lean();

        if (!conversations.length) {
            return NextResponse.json({
                success: true,
                conversations: [],
            });
        }

        const conversationIds = conversations.map((conversation) => conversation._id);

        const messages = await MessageModel.find({
            conversation: { $in: conversationIds },
        })
            .select('-attachments.extractedText')
            .sort({ createdAt: 1 })
            .lean();

        const messagesByConversation = new Map();

        for (const message of messages) {
            const key = message.conversation.toString();
            if (!messagesByConversation.has(key)) {
                messagesByConversation.set(key, []);
            }

            messagesByConversation.get(key).push({
                id: message._id.toString(),
                author: message.author,
                content: message.content || "",
                attachments: (message.attachments || []).map((att) => ({
                    type: att.type,
                    name: att.name,
                    mimeType: att.mimeType,
                    url: att.url,
                })),
                sources: message.sources || [],
                taggedDocument: message.taggedDocument || null,
                createdAt: message.createdAt,
            });
        }

        const responseConversations = conversations.map((conversation) => ({
            id: conversation._id.toString(),
            title: conversation.title,
            isPinned: Boolean(conversation.isPinned),
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            messages: messagesByConversation.get(conversation._id.toString()) || [],
        }));

        return NextResponse.json({
            success: true,
            conversations: responseConversations,
        });
    } catch (error) {
        console.error('getConversations error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const authUser = getAuthenticatedUser(request);
        if (!authUser) {
            return NextResponse.json(
                { success: false, message: 'Not authorized. Please login.' },
                { status: 401 }
            );
        }

        await connectDB();

        const body = await request.json();
        const {
            message = "",
            conversationId,
            attachments: rawAttachments = [],
            taggedPaperId = null,
            taggedPaperTitle = null,
            isRagEnabled = true,
        } = body;
        const trimmedMessage = message.trim();

        if (!trimmedMessage && rawAttachments.length === 0) {
            return NextResponse.json(
                { success: false, message: "Please enter a message or select a file attachment." },
                { status: 400 }
            );
        }

        let sanitizedAttachments = [];
        try {
            sanitizedAttachments = validateAndSanitizeAttachments(rawAttachments);
        } catch (valErr) {
            return NextResponse.json(
                { success: false, message: valErr.message },
                { status: 400 }
            );
        }

        for (const att of sanitizedAttachments) {
            if (att.type === "document") {
                try {
                    att.extractedText = await processDocumentAttachment(att);
                } catch (ocrErr) {
                    console.error("Document text extraction error:", ocrErr.message);
                }
            }
        }

        let conversation = null;

        if (!conversationId) {
            const cleanTitle = trimmedMessage 
                ? trimmedMessage.replace(/^["']|["']$/g, '').slice(0, 32).trim() 
                : (sanitizedAttachments[0]?.name || (taggedPaperTitle ? `Chat: ${taggedPaperTitle}` : "New Chat"));
            conversation = await ConversationModel.create({
                title: cleanTitle,
                user: authUser.id,
            });
        } else {
            conversation = await ConversationModel.findOne({
                _id: conversationId,
                user: authUser.id,
            });

            if (!conversation) {
                return NextResponse.json(
                    { success: false, message: "Conversation not found" },
                    { status: 404 }
                );
            }
        }

        await MessageModel.create({
            conversation: conversation._id,
            content: trimmedMessage,
            attachments: sanitizedAttachments,
            author: "user",
            taggedDocument: taggedPaperId ? { id: taggedPaperId, title: taggedPaperTitle } : undefined,
        });

        const messages = await MessageModel.find({ conversation: conversation._id })
            .sort({ createdAt: 1 })
            .lean();

        // 1. Retrieve relevant evidence chunks from user's uploaded documents in Vector DB (only if RAG is enabled)
        let retrievedSources = [];
        if (isRagEnabled && trimmedMessage && authUser.id) {
            try {
                const evidence = await retrieveResearchEvidence(trimmedMessage, {
                    userId: authUser.id,
                    paperId: taggedPaperId || null,
                    topK: 5,
                    threshold: taggedPaperId ? 0.25 : 0.35,
                });

                if (Array.isArray(evidence) && evidence.length > 0) {
                    retrievedSources = evidence.map((e) => ({
                        chunkId: e.chunkId || '',
                        paperTitle: e.paper?.title || 'Uploaded Document',
                        pageNumber: e.source?.pageNumber ?? null,
                        score: typeof e.score === 'number' ? Number(e.score.toFixed(4)) : 0,
                        text: e.text || '',
                    }));
                }
            } catch (retrievalErr) {
                console.warn('[RAG Retrieval notice]:', retrievalErr.message);
            }
        }

        let stream;
        try {
            stream = await getStream({ messages, userId: authUser.id, evidence: retrievedSources, isRagEnabled });
        } catch (aiErr) {
            console.error("AI Service Error:", aiErr.message);
            const isRateLimit = aiErr.message.includes("429") || aiErr.message.toLowerCase().includes("rate limit");
            const userMsg = isRateLimit
                ? "Rate limit exceeded on AI API provider. Please set GEMINI_API_KEY for high limits."
                : `AI Service Error: ${aiErr.message}. Please check your GEMINI_API_KEY.`;
            return NextResponse.json(
                { success: false, message: userMsg },
                { status: 500 }
            );
        }

        const currentConvId = conversation._id.toString();
        const currentConvTitle = conversation.title;

        // Create ReadableStream for SSE in Next.js App Router
        const encoder = new TextEncoder();
        const customReadable = new ReadableStream({
            async start(controller) {
                let assistantReply = "";

                // Stream retrieved source chunks immediately to the UI if available
                if (retrievedSources.length > 0) {
                    controller.enqueue(encoder.encode(`event: sources\ndata: ${JSON.stringify(retrievedSources)}\n\n`));
                }

                try {
                    for await (const chunk of stream) {
                        let token = Array.isArray(chunk) ? chunk[0] : chunk;
                        if (!token) continue;

                        let tokenText = "";
                        if (typeof token === "string") {
                            tokenText = token;
                        } else if (typeof token?.content === "string") {
                            tokenText = token.content;
                        } else if (Array.isArray(token?.content)) {
                            tokenText = token.content
                                .filter((c) => c.type === "text" || typeof c === "string")
                                .map((c) => (typeof c === "string" ? c : c.text || ""))
                                .join("");
                        } else if (typeof token?.text === "string") {
                            tokenText = token.text;
                        }

                        if (!tokenText) continue;

                        assistantReply += tokenText;

                        const lines = tokenText.split("\n");
                        let sseChunk = "";
                        for (const line of lines) {
                            sseChunk += `data: ${line}\n`;
                        }
                        sseChunk += "\n";
                        controller.enqueue(encoder.encode(sseChunk));
                    }
                } catch (streamIterErr) {
                    console.error("Stream iteration error:", streamIterErr.message);
                    const errNotice = "\n\n*(Notice: Request could not be fully completed due to provider rate limit. Please try again shortly.)*";
                    assistantReply += errNotice;
                    controller.enqueue(encoder.encode(`data: ${errNotice}\n\n`));
                }

                if (assistantReply.trim()) {
                    try {
                        await MessageModel.create({
                            conversation: currentConvId,
                            content: assistantReply,
                            author: "ai",
                            sources: retrievedSources,
                        });
                    } catch (dbErr) {
                        console.error("Failed saving assistant message:", dbErr.message);
                    }
                }

                try {
                    await ConversationModel.updateOne(
                        { _id: currentConvId },
                        { $set: { updatedAt: new Date() } }
                    );
                } catch (updateErr) {
                    console.error("Failed updating conversation updatedAt:", updateErr.message);
                }

                controller.close();
            },
        });

        return new Response(customReadable, {
            headers: {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "X-Conversation-Id": currentConvId,
                "X-Conversation-Title": currentConvTitle,
                "Access-Control-Expose-Headers": "X-Conversation-Id, X-Conversation-Title",
            },
        });
    } catch (error) {
        console.error('handleMessage error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
