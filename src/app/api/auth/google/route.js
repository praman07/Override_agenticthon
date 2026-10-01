import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import User from '@/models/user.model.js';
import env from '@/lib/env.js';
import { signToken, sanitizeUser, cookieOptions } from '@/lib/auth.js';

/**
 * POST /api/auth/google
 * Accepts a Google ID token (credential), verifies it using Google's tokeninfo API,
 * and creates or logs in the user without needing external heavy SDKs.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { credential } = body;

        if (!credential) {
            return NextResponse.json(
                { success: false, message: 'Google credential is required' },
                { status: 400 }
            );
        }

        // Verify the Google ID token directly with Google's tokeninfo API
        let payload;
        try {
            const tokenRes = await fetch(
                `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
            );
            if (!tokenRes.ok) {
                throw new Error('Google token verification response not ok');
            }
            payload = await tokenRes.json();
        } catch (verifyErr) {
            console.error('Google token verification failed:', verifyErr.message);
            return NextResponse.json(
                { success: false, message: 'Invalid Google credential' },
                { status: 401 }
            );
        }

        if (payload.aud !== env.GOOGLE_CLIENT_ID && payload.azp !== env.GOOGLE_CLIENT_ID) {
            return NextResponse.json(
                { success: false, message: 'Google token audience mismatch' },
                { status: 401 }
            );
        }

        const { sub: googleId, email, name, picture } = payload;

        if (!email) {
            return NextResponse.json(
                { success: false, message: 'Google account does not have an email' },
                { status: 400 }
            );
        }

        await connectDB();

        // Check if user exists by googleId or email
        let user = await User.findOne({
            $or: [{ googleId }, { email: email.toLowerCase() }],
        });

        if (user) {
            // Link Google account if the user signed up with email/password before
            if (!user.googleId) {
                user.googleId = googleId;
                user.authProvider = 'google';
                if (picture && !user.avatar) {
                    user.avatar = picture;
                }
                await user.save();
            }
        } else {
            // Create new user from Google profile
            user = await User.create({
                name: name || email.split('@')[0],
                email: email.toLowerCase(),
                googleId,
                avatar: picture || null,
                authProvider: 'google',
            });
        }

        const token = signToken(user._id);

        const response = NextResponse.json(
            {
                success: true,
                message: 'Google sign-in successful',
                user: {
                    ...sanitizeUser(user),
                    avatar: user.avatar || null,
                },
                token,
            },
            { status: 200 }
        );

        response.cookies.set(env.COOKIE_NAME, token, cookieOptions);
        return response;
    } catch (error) {
        console.error('Google Auth API error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
