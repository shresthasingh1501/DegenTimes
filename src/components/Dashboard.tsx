import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Mail, Hand as BrandX, Send, Settings, LogOut, User, ChevronDown,
    ArrowUpRight, X as CloseIcon, FileText, Download, Loader2 as LoaderIcon, AlertTriangle, // Added AlertTriangle
    AlertCircle, CheckCircle, Star, Zap, ListChecks, Shapes, Milestone, TrendingUp, ExternalLink, PlusCircle, DownloadCloud
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import clsx from 'clsx';
import jsPDF from 'jspdf';
import ReactDOM from 'react-dom';
import { UserPreferences } from './OnboardingWizard';
import { GoogleUserProfile } from '../App';

// Extend NotificationType if needed, or use it from App if exported
type NotificationType = 'success' | 'error' | 'info';

// Modal Component
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
    if (!isOpen) return null;
    const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${sizeClasses[size]} relative`}>
                 <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close modal"> <CloseIcon size={20} /> </button>
                <h3 className="text-lg font-semibold p-4 border-b dark:border-gray-700">{title}</h3>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
};

// Dashboard Props
interface DashboardProps {
    onEditPreferences: () => void;
    initialPreferences: UserPreferences | null;
    onLogout: () => void;
    googleUser: GoogleUserProfile | null;
    onNavigateToUpgrade: () => void;
    telegramId: string | null;
    teleUpdateRate: number | null;
    // ***** FIX 1: Update the function signature type *****
    onSaveTelegramDetails: (email: string, telegramId: string | null, teleUpdateRate: number | null) => Promise<void>; // Expects email, id, rate
    isPro: boolean;
    isEnterprise: boolean;
    watchlistNews: string | null;
    sectorNews: string | null;
    narrativeNews: string | null;
    showAppNotification: (message: string, type?: NotificationType, duration?: number) => void; // Receive notification function
}

// Helper function to determine tier
const getTierInfo = (isPro: boolean, isEnterprise: boolean): { name: string; color: string; icon: React.ReactNode } => {
    if (isEnterprise) return { name: 'Enterprise', color: 'bg-indigo-500', icon: <Zap size={12} /> };
    if (isPro) return { name: 'Pro', color: 'bg-purple-500', icon: <Star size={12} /> };
    return { name: 'Basic', color: 'bg-gray-500', icon: null };
};

type NewsTab = 'watchlist' | 'sector' | 'narrative' | 'trending';

// CoinGecko Trending API Types
interface TrendingCoinItem { id: string; coin_id: number; name: string; symbol: string; market_cap_rank: number; thumb: string; small: string; large: string; slug: string; price_btc: number; score: number; data?: any; }
interface TrendingNFTItem { id: string; name: string; symbol: string; thumb: string; nft_contract_id: number; native_currency_symbol: string; floor_price_in_native_currency: number; floor_price_24h_percentage_change: number; data?: any; }
interface TrendingCategoryItem { id: number; name: string; market_cap_1h_change: number; slug: string; coins_count: number; data?: any; }
interface TrendingData {
    coins: { item: TrendingCoinItem }[];
    nfts: TrendingNFTItem[];
    categories: TrendingCategoryItem[];
}

const coingeckoApiKey = import.meta.env.VITE_COINGECKO_API_KEY;
const coingeckoApiHeaders = {
    'accept': 'application/json',
    ...(coingeckoApiKey ? { 'x-cg-api-key': coingeckoApiKey } : { 'x-cg-demo-api-key': 'CG-g4kQ9aQZgE5DsUr9W5jL787d' })
};

const TELEGRAM_SAVE_DELAY_MS = 5000; // 5 seconds

// Dashboard Component
export const Dashboard: React.FC<DashboardProps> = ({
    onEditPreferences,
    initialPreferences,
    onLogout,
    googleUser, // Needed for email
    onNavigateToUpgrade,
    telegramId,
    teleUpdateRate,
    onSaveTelegramDetails,
    isPro,
    isEnterprise,
    watchlistNews,
    sectorNews,
    narrativeNews,
    showAppNotification // Destructure notification function
}) => {
    // State
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [telegramModalOpen, setTelegramModalOpen] = useState(false);
    const [twitterModalOpen, setTwitterModalOpen] = useState(false);
    const [isAccountPopupOpen, setIsAccountPopupOpen] = useState(false);
    const [pdfUrlLoading, setPdfUrlLoading] = useState(true);
    const [pdfUrlError, setPdfUrlError] = useState<string | null>(null);
    const [pdfURL, setPdfURL] = useState<string | null>(null);
    const [telegramIdInput, setTelegramIdInput] = useState<string>('');
    const [teleRateInput, setTeleRateInput] = useState<number>(24);
    const [isSavingTelegram, setIsSavingTelegram] = useState<boolean>(false);
    const [telegramSaveError, setTelegramSaveError] = useState<string | null>(null);
    const [emailInput, setEmailInput] = useState('');
    const accountPopupRef = useRef<HTMLDivElement>(null);
    const [activeNewsTab, setActiveNewsTab] = useState<NewsTab>('watchlist');
    const [trendingData, setTrendingData] = useState<TrendingData | null>(null);
    const [trendingLoading, setTrendingLoading] = useState<boolean>(false);
    const [trendingError, setTrendingError] = useState<string | null>(null);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestTitle, setRequestTitle] = useState('');
    const [requestContents, setRequestContents] = useState('');
    const [isRequesting, setIsRequesting] = useState(false);
    // State for Telegram save button delay
    const [telegramSaveButtonEnabled, setTelegramSaveButtonEnabled] = useState(false);
    const [telegramCountdown, setTelegramCountdown] = useState<number>(TELEGRAM_SAVE_DELAY_MS / 1000);
    const telegramTimerId = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalId = useRef<NodeJS.Timeout | null>(null);

    // Determine tier info
    const tier = getTierInfo(isPro, isEnterprise);
    const showProFeatures = isPro || isEnterprise;

    // Effects
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (accountPopupRef.current && !accountPopupRef.current.contains(event.target as Node)) setIsAccountPopupOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setTelegramIdInput(telegramId ?? '');
        setTeleRateInput(teleUpdateRate ?? 24);
    }, [telegramId, teleUpdateRate]);

    useEffect(() => {
        const fetchPdfDownloadUrl = async () => {
            setPdfUrlLoading(true);
            setPdfUrlError(null);
            setPdfURL(null);
            try {
                const response = await fetch('/api/pdf-brief');
                if (!response.ok) {
                    let errorData;
                    try { errorData = await response.json(); } catch (e) { errorData = { error: response.statusText || `HTTP error ${response.status}` }; }
                    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();
                if (data && data.pdfUrl) setPdfURL(data.pdfUrl);
                else throw new Error("PDF URL not found in the response from the server.");
            } catch (error: any) {
                setPdfUrlError(`Failed to retrieve brief link: ${error.message || 'Unknown error'}`);
            } finally {
                setPdfUrlLoading(false);
            }
        };
        fetchPdfDownloadUrl();
    }, []);


    useEffect(() => {
        if (activeNewsTab === 'trending' && !trendingData && !trendingLoading) {
            const fetchTrendingData = async () => {
                setTrendingLoading(true);
                setTrendingError(null);
                try {
                    const response = await fetch("https://api.coingecko.com/api/v3/search/trending", { headers: coingeckoApiHeaders });
                    if (!response.ok) {
                        throw new Error(`CoinGecko API Error: ${response.status} ${response.statusText}`);
                    }
                    const data: TrendingData = await response.json();
                    setTrendingData(data);
                } catch (error: any) {
                    setTrendingError(error.message || "Failed to load trending data.");
                    setTrendingData(null);
                } finally {
                    setTrendingLoading(false);
                }
            };
            fetchTrendingData();
        }
    }, [activeNewsTab, trendingData, trendingLoading]);

    // Effect for Telegram modal save button delay and countdown
    useEffect(() => {
        if (telegramModalOpen) {
            setTelegramSaveButtonEnabled(false); // Disable button initially
            setTelegramCountdown(TELEGRAM_SAVE_DELAY_MS / 1000); // Reset countdown

            // Start main timer to enable button
            telegramTimerId.current = setTimeout(() => {
                setTelegramSaveButtonEnabled(true);
                if (countdownIntervalId.current) clearInterval(countdownIntervalId.current); // Clear countdown when main timer finishes
                setTelegramCountdown(0); // Ensure countdown shows 0
            }, TELEGRAM_SAVE_DELAY_MS);

            // Start countdown timer for display
            countdownIntervalId.current = setInterval(() => {
                setTelegramCountdown((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);

        } else {
            // Cleanup if modal closes
            if (telegramTimerId.current) clearTimeout(telegramTimerId.current);
            if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);
            setTelegramSaveButtonEnabled(false); // Reset button state
        }

        // Cleanup function for when the component unmounts or modal closes
        return () => {
            if (telegramTimerId.current) clearTimeout(telegramTimerId.current);
            if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);
        };
    }, [telegramModalOpen]); // Re-run when modal open state changes

    // Handlers
    const handleDownloadClick = () => {
        if (!pdfURL) return;
        const link = document.createElement('a');
        link.href = pdfURL;
        link.setAttribute('download', 'crypto_brief.pdf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const handleUpgradeClick = () => { setIsAccountPopupOpen(false); onNavigateToUpgrade(); };
    const handleLogoutClick = () => { setIsAccountPopupOpen(false); onLogout(); };
    const handleSaveEmail = () => setEmailModalOpen(false);

    const openTelegramModal = () => {
        setIsSavingTelegram(false);
        setTelegramSaveError(null);
        setTelegramIdInput(telegramId ?? '');
        setTeleRateInput(teleUpdateRate ?? 24);
        setTelegramModalOpen(true);
        // Timer logic is now handled by the useEffect hook watching telegramModalOpen
    };

    // ***** FIX 2: Correctly call onSaveTelegramDetails with email *****
    const handleSaveTelegramDetails = async () => {
        // Button disabled state already handled by `telegramSaveButtonEnabled`
        if (!telegramSaveButtonEnabled || isSavingTelegram) return;

        // Add a check for googleUser and email for safety
        if (!googleUser?.email) {
            console.error("User email not available in Dashboard component when trying to save Telegram details.");
            setTelegramSaveError("User information is missing. Cannot save settings.");
            setIsSavingTelegram(false); // Stop loading state if applicable
            // Optionally show an app notification too
            showAppNotification("Error: User information missing.", 'error');
            return;
        }

        setIsSavingTelegram(true);
        setTelegramSaveError(null);
        try {
            const rateToSave = Math.max(1, Math.min(24, teleRateInput));
            const idToSave = telegramIdInput.trim() || null; // Ensure empty string becomes null

            // Pass the user's email as the first argument
            await onSaveTelegramDetails(googleUser.email, idToSave, rateToSave);

            setTelegramModalOpen(false); // Close modal on success (App handles notification)
        } catch (error: any) {
             // Error notification is handled by App's saveTelegramDetails
             setTelegramSaveError(`Failed to save: ${error.message || 'Unknown error'}`); // Still show error in modal
        } finally {
            setIsSavingTelegram(false);
        }
    };


    const handleOpenRequestModal = () => {
        setRequestTitle('');
        setRequestContents('');
        setIsRequesting(false);
        setIsRequestModalOpen(true);
    };

    const handleRequestSubmit = async () => {
        if (!requestTitle.trim() || !requestContents.trim() || isRequesting) return;
        setIsRequesting(true);
        console.log('Submitting request:', { title: requestTitle, contents: requestContents });
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async
        setIsRequesting(false);
        setIsRequestModalOpen(false);
        showAppNotification("Personalized tab request submitted!", 'success'); // Use App's notification
    };

    const combinePersonalizedNewsMarkdown = (): string => {
        let combined = `# Personalized News Brief\n\n`;
        if (watchlistNews) combined += `## Watchlist News\n\n${watchlistNews}\n\n---\n\n`;
        if (sectorNews) combined += `## Sector News\n\n${sectorNews}\n\n---\n\n`;
        if (narrativeNews) combined += `## Narrative News\n\n${narrativeNews}\n\n`;
        if (!watchlistNews && !sectorNews && !narrativeNews) combined += `*No personalized news available.*\n`;
        return combined.trim();
    };

    const handleDownloadPersonalizedBrief = async () => {
        const markdownContent = combinePersonalizedNewsMarkdown();
        const pdfRenderContainerId = 'pdf-render-container';
        let pdfContainer = document.getElementById(pdfRenderContainerId);
        if (!pdfContainer) {
            pdfContainer = document.createElement('div');
            pdfContainer.id = pdfRenderContainerId;
            // Hide the container visually but keep it renderable
            pdfContainer.style.position = 'absolute';
            pdfContainer.style.left = '-9999px';
            pdfContainer.style.top = 'auto';
            pdfContainer.style.width = '800px'; // A fixed width often helps pdf generation
            document.body.appendChild(pdfContainer);
        }

        const markdownElement = (
            <div className="prose prose-sm max-w-none p-10 bg-white text-black"> {/* Added bg/text for render */}
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                    {markdownContent}
                </ReactMarkdown>
            </div>
        );

        ReactDOM.render(markdownElement, pdfContainer, async () => {
            await new Promise(resolve => setTimeout(resolve, 200)); // Slightly longer wait
            const pdf = new jsPDF('p', 'pt', 'a4');
            const targetElement = document.getElementById(pdfRenderContainerId);
            if (targetElement) {
                 try {
                    await pdf.html(targetElement, {
                         callback: function (doc) {
                             doc.save('personalized_news_brief.pdf');
                             // Clean up after saving
                             ReactDOM.unmountComponentAtNode(targetElement);
                             targetElement.remove();
                         },
                         x: 10, y: 10, // Margin
                         html2canvas: {
                             scale: 0.7 // Adjust scale if content overflows
                         },
                         // autoPaging: 'text' // Experiment if needed
                         margin: [10, 10, 10, 10],
                         width: 575, // A4 width in points minus margins (approx 595 total)
                         windowWidth: targetElement.scrollWidth,
                     });
                 } catch (error) {
                     console.error("Error generating personalized PDF:", error);
                     showAppNotification("Failed to generate personalized brief PDF.", 'error'); // Use app notification
                      // Clean up on error
                      ReactDOM.unmountComponentAtNode(targetElement);
                      targetElement.remove();
                 }
            } else {
                 console.error("PDF render container not found after creation.");
                 showAppNotification("Failed to generate PDF: Render container missing.", 'error');
            }
        });
    };


    const renderNewsContent = () => {
        switch(activeNewsTab) {
            case 'watchlist':
                return watchlistNews ? <ReactMarkdown rehypePlugins={[rehypeRaw]}>{watchlistNews}</ReactMarkdown> : <p className="italic text-gray-500 dark:text-gray-400">No watchlist news available.</p>;
            case 'sector':
                return sectorNews ? <ReactMarkdown rehypePlugins={[rehypeRaw]}>{sectorNews}</ReactMarkdown> : <p className="italic text-gray-500 dark:text-gray-400">No sector news available.</p>;
            case 'narrative':
                return narrativeNews ? <ReactMarkdown rehypePlugins={[rehypeRaw]}>{narrativeNews}</ReactMarkdown> : <p className="italic text-gray-500 dark:text-gray-400">No narrative news available.</p>;
            case 'trending':
                if (trendingLoading) {
                    return <div className="flex justify-center items-center h-40"><LoaderIcon className="w-8 h-8 animate-spin text-purple-500" /></div>;
                }
                if (trendingError) {
                    return <div className="text-center text-red-500 dark:text-red-400"><AlertCircle className="mx-auto mb-2 w-8 h-8"/>{trendingError}</div>;
                }
                if (!trendingData) {
                    return <p className="italic text-gray-500 dark:text-gray-400">Could not load trending data.</p>;
                }
                return (
                    <div className="space-y-8">
                        <div>
                            <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2 border-gray-300 dark:border-gray-600">Trending Coins</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {trendingData.coins?.map(({ item }) => (
                                    <a key={item.id} href={`https://www.coingecko.com/en/coins/${item.slug}`} target="_blank" rel="noopener noreferrer" className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-600">
                                        <div className="flex items-center gap-3 mb-2">
                                            <img src={item.thumb} alt={item.name} className="w-6 h-6 rounded-full" />
                                            <span className="font-medium text-gray-900 dark:text-white truncate">{item.name} ({item.symbol})</span>
                                            <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded">#{item.market_cap_rank || '?'}</span>
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400 flex justify-between items-center">
                                            <span>Price (BTC): {item.price_btc.toExponential(3)}</span>
                                            <ExternalLink size={12} className="opacity-50"/>
                                        </div>
                                    </a>
                                ))}
                                {!trendingData.coins?.length && <p className="text-sm italic text-gray-500 dark:text-gray-400 col-span-full">No trending coins found.</p>}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2 border-gray-300 dark:border-gray-600">Trending NFTs</h4>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {trendingData.nfts?.map((nft) => (
                                    <a key={nft.id} href={`https://www.coingecko.com/en/nft/${nft.id}`} target="_blank" rel="noopener noreferrer" className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-600">
                                        <div className="flex items-center gap-3 mb-2">
                                            <img src={nft.thumb} alt={nft.name} className="w-6 h-6 rounded-full" />
                                            <span className="font-medium text-gray-900 dark:text-white truncate">{nft.name} ({nft.symbol})</span>
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400 flex justify-between items-center">
                                            <span>Floor: {nft.floor_price_in_native_currency.toFixed(4)} {nft.native_currency_symbol.toUpperCase()}</span>
                                             <span className={clsx(nft.floor_price_24h_percentage_change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                                                {nft.floor_price_24h_percentage_change >= 0 ? '+' : ''}{nft.floor_price_24h_percentage_change.toFixed(1)}% 24h
                                            </span>
                                            <ExternalLink size={12} className="opacity-50"/>
                                        </div>
                                    </a>
                                ))}
                                {!trendingData.nfts?.length && <p className="text-sm italic text-gray-500 dark:text-gray-400 col-span-full">No trending NFTs found.</p>}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2 border-gray-300 dark:border-gray-600">Trending Categories</h4>
                            <div className="space-y-3">
                                {trendingData.categories?.map((category) => (
                                     <a key={category.id} href={`https://www.coingecko.com/en/categories/${category.slug}`} target="_blank" rel="noopener noreferrer" className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-600">
                                        <div>
                                            <span className="font-medium text-gray-900 dark:text-white">{category.name}</span>
                                            <span className="block text-xs text-gray-500 dark:text-gray-400">{category.coins_count} coins</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={clsx('text-xs', category.market_cap_1h_change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                                                {category.market_cap_1h_change >= 0 ? '+' : ''}{category.market_cap_1h_change.toFixed(1)}% 1h
                                            </span>
                                            <ExternalLink size={12} className="opacity-50"/>
                                        </div>
                                    </a>
                                ))}
                                {!trendingData.categories?.length && <p className="text-sm italic text-gray-500 dark:text-gray-400">No trending categories found.</p>}
                            </div>
                        </div>
                    </div>
                );
        }
        return null;
    };


    // Render
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 text-gray-900 dark:text-white">
            {/* App-level notification is handled in App.tsx */}

            <div className="max-w-7xl mx-auto">
                {/* Header Row */}
                <div className="flex flex-wrap gap-4 mb-8 items-center justify-between">
                    {/* Left Buttons */}
                    <div className="flex flex-wrap gap-2 sm:gap-4">
                         <button onClick={() => setEmailModalOpen(true)} className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-700 dark:text-gray-300 text-sm sm:text-base"> <Mail className="w-4 h-4 sm:w-5 sm:h-5" /> <span>Email Brief</span> </button>
                         <button onClick={openTelegramModal} className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-700 dark:text-gray-300 text-sm sm:text-base"> <Send className="w-4 h-4 sm:w-5 sm:h-5" /> <span>Telegram Brief</span> </button>
                         <button onClick={() => setTwitterModalOpen(true)} className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-700 dark:text-gray-300 text-sm sm:text-base"> <BrandX className="w-4 h-4 sm:w-5 sm:h-5" /> <span>X Updates</span> </button>
                         {/* Download Personalized Brief Button - Only shown for Pro/Enterprise */}
                         {showProFeatures && (watchlistNews || sectorNews || narrativeNews) && (
                            <button
                                onClick={handleDownloadPersonalizedBrief}
                                className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-green-100 dark:bg-green-900 rounded-lg shadow-sm hover:shadow-md transition-shadow text-green-700 dark:text-green-300 text-sm sm:text-base hover:bg-green-200 dark:hover:bg-green-800"
                                title="Download Personalized News Brief as PDF"
                            >
                                <DownloadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span>Personalized PDF</span>
                            </button>
                         )}
                    </div>
                    {/* Right Buttons */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <button onClick={onEditPreferences} className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm sm:text-base" title="Edit Preferences"> <Settings className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Edit Preferences</span> </button>
                        <div className="relative" ref={accountPopupRef}>
                            <button onClick={() => setIsAccountPopupOpen(!isAccountPopupOpen)} className="flex items-center gap-2 rounded-full border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 p-0.5 transition-colors" title="Account">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center border border-gray-300 dark:border-gray-600"> {googleUser?.picture ? ( <img src={googleUser.picture} alt={googleUser.name ?? 'User'} className="w-full h-full object-cover" /> ) : ( <User className="w-5 h-5 text-gray-500 dark:text-gray-400" /> )} </div>
                                <span className="hidden sm:inline text-sm font-medium mr-1">{googleUser?.given_name ?? 'Account'}</span>
                                <ChevronDown size={16} className={`transition-transform duration-200 ${isAccountPopupOpen ? 'rotate-180' : ''} mr-1 hidden sm:inline text-gray-500 dark:text-gray-400`} />
                            </button>
                            {isAccountPopupOpen && (
                                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border dark:border-gray-700 overflow-hidden">
                                    <div className="flex items-center gap-3 p-4 border-b dark:border-gray-700">
                                         <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 border border-gray-300 dark:border-gray-600"> {googleUser?.picture ? ( <img src={googleUser.picture} alt={googleUser.name ?? 'User'} className="w-full h-full object-cover" /> ) : ( <User className="w-6 h-6 text-gray-500 dark:text-gray-400" /> )} </div>
                                         <div className="truncate"> <p className="text-sm font-semibold truncate" title={googleUser?.name}>{googleUser?.name ?? 'User Name'}</p> <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={googleUser?.email}>{googleUser?.email ?? 'email@example.com'}</p> </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <div> <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-0.5">Current Plan</span> <span className="text-sm font-semibold">{tier.name}</span> </div>
                                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white ${tier.color}`}> {tier.icon} {tier.name} </span>
                                        </div>
                                        {!isEnterprise && ( <button onClick={handleUpgradeClick} className="w-full flex justify-between items-center text-left px-3 py-2 rounded-md bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"> <span className="text-sm font-medium text-purple-700 dark:text-purple-300"> {isPro ? 'Manage Plan' : 'Upgrade Plan'} </span> <ArrowUpRight className="w-4 h-4 text-purple-600 dark:text-purple-400" /> </button> )}
                                    </div>
                                     <div className="border-t dark:border-gray-700 p-2"> <button onClick={handleLogoutClick} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors" title="Logout"> <LogOut className="w-4 h-4" /> <span>Logout</span> </button> </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dashboard Content Area */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 shadow-lg flex flex-col items-center">
                    {/* Welcome Message and Tier Badge */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
                         <h2 className="text-2xl font-bold"> Welcome back, {googleUser?.given_name ?? 'User'}! </h2>
                         <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full text-white ${tier.color}`}>
                             {tier.icon && React.cloneElement(tier.icon as React.ReactElement, { size: 14 })}
                             {tier.name} Plan
                         </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-8"> Your daily crypto brief is ready for download. </p>

                    {/* Download Section */}
                    <div className="w-full max-w-sm p-6 border dark:border-gray-700 rounded-lg shadow-md flex flex-col items-center space-y-4 bg-gray-50 dark:bg-gray-700 mb-8">
                        {pdfUrlLoading && ( <div className="flex flex-col items-center text-gray-600 dark:text-gray-400"><LoaderIcon className="w-8 h-8 animate-spin mb-2 text-purple-500" /><span>Preparing your brief...</span></div> )}
                        {pdfUrlError && !pdfUrlLoading && ( <div className="flex flex-col items-center text-red-600 dark:text-red-400 text-center"><AlertCircle className="w-8 h-8 mb-2" /><span>Error preparing brief:</span><span className="text-sm">{pdfUrlError}</span></div> )}
                        {!pdfUrlLoading && !pdfUrlError && pdfURL && (
                             <>
                                <FileText className="w-16 h-16 text-purple-500 dark:text-purple-400 mb-4" />
                                <button onClick={handleDownloadClick} disabled={!pdfURL} className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"> <Download className="w-5 h-5" /> <span>Download Daily Brief</span> </button>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Filename: crypto_brief.pdf</p>
                             </>
                         )}
                        {!pdfUrlLoading && !pdfUrlError && !pdfURL && ( <div className="flex flex-col items-center text-yellow-600 dark:text-yellow-400 text-center"><AlertCircle className="w-8 h-8 mb-2" /><span>Could not retrieve brief link.</span><span className="text-sm">Please try again later or contact support.</span></div> )}
                    </div>

                    {/* Pro/Enterprise News Sections - Tabbed Interface */}
                    {showProFeatures && (
                        <div className="w-full max-w-5xl mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">
                                Your Personalized News Feed
                            </h3>
                            {/* Tab Buttons Container */}
                            <div className="flex flex-wrap sm:flex-nowrap border-b border-gray-300 dark:border-gray-600 mb-0" role="tablist">
                                {/* Watchlist Tab */}
                                <button onClick={() => setActiveNewsTab('watchlist')} role="tab" aria-selected={activeNewsTab === 'watchlist'} aria-controls="news-content-panel" className={clsx( 'flex items-center justify-center sm:justify-start gap-2 px-3 py-3 sm:px-4 text-sm font-medium border-b-2 focus:outline-none transition-colors duration-150 flex-grow sm:flex-grow-0', activeNewsTab === 'watchlist' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500' )} >
                                    <ListChecks size={16} /> Watchlist
                                </button>
                                {/* Sector Tab */}
                                <button onClick={() => setActiveNewsTab('sector')} role="tab" aria-selected={activeNewsTab === 'sector'} aria-controls="news-content-panel" className={clsx( 'flex items-center justify-center sm:justify-start gap-2 px-3 py-3 sm:px-4 text-sm font-medium border-b-2 focus:outline-none transition-colors duration-150 flex-grow sm:flex-grow-0', activeNewsTab === 'sector' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500' )} >
                                    <Shapes size={16} /> Sector
                                </button>
                                {/* Narrative Tab */}
                                <button onClick={() => setActiveNewsTab('narrative')} role="tab" aria-selected={activeNewsTab === 'narrative'} aria-controls="news-content-panel" className={clsx( 'flex items-center justify-center sm:justify-start gap-2 px-3 py-3 sm:px-4 text-sm font-medium border-b-2 focus:outline-none transition-colors duration-150 flex-grow sm:flex-grow-0', activeNewsTab === 'narrative' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500' )} >
                                    <Milestone size={16} /> Narrative
                                </button>
                                {/* Trending Tab */}
                                <button onClick={() => setActiveNewsTab('trending')} role="tab" aria-selected={activeNewsTab === 'trending'} aria-controls="news-content-panel" className={clsx( 'flex items-center justify-center sm:justify-start gap-2 px-3 py-3 sm:px-4 text-sm font-medium border-b-2 focus:outline-none transition-colors duration-150 flex-grow sm:flex-grow-0', activeNewsTab === 'trending' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500' )} >
                                    <TrendingUp size={16} /> Trending
                                </button>
                                 {/* Request Tab Button */}
                                <button onClick={handleOpenRequestModal} title="Request Personalized Tab" className="flex items-center justify-center sm:justify-start gap-2 px-3 py-3 sm:px-4 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500 focus:outline-none transition-colors duration-150 ml-auto" >
                                    <PlusCircle size={16} />
                                    <span className="hidden md:inline">Request Tab</span>
                                </button>
                            </div>

                            {/* Content Area */}
                            <div id="news-content-panel" role="tabpanel" className="p-4 md:p-6 border border-t-0 border-gray-300 dark:border-gray-600 rounded-b-lg bg-white dark:bg-gray-800 min-h-[300px] max-h-[70vh] overflow-y-auto">
                                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                                    {renderNewsContent()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Display Preferences Section (Only for Basic users) */}
                    {!showProFeatures && (
                         <div className="text-left text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-700 pt-6 mt-8 w-full max-w-sm">
                            {initialPreferences ? (
                                <>
                                    <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Brief Based On (Edit Preferences):</h4>
                                    <p><strong>Sectors:</strong> {initialPreferences.selectedSectors.length > 0 ? initialPreferences.selectedSectors.join(', ') : <i className="text-gray-400 dark:text-gray-500">None selected</i>}</p>
                                    <p><strong>Narratives:</strong> {initialPreferences.selectedNarratives.length > 0 ? initialPreferences.selectedNarratives.join(', ') : <i className="text-gray-400 dark:text-gray-500">None selected</i>}</p>
                                    <p><strong>Watchlist:</strong> {initialPreferences.watchlistItems.length > 0 ? initialPreferences.watchlistItems.join(', ') : <i className="text-gray-400 dark:text-gray-500">None selected</i>}</p>
                                </>
                            ) : (
                                <p className="italic">Preferences not set yet. <button onClick={onEditPreferences} className="text-purple-600 dark:text-purple-400 hover:underline">Set them now?</button></p>
                            )}
                         </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={emailModalOpen} onClose={() => setEmailModalOpen(false)} title="Set Up Email Brief">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Your daily brief will be sent to your login email.</p>
                <input type="email" value={googleUser?.email ?? ''} readOnly className="w-full px-3 py-2 rounded border dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4 cursor-not-allowed" />
                <button onClick={() => setEmailModalOpen(false)} className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"> Close </button>
            </Modal>

            <Modal isOpen={telegramModalOpen} onClose={() => setTelegramModalOpen(false)} title="Set Up Telegram Brief">
                 <div className="space-y-5">
                    {/* Instruction Box */}
                    <div className="p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                            <strong>Important:</strong> To receive Telegram briefs, please first send any message (e.g., "Hi") to <strong className="font-mono">+917095417327</strong> on Telegram. This allows our bot to send messages back to you.
                        </p>
                    </div>
                    {/* Input Fields */}
                    <div>
                         <label htmlFor="telegramId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telegram User ID</label>
                         <input id="telegramId" type="text" value={telegramIdInput} onChange={(e) => setTelegramIdInput(e.target.value)} placeholder="Your Telegram User ID or @username" disabled={isSavingTelegram} className="w-full px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-600" />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Find your ID using bots like @userinfobot.</p>
                    </div>
                    <div>
                        <label htmlFor="teleUpdateRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"> Update Frequency: <span className="font-semibold text-purple-600 dark:text-purple-400">{teleRateInput} {teleRateInput === 1 ? 'hour' : 'hours'}</span> </label>
                        <input id="teleUpdateRate" type="range" min="1" max="24" step="1" value={teleRateInput} onChange={(e) => setTeleRateInput(parseInt(e.target.value, 10))} disabled={isSavingTelegram} className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-600 dark:accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1 px-1"> <span>1 hr</span> <span>12 hrs</span> <span>24 hrs</span> </div>
                    </div>
                    {/* Save Button with Delay Logic */}
                    <button
                        onClick={handleSaveTelegramDetails}
                        disabled={isSavingTelegram || !telegramSaveButtonEnabled}
                        className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                    >
                        {isSavingTelegram ? (
                            <> <LoaderIcon className="w-4 h-4 animate-spin" /> Saving... </>
                        ) : !telegramSaveButtonEnabled ? (
                            `Please wait... (${telegramCountdown}s)` // Show countdown
                        ) : (
                            'Save Telegram Settings'
                        )}
                    </button>
                    {/* Save Error Message */}
                    {telegramSaveError && ( <p className="text-sm text-red-600 dark:text-red-400 text-center mt-2">{telegramSaveError}</p> )}
                 </div>
            </Modal>

             <Modal isOpen={twitterModalOpen} onClose={() => setTwitterModalOpen(false)} title="Follow Our X Feed">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Stay updated by following our official X (Twitter) account.</p>
                 <a href="https://x.com/shresthasi58548" target="_blank" rel="noopener noreferrer" className="w-full block text-center px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-black rounded hover:opacity-90 transition-opacity font-semibold"> Follow on X </a>
            </Modal>

             {/* Request Personalized Tab Modal */}
             <Modal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                title="Request Personalized Tab"
                size="lg"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Suggest a new personalized tab you'd like to see on your dashboard.
                    </p>
                    <div>
                        <label htmlFor="requestTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tab Title
                        </label>
                        <input
                            id="requestTitle"
                            type="text"
                            value={requestTitle}
                            onChange={(e) => setRequestTitle(e.target.value)}
                            placeholder="e.g., DeFi Yield Opportunities"
                            disabled={isRequesting}
                            className="w-full px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-600"
                        />
                    </div>
                     <div>
                        <label htmlFor="requestContents" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tab Contents / Description
                        </label>
                         <textarea
                            id="requestContents"
                            rows={4}
                            value={requestContents}
                            onChange={(e) => setRequestContents(e.target.value)}
                            placeholder="Describe the data or insights you'd like this tab to show..."
                            disabled={isRequesting}
                            className="w-full px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-600 resize-y"
                        />
                    </div>

                    <button
                        onClick={handleRequestSubmit}
                        disabled={isRequesting || !requestTitle.trim() || !requestContents.trim()}
                        className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isRequesting ? (
                            <> <LoaderIcon className="w-4 h-4 animate-spin" /> Submitting Request... </>
                        ) : (
                            'Submit Request'
                        )}
                    </button>
                </div>
            </Modal>
        </div>
    );
};
