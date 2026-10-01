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
        await connectDB();

        const conversation = await ConversationModel.findOne({ _id: id, user: authUser.id });

        if (!conversation) {
            return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
        }

        conversation.isPinned = !conversation.isPinned;
        await conversation.save();

        return NextResponse.json({
            success: true,
            conversation: {
                id: conversation._id.toString(),
                title: conversation.title,
                isPinned: conversation.isPinned,
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt,
            }
        });
    } catch (error) {
        console.error('togglePinConversation error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
