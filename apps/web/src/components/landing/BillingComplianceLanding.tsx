import React from 'react';

export function BillingComplianceLanding() {
    return (
        <main className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
            {/* SECTION 1: HERO */}
            <section className="relative px-4 pt-24 pb-16 sm:px-6 sm:pt-32 sm:pb-24 lg:px-8 overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
                    <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-100 to-blue-400 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
                </div>

                <div className="mx-auto max-w-4xl text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                        Stop Medicare Claim Denials
                    </h1>
                    <p className="mt-6 text-xl font-semibold leading-8 text-blue-600 sm:text-2xl">
                        Get immediate medical billing compliance for your entire organization.
                    </p>
                    <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
                        You manage ringing phones and crowded waiting rooms daily. We check every Medicare claim before submission, catching errors instantly to protect your bottom line and your sanity.
                    </p>
                </div>
            </section>

            {/* SECTION 2 & 3: CARDS GRID (ROI & WORKFLOW) */}
            <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 relative z-10">

                    {/* SECTION 2: ROI CARD */}
                    <div className="flex flex-col rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 transition-transform duration-300 hover:-translate-y-1">
                        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                            Lower Liability, Faster Payouts
                        </h3>
                        <p className="mt-4 text-base leading-7 text-slate-600 flex-grow">
                            A rejected code creates crippling institutional risk and weeks of paperwork. We end that cycle today.
                        </p>
                        <ul className="mt-8 space-y-4">
                            {[
                                'Catches incorrect billing codes instantly.',
                                'Eliminates backlogs of denied claims.',
                                'Reduces your costly institutional liability.',
                                'Saves you hours of weekly rework.'
                            ].map((item, index) => (
                                <li key={index} className="flex gap-x-3 text-base leading-7 text-slate-700">
                                    <svg className="h-6 w-5 flex-none text-blue-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                    </svg>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* SECTION 3: WORKFLOW CARD */}
                    <div className="flex flex-col rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 transition-transform duration-300 hover:-translate-y-1">
                        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                            Quiet Background Support
                        </h3>
                        <div className="mt-4 space-y-6 text-base leading-7 text-slate-600">
                            <p>
                                You and your team work exactly as you do today inside your current software. The tool runs silently alongside daily tasks to ensure complete medical billing compliance—zero new training required.
                            </p>
                            <p>
                                It spots mismatched codes and highlights the exact fix before you hit submit.
                            </p>
                        </div>
                    </div>

                </div>
            </section>

            {/* SECTION 4: CTA AREA */}
            <section className="relative isolate mt-8 bg-slate-900 py-16 sm:py-24 lg:py-32">
                <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        Get Relief In Five Minutes
                    </h2>
                    <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300">
                        Take the first step toward stress-free medical coding.
                    </p>
                    <div className="mt-10 flex items-center justify-center">
                        <button
                            type="button"
                            className="rounded-full bg-blue-600 px-8 py-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
                        >
                            Book a 5-Minute Walkthrough
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}
