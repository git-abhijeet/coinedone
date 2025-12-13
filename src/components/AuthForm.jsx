"use client";

/**
 * AuthInput Component
 * Reusable input field for auth forms with error handling and styling
 */
export function AuthInput({
    label,
    type = "text",
    name,
    value,
    onChange,
    placeholder,
    error,
    required = false,
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
                {label}
                {required && <span className="text-red-400">*</span>}
            </label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full rounded-lg border ${error ? "border-red-500" : "border-zinc-600"
                    } bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
            />
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
    );
}

/**
 * AuthFormContainer Component
 * Reusable container for auth forms with consistent styling
 */
export function AuthFormContainer({ title, subtitle, children }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-black px-4">
            <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900/80 p-8 backdrop-blur">
                <h2 className="mb-2 text-center text-3xl font-bold text-white">{title}</h2>
                <p className="mb-6 text-center text-sm text-zinc-400">{subtitle}</p>
                {children}
            </div>
        </div>
    );
}

/**
 * SubmitButton Component
 * Reusable submit button for auth forms
 */
export function SubmitButton({ label, loading = false }) {
    return (
        <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition mt-6"
        >
            {loading ? "Loading..." : label}
        </button>
    );
}
