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
        const { name, email, password } = body;

        if (!name || !email || !password) {
            return NextResponse.json(
                { success: false, message: 'name, email and password are required' },
                { status: 400 }
            );
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json(
                { success: false, message: 'User already exists' },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
        });

        const token = signToken(user._id);

        const response = NextResponse.json(
            {
                success: true,
                message: 'Registered successfully',
                user: sanitizeUser(user),
                token,
            },
            { status: 201 }
        );

        response.cookies.set(env.COOKIE_NAME, token, cookieOptions);
        return response;
    } catch (error) {
        console.error('Register API error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
