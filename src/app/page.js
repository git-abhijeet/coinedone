import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-800 to-black">
      {/* Header */}
      <header className="border-b border-zinc-700 bg-zinc-900/50 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="text-2xl font-bold text-white">Anti-Calculator</div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-6 text-5xl font-bold text-white md:text-6xl">
            Your Mortgage<br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Smart Friend
            </span>
          </h1>

          <p className="mb-8 text-lg text-zinc-400">
            Not another calculator. Get personalized advice on whether to buy or rent your dream home in the UAE.
          </p>

          <p className="mb-12 text-base text-zinc-500">
            No confusing numbers. No hidden fees. Just clear guidance tailored to your financial situation.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-zinc-600 bg-transparent px-8 py-3 text-lg font-semibold text-white hover:bg-zinc-800 transition"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-20 grid w-full max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="rounded-lg bg-zinc-800/50 p-6 backdrop-blur">
            <div className="mb-2 text-2xl">💰</div>
            <h3 className="mb-2 text-lg font-semibold text-white">Accurate Calculations</h3>
            <p className="text-sm text-zinc-400">
              Deterministic math ensures no errors. Ever.
            </p>
          </div>

          <div className="rounded-lg bg-zinc-800/50 p-6 backdrop-blur">
            <div className="mb-2 text-2xl">💬</div>
            <h3 className="mb-2 text-lg font-semibold text-white">Natural Chat</h3>
            <p className="text-sm text-zinc-400">
              Just chat naturally. No forms, no jargon.
            </p>
          </div>

          <div className="rounded-lg bg-zinc-800/50 p-6 backdrop-blur">
            <div className="mb-2 text-2xl">🏠</div>
            <h3 className="mb-2 text-lg font-semibold text-white">Smart Advice</h3>
            <p className="text-sm text-zinc-400">
              Buy or rent? Let AI help you decide.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-700 bg-zinc-900 py-6 text-center text-sm text-zinc-500">
        <p>
          Built for UAE expats navigating the mortgage market.{" "}
          <span className="text-zinc-400">CoinedOne Founder's Office Challenge.</span>
        </p>
      </footer>
    </div>
  );
}
