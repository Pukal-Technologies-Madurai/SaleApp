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
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Feather from "react-native-vector-icons/Feather";
import NetInfo from "@react-native-community/netinfo";
import RNFS from "react-native-fs";
import Share from "react-native-share";
import AttendanceInfo from "./attendance/AttendanceInfo";
import AppHeader from "../Components/AppHeader";
import assetImages from "../Config/Image";
import Dashboard from "./Dashboard";
import { customColors, typography, spacing, shadows, borderRadius } from "../Config/helper";

const HomeScreen = () => {
    const navigation = useNavigation();
    const [name, setName] = useState("");
    const [userTypeID, setUserTypeID] = useState("");
    const [error, setError] = useState(null);
    const [isQRVisible, setIsQRVisible] = useState(false);
    const [companyName, setCompanyName] = useState("");
    const [isFabOpen, setIsFabOpen] = useState(false);
    const fabAnimation = useRef(new Animated.Value(0)).current;

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
        // {
        //     title: "Delivery Return",
        //     image: assetImages.deliveryCancel,
        //     navigate: "PendingDeliveryIndividual",
        //     gradientStart: "#EC4899",
        //     gradientEnd: "#F472B6",
        // }
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

    const toggleFab = () => {
        const toValue = isFabOpen ? 0 : 1;
        Animated.spring(fabAnimation, {
            toValue,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
        }).start();
        setIsFabOpen(!isFabOpen);
    };

    const handleFabOption = (screen) => {
        toggleFab();
        navigation.navigate(screen);
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
                            {companyName === "SM TRADERS"
                                ? null
                                : <AttendanceInfo />
                            }

                            <View style={styles.buttonContainer}>
                                <View style={styles.sectionTitleContainer}>
                                    <Text style={styles.sectionTitle}>
                                        Quick Actions
                                    </Text>
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

            {/* Floating Action Button */}
            {!isAdmin && (
                <>
                    {/* Backdrop */}
                    {isFabOpen && (
                        <TouchableOpacity
                            style={styles.fabBackdrop}
                            activeOpacity={1}
                            onPress={toggleFab}
                        />
                    )}
                    
                    <View style={styles.fabContainer}>
                        {/* FAB Options */}
                        <Animated.View
                            style={[
                                styles.fabOption,
                                styles.fabOption1,
                                {
                                    opacity: fabAnimation,
                                    transform: [
                                        {
                                            scale: fabAnimation.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0.3, 1],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                            pointerEvents={isFabOpen ? "auto" : "none"}>
                            <TouchableOpacity
                                style={[styles.fabOptionButton, styles.fabOptionRetailer]}
                                onPress={() => handleFabOption("AddCustomer")}
                                activeOpacity={0.8}>
                                <Feather name="user-plus" size={22} color={customColors.white} />
                            </TouchableOpacity>
                            <View style={styles.fabLabelContainer}>
                                <Text style={styles.fabOptionLabel}>Add Retailer</Text>
                            </View>
                        </Animated.View>

                        <Animated.View
                            style={[
                                styles.fabOption,
                                styles.fabOption2,
                                {
                                    opacity: fabAnimation,
                                    transform: [
                                        {
                                            scale: fabAnimation.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0.3, 1],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                            pointerEvents={isFabOpen ? "auto" : "none"}>
                            <TouchableOpacity
                                style={[styles.fabOptionButton, styles.fabOptionVisit]}
                                onPress={() => handleFabOption("RetailerVisit")}
                                activeOpacity={0.8}>
                                <Feather name="map-pin" size={22} color={customColors.white} />
                            </TouchableOpacity>
                            <View style={styles.fabLabelContainer}>
                                <Text style={styles.fabOptionLabel}>Visit Entry</Text>
                            </View>
                        </Animated.View>

                        {/* Main FAB */}
                        <TouchableOpacity
                            style={[styles.fab, isFabOpen && styles.fabActive]}
                            onPress={toggleFab}
                            activeOpacity={0.9}>
                            <Animated.View
                                style={{
                                    transform: [
                                        {
                                            rotate: fabAnimation.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ["0deg", "135deg"],
                                            }),
                                        },
                                    ],
                                }}>
                                <Feather name="plus" size={28} color={customColors.white} />
                            </Animated.View>
                        </TouchableOpacity>
                    </View>
                </>
            )}
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
    // FAB styles
    fabBackdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
    },
    fabContainer: {
        position: "absolute",
        bottom: spacing.xl * 2.5, // move up from bottom (e.g., 32–40px above system nav)
        right: spacing.lg + 4,
        alignItems: "center",
        zIndex: 100,
    },
    fab: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: customColors.primary,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: customColors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
    },
    fabActive: {
        backgroundColor: customColors.grey800,
    },
    fabOption: {
        position: "absolute",
        alignItems: "center",
        flexDirection: "row-reverse",
        gap: spacing.sm,
    },
    fabOption1: {
        // Add Retailer: up and left (diagonal)
        left: -90,
        bottom: 110,
    },
    fabOption2: {
        // Visit Entry: up and slightly left
        left: -50,
        bottom: 60,
    },
    fabOptionButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    fabOptionRetailer: {
        backgroundColor: "#10B981",
    },
    fabOptionVisit: {
        backgroundColor: "#6366F1",
    },
    fabLabelContainer: {
        backgroundColor: customColors.white,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    fabOptionLabel: {
        ...typography.body2(),
        color: customColors.grey800,
        fontWeight: "600",
    },
});
