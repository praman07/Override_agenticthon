import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import ConversationModel from '@/models/conversation.model.js';
import MessageModel from '@/models/message.model.js';
import { getAuthenticatedUser } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    try {
        const authUser = getAuthenticatedUser(request);
        if (!authUser) {
            return NextResponse.json(
                { success: false, message: 'Not authorized. Please login.' },
                { status: 401 }
            );
        }

        const { id } = await params;
        await connectDB();

        const conversation = await ConversationModel.findOneAndUpdate(
            { _id: id, user: authUser.id },
            { updatedAt: new Date() },
            { new: true }
        ).lean();

        if (!conversation) {
            return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 });
        }

        const messages = await MessageModel.find({ conversation: id })
            .select('-attachments.extractedText')
            .sort({ createdAt: 1 })
            .lean();

        const formattedMessages = messages.map((msg) => ({
            id: msg._id.toString(),
            author: msg.author,
            content: msg.content || '',
            attachments: (msg.attachments || []).map((att) => ({
                type: att.type,
                name: att.name,
                mimeType: att.mimeType,
                url: att.url,
            })),
            createdAt: msg.createdAt,
        }));

        return NextResponse.json({
            success: true,
            conversation: {
                id: conversation._id.toString(),
                title: conversation.title,
                isPinned: Boolean(conversation.isPinned),
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt,
                messages: formattedMessages,
            },
        });
    } catch (error) {
        console.error('getSingleConversation error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        const authUser = getAuthenticatedUser(request);
        if (!authUser) {
            return NextResponse.json(
                { success: false, message: 'Not authorized. Please login.' },
                { status: 401 }
            );
        }

        const { id } = await params;
        await connectDB();

        const conversation = await ConversationModel.findOneAndDelete({ _id: id, user: authUser.id });

        if (!conversation) {
            return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
        }

        await MessageModel.deleteMany({ conversation: id });

        return NextResponse.json({
            success: true,
            message: "Conversation deleted successfully",
            id: id,
        });
    } catch (error) {
        console.error('deleteConversation error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
