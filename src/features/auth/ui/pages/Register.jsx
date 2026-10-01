'use client';

import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resetChat } from '@/features/chat/state/chatSlice.js';
import useAuth from '@/features/auth/hooks/useAuth.js';

const Register = () => {
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const dispatch = useDispatch();
    const { loading, error, isAuthenticated, clearError, register, savedAccounts, isAddingAccount, cancelAddAccount } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            dispatch(resetChat());
            router.replace('/chat');
        }
    }, [isAuthenticated, dispatch, router]);

    useEffect(() => {
        return () => {
            clearError();
        };
    }, [clearError]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        await register(form);
    };

    const handleCancelAddAccount = () => {
        cancelAddAccount();
        router.replace('/chat');
    };

    return (
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-8 shadow-2xl shadow-black/50">
            {isAddingAccount && savedAccounts && savedAccounts.length > 0 ? (
                <button
                    type="button"
                    onClick={handleCancelAddAccount}
                    className="mb-4 flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Cancel & Back to Chat</span>
                </button>
            ) : null}

            <p className="text-sm uppercase tracking-[0.26em] text-zinc-300">Get started</p>
            <h2 className="mt-2 text-3xl font-semibold text-zinc-100">Create account</h2>
            <p className="mt-1 text-sm text-zinc-400">Use one secure session token via cookies.</p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <label className="block">
                    <span className="mb-1.5 block text-sm text-zinc-300">Name</span>
                    <input
                        required
                        type="text"
                        name="name"
                        autoComplete="name"
                        value={form.name}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none ring-0 transition focus:border-zinc-500"
                        placeholder="Praman Bhogal"
                    />
                </label>

                <label className="block">
                    <span className="mb-1.5 block text-sm text-zinc-300">Email</span>
                    <input
                        required
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none ring-0 transition focus:border-zinc-500"
                        placeholder="you@example.com"
                    />
                </label>

                <div>
                    <span className="mb-1.5 block text-sm text-zinc-300">Password</span>
                    <div className="relative">
                        <input
                            required
                            minLength={6}
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            autoComplete="new-password"
                            value={form.password}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-white/10 bg-zinc-900 pl-4 pr-12 py-3 text-zinc-100 outline-none ring-0 transition focus:border-zinc-500"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200 focus:outline-none transition"
                            title={showPassword ? 'Hide password' : 'Show password'}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? (
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.326 16.17 7.26 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639a10.477 10.477 0 01-1.334 2.524M14.121 14.121a3 3 0 11-4.242-4.242M3 3l18 18" />
                                </svg>
                            ) : (
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {error ? <p className="text-sm text-zinc-300">{error}</p> : null}

                <button
                    disabled={loading}
                    type="submit"
                    className="w-full rounded-xl bg-zinc-100 px-4 py-3 font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {loading ? 'Creating account...' : 'Sign up'}
                </button>
            </form>

            <p className="mt-5 text-sm text-zinc-400">
                Already have an account?{' '}
                <Link className="text-zinc-200 hover:text-zinc-100" href="/login">
                    Log in
                </Link>
            </p>
        </section>
    );
};

export default Register;