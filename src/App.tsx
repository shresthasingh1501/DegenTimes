// src/App.tsx
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAuthStore } from './store/auth';
import { OnboardingWizard, UserPreferences } from './components/OnboardingWizard';
import { Dashboard } from './components/Dashboard';
import { Background3D } from './components/Background3D';
import { UpgradePage } from './components/UpgradePage';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import axios from 'axios';
import { supabase } from './supabaseClient'; // Import Supabase client

// Google User Profile interface
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

// Define possible page states
type CurrentPage = 'landing' | 'onboarding' | 'dashboard' | 'upgrade' | 'loading' | 'error';

function App() {
    // --- State ---
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

    // --- Supabase Helper Functions ---
    const fetchPreferences = useCallback(async (email: string): Promise<UserPreferences | null> => {
        console.log(`Fetching preferences for ${email}...`);
        try {
            const { data, error, status } = await supabase
                .from('user_preferences')
                .select('preferences')
                .eq('user_email', email)
                .single();

            // Handle potential errors, specifically ignore 'PGRST116' (0 rows)
            if (error && status !== 406) { // 406 is the status for 'PGRST116' when using .single()
                console.error('Supabase fetch error:', error);
                throw new Error(`Supabase fetch error: ${error.message}`);
            }

            if (data) {
                console.log("Preferences found:", data.preferences);
                // Basic validation (optional but recommended)
                if (typeof data.preferences === 'object' && data.preferences !== null) {
                    return data.preferences as UserPreferences;
                } else {
                    console.warn("Fetched preferences are not a valid object:", data.preferences);
                    return null; // Treat invalid data as no preferences
                }
            } else {
                console.log("No preferences found for user.");
                return null;
            }
        } catch (error) {
             console.error("Caught error in fetchPreferences:", error);
             throw error; // Re-throw to be caught by caller
        }
    }, []); // Empty dependency array as supabase client is stable

    const savePreferences = useCallback(async (email: string, preferences: UserPreferences): Promise<void> => {
        console.log(`Saving preferences for ${email}...`, preferences);
        try {
             const { error } = await supabase
                .from('user_preferences')
                .upsert({ user_email: email, preferences: preferences }, { onConflict: 'user_email' });

             if (error) {
                 console.error('Supabase save error:', error);
                 throw new Error(`Supabase save error: ${error.message}`);
             }
             console.log("Preferences saved successfully.");
         } catch (error) {
             console.error("Caught error in savePreferences:", error);
             throw error;
         }
    }, []);

    const deletePreferences = useCallback(async (email: string): Promise<void> => {
        console.log(`Deleting preferences for ${email}...`);
        try {
            const { error } = await supabase
                .from('user_preferences')
                .delete()
                .eq('user_email', email);

            if (error) {
                console.error('Supabase delete error:', error);
                throw new Error(`Supabase delete error: ${error.message}`);
            }
            console.log("Preferences deleted successfully.");
        } catch (error) {
            console.error("Caught error in deletePreferences:", error);
            throw error;
        }
    }, []);
    // --- End Supabase Helpers ---

    // --- Effects ---
    // Initial mount effect (optional cleanup)
    useEffect(() => {
        console.log("App mounted. Current state:", currentPage);
    }, [currentPage]); // Log page changes

    // Theme effect
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);
    // --- End Effects ---


    // --- Authentication and Data Handling ---
    const handleLogout = useCallback(() => {
        googleLogout();
        // Consider Supabase signout if using Supabase Auth
        // supabase.auth.signOut();
        setIsAuthenticated(false);
        setUserPreferences(null);
        setGoogleUser(null);
        setCurrentPage('landing');
        setErrorMessage(null);
        console.log("User logged out");
    }, [setIsAuthenticated]); // Add dependencies


    const handleGoogleLoginSuccess = useCallback(async (tokenResponse: any) => {
        console.log("Google Login Success:", tokenResponse);
        setCurrentPage('loading');
        setLoadingMessage('Authenticating & fetching profile...');
        try {
            // 1. Fetch Google User Info
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

            // 2. Check Supabase for Preferences
            setLoadingMessage('Checking preferences...');
            const existingPrefs = await fetchPreferences(user.email);
            setUserPreferences(existingPrefs);

            // 3. Navigate based on preferences
            if (existingPrefs) {
                setCurrentPage('dashboard');
            } else {
                setCurrentPage('onboarding');
            }

        } catch (error: any) {
            console.error("Error during login/preference check:", error);
            setErrorMessage(`Login failed: ${error.message || 'Unknown error'}. Please try again.`);
            setCurrentPage('error');
            // Clean up potentially partial auth state
            handleLogout();
        }
    }, [fetchPreferences, setIsAuthenticated, handleLogout]); // Add dependencies

    const handleGoogleLoginError = useCallback((error: any) => {
        console.error("Google Login Failed:", error);
        // Provide more specific error message if possible, e.g., user closed popup
        let message = "Google login failed. Please try again.";
        if (error?.type === 'popup_closed') {
            message = "Login cancelled. Please try again if you wish to continue.";
            setCurrentPage('landing'); // Go back to landing if user cancelled
        } else {
            setCurrentPage('error'); // Show error page for other errors
        }
         setErrorMessage(message);
    }, []);

    const login = useGoogleLogin({
        onSuccess: handleGoogleLoginSuccess,
        onError: handleGoogleLoginError,
    });

    // Called from OnboardingWizard
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

    // Called from Dashboard
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
            await deletePreferences(googleUser.email);
            setUserPreferences(null);
            setCurrentPage('onboarding');
        } catch (error: any) {
             console.error("Error deleting preferences:", error);
             setErrorMessage(`Failed to reset preferences: ${error.message || 'Please try again.'}`);
             setCurrentPage('error');
        }
    }, [googleUser, deletePreferences]);
    // --- End Authentication and Data Handling ---


    // --- Navigation ---
    const showUpgradePage = useCallback(() => setCurrentPage('upgrade'), []);
    const showDashboard = useCallback(() => {
         if (isAuthenticated) {
             setCurrentPage('dashboard');
         } else {
             console.warn("Attempted to show dashboard while not authenticated.");
             handleLogout(); // Redirect to landing if not authenticated
         }
    }, [isAuthenticated, handleLogout]);
    const tryAgain = useCallback(() => {
        setErrorMessage(null); // Clear error before going back
        setCurrentPage('landing');
    }, []);
    // --- End Navigation ---


    // --- Background Component ---
    const Background = React.memo(() => ( // Memoize background
        <Suspense fallback={<div className="fixed inset-0 bg-gradient-to-br from-gray-700 to-gray-900 -z-20"></div>}>
            <Background3D />
        </Suspense>
    ));
    // --- End Background Component ---


    // --- Render Logic based on currentPage ---
    const renderCurrentPage = () => {
        switch (currentPage) {
            case 'loading':
                return (
                    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                        {/* Consider adding a visual spinner here */}
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
                // Ensure user is authenticated before showing onboarding
                if (!isAuthenticated || !googleUser) {
                    console.warn("Attempted to show onboarding while not authenticated.");
                    handleLogout(); // Should not happen, but redirect if it does
                    return null;
                }
                // Pass saving state based on loading message (could be more robust)
                const isSavingPrefs = currentPage === 'loading' && loadingMessage.includes('Saving');
                return <OnboardingWizard
                            onComplete={handleOnboardingComplete}
                            isSaving={isSavingPrefs}
                       />;
            case 'dashboard':
                 // Ensure user is authenticated and preferences are loaded
                 if (!isAuthenticated || !googleUser) {
                     console.warn("Attempted to show dashboard while not authenticated.");
                     handleLogout();
                     return null;
                 }
                 if (userPreferences === null && currentPage !== 'loading') {
                     // This case might happen if fetchPreferences returned null unexpectedly after login success
                     console.warn("Dashboard rendered without preferences state, forcing reset.");
                     handleResetPreferencesRequest(); // Force re-onboarding
                     return null; // Avoid rendering dashboard flicker
                 }
                return (
                    <>
                        <Background />
                        <Dashboard
                            onEditPreferences={handleResetPreferencesRequest}
                            initialPreferences={userPreferences} // Pass potentially null prefs initially
                            onLogout={handleLogout}
                            googleUser={googleUser}
                            onNavigateToUpgrade={showUpgradePage}
                        />
                    </>
                );
             case 'upgrade':
                 if (!isAuthenticated || !googleUser) {
                     console.warn("Attempted to show upgrade page while not authenticated.");
                     handleLogout();
                     return null;
                 }
                return <UpgradePage onGoBack={showDashboard} />;
            case 'landing':
            default:
                 // Reset error message when returning to landing
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
                                 {/* Features Section */}
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
