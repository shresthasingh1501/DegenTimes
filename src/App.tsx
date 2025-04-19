import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAuthStore } from './store/auth';
import { OnboardingWizard } from './components/OnboardingWizard';
import { Dashboard } from './components/Dashboard';
import { Background3D } from './components/Background3D';
import { UpgradePage } from './components/UpgradePage';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import axios from 'axios';
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

const Background = React.memo(() => (
    <Suspense fallback={<div className="fixed inset-0 bg-gradient-to-br from-gray-700 to-gray-900 -z-20"></div>}>
        <Background3D />
    </Suspense>
));
Background.displayName = 'MemoizedBackground';

const VALID_REDEEM_CODE = "BOUNTY";

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


    const fetchUserData = useCallback(async (email: string): Promise<Partial<SupabaseUserData> | null> => {
        console.log(`Fetching user data for ${email}...`);
        try {
            const { data, error, status } = await supabase
                .from('user_preferences')
                .select('preferences, telegramid, tele_update_rate, ispro, isenterprise, watchlist, sector, narrative')
                .eq('user_email', email)
                .single();

            if (error && status !== 406) {
                console.error('Supabase fetch user data error:', error);
                throw new Error(`Supabase fetch error: ${error.message}`);
            }

            if (data) {
                console.log("User data found:", data);
                let validPreferences: UserPreferences | null = null;
                // Check if preferences is not null and is an object with keys (not just {})
                if (data.preferences && typeof data.preferences === 'object' && Object.keys(data.preferences).length > 0) {
                    validPreferences = data.preferences as UserPreferences;
                } else if (data.preferences) {
                     // It exists but might be an empty object '{}' which we treat as null/unset for UI logic
                     console.log("Fetched preferences are empty or invalid:", data.preferences);
                }
                return {
                    preferences: validPreferences, // Return null if empty or invalid
                    telegramid: data.telegramid ?? null,
                    tele_update_rate: data.tele_update_rate ?? null,
                    ispro: data.ispro ?? false,
                    isenterprise: data.isenterprise ?? false,
                    watchlist: data.watchlist ?? null,
                    sector: data.sector ?? null,
                    narrative: data.narrative ?? null,
                };
            } else {
                console.log("No user data found for user.");
                return null;
            }
        } catch (error) {
             console.error("Caught error in fetchUserData:", error);
             throw error;
        }
    }, []);

    const savePreferences = useCallback(async (email: string, preferences: UserPreferences): Promise<void> => {
        console.log(`Saving preferences for ${email}...`, preferences);
        try {
             const { error } = await supabase
                .from('user_preferences')
                .upsert({ user_email: email, preferences: preferences }, { onConflict: 'user_email' });

             if (error) {
                 console.error('Supabase save preferences error:', error);
                 throw new Error(`Supabase save error: ${error.message}`);
             }
             console.log("Preferences saved successfully.");
         } catch (error) {
             console.error("Caught error in savePreferences:", error);
             throw error;
         }
    }, []);

    const saveTelegramDetails = useCallback(async (email: string, newTelegramId: string | null, newRate: number | null): Promise<void> => {
        console.log(`Saving Telegram details for ${email}...`, { telegramId: newTelegramId, rate: newRate });
        if (!email) {
            throw new Error("User email is missing, cannot save Telegram details.");
        }
        try {
            const updateData: Partial<Pick<SupabaseUserData, 'telegramid' | 'tele_update_rate'>> = {};
             if (newTelegramId !== undefined) {
                 updateData.telegramid = newTelegramId;
             }
             if (newRate !== undefined && newRate !== null) {
                 updateData.tele_update_rate = newRate;
             } else if (newRate === null) {
                 updateData.tele_update_rate = null;
             }

            const { error } = await supabase
                .from('user_preferences')
                .update(updateData)
                .eq('user_email', email);

            if (error) {
                console.error('Supabase save Telegram details error:', error);
                throw new Error(`Supabase save error: ${error.message}`);
            }

            setTelegramId(newTelegramId ?? null);
            setTeleUpdateRate(newRate ?? null);

            console.log("Telegram details saved successfully.");
        } catch (error) {
            console.error("Caught error in saveTelegramDetails:", error);
            throw error;
        }
    }, []);

    // --- UPDATED deletePreferences function ---
    const deletePreferences = useCallback(async (email: string): Promise<void> => {
        // Instead of setting to NULL, set to an empty JSON object '{}'
        // This satisfies NOT NULL constraints while representing an empty/reset state.
        console.log(`Resetting preferences field for ${email}...`);
        try {
            const { error } = await supabase
                .from('user_preferences')
                .update({ preferences: {} }) // Set preferences to empty object
                .eq('user_email', email);

            if (error) {
                console.error('Supabase reset preferences error:', error);
                // Provide more context if possible from the error object
                throw new Error(`Supabase reset error: ${error.message}`);
            }
            console.log("Preferences field reset successfully.");
        } catch (error) {
            console.error("Caught error in deletePreferences:", error);
            throw error; // Re-throw to be handled by the caller
        }
    }, []);
    // --- END UPDATED deletePreferences function ---


    const redeemProCode = useCallback(async (email: string, enteredCode: string): Promise<void> => {
        console.log(`Attempting to redeem code "${enteredCode}" for ${email}`);
        if (enteredCode !== VALID_REDEEM_CODE) {
            console.log("Invalid code entered.");
            throw new Error("Invalid code entered.");
        }

        console.log("Valid code entered, updating user to Pro...");
        try {
            const { error } = await supabase
                .from('user_preferences')
                .update({ ispro: true })
                .eq('user_email', email);

            if (error) {
                console.error('Supabase update error during redeem:', error);
                throw new Error(`Failed to update account: ${error.message}`);
            }

            setIsProUser(true);
            console.log("User successfully updated to Pro.");

        } catch (error) {
            console.error("Caught error in redeemProCode:", error);
            throw error;
        }
    }, []);

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
        setCurrentPage('landing');
        setErrorMessage(null);
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

             if (!user || !user.email) {
                throw new Error("Invalid user information received from Google.");
            }

            setGoogleUser(user);
            setIsAuthenticated(true);

            setLoadingMessage('Checking preferences & settings...');
            const userData = await fetchUserData(user.email);

            setUserPreferences(userData?.preferences ?? null);
            setTelegramId(userData?.telegramid ?? null);
            setTeleUpdateRate(userData?.tele_update_rate ?? null);
            setIsProUser(userData?.ispro ?? false);
            setIsEnterpriseUser(userData?.isenterprise ?? false);
            setWatchlistNews(userData?.watchlist ?? null);
            setSectorNews(userData?.sector ?? null);
            setNarrativeNews(userData?.narrative ?? null);


            if (userData?.preferences) { // Navigate to dashboard if preferences are not null/empty
                setCurrentPage('dashboard');
            } else {
                 // If user data doesn't exist at all, create the row first
                 if (!userData) {
                     console.log("No user record found, creating one before onboarding...");
                     await supabase.from('user_preferences').upsert({
                         user_email: user.email,
                         preferences: {}, // Ensure preferences starts as {} to satisfy NOT NULL
                         ispro: false,
                         isenterprise: false
                        });
                 }
                setCurrentPage('onboarding'); // Go to onboarding if no valid prefs found
            }

        } catch (error: any) {
            console.error("Error during login/data check:", error);
            setErrorMessage(`Login failed: ${error.message || 'Unknown error'}. Please try again.`);
            setCurrentPage('error');
            handleLogout();
        }
    }, [fetchUserData, setIsAuthenticated, handleLogout]);

    const handleGoogleLoginError = useCallback((error: any) => {
        console.error("Google Login Failed:", error);
        let message = "Google login failed. Please try again.";
        if (error?.type === 'popup_closed') {
            message = "Login cancelled. Please try again if you wish to continue.";
            setCurrentPage('landing');
        } else {
            setCurrentPage('error');
        }
         setErrorMessage(message);
    }, []);

    const login = useGoogleLogin({
        onSuccess: handleGoogleLoginSuccess,
        onError: handleGoogleLoginError,
    });

    const handleOnboardingComplete = useCallback(async (preferences: UserPreferences) => {
        if (!googleUser?.email) {
             console.error("Cannot save preferences, user email is missing.");
             setErrorMessage("An error occurred saving your preferences (missing user info). Please try logging out and in again.");
             setCurrentPage('error');
             return;
         }

        setCurrentPage('loading');
        setLoadingMessage('Saving your preferences...');
        try {
            await savePreferences(googleUser.email, preferences);
            setUserPreferences(preferences);
            setCurrentPage('dashboard');
        } catch (error: any) {
            console.error("Error saving preferences during onboarding:", error);
            setErrorMessage(`Failed to save preferences: ${error.message || 'Please try again.'}`);
            setCurrentPage('error');
        }
    }, [googleUser, savePreferences]);

    const handleResetPreferencesRequest = useCallback(async () => {
        if (!googleUser?.email) {
            console.error("Cannot reset preferences, user email is missing.");
             setErrorMessage("An error occurred resetting preferences (missing user info). Please try logging out and in again.");
             setCurrentPage('error');
            return;
        }

        setCurrentPage('loading');
        setLoadingMessage('Resetting preferences...');
        try {
            await deletePreferences(googleUser.email); // This now sets preferences to {}
            setUserPreferences(null); // Clear local state
            setCurrentPage('onboarding'); // Go to onboarding
        } catch (error: any) {
             console.error("Error resetting preferences:", error); // Changed log prefix
             setErrorMessage(`Failed to reset preferences: ${error.message || 'Please try again.'}`);
             setCurrentPage('error');
        }
    }, [googleUser, deletePreferences]);

    const showUpgradePage = useCallback(() => setCurrentPage('upgrade'), []);
    const showDashboard = useCallback(() => {
         if (isAuthenticated) {
             setCurrentPage('dashboard');
         } else {
             console.warn("Attempted to show dashboard while not authenticated.");
             handleLogout();
         }
    }, [isAuthenticated, handleLogout]);
    const tryAgain = useCallback(() => {
        setErrorMessage(null);
        setCurrentPage('landing');
    }, []);

    const renderCurrentPage = () => {
        switch (currentPage) {
            case 'loading':
                return (
                    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                        <p className="text-xl text-gray-700 dark:text-gray-300 animate-pulse">{loadingMessage}</p>
                    </div>
                );
            case 'error':
                 return (
                    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 dark:bg-gray-900 p-6 text-center">
                        <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-4">Oops! Something went wrong.</h2>
                        <p className="text-red-600 dark:text-red-300 mb-6 max-w-md">{errorMessage || 'An unexpected error occurred.'}</p>
                        <button
                            onClick={tryAgain}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                            Return to Login
                        </button>
                    </div>
                 );
            case 'onboarding':
                if (!isAuthenticated || !googleUser) {
                    console.warn("Attempted to show onboarding while not authenticated.");
                    handleLogout();
                    return null;
                }
                const isSavingPrefs = currentPage === 'loading' && loadingMessage.includes('Saving');
                return <OnboardingWizard
                            onComplete={handleOnboardingComplete}
                            isSaving={isSavingPrefs}
                       />;
            case 'dashboard':
                 if (!isAuthenticated || !googleUser) {
                     console.warn("Attempted to show dashboard while not authenticated.");
                     handleLogout();
                     return null;
                 }
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
                            onSaveTelegramDetails={async (id, rate) => {
                                if (googleUser?.email) {
                                   await saveTelegramDetails(googleUser.email, id, rate);
                                } else {
                                    console.error("Dashboard: Cannot save Telegram details, user email missing.");
                                    throw new Error("User email not available.");
                                }
                            }}
                            isPro={isProUser}
                            isEnterprise={isEnterpriseUser}
                            watchlistNews={watchlistNews}
                            sectorNews={sectorNews}
                            narrativeNews={narrativeNews}
                        />
                    </>
                );
             case 'upgrade':
                 if (!isAuthenticated || !googleUser) {
                     console.warn("Attempted to show upgrade page while not authenticated.");
                     handleLogout();
                     return null;
                 }
                 return (
                     <UpgradePage
                         onGoBack={showDashboard}
                         userEmail={googleUser.email}
                         onRedeemCode={redeemProCode}
                     />
                 );
            case 'landing':
            default:
                 if (errorMessage) setErrorMessage(null);
                return (
                     <>
                         <Background />
                         <div className="relative min-h-screen bg-transparent text-gray-900 dark:text-white">
                             <header className="container mx-auto px-4 py-6 relative z-10">
                                 <div className="flex justify-between items-center">
                                     <h1 className="font-chomsky text-4xl">Degen Times</h1>
                                     <button
                                         onClick={() => setIsDark(!isDark)}
                                         className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                                         title="Toggle Theme"
                                     >
                                         {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                                     </button>
                                 </div>
                             </header>
                             <main className="container mx-auto px-4 py-16 md:py-24 relative z-10">
                                 <div className="max-w-4xl mx-auto text-center backdrop-blur-lg bg-white/30 dark:bg-gray-900/40 p-8 rounded-2xl shadow-xl">
                                     <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                                         Stop Drowning in Crypto Noise.
                                         <span className="block bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                                             Get Your Personalized Signal Brief.
                                         </span>
                                     </h2>
                                     <p className="text-xl md:text-2xl mb-12 text-gray-800 dark:text-gray-200">
                                         We filter data from 100s of sources – news, X (Twitter), Telegram, on-chain activity, smart wallets – delivering only what matters to you, every day.
                                     </p>
                                     <button
                                         onClick={() => login()}
                                         disabled={currentPage === 'loading'}
                                         className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-300 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 text-gray-800 dark:text-white px-8 py-4 rounded-lg text-lg font-semibold flex items-center gap-3 mx-auto shadow-md hover:shadow-lg transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
                                     >
                                         <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
                                         {currentPage === 'loading' ? 'Connecting...' : 'Continue with Google'}
                                     </button>
                                 </div>
                                 <div className="grid md:grid-cols-3 gap-8 mt-24">
                                      {[
                                          { title: 'Personalized', description: 'Tailored insights based on your interests, portfolio, and trading style.' },
                                          { title: 'Comprehensive', description: 'Data from hundreds of sources, filtered and analyzed for relevance.' },
                                          { title: 'Data-Driven', description: 'On-chain analytics, market sentiment, and smart money movements.' }
                                      ].map((feature, index) => (
                                          <div key={index} className="backdrop-blur-lg bg-white/30 dark:bg-gray-900/40 p-6 rounded-lg border border-white/20 shadow-lg">
                                              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                                              <p className="text-gray-800 dark:text-gray-200">{feature.description}</p>
                                          </div>
                                      ))}
                                  </div>
                             </main>
                         </div>
                     </>
                );
        }
    };

    return <>{renderCurrentPage()}</>;
}

export default App;
