// src/components/UpgradePage.tsx
import React from 'react';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface UpgradePageProps {
    onGoBack: () => void; // Function to navigate back to the dashboard
}

const FeatureItem: React.FC<{ children: React.ReactNode; included?: boolean }> = ({ children, included = true }) => (
    <li className={`flex items-center gap-2 ${included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500 line-through'}`}>
        {included ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
        <span>{children}</span>
    </li>
);

export const UpgradePage: React.FC<UpgradePageProps> = ({ onGoBack }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-black text-gray-900 dark:text-white p-8">
            <div className="max-w-5xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={onGoBack}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 mb-6"
                >
                    <ArrowLeft size={16} />
                    Back to Dashboard
                </button>

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-3">Choose Your Plan</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400">Unlock more power and insights with our premium plans.</p>
                </div>

                {/* Pricing Tiers */}
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Free Tier */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 flex flex-col">
                        <h2 className="text-2xl font-semibold mb-2">Free</h2>
                        <p className="text-3xl font-bold mb-4">$0<span className="text-lg font-normal text-gray-500 dark:text-gray-400">/mo</span></p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Get started with essential personalized crypto briefs.</p>
                        <ul className="space-y-3 text-sm mb-8 flex-grow">
                            <FeatureItem>Personalized Daily Brief (Email)</FeatureItem>
                            <FeatureItem>Basic Sector/Narrative Tracking</FeatureItem>
                            <FeatureItem>Limited Watchlist (5 items)</FeatureItem>
                            <FeatureItem included={false}>Telegram Briefs</FeatureItem>
                            <FeatureItem included={false}>X (Twitter) Feed Integration</FeatureItem>
                            <FeatureItem included={false}>Advanced On-Chain Filters</FeatureItem>
                            <FeatureItem included={false}>Smart Wallet Tracking</FeatureItem>
                            <FeatureItem included={false}>Priority Support</FeatureItem>
                        </ul>
                        <button
                            disabled
                            className="w-full mt-auto px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold cursor-default opacity-75"
                        >
                            Your Current Plan
                        </button>
                    </div>

                    {/* Pro Tier (Coming Soon) */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-purple-500 relative flex flex-col">
                         <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                             Coming Soon
                         </div>
                        <h2 className="text-2xl font-semibold mb-2 text-purple-600 dark:text-purple-400">Pro</h2>
                        <p className="text-3xl font-bold mb-4">TBD<span className="text-lg font-normal text-gray-500 dark:text-gray-400">/mo</span></p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">For active traders and enthusiasts needing more depth.</p>
                        <ul className="space-y-3 text-sm mb-8 flex-grow">
                            <FeatureItem>Everything in Free</FeatureItem>
                            <FeatureItem>Enhanced Daily Brief (Email/Telegram)</FeatureItem>
                            <FeatureItem>Expanded Watchlist (50 items)</FeatureItem>
                            <FeatureItem>X (Twitter) Feed Integration</FeatureItem>
                            <FeatureItem>Basic On-Chain Filters</FeatureItem>
                            <FeatureItem>Basic Smart Wallet Tracking</FeatureItem>
                            <FeatureItem included={false}>Real-time Alerts</FeatureItem>
                            <FeatureItem included={false}>Dedicated Support Channel</FeatureItem>
                        </ul>
                        <button
                            disabled
                            className="w-full mt-auto px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg font-semibold cursor-not-allowed"
                        >
                            Coming Soon
                        </button>
                    </div>

                    {/* Enterprise Tier (Coming Soon) */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 relative flex flex-col">
                        <div className="absolute top-0 right-0 bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                            Coming Soon
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">Enterprise</h2>
                        <p className="text-3xl font-bold mb-4">Contact Us</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Custom solutions for funds, protocols, and power users.</p>
                        <ul className="space-y-3 text-sm mb-8 flex-grow">
                           <FeatureItem>Everything in Pro</FeatureItem>
                           <FeatureItem>Unlimited Watchlist</FeatureItem>
                           <FeatureItem>Advanced On-Chain Filters & API Access</FeatureItem>
                           <FeatureItem>Customizable Alerts & Reports</FeatureItem>
                           <FeatureItem>Dedicated Account Manager</FeatureItem>
                           <FeatureItem>Priority Support & SLA</FeatureItem>
                        </ul>
                         <button
                            disabled
                            className="w-full mt-auto px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg font-semibold cursor-not-allowed"
                        >
                            Coming Soon
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
