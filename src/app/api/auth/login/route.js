import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb.js';
import User from '@/models/user.model.js';
import env from '@/lib/env.js';
import { signToken, sanitizeUser, cookieOptions } from '@/lib/auth.js';

export async function POST(request) {
    try {
        await connectDB();
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { success: false, message: 'email and password are required' },
                { status: 400 }
            );
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return NextResponse.json(
                { success: false, message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return NextResponse.json(
                { success: false, message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        const token = signToken(user._id);

        const response = NextResponse.json(
            {
                success: true,
                message: 'Logged in successfully',
                user: sanitizeUser(user),
                token,
            },
            { status: 200 }
        );

        response.cookies.set(env.COOKIE_NAME, token, cookieOptions);
        return response;
    } catch (error) {
        console.error('Login API error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
