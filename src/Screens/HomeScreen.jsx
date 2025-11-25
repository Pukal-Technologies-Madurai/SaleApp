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
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import NetInfo from "@react-native-community/netinfo";
import RNFS from "react-native-fs";
import Share from "react-native-share";
import AttendanceInfo from "./attendance/AttendanceInfo";
import AppHeader from "../Components/AppHeader";
import assetImages from "../Config/Image";
import Dashboard from "./Dashboard";
import { customColors, typography, spacing, shadows } from "../Config/helper";

const HomeScreen = () => {
    const navigation = useNavigation();
    const [name, setName] = useState("");
    const [userTypeID, setUserTypeID] = useState("");
    const [error, setError] = useState(null);
    const [isQRVisible, setIsQRVisible] = useState(false);
    const [companyName, setCompanyName] = useState("");

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
            title: "Receipts",
            iconLibrary: "Ionicons",
            iconName: "receipt-outline",
            navigate: "ReceiptInfo",
            color: "#84CC16",
            backgroundColor: "#F7FEE7",
        },
        {
            title: "Pending Invoices",
            iconLibrary: "FontAwesome5",
            iconName: "receipt",
            navigate: "PendingInvoice",
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

    const handleShowQR = () => {
        setIsQRVisible(true); // This should set the state to show the modal
    };

    const handleShareQR = async () => {
        try {
            // 1) Resolve the asset URI
            const srcUri = Image.resolveAssetSource(assetImages.gpayLogo)?.uri;
            if (!srcUri) throw new Error("Could not resolve asset URI");

            // 2) Materialize to a file when needed (dev http:// uri or file://)
            let urlToShare = srcUri;

            if (srcUri.startsWith("http")) {
                // dev mode: download the asset to cache
                const destPath = `${RNFS.TemporaryDirectoryPath}/qr_code.jpg`;
                await RNFS.downloadFile({ fromUrl: srcUri, toFile: destPath })
                    .promise;
                urlToShare = `file://${destPath}`;
            } else if (srcUri.startsWith("file://")) {
                urlToShare = srcUri; // already a file
            } else if (
                Platform.OS === "android" &&
                srcUri.startsWith("asset:/")
            ) {
                // react-native-share understands asset:// on Android:
                // convert asset:/ to asset://
                urlToShare = srcUri.replace("asset:/", "asset://");
            }

            await Share.open({
                title: "Share QR Code",
                message:
                    "Here is the QR code for payment. Scan to make payment!",
                url: urlToShare,
                type: "image/jpeg",
                failOnCancel: false,
            });
        } catch (error) {
            if (error.message !== "User did not share") {
                console.error("Error sharing image:", error);
                Alert.alert("Error", "Failed to share QR code");
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

            {/* Simplified QR Modal */}
            <Modal
                visible={isQRVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsQRVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity
                            style={styles.closeIconButton}
                            onPress={() => setIsQRVisible(false)}
                            activeOpacity={0.7}>
                            <MaterialIcons
                                name="close"
                                size={28}
                                color={customColors.grey700}
                            />
                        </TouchableOpacity>

                        <Image
                            source={assetImages.gpayLogo}
                            style={styles.qrImage}
                            resizeMode="contain"
                        />

                        <TouchableOpacity
                            style={styles.shareButton}
                            onPress={handleShareQR}
                            activeOpacity={0.7}>
                            <MaterialIcons
                                name="share"
                                size={20}
                                color={customColors.white}
                                style={{ marginRight: 8 }}
                            />
                            <Text style={styles.shareButtonText}>Share</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
        borderRadius: 20,
        padding: spacing.lg,
        marginHorizontal: spacing.md,
        marginVertical: spacing.md,
        ...shadows.medium,
    },
    sectionTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.md,
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
    // Simplified modal styles
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
    },
    modalContent: {
        width: "90%",
        maxWidth: 400,
        backgroundColor: customColors.white,
        borderRadius: 20,
        padding: spacing.lg,
        alignItems: "center",
        position: "relative",
        margin: spacing.lg,
        ...shadows.large,
    },
    closeIconButton: {
        position: "absolute",
        top: 10,
        right: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    qrImage: {
        width: "100%",
        height: 510,
        borderRadius: 12,
        marginBottom: spacing.xxs,
    },
    shareButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: customColors.primary,
        borderRadius: 12,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        width: "60%",
        ...shadows.small,
    },
    shareButtonText: {
        color: customColors.white,
        ...typography.body2(),
        fontWeight: "600",
        marginLeft: spacing.xs,
    },
});
