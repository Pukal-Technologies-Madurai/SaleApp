import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Modal,
    Alert,
    Platform,
    Animated,
    Linking,
    ToastAndroid,
    Dimensions,
    StatusBar,
} from "react-native";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Feather from "react-native-vector-icons/Feather";
import NetInfo from "@react-native-community/netinfo";
import RNFS from "react-native-fs";
import Share from "react-native-share";
import LinearGradient from "react-native-linear-gradient";
import AttendanceInfo from "./attendance/AttendanceInfo";
import AppHeader from "../Components/AppHeader";
import assetImages from "../Config/Image";
import Dashboard from "./Dashboard";
import { customColors, typography, spacing, shadows, borderRadius, responsiveSize } from "../Config/helper";
import { appVersion } from "../Api/auth";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const HomeScreen = () => {
    const navigation = useNavigation();
    const [name, setName] = useState("");
    const [userTypeID, setUserTypeID] = useState("");
    const [error, setError] = useState(null);
    const [isQRVisible, setIsQRVisible] = useState(false);
    const [isQuickActionsVisible, setIsQuickActionsVisible] = useState(false);
    const [companyName, setCompanyName] = useState("");
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const menuAnimation = useRef(new Animated.Value(0)).current;
    const APP_VERSION = appVersion();

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

    const ADMIN_USER_TYPES = ["0", "1", "2"];
    const isAdmin = ADMIN_USER_TYPES.includes(userTypeID);

    const menuItems = [
        {
            icon: "account-circle-outline",
            label: "My Profile",
            description: "View & edit profile",
            screen: "ProfileScreen",
            gradient: ["#10B981", "#059669"],
        },
        {
            icon: "account-plus-outline",
            label: "Add Retailer",
            description: "Register new retailer",
            screen: "AddCustomer",
            gradient: ["#3B82F6", "#2563EB"],
        },
        {
            icon: "cog-outline",
            label: "Settings",
            description: "App preferences",
            screen: "Settings",
            gradient: ["#F59E0B", "#D97706"],
        },
        {
            icon: "warehouse",
            label: "Godown",
            description: "Manage stock",
            screen: "GodownActivities",
            gradient: ["#8B5CF6", "#7C3AED"],
        },
        {
            icon: "cellphone-cog",
            label: "Device Settings",
            description: "System app settings",
            screen: null,
            gradient: ["#EF4444", "#DC2626"],
            onPress: () => Linking.openSettings(),
        },
    ];

    const toggleMenu = useCallback((open) => {
        if (open) {
            setIsMenuVisible(true);
            Animated.spring(menuAnimation, {
                toValue: 1,
                friction: 8,
                tension: 65,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(menuAnimation, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(() => {
                setIsMenuVisible(false);
            });
        }
    }, [menuAnimation]);

    const handleMenuNav = useCallback((item) => {
        toggleMenu(false);
        setTimeout(() => {
            if (item.screen) {
                navigation.navigate(item.screen);
            } else if (item.onPress) {
                item.onPress();
            }
        }, 250);
    }, [navigation, toggleMenu]);

    const logout = async () => {
        toggleMenu(false);
        try {
            await AsyncStorage.multiRemove([
                "Autheticate_Id",
                "userToken",
                "Company_Id",
                "companyName",
                "UserId",
                "userName",
                "Name",
                "UserType",
                "branchId",
                "branchName",
                "userTypeId",
                "activeGodown",
            ]);
            ToastAndroid.show("Log out Successfully", ToastAndroid.LONG);
            navigation.reset({
                index: 0,
                routes: [{ name: "LoginPortal" }],
            });
        } catch (err) {
            console.error("Error clearing AsyncStorage: ", err);
        }
    };

    React.useEffect(() => {
        const loadUserDetails = async () => {
            try {
                const userName = await AsyncStorage.getItem("Name");
                const storeUserTypeId =
                    await AsyncStorage.getItem("userTypeId");
                setUserTypeID(storeUserTypeId);
                const companyName = await AsyncStorage.getItem("companyName");

                setName(userName || "");
                setCompanyName(companyName || "");
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
            image: assetImages.shops,
            navigate: "Customers",
            gradientStart: "#6366F1",
            gradientEnd: "#818CF8",
        },
        {
            title: "Visit Log",
            image: assetImages.dailyLog,
            navigate: "RetailerLog",
            gradientStart: "#10B981",
            gradientEnd: "#34D399",
        },
        {
            title: "Sale List",
            image: assetImages.sales,
            navigate: "OrderPreview",
            gradientStart: "#F59E0B",
            gradientEnd: "#FBBF24",
        },
        {
            title: "Delivery",
            image: assetImages.delivery,
            navigate: "DeliveryUpdate",
            gradientStart: "#EF4444",
            gradientEnd: "#F87171",
        },
        {
            title: "Receipts",
            image: assetImages.receipts,
            navigate: "ReceiptInfo",
            gradientStart: "#84CC16",
            gradientEnd: "#A3E635",
        },
        {
            title: "Invoices",
            image: assetImages.invoice,
            navigate: "SaleInvoiceList",
            gradientStart: "#3B82F6",
            gradientEnd: "#60A5FA",
        },
        {
            title: "Retailers Stock",
            image: assetImages.stock,
            navigate: "StockInfo",
            gradientStart: "#8B5CF6",
            gradientEnd: "#A78BFA",
        },
        {
            title: "TripSheet",
            image: assetImages.TripSheet,
            navigate: "TripSheet",
            gradientStart: "#06B6D4",
            gradientEnd: "#22D3EE",
        },
        {
            title: "Credit Note",
            image: assetImages.creditNote,
            navigate: "DeliveryReturn",
            gradientStart: "#F97316",
            gradientEnd: "#FB923C",
        },
        {
            title: "Expense",
            image: assetImages.expenses,
            navigate: "ExpenseList",
            gradientStart: "#EC4899",
            gradientEnd: "#F472B6",
        }
    ];

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    const handleShowQR = () => {
        setIsQRVisible(true);
    };



    const handleShareQR = async () => {
        try {
            const destPath = `${RNFS.CachesDirectoryPath}/qr_code.jpg`;

            // Resolve the bundled asset URI
            const asset = Image.resolveAssetSource(assetImages.gpayLogo);
            if (!asset?.uri) throw new Error("Could not resolve asset URI");

            const srcUri = asset.uri;

            if (srcUri.startsWith("http")) {
                // Dev / Metro bundler — download the file directly
                const result = await RNFS.downloadFile({
                    fromUrl: srcUri,
                    toFile: destPath,
                }).promise;
                if (result.statusCode !== 200) {
                    throw new Error(`Download failed with status ${result.statusCode}`);
                }
            } else if (Platform.OS === "android") {
                // Release build — asset lives inside the APK.
                // Strip all variants of the asset:// prefix before calling copyFileAssets.
                const assetRelativePath = srcUri
                    .replace(/^asset:\/\/\//, "")
                    .replace(/^asset:\/\//, "")
                    .replace(/^asset:\//, "");
                await RNFS.copyFileAssets(assetRelativePath, destPath);
            } else {
                // iOS — file is in the app bundle
                const bundlePath = srcUri.replace(/^file:\/\//, "");
                if (!(await RNFS.exists(bundlePath))) {
                    throw new Error("Source bundle file not found");
                }
                await RNFS.copyFile(bundlePath, destPath);
            }

            // Share via a real file:// URI.
            // base64 data URIs are rejected by most Android share targets
            // (WhatsApp, Gmail, Drive, etc.) — a file path is required.
            await Share.open({
                title: "Payment QR Code",
                url: `file://${destPath}`,
                type: "image/jpeg",
                failOnCancel: false,
            });
        } catch (error) {
            // react-native-share signals cancellation in multiple ways — ignore them all
            const msg = error?.message ?? "";
            const isCancelled =
                msg === "User did not share" ||
                msg === "CANCELLED" ||
                msg.toLowerCase().includes("cancel") ||
                error?.error === "User did not share";

            if (!isCancelled) {
                console.error("Error sharing QR image:", error);
                Alert.alert("Error", "Failed to share QR code. Please try again.");
            }
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle="light-content" backgroundColor={customColors.primaryDark} />
            <AppHeader
                navigation={navigation}
                showDrawer={true}
                name={name}
                subtitle={companyName}
                showRightIcon={true}
                rightIconName="bells"
                rightIconLibrary="AntDesign"
                onRightPress={() => navigation.navigate("TodayLog")}
                onMenuPress={() => toggleMenu(true)}
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
                            {companyName === "SM TRADERS"
                                ? null
                                : <AttendanceInfo />
                            }

                            <View style={styles.buttonContainer}>
                                <View style={styles.sectionTitleContainer}>
                                    <Text style={styles.sectionTitle}>
                                        Quick Actions
                                    </Text>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                                        <TouchableOpacity
                                            onPress={() => setIsQuickActionsVisible(true)}
                                            activeOpacity={0.7}>
                                            <MaterialIcons
                                                name="add-circle-outline"
                                                size={26}
                                                color={customColors.primary}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={handleShowQR}
                                            activeOpacity={0.7}>
                                            <MaterialIcons
                                                name="qr-code-scanner"
                                                size={24}
                                                color={customColors.primary}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.buttonsGrid}>
                                    {buttons.map((button, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.button,
                                                {
                                                    backgroundColor: button.gradientStart + "15",
                                                    borderColor: button.gradientStart + "30",
                                                },
                                            ]}
                                            onPress={() =>
                                                navigation.navigate(
                                                    button.navigate,
                                                )
                                            }
                                            activeOpacity={0.8}>
                                            <View
                                                style={[
                                                    styles.iconContainer,
                                                    {
                                                        backgroundColor: button.gradientStart + "20",
                                                        shadowColor: button.gradientStart,
                                                    },
                                                ]}>
                                                <Image
                                                    source={button.image}
                                                    style={styles.buttonImage}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                            <Text
                                                style={[
                                                    styles.buttonText,
                                                    { color: button.gradientStart },
                                                ]}
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

            {/* QR Code Modal */}
            <Modal
                visible={isQRVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsQRVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Scan to Pay</Text>
                            <TouchableOpacity
                                style={styles.closeIconButton}
                                onPress={() => setIsQRVisible(false)}
                                activeOpacity={0.7}>
                                <MaterialIcons
                                    name="close"
                                    size={24}
                                    color={customColors.grey700}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.qrContainer}>
                            <Image
                                source={assetImages.gpayLogo}
                                style={styles.qrImage}
                                resizeMode="contain"
                            />
                        </View>

                        <Text style={styles.qrHint}>
                            Scan this QR code with any UPI app to make payment
                        </Text>

                        <TouchableOpacity
                            style={styles.shareButton}
                            onPress={handleShareQR}
                            activeOpacity={0.7}>
                            <MaterialIcons
                                name="share"
                                size={20}
                                color={customColors.white}
                            />
                            <Text style={styles.shareButtonText}>Share QR Code</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Quick Actions Modal */}
            <Modal
                visible={isQuickActionsVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsQuickActionsVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Quick Actions</Text>
                            <TouchableOpacity
                                style={styles.closeIconButton}
                                onPress={() => setIsQuickActionsVisible(false)}
                                activeOpacity={0.7}>
                                <MaterialIcons
                                    name="close"
                                    size={24}
                                    color={customColors.grey700}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.quickActionsContainer}>
                            <TouchableOpacity
                                style={styles.quickActionItem}
                                onPress={() => {
                                    setIsQuickActionsVisible(false);
                                    navigation.navigate("RetailerVisit");
                                }}
                                activeOpacity={0.7}>
                                <LinearGradient
                                    colors={["#10B981", "#059669"]}
                                    style={styles.quickActionIcon}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}>
                                    <MaterialCommunityIcons
                                        name="calendar-check-outline"
                                        size={28}
                                        color={customColors.white}
                                    />
                                </LinearGradient>
                                <Text style={styles.quickActionLabel}>Daily Log</Text>
                                <Text style={styles.quickActionDesc}>Log retailer visit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.quickActionItem}
                                onPress={() => {
                                    setIsQuickActionsVisible(false);
                                    navigation.navigate("AddCustomer");
                                }}
                                activeOpacity={0.7}>
                                <LinearGradient
                                    colors={["#3B82F6", "#2563EB"]}
                                    style={styles.quickActionIcon}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}>
                                    <MaterialCommunityIcons
                                        name="store-plus-outline"
                                        size={28}
                                        color={customColors.white}
                                    />
                                </LinearGradient>
                                <Text style={styles.quickActionLabel}>Add Shops</Text>
                                <Text style={styles.quickActionDesc}>Register new retailer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Bottom Sheet Menu */}
            <Modal
                visible={isMenuVisible}
                transparent
                animationType="none"
                statusBarTranslucent
                onRequestClose={() => toggleMenu(false)}
            >
                <TouchableOpacity
                    style={styles.menuBackdrop}
                    activeOpacity={1}
                    onPress={() => toggleMenu(false)}
                >
                    <Animated.View
                        style={[
                            styles.menuSheet,
                            {
                                transform: [{
                                    translateY: menuAnimation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [SCREEN_HEIGHT, 0],
                                    }),
                                }],
                            },
                        ]}
                    >
                        <TouchableOpacity activeOpacity={1}>
                            {/* Handle bar */}
                            <View style={styles.menuHandleBar} />

                            {/* Menu Header */}
                            <View style={styles.menuSheetHeader}>
                                <View>
                                    <Text style={styles.menuSheetTitle}>Menu</Text>
                                    <Text style={styles.menuSheetVersion}>v{APP_VERSION}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.menuCloseBtn}
                                    onPress={() => toggleMenu(false)}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons name="close" size={20} color={customColors.grey600} />
                                </TouchableOpacity>
                            </View>

                            {/* Menu Items */}
                            <View style={styles.menuItemsContainer}>
                                {menuItems.map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.menuSheetItem}
                                        onPress={() => handleMenuNav(item)}
                                        activeOpacity={0.7}
                                    >
                                        <LinearGradient
                                            colors={item.gradient}
                                            style={styles.menuSheetIcon}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <MaterialCommunityIcons
                                                name={item.icon}
                                                size={20}
                                                color={customColors.white}
                                            />
                                        </LinearGradient>
                                        <View style={styles.menuSheetTextContainer}>
                                            <Text style={styles.menuSheetLabel}>{item.label}</Text>
                                            <Text style={styles.menuSheetDesc}>{item.description}</Text>
                                        </View>
                                        <MaterialCommunityIcons
                                            name="chevron-right"
                                            size={22}
                                            color={customColors.grey300}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Divider */}
                            <View style={styles.menuDivider} />

                            {/* Sign Out */}
                            <TouchableOpacity
                                style={styles.menuSignOut}
                                onPress={logout}
                                activeOpacity={0.8}
                            >
                                <MaterialCommunityIcons name="logout" size={20} color="#DC2626" />
                                <Text style={styles.menuSignOutText}>Sign Out</Text>
                            </TouchableOpacity>

                            <Text style={styles.menuFooterText}>Pukal Tech | All rights reserved</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

        </SafeAreaView>
    );
};

export default HomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    overlay: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
    },
    buttonContainer: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginHorizontal: spacing.md,
        marginVertical: spacing.md,
        ...shadows.small,
    },
    sectionTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        ...typography.h5(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    buttonsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: spacing.sm,
    },
    button: {
        width: "31%",
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        marginBottom: spacing.xs,
        // 3D effect
        // shadowColor: "#000",
        // shadowOffset: { width: 0, height: 4 },
        // shadowOpacity: 0.15,
        // shadowRadius: 8,
        // elevation: 6,
        // minHeight: 110,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: borderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.sm,
        // 3D effect for icon container
        // shadowOffset: { width: 0, height: 3 },
        // shadowOpacity: 0.2,
        // shadowRadius: 4,
        // elevation: 4,
    },
    buttonImage: {
        width: 36,
        height: 36,
    },
    buttonText: {
        ...typography.body2(),
        fontWeight: "700",
        textAlign: "center",
        lineHeight: 14,
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
    // QR Modal styles
    modalContainer: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        backgroundColor: customColors.white,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
        ...shadows.large,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.md,
    },
    modalTitle: {
        ...typography.h5(),
        fontWeight: "700",
        color: customColors.grey900,
    },
    closeIconButton: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
    },
    qrContainer: {
        alignItems: "center",
        backgroundColor: customColors.grey50,
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
        marginBottom: spacing.md,
    },
    qrImage: {
        width: "100%",
        height: 400,
        borderRadius: borderRadius.md,
    },
    qrHint: {
        ...typography.body2(),
        color: customColors.grey600,
        textAlign: "center",
        marginBottom: spacing.lg,
    },
    shareButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: customColors.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
        ...shadows.small,
    },
    shareButtonText: {
        ...typography.body1(),
        color: customColors.white,
        fontWeight: "600",
    },
    // Quick Actions Modal styles
    quickActionsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: spacing.lg,
        gap: spacing.md,
    },
    quickActionItem: {
        flex: 1,
        alignItems: "center",
        backgroundColor: customColors.grey50,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    quickActionIcon: {
        width: 60,
        height: 60,
        borderRadius: borderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    quickActionLabel: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "700",
        textAlign: "center",
    },
    quickActionDesc: {
        ...typography.caption(),
        color: customColors.grey500,
        textAlign: "center",
        marginTop: 2,
    },
    // Bottom Sheet Menu styles
    menuBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    menuSheet: {
        backgroundColor: customColors.white,
        borderTopLeftRadius: borderRadius.xl + 4,
        borderTopRightRadius: borderRadius.xl + 4,
        paddingBottom: spacing.xl,
        ...shadows.large,
    },
    menuHandleBar: {
        width: 40,
        height: 4,
        backgroundColor: customColors.grey300,
        borderRadius: 2,
        alignSelf: "center",
        marginTop: spacing.sm,
        marginBottom: spacing.md,
    },
    menuSheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    menuSheetTitle: {
        ...typography.h5(),
        fontWeight: "700",
        color: customColors.grey900,
    },
    menuSheetVersion: {
        ...typography.caption(),
        color: customColors.grey400,
        marginTop: 2,
    },
    menuCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
    },
    menuItemsContainer: {
        paddingHorizontal: spacing.md,
        gap: spacing.xs,
    },
    menuSheetItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey50,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
    },
    menuSheetIcon: {
        width: responsiveSize(42),
        height: responsiveSize(42),
        borderRadius: borderRadius.md,
        justifyContent: "center",
        alignItems: "center",
    },
    menuSheetTextContainer: {
        flex: 1,
        marginLeft: spacing.md,
    },
    menuSheetLabel: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    menuSheetDesc: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: 2,
    },
    menuDivider: {
        height: 1,
        backgroundColor: customColors.grey100,
        marginHorizontal: spacing.lg,
        marginVertical: spacing.md,
    },
    menuSignOut: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.md,
        marginHorizontal: spacing.lg,
        borderRadius: borderRadius.round,
        borderWidth: 1.5,
        borderColor: "#FEE2E2",
        backgroundColor: "#FEF2F2",
        gap: spacing.sm,
    },
    menuSignOutText: {
        ...typography.subtitle2(),
        color: "#DC2626",
        fontWeight: "600",
    },
    menuFooterText: {
        ...typography.caption(),
        color: customColors.grey400,
        textAlign: "center",
        marginTop: spacing.md,
    },
});
