// ================================================
// FILE: src/components/OnboardingWizard.tsx
// ================================================
import React, { useState, KeyboardEvent } from 'react';
import clsx from 'clsx';
import { X, AlertTriangle } from 'lucide-react'; // Added AlertTriangle for errors

// --- Data Constants ---
const SECTORS = ['DeFi', 'Gaming', 'NFTs', 'Infrastructure', 'Memecoins', 'AI', 'RWA', 'SocialFi'];
const NARRATIVES = ['Layer 2 Scaling', 'Modular Blockchains', 'Account Abstraction', 'Liquid Staking', 'Decentralized Science (DeSci)', 'Zero-Knowledge Proofs'];
const POPULAR_TOKENS = [
    { id: 'BTC', display: 'Bitcoin (BTC)' },
    { id: 'ETH', display: 'Ethereum (ETH)' },
    { id: 'SOL', display: 'Solana (SOL)' },
    { id: 'LINK', display: 'Chainlink (LINK)' },
    { id: 'UNI', display: 'Uniswap (UNI)' },
    { id: 'MATIC', display: 'Polygon (MATIC)' },
    { id: 'AVAX', display: 'Avalanche (AVAX)' },
    { id: 'DOGE', display: 'Dogecoin (DOGE)' },
];

// --- Interfaces ---
export interface UserPreferences {
    selectedSectors: string[];
    selectedNarratives: string[];
    watchlistItems: string[];
}

interface OnboardingWizardProps {
    onComplete: (preferences: UserPreferences) => void;
    isSaving?: boolean;
}

// --- Component ---
export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, isSaving = false }) => {
    // --- State ---
    const [step, setStep] = useState(1);
    const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
    const [selectedNarratives, setSelectedNarratives] = useState<string[]>([]);
    const [selectedWatchlistItems, setSelectedWatchlistItems] = useState<string[]>([]);
    const [customSectorInput, setCustomSectorInput] = useState('');
    const [customNarrativeInput, setCustomNarrativeInput] = useState('');
    const [customWatchlistInput, setCustomWatchlistInput] = useState('');
    const [stepError, setStepError] = useState<string | null>(null); // <<< ADDED: State for step validation errors

    const totalSteps = 4; // Welcome, Sectors, Narratives, Watchlist

    // --- Handlers ---
    const handleToggleSelection = (
        item: string,
        list: string[],
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        if (isSaving) return;
        setStepError(null); // Clear error on interaction
        if (list.includes(item)) {
            setter(list.filter((i) => i !== item));
        } else {
            setter([...list, item]);
        }
    };

    const handleAddCustomItem = (
        input: string,
        list: string[],
        setter: React.Dispatch<React.SetStateAction<string[]>>,
        clearInput: () => void
    ) => {
        if (isSaving) return;
        setStepError(null); // Clear error on interaction
        const trimmedInput = input.trim();
        if (trimmedInput && !list.includes(trimmedInput)) {
            setter([...list, trimmedInput]);
            clearInput();
        } else if (list.includes(trimmedInput)) {
            // Optional: Provide feedback if item already exists
             setStepError(`"${trimmedInput}" is already in the list.`);
            // Do not clear input if it already exists, let user decide
        } else {
             // Optional: Provide feedback if input is empty/whitespace
             setStepError("Cannot add an empty item.");
        }
    };

    const handleRemoveItem = (
        itemToRemove: string,
        list: string[],
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        if (isSaving) return;
        setStepError(null); // Clear error on interaction
        setter(list.filter((item) => item !== itemToRemove));
    };

    const handleKeyDown = (
        e: KeyboardEvent<HTMLInputElement>,
        addFn: () => void
    ) => {
        if (isSaving) return;
        // No need to clear error here, addFn will handle it
        if (e.key === 'Enter') {
            e.preventDefault();
            addFn();
        }
    };

    // <<< MODIFIED: Added validation logic before finishing
    const handleFinish = () => {
        setStepError(null); // Clear previous error first
        if (isSaving) return;

        // Validate Watchlist (Step 4) before finishing
        if (customWatchlistInput.trim()) {
            setStepError('You have an unadded item in the watchlist input. Please "Add" it or clear the field before finishing.');
            return;
        }
        if (selectedWatchlistItems.length === 0) {
            setStepError('Please add at least one item to your watchlist (popular or custom) before finishing.');
            return;
        }

        // If validation passes:
        const preferences: UserPreferences = {
            selectedSectors: selectedSectors,
            selectedNarratives: selectedNarratives,
            watchlistItems: selectedWatchlistItems,
        };
        console.log("OnboardingWizard: Final preferences ready, calling onComplete.", preferences);
        onComplete(preferences);
    };

    // <<< MODIFIED: Added validation logic before proceeding
    const nextStep = () => {
        setStepError(null); // Clear previous error first
        if (isSaving) return;

        // Validate current step before proceeding
        if (step === 2) { // Validate Sectors
            if (customSectorInput.trim()) {
                setStepError('You have unadded text in the custom sector input. Please "Add" it or clear the field.');
                return;
            }
            if (selectedSectors.length === 0) {
                setStepError('Please select or add at least one sector before proceeding.');
                return;
            }
        } else if (step === 3) { // Validate Narratives
            if (customNarrativeInput.trim()) {
                setStepError('You have unadded text in the custom narrative input. Please "Add" it or clear the field.');
                return;
            }
            if (selectedNarratives.length === 0) {
                setStepError('Please select or add at least one narrative before proceeding.');
                return;
            }
        }
        // Step 1 (Welcome) has no validation to proceed
        // Step 4 validation happens in handleFinish

        if (step < totalSteps) {
            setStep(step + 1);
        }
    };

    // <<< MODIFIED: Clear error when going back
    const prevStep = () => {
        setStepError(null); // Clear error when going back
        if (isSaving) return;
        if (step > 1) {
            setStep(step - 1);
        }
    };

    // --- Render Step Content ---
    const renderStepContent = () => {
        switch (step) {
            case 1: // Welcome
                return (
                    <div className="text-center">
                        <h2 className="text-3xl font-bold mb-4">Welcome to Degen Times!</h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                            Let's personalize your crypto brief. Tell us what you're interested in.
                        </p>
                        <button
                            onClick={nextStep}
                            disabled={isSaving}
                            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-lg disabled:opacity-50"
                        >
                            Get Started
                        </button>
                    </div>
                );
            case 2: // Select Sectors
                return (
                    <div>
                        <h2 className="text-2xl font-semibold mb-2">Select Sectors</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">Choose the crypto sectors you follow (at least one), or add your own.</p>
                        {/* Predefined Sectors */}
                        <div className="flex flex-wrap gap-3 mb-4">
                            {SECTORS.map((sector) => (
                                <button
                                    key={sector}
                                    onClick={() => handleToggleSelection(sector, selectedSectors, setSelectedSectors)}
                                    disabled={isSaving}
                                    className={clsx(
                                        'px-4 py-2 rounded-full border transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed',
                                        selectedSectors.includes(sector)
                                            ? 'bg-purple-600 text-white border-purple-600'
                                            : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    )}
                                >
                                    {sector}
                                </button>
                            ))}
                        </div>
                        {/* Custom Sector Input */}
                         <div className="flex gap-2 mb-4">
                             <input
                                type="text"
                                value={customSectorInput}
                                // Clear error on input change for better UX
                                onChange={(e) => { setCustomSectorInput(e.target.value); setStepError(null); }}
                                placeholder="Add custom sector..."
                                disabled={isSaving}
                                onKeyDown={(e) => handleKeyDown(e, () => handleAddCustomItem(customSectorInput, selectedSectors, setSelectedSectors, () => setCustomSectorInput('')))}
                                className="flex-grow px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-600"
                             />
                             <button
                                onClick={() => handleAddCustomItem(customSectorInput, selectedSectors, setSelectedSectors, () => setCustomSectorInput(''))}
                                disabled={isSaving || !customSectorInput.trim()}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                Add
                             </button>
                         </div>
                         {/* Display Custom/Selected Sectors */}
                         <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Your selections:</p>
                         <div className="flex flex-wrap gap-2 min-h-[2rem] p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/30"> {/* Added min-height & visual box */}
                             {selectedSectors.length === 0 && <p className="text-sm italic text-gray-400 dark:text-gray-500">No sectors selected yet.</p>}
                             {selectedSectors.map((sector) => (
                                 <span key={sector} className="flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm">
                                     {sector}
                                     <button
                                        onClick={() => handleRemoveItem(sector, selectedSectors, setSelectedSectors)}
                                        disabled={isSaving}
                                        className="text-purple-500 hover:text-purple-700 dark:hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label={`Remove ${sector}`}
                                     >
                                         <X size={14} />
                                     </button>
                                 </span>
                             ))}
                         </div>
                    </div>
                );
            case 3: // Select Narratives
                return (
                    <div>
                        <h2 className="text-2xl font-semibold mb-2">Select Narratives</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">Which market narratives are on your radar (at least one)? Add your own.</p>
                         {/* Predefined Narratives */}
                        <div className="flex flex-wrap gap-3 mb-4">
                            {NARRATIVES.map((narrative) => (
                                <button
                                    key={narrative}
                                    onClick={() => handleToggleSelection(narrative, selectedNarratives, setSelectedNarratives)}
                                    disabled={isSaving}
                                    className={clsx(
                                        'px-4 py-2 rounded-full border transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed',
                                        selectedNarratives.includes(narrative)
                                            ? 'bg-purple-600 text-white border-purple-600'
                                            : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    )}
                                >
                                    {narrative}
                                </button>
                            ))}
                        </div>
                         {/* Custom Narrative Input */}
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={customNarrativeInput}
                                // Clear error on input change
                                onChange={(e) => { setCustomNarrativeInput(e.target.value); setStepError(null); }}
                                placeholder="Add custom narrative..."
                                disabled={isSaving}
                                onKeyDown={(e) => handleKeyDown(e, () => handleAddCustomItem(customNarrativeInput, selectedNarratives, setSelectedNarratives, () => setCustomNarrativeInput('')))}
                                className="flex-grow px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-600"
                            />
                            <button
                                onClick={() => handleAddCustomItem(customNarrativeInput, selectedNarratives, setSelectedNarratives, () => setCustomNarrativeInput(''))}
                                disabled={isSaving || !customNarrativeInput.trim()}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add
                            </button>
                        </div>
                        {/* Display Custom/Selected Narratives */}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Your selections:</p>
                        <div className="flex flex-wrap gap-2 min-h-[2rem] p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/30"> {/* Added min-height & visual box */}
                            {selectedNarratives.length === 0 && <p className="text-sm italic text-gray-400 dark:text-gray-500">No narratives selected yet.</p>}
                            {selectedNarratives.map((narrative) => (
                                <span key={narrative} className="flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm">
                                    {narrative}
                                    <button
                                        onClick={() => handleRemoveItem(narrative, selectedNarratives, setSelectedNarratives)}
                                        disabled={isSaving}
                                        className="text-purple-500 hover:text-purple-700 dark:hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label={`Remove ${narrative}`}
                                    >
                                         <X size={14} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                );
            case 4: // Setup Watchlist
                return (
                    <div>
                        <h2 className="text-2xl font-semibold mb-2">Setup Your Watchlist</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">Select popular tokens or add any token symbol, project name, or topic you want specific updates for (at least one).</p>
                        {/* Popular Tokens */}
                        <div className="flex flex-wrap gap-3 mb-4">
                            {POPULAR_TOKENS.map((token) => (
                                <button
                                    key={token.id}
                                    onClick={() => handleToggleSelection(token.id, selectedWatchlistItems, setSelectedWatchlistItems)}
                                    disabled={isSaving}
                                    className={clsx(
                                        'px-4 py-2 rounded-full border transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
                                        selectedWatchlistItems.includes(token.id)
                                            ? 'bg-purple-600 text-white border-purple-600'
                                            : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    )}
                                >
                                    <span>{token.display}</span>
                                </button>
                            ))}
                        </div>
                        {/* Custom Watchlist Input */}
                         <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={customWatchlistInput}
                                // Clear error on input change
                                onChange={(e) => { setCustomWatchlistInput(e.target.value); setStepError(null); }}
                                placeholder="Add watchlist item (e.g., RNDR, friend.tech)..."
                                disabled={isSaving}
                                onKeyDown={(e) => handleKeyDown(e, () => handleAddCustomItem(customWatchlistInput, selectedWatchlistItems, setSelectedWatchlistItems, () => setCustomWatchlistInput('')))}
                                className="flex-grow px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-600"
                            />
                            <button
                                onClick={() => handleAddCustomItem(customWatchlistInput, selectedWatchlistItems, setSelectedWatchlistItems, () => setCustomWatchlistInput(''))}
                                disabled={isSaving || !customWatchlistInput.trim()}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add
                            </button>
                        </div>
                        {/* Display Custom/Selected Watchlist Items */}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Your watchlist:</p>
                        <div className="flex flex-wrap gap-2 min-h-[2rem] p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/30"> {/* Added min-height & visual box */}
                            {selectedWatchlistItems.length === 0 && <p className="text-sm italic text-gray-400 dark:text-gray-500">No watchlist items added yet.</p>}
                            {selectedWatchlistItems.map((item) => (
                                <span key={item} className="flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm">
                                    {/* Display full name if it's a popular token, otherwise the item itself */}
                                    {POPULAR_TOKENS.find(t => t.id === item)?.display || item}
                                    <button
                                        onClick={() => handleRemoveItem(item, selectedWatchlistItems, setSelectedWatchlistItems)}
                                        disabled={isSaving}
                                        className="text-purple-500 hover:text-purple-700 dark:hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label={`Remove ${item}`}
                                    >
                                        <X size={14} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                );
            default:
                return <div>Unknown step</div>;
        }
    };

    // --- Main Render ---
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-100 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-black">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 md:p-12 max-w-3xl w-full text-gray-900 dark:text-white">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Step {step} of {totalSteps}</span>
                        {isSaving && <span className="text-purple-600 dark:text-purple-400 animate-pulse">Saving...</span>}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {/* Step Content Area */}
                <div className="mb-8 min-h-[300px] md:min-h-[350px]">
                     {renderStepContent()}
                 </div>

                 {/* <<< ADDED: Display Step Error Message >>> */}
                 {stepError && (
                     <div className="mb-4 -mt-4 p-3 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 flex items-center gap-2" role="alert">
                         <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" aria-hidden="true" />
                         <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                             {stepError}
                         </p>
                     </div>
                 )}
                 {/* <<< END: Error Message Display >>> */}


                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={prevStep}
                        disabled={step === 1 || isSaving}
                        className="px-5 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Back
                    </button>

                    {step < totalSteps ? (
                        <button
                            onClick={nextStep} // nextStep now includes validation
                            disabled={isSaving}
                            className="px-5 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish} // handleFinish now includes validation
                            disabled={isSaving}
                            className="px-5 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-wait"
                        >
                            {isSaving ? 'Saving...' : 'Finish Setup'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
