'use client';

import { useEffect, useRef } from 'react';
import useAuth from '@/features/auth/hooks/useAuth.js';

export default function AuthBootstrap({ children }) {
    const { me } = useAuth();
    const bootstrappedRef = useRef(false);

    useEffect(() => {
        if (!bootstrappedRef.current) {
            bootstrappedRef.current = true;
            me();
        }

        const interval = setInterval(() => {
            fetch('/api/health', { method: 'GET' }).catch(() => {});
        }, 10 * 60 * 1000);

        return () => clearInterval(interval);
    }, [me]);

    return children;
}
