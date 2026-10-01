import Link from 'next/link';

export default function AuthLayout({ children }) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col">
        <header className="flex items-center justify-between border-b border-white/10 bg-black px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-wide text-zinc-100">
            Override AI
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-300"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-zinc-100 px-4 py-1.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
            >
              Sign up
            </Link>
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center px-6 py-10">
          {children}
        </section>
      </div>
    </main>
  );
}
