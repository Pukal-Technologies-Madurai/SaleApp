import React from "react"
import { NavigationContainer } from "@react-navigation/native";

import { AuthProvider } from "./Config/AuthContext";
import AppDrawer from "./Routes/AppDrawer";

const App = () => {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppDrawer />
      </NavigationContainer>
    </AuthProvider>
  );
};

export default App