import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import AttendanceInfo from "./attendance/AttendanceInfo";
import { customColors, typography } from "../Config/helper";
import assetImages from "../Config/Image";
import AppHeader from "../Components/AppHeader";
import Dashboard from "./Dashboard";

const HomeScreen = () => {
    const navigation = useNavigation();
    const [name, setName] = useState("");
    const [userTypeID, setUserTypeID] = useState("");
    const [error, setError] = useState(null);

    const ADMIN_USER_TYPES = ["0", "1", "2"];
    const isAdmin = ADMIN_USER_TYPES.includes(userTypeID);

    const [isConnected, setIsConnected] = useState(null);
    const [connectionType, setConnectionType] = useState(null);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
            setConnectionType(state.type);
        });

        // Optional: get initial state
        NetInfo.fetch().then(state => {
            setIsConnected(state.isConnected);
            setConnectionType(state.type);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    React.useEffect(() => {
        const loadUserDetails = async () => {
            try {
                const userName = await AsyncStorage.getItem("Name");
                const storeUserTypeId =
                    await AsyncStorage.getItem("userTypeId");
                setUserTypeID(storeUserTypeId);

                setName(userName || "");
            } catch (err) {
                console.error("Error loading user details:", err);
                setError("Failed to load user details");
            }
        };
        loadUserDetails();
    }, []);

    const buttons = [
        {
            title: "Retailers",
            icon: assetImages.retailer,
            navigate: "Customers",
        },
        {
            title: "Visit Log",
            icon: assetImages.visitLog,
            navigate: "RetailerLog",
        },
        {
            title: "Sale List",
            icon: assetImages.salesOrder,
            navigate: "OrderPreview",
        },
        {
            title: "Stock List",
            icon: assetImages.inventoryStore,
            navigate: "StockInfo",
        },
        {
            title: "Delivery",
            icon: assetImages.attendance,
            navigate: "DeliveryUpdate",
        },
        {
            title: "TripSheet",
            icon: assetImages.tripInfo,
            navigate: "TripSheet",
        },
        {
            title: "Bills Collection",
            icon: assetImages.inventoryStore,
            navigate: "BillSummary",
        },
    ];

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top", "right"]}>
            <AppHeader
                navigation={navigation}
                showDrawer={true}
                name={name}
                subtitle={AsyncStorage.getItem("companyName")}
                showRightIcon={true}
                rightIconName="bells"
                rightIconLibrary="AntDesign"
                onRightPress={() => navigation.navigate("TodayLog")}
            />

            {!isConnected ? (
                <View
                    style={{
                        paddingVertical: 1.5,
                        marginTop: 10,
                        alignItems: "center",
                    }}>
                    <Text style={styles.text}>
                        {isConnected
                            ? `Online ✅ ${connectionType}`
                            : "Offline ❌ Please check your internet connection."}
                    </Text>
                </View>
            ) : null}

            <View style={styles.overlay}>
                <ScrollView>
                    {error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : isAdmin ? (
                        <Dashboard />
                    ) : (
                        <View>
                            <AttendanceInfo />

                            <View style={styles.buttonContainer}>
                                {buttons.map((button, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.button}
                                        onPress={() =>
                                            navigation.navigate(button.navigate)
                                        }>
                                        <View style={styles.iconContainer}>
                                            <Image
                                                source={button.icon}
                                                style={styles.icon}
                                            />
                                        </View>
                                        <Text
                                            style={styles.buttonText}
                                            maxFontSizeMultiplier={1.2}>
                                            {button.title}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

export default HomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    overlay: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
        alignItems: "center",
    },
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    buttonContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        backgroundColor: customColors.white,
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 20,
        marginVertical: 10,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    button: {
        width: "48%",
        aspectRatio: 1,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 15,
        borderRadius: 16,
        backgroundColor: "#F8F9FA",
        borderWidth: 1,
        borderColor: "#E9ECEF",
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    buttonText: {
        textAlign: "center",
        ...typography.h6(),
        fontWeight: "600",
        color: "#495057",
    },
    icon: {
        width: 45,
        height: 45,
    },
    iconContainer: {
        width: 70,
        height: 70,
        justifyContent: "center",
        alignItems: "center",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorText: {
        color: customColors.error,
        ...typography.h6(),
        fontWeight: "600",
    },
});
