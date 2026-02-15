import { type ReactNode } from 'react';
interface AuthLayoutProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#020617] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-500">
            {/* Dynamic Aura Background */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/20 dark:bg-violet-900/10 rounded-full blur-[120px] animate-pulse"></div>
            <div
                className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/20 dark:bg-indigo-900/10 rounded-full blur-[100px] animate-pulse"
                style={{ animationDelay: '4s' }}
            ></div>

            <div className="max-w-md w-full relative z-10 animate-fade-in">
                <div className="flex flex-col items-center mb-10 translate-y-2">
                    <div className="w-20 h-20 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-3xl shadow-2xl shadow-violet-500/20 flex items-center justify-center mb-6 transform hover:rotate-6 hover:scale-105 transition-all duration-500">
                        <svg
                            className="w-10 h-10 text-white drop-shadow-md"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                        </svg>
                    </div>
                    <h1 className="text-5xl font-black bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm tracking-tight text-center">
                        {title || 'Horizon Auth'}
                    </h1>
                    {subtitle && (
                        <p className="mt-3 text-sm font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 text-center">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div className="premium-card p-10 animate-slide-up bg-white/60 dark:bg-[#0f172a]/50 backdrop-blur-xl">
                    {children}
                </div>

                <div className="mt-12 flex flex-col items-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 dark:text-slate-600 select-none hover:text-violet-400 dark:hover:text-violet-500 transition-colors cursor-default">
                        © 2026 OfekLabs
                    </p>
                </div>
            </div>
        </div>
    );
}
