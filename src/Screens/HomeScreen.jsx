import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import AttendanceInfo from "./attendance/AttendanceInfo";
import { customColors, typography, spacing, shadows } from "../Config/helper";
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
            iconLibrary: "MaterialIcons",
            iconName: "store",
            navigate: "Customers",
            color: "#6366F1",
            backgroundColor: "#EEF2FF",
        },
        {
            title: "Visit Log",
            iconLibrary: "MaterialCommunityIcons",
            iconName: "map-marker-path",
            navigate: "RetailerLog",
            color: "#10B981",
            backgroundColor: "#ECFDF5",
        },
        {
            title: "Sale List",
            iconLibrary: "MaterialIcons",
            iconName: "shopping-cart",
            navigate: "OrderPreview",
            color: "#F59E0B",
            backgroundColor: "#FFFBEB",
        },
        {
            title: "Stock List",
            iconLibrary: "MaterialCommunityIcons",
            iconName: "warehouse",
            navigate: "StockInfo",
            color: "#8B5CF6",
            backgroundColor: "#F3E8FF",
        },
        {
            title: "Delivery",
            iconLibrary: "MaterialIcons",
            iconName: "local-shipping",
            navigate: "DeliveryUpdate",
            color: "#EF4444",
            backgroundColor: "#FEF2F2",
        },
        {
            title: "TripSheet",
            iconLibrary: "MaterialCommunityIcons",
            iconName: "truck-delivery",
            navigate: "TripSheet",
            color: "#06B6D4",
            backgroundColor: "#ECFEFF",
        },
        {
            title: "Receipts Info",
            iconLibrary: "Ionicons",
            iconName: "receipt-outline",
            navigate: "ReceiptInfo",
            color: "#84CC16",
            backgroundColor: "#F7FEE7",
        },
        {
            title: "Bills Collection",
            iconLibrary: "MaterialIcons",
            iconName: "receipt-long",
            navigate: "BillSummary",
            color: "#EC4899",
            backgroundColor: "#FDF2F8",
        },
    ];

    const renderIcon = (iconLibrary, iconName, color) => {
        const iconProps = {
            name: iconName,
            size: 28,
            color: color,
        };

        switch (iconLibrary) {
            case "MaterialIcons":
                return <MaterialIcons {...iconProps} />;
            case "MaterialCommunityIcons":
                return <MaterialCommunityIcons {...iconProps} />;
            case "Ionicons":
                return <Ionicons {...iconProps} />;
            default:
                return <MaterialIcons {...iconProps} />;
        }
    };

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top", "right"]}>
            <StatusBar backgroundColor={customColors.primaryDark} />
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
                <ScrollView showsVerticalScrollIndicator={false}>
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
                                <Text style={styles.sectionTitle}>
                                    Quick Actions
                                </Text>
                                <View style={styles.buttonsGrid}>
                                    {buttons.map((button, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.button}
                                            onPress={() =>
                                                navigation.navigate(
                                                    button.navigate,
                                                )
                                            }
                                            activeOpacity={0.7}>
                                            <View
                                                style={[
                                                    styles.iconContainer,
                                                    {
                                                        backgroundColor:
                                                            button.backgroundColor,
                                                    },
                                                ]}>
                                                {renderIcon(
                                                    button.iconLibrary,
                                                    button.iconName,
                                                    button.color,
                                                )}
                                            </View>
                                            <Text
                                                style={styles.buttonText}
                                                numberOfLines={2}>
                                                {button.title}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
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
    },
    buttonContainer: {
        backgroundColor: customColors.white,
        borderRadius: 20,
        padding: spacing.lg,
        marginHorizontal: spacing.md,
        marginVertical: spacing.md,
        ...shadows.medium,
    },
    sectionTitle: {
        ...typography.h5(),
        color: customColors.grey900,
        fontWeight: "700",
        marginBottom: spacing.lg,
    },
    buttonsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: spacing.md,
    },
    button: {
        width: "47%",
        backgroundColor: customColors.white,
        borderRadius: 16,
        padding: spacing.md,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: customColors.grey100,
        ...shadows.small,
        minHeight: 120,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    buttonText: {
        ...typography.body2(),
        fontWeight: "600",
        color: customColors.grey800,
        textAlign: "center",
        lineHeight: 18,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.xl,
    },
    errorText: {
        color: customColors.error,
        ...typography.h6(),
        fontWeight: "600",
        textAlign: "center",
    },
    text: {
        ...typography.body2(),
        color: customColors.grey600,
        textAlign: "center",
    },
});
