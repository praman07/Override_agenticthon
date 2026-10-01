import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import ConversationModel from '@/models/conversation.model.js';
import { getAuthenticatedUser } from '@/lib/auth.js';

export async function PATCH(request, { params }) {
    try {
        const authUser = getAuthenticatedUser(request);
        if (!authUser) {
            return NextResponse.json(
                { success: false, message: 'Not authorized. Please login.' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const { title } = body;

        if (!title || !title.trim()) {
            return NextResponse.json({ success: false, message: "Title is required" }, { status: 400 });
        }

        await connectDB();

        const conversation = await ConversationModel.findOneAndUpdate(
            { _id: id, user: authUser.id },
            { $set: { title: title.trim() } },
            { new: true }
        );

        if (!conversation) {
            return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            conversation: {
                id: conversation._id.toString(),
                title: conversation.title,
                isPinned: Boolean(conversation.isPinned),
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt,
            }
        });
    } catch (error) {
        console.error('renameConversation error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
