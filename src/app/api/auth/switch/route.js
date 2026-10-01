import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import User from '@/models/user.model.js';
import env from '@/lib/env.js';
import { verifyToken, sanitizeUser, cookieOptions } from '@/lib/auth.js';

export async function POST(request) {
    try {
        await connectDB();
        const body = await request.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Token is required to switch account' },
                { status: 400 }
            );
        }

        const decoded = verifyToken(token);
        if (!decoded || !decoded.id) {
            return NextResponse.json(
                { success: false, message: 'Invalid or expired session token' },
                { status: 401 }
            );
        }

        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        const response = NextResponse.json(
            {
                success: true,
                message: 'Switched account successfully',
                user: sanitizeUser(user),
                token,
            },
            { status: 200 }
        );

        response.cookies.set(env.COOKIE_NAME, token, cookieOptions);
        return response;
    } catch (error) {
        console.error('Switch account API error:', error);
        return NextResponse.json(
            { success: false, message: 'Invalid or expired session token' },
            { status: 401 }
        );
    }
}
