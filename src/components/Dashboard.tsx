// src/components/Dashboard.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mail, Hand as BrandX, GitBranch as BrandTelegram, Settings, LogOut, User, ChevronDown, ArrowUpRight, X as CloseIcon, FilePdf, Download, Loader2 as LoaderIcon, AlertCircle } from 'lucide-react'; // Added Download, LoaderIcon, AlertCircle
import { UserPreferences } from './OnboardingWizard';
import { GoogleUserProfile } from '../App';
// Removed react-pdf imports

// Removed FileInfo interface if only used for PDF viewer

// --- Modal Component --- (Keep your existing Modal implementation)
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md relative">
                 <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Close modal"
                 >
                     <CloseIcon size={20} />
                 </button>
                <h3 className="text-lg font-semibold p-4 border-b dark:border-gray-700">{title}</h3>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
};

// --- Dashboard Props ---
interface DashboardProps {
    onEditPreferences: () => void;
    initialPreferences: UserPreferences | null;
    onLogout: () => void;
    googleUser: GoogleUserProfile | null;
    onNavigateToUpgrade: () => void;
}

// --- Dashboard Component ---
export const Dashboard: React.FC<DashboardProps> = ({
    onEditPreferences,
    initialPreferences,
    onLogout,
    googleUser,
    onNavigateToUpgrade,
}) => {
    // --- State ---
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [telegramModalOpen, setTelegramModalOpen] = useState(false);
    const [twitterModalOpen, setTwitterModalOpen] = useState(false);
    const [isAccountPopupOpen, setIsAccountPopupOpen] = useState(false);

    const [emailInput, setEmailInput] = useState('');
    const [telegramIdInput, setTelegramIdInput] = useState('');

    const accountPopupRef = useRef<HTMLDivElement>(null);

    // State for fetching the PDF URL
    const [pdfUrlLoading, setPdfUrlLoading] = useState(true); // Renamed for clarity
    const [pdfUrlError, setPdfUrlError] = useState<string | null>(null); // Renamed for clarity
    const [pdfURL, setPdfURL] = useState<string | null>(null); // Stores the fetched URL string


    // --- Effects ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (accountPopupRef.current && !accountPopupRef.current.contains(event.target as Node)) {
                setIsAccountPopupOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchPdfDownloadUrl = async () => {
            console.log("Dashboard.tsx: fetchPdfDownloadUrl called");
            setPdfUrlLoading(true);
            setPdfUrlError(null);
            setPdfURL(null); // Reset URL on new fetch
            try {
                console.log("Dashboard.tsx: Fetching PDF URL from /api/pdf-brief...");
                const response = await fetch('/api/pdf-brief');

                console.log("Dashboard.tsx: Response status from /api/pdf-brief:", response.status);

                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json(); // Try parsing error JSON
                    } catch (parseError) {
                         // If JSON parsing fails, use status text
                         errorData = { error: response.statusText || `HTTP error ${response.status}` };
                    }
                    console.error("Dashboard.tsx: Error from /api/pdf-brief:", errorData);
                    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();

                if (data && data.pdfUrl) {
                    console.log("Dashboard.tsx: PDF URL received:", data.pdfUrl);
                    setPdfURL(data.pdfUrl);
                } else {
                     console.warn("Dashboard.tsx: pdfUrl not found in API response");
                     throw new Error("PDF URL not found in the response from the server.");
                }

            } catch (error: any) {
                console.error('Dashboard.tsx: Failed to fetch PDF URL:', error);
                setPdfUrlError(`Failed to retrieve brief link: ${error.message || 'Unknown error'}`);
            } finally {
                console.log("Dashboard.tsx: fetchPdfDownloadUrl completed (loading=false)");
                setPdfUrlLoading(false);
            }
        };

        fetchPdfDownloadUrl();
    }, []);

    // --- Handlers ---
    const handleDownloadClick = () => {
        if (!pdfURL) {
            console.error("Download attempt failed: No PDF URL available.");
            // Optionally show an alert to the user
            // alert("Could not download the brief. Please try again later.");
            return;
        }

        console.log("Triggering download for:", pdfURL);
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = pdfURL;
        link.setAttribute('download', 'crypto_brief.pdf'); // Suggests a filename to the browser
        // Optional: For cross-origin downloads, you might need these, but test without first
        // link.setAttribute('target', '_blank');
        // link.setAttribute('rel', 'noopener noreferrer');

        // Append to the document, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    const handleUpgradeClick = () => {
        setIsAccountPopupOpen(false);
        onNavigateToUpgrade();
    };

    const handleLogoutClick = () => {
        setIsAccountPopupOpen(false);
        onLogout();
    };

    const handleSaveEmail = () => {
        console.log("Saving Email:", emailInput);
        setEmailModalOpen(false);
    }
    const handleSaveTelegramId = () => {
        console.log("Saving Telegram ID:", telegramIdInput);
        setTelegramModalOpen(false);
    }

    // --- Render ---
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 text-gray-900 dark:text-white">
            <div className="max-w-7xl mx-auto">
                {/* Header Row */}
                <div className="flex flex-wrap gap-4 mb-8 items-center justify-between">
                    {/* Left Buttons (Briefs) */}
                    <div className="flex flex-wrap gap-4">
                         <button
                             onClick={() => setEmailModalOpen(true)}
                             className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-700 dark:text-gray-300"
                         >
                             <Mail className="w-5 h-5" />
                             <span>Email Brief</span>
                         </button>
                         <button
                             onClick={() => setTelegramModalOpen(true)}
                             className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-700 dark:text-gray-300"
                         >
                             <BrandTelegram className="w-5 h-5" />
                             <span>Telegram Brief</span>
                         </button>
                         <button
                             onClick={() => setTwitterModalOpen(true)}
                             className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-700 dark:text-gray-300"
                         >
                             <BrandX className="w-5 h-5" />
                             <span>X Updates</span>
                         </button>
                    </div>

                    {/* Right Buttons (Settings, Account) */}
                    <div className="flex flex-wrap items-center gap-4">
                        <button
                            onClick={onEditPreferences}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                            title="Edit Preferences"
                        >
                            <Settings className="w-5 h-5" />
                            <span className="hidden sm:inline">Edit Preferences</span>
                        </button>

                        {/* Account Circle and Popup */}
                        <div className="relative" ref={accountPopupRef}>
                            <button
                                onClick={() => setIsAccountPopupOpen(!isAccountPopupOpen)}
                                className="flex items-center gap-2 rounded-full border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 p-0.5 transition-colors"
                                title="Account"
                            >
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center border border-gray-300 dark:border-gray-600">
                                    {googleUser?.picture ? (
                                        <img src={googleUser.picture} alt={googleUser.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                    )}
                                </div>
                                <span className="hidden sm:inline text-sm font-medium mr-1">{googleUser?.given_name ?? 'Account'}</span>
                                <ChevronDown size={16} className={`transition-transform duration-200 ${isAccountPopupOpen ? 'rotate-180' : ''} mr-1 hidden sm:inline text-gray-500 dark:text-gray-400`} />
                            </button>

                            {/* Account Popup */}
                            {isAccountPopupOpen && (
                                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border dark:border-gray-700 overflow-hidden">
                                    {/* User Info */}
                                    <div className="flex items-center gap-3 p-4 border-b dark:border-gray-700">
                                         <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 border border-gray-300 dark:border-gray-600">
                                             {googleUser?.picture ? (
                                                 <img src={googleUser.picture} alt={googleUser.name} className="w-full h-full object-cover" />
                                             ) : ( <User className="w-6 h-6 text-gray-500 dark:text-gray-400" /> )}
                                         </div>
                                         <div className="truncate">
                                            <p className="text-sm font-semibold truncate" title={googleUser?.name}>{googleUser?.name ?? 'User Name'}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={googleUser?.email}>{googleUser?.email ?? 'email@example.com'}</p>
                                         </div>
                                    </div>
                                    {/* Plan & Upgrade */}
                                    <div className="p-4 space-y-3">
                                        <div>
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Current Plan</span>
                                            <span className="text-sm font-semibold">Free</span>
                                        </div>
                                        <button
                                            onClick={handleUpgradeClick}
                                            className="w-full flex justify-between items-center text-left px-3 py-2 rounded-md bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                                        >
                                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Upgrade Plan</span>
                                            <ArrowUpRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                        </button>
                                    </div>
                                     {/* Logout */}
                                     <div className="border-t dark:border-gray-700 p-2">
                                         <button
                                             onClick={handleLogoutClick}
                                             className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                                             title="Logout"
                                         >
                                             <LogOut className="w-4 h-4" />
                                             <span>Logout</span>
                                         </button>
                                     </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dashboard Content */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center shadow-lg flex flex-col items-center">
                    <h2 className="text-2xl font-bold mb-4">Welcome back, {googleUser?.given_name ?? 'User'}!</h2>
                     <p className="text-gray-600 dark:text-gray-400 mb-8">
                         Your personalized crypto brief is ready for download.
                     </p>

                     {/* Download Section */}
                     <div className="w-full max-w-sm p-6 border dark:border-gray-700 rounded-lg shadow-md flex flex-col items-center space-y-4 bg-gray-50 dark:bg-gray-800">
                        {pdfUrlLoading && (
                             <div className="flex flex-col items-center text-gray-600 dark:text-gray-400">
                                 <LoaderIcon className="w-8 h-8 animate-spin mb-2 text-purple-500" />
                                 <span>Preparing your brief...</span>
                             </div>
                         )}
                         {pdfUrlError && !pdfUrlLoading && (
                             <div className="flex flex-col items-center text-red-600 dark:text-red-400 text-center">
                                 <AlertCircle className="w-8 h-8 mb-2" />
                                 <span>Error preparing brief:</span>
                                 <span className="text-sm">{pdfUrlError}</span>
                             </div>
                         )}
                         {!pdfUrlLoading && !pdfUrlError && pdfURL && (
                             <>
                                <FilePdf className="w-16 h-16 text-purple-500 dark:text-purple-400 mb-4" />
                                <button
                                    onClick={handleDownloadClick}
                                    disabled={!pdfURL} // Should always be enabled here, but good practice
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Download className="w-5 h-5" />
                                    <span>Download Your Brief</span>
                                </button>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Filename: crypto_brief.pdf</p>
                             </>
                         )}
                     </div>


                     {/* Display Preferences from Prop */}
                     {initialPreferences ? (
                         <div className="text-left text-sm text-gray-600 dark:text-gray-400 border-t dark:border-gray-700 pt-6 mt-8 w-full max-w-sm">
                             <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Brief Based On:</h4>
                             <p><strong>Sectors:</strong> {initialPreferences.selectedSectors.length > 0 ? initialPreferences.selectedSectors.join(', ') : <i className="text-gray-400 dark:text-gray-500">None selected</i>}</p>
                             <p><strong>Narratives:</strong> {initialPreferences.selectedNarratives.length > 0 ? initialPreferences.selectedNarratives.join(', ') : <i className="text-gray-400 dark:text-gray-500">None selected</i>}</p>
                             <p><strong>Watchlist:</strong> {initialPreferences.watchlistItems.length > 0 ? initialPreferences.watchlistItems.join(', ') : <i className="text-gray-400 dark:text-gray-500">None selected</i>}</p>
                         </div>
                     ) : (
                         <div className="text-left text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-700 pt-6 mt-8 w-full max-w-sm">
                            <p>Loading preferences...</p>
                         </div>
                     )}
                </div>
            </div>

            {/* --- Modals --- */}
             <Modal isOpen={emailModalOpen} onClose={() => setEmailModalOpen(false)} title="Set Up Email Brief">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Enter the email address for your daily brief. (Currently uses your login email)</p>
                <input
                    type="email"
                    value={googleUser?.email ?? emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="your.email@example.com"
                    readOnly={!!googleUser?.email}
                    className="w-full px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4 read-only:bg-gray-100 dark:read-only:bg-gray-600"
                />
                <button
                    onClick={handleSaveEmail}
                    disabled={!!googleUser?.email}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    Save Email
                 </button>
            </Modal>
            <Modal isOpen={telegramModalOpen} onClose={() => setTelegramModalOpen(false)} title="Set Up Telegram Brief">
                 <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Enter your Telegram User ID to receive briefs.</p>
                 <input
                    type="text"
                    value={telegramIdInput}
                    onChange={(e) => setTelegramIdInput(e.target.value)}
                    placeholder="Your Telegram User ID (e.g., 123456789)"
                    className="w-full px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
                 />
                 <button
                    onClick={handleSaveTelegramId}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                 >
                    Save Telegram ID
                 </button>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Note: You may need to start a chat with our bot first. <a href="#" className="text-blue-500 hover:underline">Find bot (link coming soon)</a></p>
             </Modal>
             <Modal isOpen={twitterModalOpen} onClose={() => setTwitterModalOpen(false)} title="Follow Our X Feed">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Stay updated with our latest insights by following our official X (Twitter) account for real-time news and analysis.</p>
                 <a
                    href="https://x.com/shresthasi58548"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full block text-center px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-black rounded hover:opacity-90 transition-opacity font-semibold"
                 >
                    Follow on X
                 </a>
            </Modal>
        </div>
    );
};
