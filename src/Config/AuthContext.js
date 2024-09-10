import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [userInfo, setUserInfo] = useState(null);

    const setAuthInfo = (data) => {
        setUserInfo(data);
    };

    return (
        <AuthContext.Provider value={{ userInfo, setAuthInfo }}>
            {children}
        </AuthContext.Provider>
    );
}

export const storeInfo = () => useContext(AuthContext);