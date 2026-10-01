import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import User from '@/models/user.model.js';
import { getAuthenticatedUser, sanitizeUser } from '@/lib/auth.js';

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
        const user = await User.findById(authUser.id).select('-password');
        if (!user) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                user: sanitizeUser(user),
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Me API error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
