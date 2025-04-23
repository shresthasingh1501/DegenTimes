// ================================================
// FILE: src/App.tsx
// ================================================
import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { Moon, Sun, X as CloseIcon, CheckCircle, AlertCircle, PartyPopper, Clock, Award } from 'lucide-react'; // Added new icons
import { useAuthStore } from './store/auth';
import { OnboardingWizard } from './components/OnboardingWizard';
import { Dashboard } from './components/Dashboard';
import { Background3D } from './components/Background3D';
import { UpgradePage } from './components/UpgradePage';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import axios from 'axios';
import clsx from 'clsx';
import { supabase, SupabaseUserData, UserPreferences } from './supabaseClient';

export interface GoogleUserProfile {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    locale: string;
}

type CurrentPage = 'landing' | 'onboarding' | 'dashboard' | 'upgrade' | 'loading' | 'error';
type NotificationType = 'success' | 'error' | 'info';

const Background = React.memo(() => (
    <Suspense fallback={<div className="fixed inset-0 bg-gradient-to-br from-gray-700 to-gray-900 -z-20"></div>}>
        <Background3D />
    </Suspense>
));
Background.displayName = 'MemoizedBackground';

const VALID_REDEEM_CODE = "BOUNTY";

// Notification Component (Top Banner)
interface AppNotificationProps {
    message: string;
    type: NotificationType;
    onClose: () => void;
}
const AppNotification: React.FC<AppNotificationProps> = ({ message, type, onClose }) => {
    const baseClasses = "fixed top-5 left-1/2 transform -translate-x-1/2 z-[70] px-4 py-3 rounded-md shadow-lg flex items-center gap-3 border";
    const typeClasses = {
        success: "bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-600 text-green-700 dark:text-green-200",
        error: "bg-red-100 dark:bg-red-900 border-red-400 dark:border-red-600 text-red-700 dark:text-red-200",
        info: "bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-200",
    };
    const iconClasses = {
         success: "text-green-600 dark:text-green-400",
         error: "text-red-600 dark:text-red-400",
         info: "text-blue-600 dark:text-blue-400",
    };
    const IconComponent = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : AlertCircle;
    return (
        <div className={clsx(baseClasses, typeClasses[type])} role="alert">
            <IconComponent className={`w-5 h-5 ${iconClasses[type]}`} />
            <span className="block sm:inline">{message}</span>
            <button onClick={onClose} className={`absolute top-1 right-1 ${iconClasses[type]} hover:opacity-75`} aria-label="Close notification">
                <CloseIcon size={16} />
            </button>
        </div>
    );
};

// <<< NEW: Upgrade Success Modal Component >>>
interface UpgradeSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
}
const UpgradeSuccessModal: React.FC<UpgradeSuccessModalProps> = ({ isOpen, onClose }) => {
    const [canClose, setCanClose] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isOpen) {
            setCanClose(false); // Disable closing initially
            setCountdown(5); // Reset countdown

            // Timer to enable closing after 5 seconds
            timerRef.current = setTimeout(() => {
                setCanClose(true);
                if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current); // Stop countdown interval
                }
                setCountdown(0); // Ensure countdown shows 0
            }, 5000);

            // Interval to update countdown display
            countdownIntervalRef.current = setInterval(() => {
                setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);

        } else {
            // Cleanup if modal closes or component unmounts
            if (timerRef.current) clearTimeout(timerRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        }

        // Cleanup function
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, [isOpen]); // Re-run effect when isOpen changes

    const handleCloseAttempt = () => {
        if (canClose) {
            onClose();
        }
        // If !canClose, do nothing
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl shadow-2xl w-full max-w-md relative text-white overflow-hidden">
                {/* Background Sparkles (Optional Enhancement) */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '15px 15px' }}></div>

                <div className="p-8 text-center relative z-10">
                    <PartyPopper size={60} className="mx-auto mb-5 text-yellow-300" />
                    <h2 className="text-3xl font-bold mb-3">Congratulations!</h2>
                    <p className="text-xl mb-6 flex items-center justify-center gap-2">
                        <Award size={20} /> You now have <span className="font-semibold">Pro Access!</span>
                    </p>

                    <div className="bg-white/10 dark:bg-black/20 p-4 rounded-lg mb-6 text-sm flex items-start gap-3 text-left">
                        <Clock size={30} className="text-blue-300 flex-shrink-0 mt-1" />
                        <div>
                            <p className="font-semibold mb-1">What happens next?</p>
                            <p>Your first personalized news brief based on your preferences is being generated.</p>
                            <p className="mt-1">This usually takes <span className="font-semibold">15-20 minutes</span>. Please check back on your dashboard soon!</p>
                        </div>
                    </div>

                    <button
                        onClick={handleCloseAttempt}
                        disabled={!canClose}
                        className={clsx(
                            "w-full px-6 py-3 rounded-lg font-semibold transition-all duration-300",
                            canClose
                                ? "bg-white text-purple-700 hover:bg-gray-100"
                                : "bg-white/40 text-white/70 cursor-not-allowed"
                        )}
                        aria-label={canClose ? "Close" : `Close (available in ${countdown}s)`}
                    >
                        {canClose ? "Got it!" : `Please wait (${countdown}s)`}
                    </button>
                </div>
            </div>
        </div>
    );
};
// <<< END: Upgrade Success Modal Component >>>


function App() {
    const [isDark, setIsDark] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) return savedTheme === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    const { isAuthenticated, setIsAuthenticated } = useAuthStore();
    const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
    const [googleUser, setGoogleUser] = useState<GoogleUserProfile | null>(null);
    const [currentPage, setCurrentPage] = useState<CurrentPage>('landing');
    const [loadingMessage, setLoadingMessage] = useState('Loading...');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [telegramId, setTelegramId] = useState<string | null>(null);
    const [teleUpdateRate, setTeleUpdateRate] = useState<number | null>(null);
    const [isProUser, setIsProUser] = useState<boolean>(false);
    const [isEnterpriseUser, setIsEnterpriseUser] = useState<boolean>(false);
    const [watchlistNews, setWatchlistNews] = useState<string | null>(null);
    const [sectorNews, setSectorNews] = useState<string | null>(null);
    const [narrativeNews, setNarrativeNews] = useState<string | null>(null);
    const [preferenceUpdateTimestamp, setPreferenceUpdateTimestamp] = useState<string | null>(null);
    const [appNotification, setAppNotification] = useState<{ message: string; type: NotificationType } | null>(null);
    const appNotificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const prevIsProUserRef = useRef<boolean>(isProUser);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false); // <<< ADDED STATE for new modal

    const showAppNotification = useCallback((message: string, type: NotificationType = 'info', duration: number = 3000) => {
        if (appNotificationTimeoutRef.current) {
            clearTimeout(appNotificationTimeoutRef.current);
        }
        setAppNotification({ message, type });
        appNotificationTimeoutRef.current = setTimeout(() => {
            setAppNotification(null);
            appNotificationTimeoutRef.current = null;
        }, duration);
    }, []);

    const fetchUserData = useCallback(async (email: string): Promise<Partial<SupabaseUserData> | null> => {
        console.log(`Fetching user data for ${email}...`);
        try {
            const { data, error, status } = await supabase
                .from('user_preferences')
                .select('preferences, telegramid, tele_update_rate, ispro, isenterprise, watchlist, sector, narrative, preference_update')
                .eq('user_email', email)
                .single();

            if (error && status !== 406) {
                console.error('Supabase fetch user data error:', error);
                throw new Error(`Supabase fetch error: ${error.message}`);
            }

            if (data) {
                console.log("User data found:", data);
                let validPreferences: UserPreferences | null = null;
                if (data.preferences && typeof data.preferences === 'object' && Object.keys(data.preferences).length > 0) {
                    validPreferences = data.preferences as UserPreferences;
                } else if (data.preferences) {
                     console.log("Fetched preferences are empty or invalid:", data.preferences);
                }
                return {
                    preferences: validPreferences,
                    telegramid: data.telegramid ?? null,
                    tele_update_rate: data.tele_update_rate ?? null,
                    ispro: data.ispro ?? false,
                    isenterprise: data.isenterprise ?? false,
                    watchlist: data.watchlist ?? null,
                    sector: data.sector ?? null,
                    narrative: data.narrative ?? null,
                    preference_update: data.preference_update ?? null,
                };
            } else {
                console.log("No user data found for user.");
                return null;
            }
        } catch (error) {
             console.error("Caught error in fetchUserData:", error);
             throw error;
        }
    }, [supabase]);

    const savePreferences = useCallback(async (email: string, preferences: UserPreferences): Promise<void> => {
        console.log(`Saving preferences for ${email}...`, preferences);
        try {
             const { error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_email: email,
                    preferences: preferences,
                    preference_update: new Date().toISOString()
                }, { onConflict: 'user_email' });

             if (error) {
                 console.error('Supabase save preferences error:', error);
                 throw new Error(`Supabase save error: ${error.message}`);
             }
             console.log("Preferences saved successfully.");
             setPreferenceUpdateTimestamp(new Date().toISOString());
         } catch (error) {
             console.error("Caught error in savePreferences:", error);
             throw error;
         }
    }, [supabase]);

    const saveTelegramDetails = useCallback(async (email: string, newTelegramId: string | null, newRate: number | null): Promise<void> => {
        console.log(`Saving Telegram details for ${email}...`, { telegramId: newTelegramId, rate: newRate });
        if (!email) {
            console.error("User email is missing in saveTelegramDetails!");
            throw new Error("User email is missing, cannot save Telegram details.");
        }
        try {
            const updateData: Partial<Pick<SupabaseUserData, 'telegramid' | 'tele_update_rate'>> = {};
             if (newTelegramId !== undefined) updateData.telegramid = newTelegramId || null;
             if (newRate !== undefined && newRate !== null) updateData.tele_update_rate = newRate;
             else if (newRate === null) updateData.tele_update_rate = null;

            console.log('Attempting Supabase update with:');
            console.log('Email:', email);
            console.log('Update Data:', updateData);

            if (Object.keys(updateData).length === 0) {
                console.warn("No data to update for Telegram details.");
                showAppNotification("No changes detected in Telegram settings.", 'info');
                return;
            }

            const { data, error } = await supabase
                .from('user_preferences')
                .update(updateData)
                .eq('user_email', email)
                .select();

            console.log('Supabase update response:', { data, error });

            if (error) {
                console.error('Supabase save Telegram details error:', error);
                throw new Error(`Supabase save error: ${error.message}`);
            }

            if (data && data.length > 0) {
                 console.log("Telegram details saved successfully in Supabase for:", data[0].user_email);
                 setTelegramId(newTelegramId ?? null);
                 setTeleUpdateRate(newRate ?? null);
                 showAppNotification("Telegram settings updated successfully!", 'success');
            } else {
                 console.warn("Supabase update ran without error, but no rows were updated. Was the email correct?");
                 showAppNotification("Could not find user record to update Telegram settings. Please ensure your account exists.", 'error');
            }

        } catch (error) {
            console.error("Caught error in saveTelegramDetails:", error);
            showAppNotification(`Failed to save Telegram settings: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            throw error;
        }
    }, [showAppNotification, supabase]);

    const deletePreferences = useCallback(async (email: string): Promise<void> => {
        console.log(`Resetting preferences field for ${email}...`);
        try {
            const { error } = await supabase
                .from('user_preferences')
                .update({
                    preferences: {},
                    preference_update: new Date().toISOString()
                })
                .eq('user_email', email);

            if (error) throw new Error(`Supabase reset error: ${error.message}`);
            console.log("Preferences field reset successfully.");
            setPreferenceUpdateTimestamp(new Date().toISOString());
        } catch (error) {
            console.error("Caught error in deletePreferences:", error);
            throw error;
        }
    }, [supabase]);

    // <<< MODIFIED redeemProCode to use the new modal >>>
    const redeemProCode = useCallback(async (email: string, enteredCode: string): Promise<void> => {
        console.log(`Attempting to redeem code "${enteredCode}" for ${email}`);
        if (enteredCode !== VALID_REDEEM_CODE) throw new Error("Invalid code entered.");
        console.log("Valid code entered, updating user to Pro...");
        try {
            const { error } = await supabase
                .from('user_preferences')
                .update({ ispro: true })
                .eq('user_email', email);
            if (error) throw new Error(`Failed to update account: ${error.message}`);

            setIsProUser(true); // Update local state
            console.log("User successfully updated to Pro.");

            // --- Show the new upgrade success modal ---
            setIsUpgradeModalOpen(true);
            // --- Don't show the top banner for this specific event ---
            // showAppNotification("Code redeemed successfully! You now have Pro access.", 'success', 5000);

        } catch (error) {
            console.error("Caught error in redeemProCode:", error);
            // Re-throw so UpgradePage can handle showing the error *within its own modal*
            throw error;
        }
    }, [supabase]); // Removed showAppNotification dependency, added setIsUpgradeModalOpen

    useEffect(() => {
        console.log("App mounted/page changed. Current state:", currentPage);
    }, [currentPage]);

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    useEffect(() => {
        return () => { if (appNotificationTimeoutRef.current) clearTimeout(appNotificationTimeoutRef.current); };
    }, []);

    // Effect to show *TOP BANNER* notification if user *logs in* and is Pro, but news is empty
    // This is DIFFERENT from the upgrade modal which shows immediately on redemption.
    useEffect(() => {
        const wasPro = prevIsProUserRef.current;
        if (isProUser && !wasPro) { // Just became Pro (could be via login if DB updated elsewhere)
            // Only show the *banner* if the upgrade modal isn't already showing
            // And only if personalized news data is currently empty
            if (!isUpgradeModalOpen && !watchlistNews && !sectorNews && !narrativeNews) {
                 showAppNotification(
                     "Welcome to Pro! Your personalized news feed will be generated soon (usually within 15-20 minutes).",
                     'info',
                     7000
                 );
            }
        }
        // Update the ref for the next render
        prevIsProUserRef.current = isProUser;
    }, [isProUser, watchlistNews, sectorNews, narrativeNews, showAppNotification, isUpgradeModalOpen]); // Added isUpgradeModalOpen dependency


    const handleLogout = useCallback(() => {
        googleLogout();
        setIsAuthenticated(false);
        setUserPreferences(null);
        setGoogleUser(null);
        setTelegramId(null);
        setTeleUpdateRate(null);
        setIsProUser(false);
        setIsEnterpriseUser(false);
        setWatchlistNews(null);
        setSectorNews(null);
        setNarrativeNews(null);
        setPreferenceUpdateTimestamp(null);
        setCurrentPage('landing');
        setErrorMessage(null);
        setAppNotification(null);
        if (appNotificationTimeoutRef.current) clearTimeout(appNotificationTimeoutRef.current);
        setIsUpgradeModalOpen(false); // Ensure modal is closed on logout
        console.log("User logged out");
    }, [setIsAuthenticated]);


    const handleGoogleLoginSuccess = useCallback(async (tokenResponse: any) => {
        console.log("Google Login Success:", tokenResponse);
        setCurrentPage('loading');
        setLoadingMessage('Authenticating & fetching profile...');
        try {
            const userInfoResponse = await axios.get<GoogleUserProfile>(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
            );
            const user = userInfoResponse.data;
            console.log("User Info:", user);

             if (!user || !user.email) throw new Error("Invalid user information received from Google.");

            setGoogleUser(user);
            setIsAuthenticated(true);

            setLoadingMessage('Checking preferences & settings...');
            const userData = await fetchUserData(user.email);

            // Update the ref *before* setting new state to track if they *just* became Pro
            prevIsProUserRef.current = userData?.ispro ?? false;

            setUserPreferences(userData?.preferences ?? null);
            setTelegramId(userData?.telegramid ?? null);
            setTeleUpdateRate(userData?.tele_update_rate ?? null);
            setIsProUser(userData?.ispro ?? false);
            setIsEnterpriseUser(userData?.isenterprise ?? false);
            setWatchlistNews(userData?.watchlist ?? null);
            setSectorNews(userData?.sector ?? null);
            setNarrativeNews(userData?.narrative ?? null);
            setPreferenceUpdateTimestamp(userData?.preference_update ?? null);

            if (userData?.preferences) {
                setCurrentPage('dashboard');
            } else {
                 if (!userData) {
                     console.log("No user record found, creating one before onboarding...");
                     await supabase.from('user_preferences').upsert({
                         user_email: user.email,
                         preferences: {},
                         ispro: false,
                         isenterprise: false,
                         preference_update: null,
                        }, { onConflict: 'user_email' });
                 }
                setCurrentPage('onboarding');
            }

        } catch (error: any) {
            console.error("Error during login/data check:", error);
            setErrorMessage(`Login failed: ${error.message || 'Unknown error'}. Please try again.`);
            setCurrentPage('error');
            handleLogout(); // Use handleLogout for cleanup
        }
    }, [fetchUserData, setIsAuthenticated, handleLogout, supabase]);

    const handleGoogleLoginError = useCallback((error: any) => {
        console.error("Google Login Failed:", error);
        let message = "Google login failed. Please try again.";
        if (error?.type === 'popup_closed') {
            message = "Login cancelled. Please try again if you wish to continue.";
            setCurrentPage('landing');
        } else setCurrentPage('error');
        setErrorMessage(message);
    }, []);

    const login = useGoogleLogin({
        onSuccess: handleGoogleLoginSuccess,
        onError: handleGoogleLoginError,
    });

    const handleOnboardingComplete = useCallback(async (preferences: UserPreferences) => {
        if (!googleUser?.email) {
             setErrorMessage("An error occurred saving your preferences (missing user info). Please try logging out and in again.");
             setCurrentPage('error');
             return;
         }

        const wasAlreadySetup = !!userPreferences;
        setCurrentPage('loading');
        setLoadingMessage('Saving your preferences...');
        try {
            await savePreferences(googleUser.email, preferences);
            setUserPreferences(preferences);
            setCurrentPage('dashboard');

            // Use setTimeout to ensure state update completes before showing notification
            setTimeout(() => {
                 if (isProUser || isEnterpriseUser) {
                     // Use top banner here, as the big modal is only for initial upgrade redemption
                     if (wasAlreadySetup) {
                          showAppNotification(
                              "Preferences updated! Your personalized brief will update within a few hours. Upgrade to Enterprise for instant changes.",
                              'info', 7000
                          );
                     } else {
                          // This case might be redundant if the useEffect handles the "Welcome to Pro" banner
                          // But let's keep a success message for saving prefs
                          showAppNotification(
                              "Preferences saved! Your first personalized brief will be ready in 15-20 minutes.",
                              'success', 5000
                          );
                     }
                 } else {
                     showAppNotification("Preferences saved successfully!", 'success');
                 }
            }, 100);

        } catch (error: any) {
            console.error("Error saving preferences during onboarding:", error);
            setErrorMessage(`Failed to save preferences: ${error.message || 'Please try again.'}`);
            setCurrentPage('error');
            showAppNotification(`Failed to save preferences: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [googleUser, savePreferences, showAppNotification, isProUser, isEnterpriseUser, userPreferences]);

    const handleResetPreferencesRequest = useCallback(async () => {
        if (!googleUser?.email) {
             setErrorMessage("An error occurred resetting preferences (missing user info). Please try logging out and in again.");
             setCurrentPage('error');
            return;
        }
        setCurrentPage('loading');
        setLoadingMessage('Resetting preferences...');
        try {
            await deletePreferences(googleUser.email);
            setUserPreferences(null);
            setCurrentPage('onboarding');
            // Use top banner for reset confirmation
            if (isProUser || isEnterpriseUser) {
                showAppNotification(
                    "Preferences reset! Your personalized brief will update within a few hours. Upgrade to Enterprise for instant changes.",
                    'info', 7000
                );
            } else {
                 showAppNotification("Preferences reset. Please set your new preferences.", 'info');
            }
        } catch (error: any) {
             console.error("Error resetting preferences:", error);
             setErrorMessage(`Failed to reset preferences: ${error.message || 'Please try again.'}`);
             setCurrentPage('error');
             showAppNotification(`Failed to reset preferences: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [googleUser, deletePreferences, showAppNotification, isProUser, isEnterpriseUser]);

    const showUpgradePage = useCallback(() => setCurrentPage('upgrade'), []);
    const showDashboard = useCallback(() => {
         if (isAuthenticated) setCurrentPage('dashboard');
         else handleLogout();
    }, [isAuthenticated, handleLogout]);
    const tryAgain = useCallback(() => { setErrorMessage(null); setCurrentPage('landing'); }, []);

    const renderCurrentPage = () => {
        switch (currentPage) {
            case 'loading':
                return <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900"><p className="text-xl text-gray-700 dark:text-gray-300 animate-pulse">{loadingMessage}</p></div>;
            case 'error':
                 return <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 dark:bg-gray-900 p-6 text-center"><h2 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-4">Oops! Something went wrong.</h2><p className="text-red-600 dark:text-red-300 mb-6 max-w-md">{errorMessage || 'An unexpected error occurred.'}</p><button onClick={tryAgain} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"> Return to Login </button></div>;
            case 'onboarding':
                if (!isAuthenticated || !googleUser) { handleLogout(); return null; }
                const isSavingPrefs = currentPage === 'loading' && loadingMessage.includes('Saving');
                return <OnboardingWizard onComplete={handleOnboardingComplete} isSaving={isSavingPrefs} />;
            case 'dashboard':
                 if (!isAuthenticated || !googleUser) { handleLogout(); return null; }
                 return (
                     <>
                         <Background />
                         <Dashboard
                             onEditPreferences={handleResetPreferencesRequest}
                             initialPreferences={userPreferences}
                             onLogout={handleLogout}
                             googleUser={googleUser}
                             onNavigateToUpgrade={showUpgradePage}
                             telegramId={telegramId}
                             teleUpdateRate={teleUpdateRate}
                             onSaveTelegramDetails={saveTelegramDetails}
                             isPro={isProUser}
                             isEnterprise={isEnterpriseUser}
                             watchlistNews={watchlistNews}
                             sectorNews={sectorNews}
                             narrativeNews={narrativeNews}
                             preferenceUpdateTimestamp={preferenceUpdateTimestamp}
                             showAppNotification={showAppNotification} // Pass down the banner notification function
                         />
                     </>
                 );
             case 'upgrade':
                 if (!isAuthenticated || !googleUser) { handleLogout(); return null; }
                 return <UpgradePage
                            onGoBack={showDashboard}
                            userEmail={googleUser.email}
                            onRedeemCode={redeemProCode} // Passes function that now triggers the big modal
                            showAppNotification={showAppNotification} // Still pass banner for potential other messages in UpgradePage
                        />;
            case 'landing':
            default:
                 if (errorMessage) setErrorMessage(null);
                 return (
                     <>
                         <Background />
                         <div className="relative min-h-screen bg-transparent text-gray-900 dark:text-white">
                             <header className="container mx-auto px-4 py-6 relative z-10">
                                 <div className="flex justify-between items-center"> <h1 className="font-chomsky text-4xl">Degen Times</h1> <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10" title="Toggle Theme"> {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />} </button> </div>
                             </header>
                             <main className="container mx-auto px-4 py-16 md:py-24 relative z-10">
                                 <div className="max-w-4xl mx-auto text-center backdrop-blur-lg bg-white/30 dark:bg-gray-900/40 p-8 rounded-2xl shadow-xl">
                                     <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight"> Stop Drowning in Crypto Noise. <span className="block bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent"> Get Your Personalized Signal Brief. </span> </h2>
                                     <p className="text-xl md:text-2xl mb-12 text-gray-800 dark:text-gray-200"> We filter data from 100s of sources – news, X (Twitter), Telegram, on-chain activity, smart wallets – delivering only what matters to you, every day. </p>
                                     <button onClick={() => login()} disabled={currentPage === 'loading'} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-300 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 text-gray-800 dark:text-white px-8 py-4 rounded-lg text-lg font-semibold flex items-center gap-3 mx-auto shadow-md hover:shadow-lg transition-shadow disabled:opacity-60 disabled:cursor-not-allowed" > <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" /> {currentPage === 'loading' ? 'Connecting...' : 'Continue with Google'} </button>
                                 </div>
                                 <div className="grid md:grid-cols-3 gap-8 mt-24">
                                      {[ { title: 'Personalized', description: 'Tailored insights based on your interests, portfolio, and trading style.' }, { title: 'Comprehensive', description: 'Data from hundreds of sources, filtered and analyzed for relevance.' }, { title: 'Data-Driven', description: 'On-chain analytics, market sentiment, and smart money movements.' } ].map((feature, index) => ( <div key={index} className="backdrop-blur-lg bg-white/30 dark:bg-gray-900/40 p-6 rounded-lg border border-white/20 shadow-lg"> <h3 className="text-xl font-semibold mb-3">{feature.title}</h3> <p className="text-gray-800 dark:text-gray-200">{feature.description}</p> </div> ))}
                                  </div>
                             </main>
                         </div>
                     </>
                 );
        }
    };

    return (
        <>
             {/* Top Banner Notifications */}
             {appNotification && (
                 <AppNotification
                     message={appNotification.message}
                     type={appNotification.type}
                     onClose={() => setAppNotification(null)}
                 />
             )}
             {/* <<< Render the new Upgrade Success Modal >>> */}
             <UpgradeSuccessModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
            />
             {/* Render the current page content */}
            {renderCurrentPage()}
        </>
    );
}

export default App;
