// src/components/Dashboard.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mail, Hand as BrandX, GitBranch as BrandTelegram, Settings, LogOut, User, ChevronDown, ArrowUpRight, X as CloseIcon, FilePdf } from 'lucide-react';
import { UserPreferences } from './OnboardingWizard';
import { GoogleUserProfile } from '../App';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import * as base64js from 'base64-js'; // Import base64-js

// --- PDF Viewer Configuration ---
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface FileInfo {
    id: number;
    path: string;
    fullUrl: string;
    summary: string;
    size: number;
}

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

    // PDF Viewer States
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [pdfLoading, setPdfLoading] = useState(true);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [pdfURL, setPdfURL] = useState<string | null>(null); // Changed to string | null


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
        const fetchPdfData = async () => {
            console.log("Dashboard.tsx: fetchPdfData called");  //Debug: function entry
            setPdfLoading(true);
            setPdfError(null);
            try {
                console.log("Dashboard.tsx: Fetching PDF data from /api/pdf-brief...");
                const response = await fetch('/api/pdf-brief'); // Call your Vercel function

                console.log("Dashboard.tsx: Response status from /api/pdf-brief:", response.status);

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Dashboard.tsx: Error from /api/pdf-brief:", errorData);
                    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
                }

                // Get the PDF data as an ArrayBuffer
                const pdfData = await response.arrayBuffer();
                console.log("Dashboard.tsx: PDF data received (ArrayBuffer)");


               // Convert ArrayBuffer to base64
                const uint8Array = new Uint8Array(pdfData);
                const base64String = base64js.fromByteArray(uint8Array);
                const base64Url = `data:application/pdf;base64,${base64String}`;

                console.log("Dashboard.tsx: PDF data converted to base64 URL:", base64Url.substring(0, 50) + "...");
                setPdfURL(base64Url);

            } catch (error: any) {
                console.error('Dashboard.tsx: Failed to fetch PDF data:', error);
                setPdfError(`Failed to fetch PDF data: ${error.message || 'Unknown error'}`);
            } finally {
                console.log("Dashboard.tsx: fetchPdfData completed (loading=false)");
                setPdfLoading(false);
            }
        };

        fetchPdfData();
    }, []);

    useEffect(() => {
        console.log("Dashboard.tsx: pdfURL state updated:", pdfURL?.substring(0, 50) + "...");  // Track pdfURL changes
    }, [pdfURL]);


    useEffect(() => {
        if (pdfError) {
            console.error("Dashboard.tsx: PDF Error state:", pdfError);
        }
    }, [pdfError]);

    // --- Handlers ---
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

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const onDocumentLoadError = (error: any) => {
        console.error("Error loading PDF:", error);
        setPdfError("Failed to load PDF from URL.  Ensure the URL is correct and the PDF is valid.");
        setPdfLoading(false);  // Ensure loading is stopped
    };

     const goToPrevPage = () => {
         if (pageNumber > 1) {
            setPageNumber(pageNumber - 1);
         }
     };

     const goToNextPage = () => {
         if (numPages && pageNumber < numPages) {
             setPageNumber(pageNumber + 1);
         }
     };

     const resetPDFState = useCallback(() => {
         setNumPages(null);
         setPageNumber(1);
         setPdfLoading(true);
         setPdfError(null);
     }, []);

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
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center shadow-lg">
                    <h2 className="text-2xl font-bold mb-4">Welcome back, {googleUser?.given_name ?? 'User'}!</h2>
                     <p className="text-gray-600 dark:text-gray-400 mb-6">
                         Here's your personalized crypto brief based on your preferences.
                     </p>

                     {/* PDF Viewer Section */}
                     <div className="border dark:border-gray-700 rounded-lg overflow-hidden shadow-md">
                         {pdfLoading && (
                             <div className="flex items-center justify-center h-64 text-gray-600 dark:text-gray-400">
                                 Loading PDF...
                             </div>
                         )}
                         {pdfError && (
                             <div className="flex items-center justify-center h-64 text-red-600 dark:text-red-400">
                                 {pdfError}
                             </div>
                         )}
                         {!pdfLoading && !pdfError && pdfURL && (
                             <>
                                 {console.log("Dashboard.tsx: Rendering PDF with pdfURL (base64):", pdfURL.substring(0, 50) + "...")}
                                 <Document
                                     file={pdfURL}
                                     onLoadSuccess={onDocumentLoadSuccess}
                                     onLoadError={onDocumentLoadError}
                                     loading={<div className="text-center">Fetching PDF...</div>}
                                     error={<div className="text-center text-red-500">Error loading PDF</div>}
                                 >
                                     <Page pageNumber={pageNumber} renderTextLayer={false} renderAnnotationLayer={false} width={700}/>
                                 </Document>
                                 <div className="flex justify-between items-center px-4 py-2 bg-gray-100 dark:bg-gray-700">
                                     <button
                                         onClick={goToPrevPage}
                                         disabled={pageNumber <= 1}
                                         className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                     >
                                         Previous
                                     </button>
                                     <span className="text-sm text-gray-600 dark:text-gray-400">
                                         Page {pageNumber} of {numPages}
                                     </span>
                                     <button
                                         onClick={goToNextPage}
                                         disabled={!numPages || pageNumber >= numPages}
                                         className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                     >
                                         Next
                                     </button>
                                 </div>
                             </>
                         )}
                     </div>

                     {/* Display Preferences from Prop */}
                     {initialPreferences ? (
                         <div className="text-left text-sm text-gray-600 dark:text-gray-400 border-t dark:border-gray-700 pt-4 mt-4">
                             <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Your Current Preferences:</h4>
                             <p><strong>Sectors:</strong> {initialPreferences.selectedSectors.length > 0 ? initialPreferences.selectedSectors.join(', ') : <i className="text-gray-400 dark:text-gray-500">None selected</i>}</p>
                             <p><strong>Narratives:</strong> {initialPreferences.selectedNarratives.length > 0 ? initialPreferences.selectedNarratives.join(', ') : <i className="text-gray-400 dark:text-gray-500">None selected</i>}</p>
                             <p><strong>Watchlist:</strong> {initialPreferences.watchlistItems.length > 0 ? initialPreferences.watchlistItems.join(', ') : <i className="text-gray-400 dark:text-gray-500">None selected</i>}</p>
                         </div>
                     ) : (
                         <div className="text-left text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-700 pt-4 mt-4">
                            <p>Loading preferences or none set...</p>
                         </div>
                     )}
                </div>
            </div>

            {/* --- Modals --- */}
            {/* Email Modal */}
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

            {/* Telegram Modal */}
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

             {/* X (Twitter) Modal */}
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
