import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./Config/AuthContext";
import AppDrawer from "./Routes/AppDrawer";

const queryClient = new QueryClient();

const App = () => {
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
