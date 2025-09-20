import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

import AppDrawer from "./Routes/AppDrawer";
import { AuthProvider } from "./Config/AuthContext";
import { setBaseUrl } from "./Config/Endpoint";

const queryClient = new QueryClient();

const App = () => {

    React.useEffect(() => {
        const initializeBaseURL = async () => {
            try {
                const storedBaseURL = await AsyncStorage.getItem("baseURL");
                if (storedBaseURL) {
                    setBaseUrl(storedBaseURL);
                }
            } catch (error) {
                console.error("Error loading baseURL:", error);
            }
        };

        initializeBaseURL();
    }, [])

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <SafeAreaProvider>
                    <NavigationContainer>
                        <AppDrawer />
                    </NavigationContainer>
                </SafeAreaProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
};

export default App;
