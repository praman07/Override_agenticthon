import jwt from 'jsonwebtoken';
import env from '@/lib/env.js';

export const cookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds for Next.js cookies
    path: '/',
};

export const signToken = (id) => jwt.sign({ id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

export const verifyToken = (token) => {
    try {
        return jwt.verify(token, env.JWT_SECRET);
    } catch {
        return null;
    }
};

export const sanitizeUser = (user) => ({
    id: user._id?.toString() || user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
});

/**
 * Extracts and verifies the authenticated user from a Next.js Request or NextRequest.
 * Supports cookies and Authorization Bearer header.
 *
 * @param {Request} request
 * @returns {{ id: string } | null}
 */
export function getAuthenticatedUser(request) {
    const authHeader = request.headers?.get ? request.headers.get('authorization') : null;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        if (request?.cookies && typeof request.cookies.get === 'function') {
            token = request.cookies.get(env.COOKIE_NAME)?.value;
        }

        if (!token && request?.headers?.get) {
            const cookieHeader = request.headers.get('cookie') || '';
            const cookieMap = {};
            cookieHeader.split(';').forEach((c) => {
                const [k, v] = c.trim().split('=');
                if (k) cookieMap[k] = decodeURIComponent(v || '');
            });
            token = cookieMap[env.COOKIE_NAME];
        }
    }

    if (!token) {
        return null;
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
        return null;
    }

    return { id: decoded.id };
}
