import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./Config/AuthContext";
import AppDrawer from "./Routes/AppDrawer";

const queryClient = new QueryClient();

const App = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <NavigationContainer>
                    <AppDrawer />
                </NavigationContainer>
            </AuthProvider>
        </QueryClientProvider>
    );
};

export default App;
