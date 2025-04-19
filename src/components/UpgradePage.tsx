import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Loader2, Gift } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm relative">
                 <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Close modal"
                 >
                     <XCircle size={20} />
                 </button>
                <h3 className="text-lg font-semibold p-4 border-b dark:border-gray-700">{title}</h3>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
};

const FeatureItem: React.FC<{ children: React.ReactNode; included?: boolean }> = ({ children, included = true }) => (
    <li className={`flex items-start sm:items-center gap-2 ${included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500 line-through'}`}>
        {included ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-1 sm:mt-0" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-1 sm:mt-0" />}
        <span>{children}</span>
    </li>
);

interface UpgradePageProps {
    onGoBack: () => void;
    userEmail: string;
    onRedeemCode: (email: string, code: string) => Promise<void>;
}

export const UpgradePage: React.FC<UpgradePageProps> = ({ onGoBack, userEmail, onRedeemCode }) => {
    const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
    const [redeemCodeInput, setRedeemCodeInput] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
    const [isRedeemError, setIsRedeemError] = useState(false);

    const handleOpenRedeemModal = () => {
        setRedeemCodeInput('');
        setRedeemMessage(null);
        setIsRedeemError(false);
        setIsRedeeming(false);
        setIsRedeemModalOpen(true);
    };

    const handleRedeemSubmit = async () => {
        if (!redeemCodeInput.trim() || isRedeeming || !userEmail) return;

        setIsRedeeming(true);
        setRedeemMessage(null);
        setIsRedeemError(false);

        try {
            await onRedeemCode(userEmail, redeemCodeInput);
            setRedeemMessage("Code redeemed successfully! You now have access to Pro features.");
            setIsRedeemError(false);
        } catch (error: any) {
            console.error("Redeem failed:", error);
            setRedeemMessage(error.message || "An error occurred during redemption.");
            setIsRedeemError(true);
        } finally {
            setIsRedeeming(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-black text-gray-900 dark:text-white p-8 relative">
            <div className="max-w-5xl mx-auto">
                <button
                    onClick={onGoBack}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 mb-6"
                >
                    <ArrowLeft size={16} />
                    Back to Dashboard
                </button>

                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-3">Choose Your Plan</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400">Unlock more power and insights with our premium plans.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 flex flex-col">
                        <h2 className="text-2xl font-semibold mb-2">Free</h2>
                        <p className="text-3xl font-bold mb-4">$0<span className="text-lg font-normal text-gray-500 dark:text-gray-400">/mo</span></p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Get started with essential crypto briefs.</p>
                        <ul className="space-y-3 text-sm mb-8 flex-grow">
                            <FeatureItem included={true}>General Daily Brief (Email)</FeatureItem>
                            <FeatureItem included={false}>Personalized Daily Brief</FeatureItem>
                            <FeatureItem included={false}>Basic Sector/Narrative Tracking</FeatureItem>
                            <FeatureItem included={false}>Watchlist (5 items)</FeatureItem>
                            <FeatureItem included={false}>Telegram Briefs</FeatureItem>
                            <FeatureItem included={false}>X (Twitter) Feed Integration</FeatureItem>
                            <FeatureItem included={false}>Basic On-Chain Filters</FeatureItem>
                            <FeatureItem included={false}>Basic Smart Wallet Tracking</FeatureItem>
                            <FeatureItem included={false}>Priority Support</FeatureItem>
                        </ul>
                        <button
                            disabled
                            className="w-full mt-auto px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold cursor-default opacity-75"
                        >
                            Your Current Plan
                        </button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-purple-500 relative flex flex-col">
                         <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                             Coming Soon
                         </div>
                        <h2 className="text-2xl font-semibold mb-2 text-purple-600 dark:text-purple-400">Pro</h2>
                        <p className="text-3xl font-bold mb-4">TBD<span className="text-lg font-normal text-gray-500 dark:text-gray-400">/mo</span></p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">For active traders and enthusiasts needing more depth.</p>
                        <ul className="space-y-3 text-sm mb-8 flex-grow">
                            <FeatureItem>Everything in Free (plus personalization)</FeatureItem>
                            <FeatureItem>Enhanced Daily Brief (Email/Telegram)</FeatureItem>
                            <FeatureItem>Expanded Watchlist (50 items)</FeatureItem>
                            <FeatureItem>X (Twitter) Feed Integration</FeatureItem>
                            <FeatureItem>Basic On-Chain Filters</FeatureItem>
                            <FeatureItem>Basic Smart Wallet Tracking</FeatureItem>
                            <FeatureItem>Real-time Alerts (Basic)</FeatureItem>
                            <FeatureItem included={false}>Dedicated Support Channel</FeatureItem>
                        </ul>
                        <button
                            disabled
                            className="w-full mt-auto px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg font-semibold cursor-not-allowed"
                        >
                            Coming Soon
                        </button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 relative flex flex-col">
                        <div className="absolute top-0 right-0 bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                            Coming Soon
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">Enterprise</h2>
                        <p className="text-3xl font-bold mb-4">Contact Us</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Custom solutions for funds, protocols, and power users.</p>
                        <ul className="space-y-3 text-sm mb-8 flex-grow">
                           <FeatureItem>Everything in Pro</FeatureItem>
                           <FeatureItem>Unlimited Watchlist & API Access</FeatureItem>
                           <FeatureItem>Advanced On-Chain Filters</FeatureItem>
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

                <div className="mt-12 text-center sm:text-left">
                    <button
                        onClick={handleOpenRedeemModal}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                    >
                        <Gift size={16} />
                        Redeem Code
                    </button>
                </div>

            </div>

            <Modal
                isOpen={isRedeemModalOpen}
                onClose={() => setIsRedeemModalOpen(false)}
                title="Redeem Your Code"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Enter your bounty or promotional code below to unlock Pro features.
                    </p>
                    <div>
                        <label htmlFor="redeemCode" className="sr-only">Redeem Code</label>
                        <input
                            id="redeemCode"
                            type="text"
                            value={redeemCodeInput}
                            onChange={(e) => setRedeemCodeInput(e.target.value.toUpperCase())}
                            placeholder="ENTER CODE"
                            disabled={isRedeeming}
                            className="w-full px-4 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-600 uppercase tracking-wider text-center font-medium"
                        />
                    </div>

                    {redeemMessage && (
                         <p className={`text-sm text-center font-medium ${isRedeemError ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                             {redeemMessage}
                         </p>
                     )}

                    <button
                        onClick={handleRedeemSubmit}
                        disabled={isRedeeming || !redeemCodeInput.trim() || !!(redeemMessage && !isRedeemError)}
                        className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isRedeeming ? (
                            <> <Loader2 className="w-4 h-4 animate-spin" /> Redeeming... </>
                        ) : (
                            'Redeem'
                        )}
                    </button>
                </div>
            </Modal>
        </div>
    );
};
