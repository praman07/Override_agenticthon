import { NextResponse } from 'next/server';
import env from '@/lib/env.js';
import { cookieOptions } from '@/lib/auth.js';

export async function POST() {
    const response = NextResponse.json({
        success: true,
        message: 'Logged out successfully',
    });

    response.cookies.set(env.COOKIE_NAME, '', {
        ...cookieOptions,
        maxAge: 0,
    });

    return response;
}
