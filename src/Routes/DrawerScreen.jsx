import {
    Linking,
    StatusBar,
    ScrollView,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
} from "react-native";
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import IconAntDesign from "react-native-vector-icons/AntDesign";
import IconFont from "react-native-vector-icons/FontAwesome6";
import IconMaterial from "react-native-vector-icons/MaterialIcons";
import {
    customColors,
    typography,
    spacing,
    responsiveSize,
    borderRadius,
} from "../Config/helper";
import { appVersion } from "../Api/auth";
import { SafeAreaView } from "react-native-safe-area-context";

const DrawerScreen = ({ navigation }) => {
    const [activeItem, setActiveItem] = React.useState(null);
    const APP_VERSION = appVersion();

    const logout = async () => {
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

            // navigation.reset({
            //     index: 0,
            //     routes: [
            //         {
            //             name: "AppStack",
            //             state: {
            //                 routes: [{ name: "LoginPortal" }],
            //             },
            //         },
            //     ],
            // });
            setTimeout(() => {
                navigation.navigate("AppStack", { screen: "LoginPortal" });
            }, 100);
            navigation.closeDrawer();
        } catch (err) {
            console.error("Error clearing AsyncStorage: ", err);
        }
    };

    const menuItems = [
        {
            icon: "account-circle-outline",
            iconLibrary: "MaterialCommunityIcons",
            label: "My Profile",
            description: "View & edit profile",
            onPress: () =>
                navigation.navigate("AppStack", { screen: "ProfileScreen" }),
            gradient: ["#10B981", "#059669"],
        },
        {
            icon: "account-plus-outline",
            iconLibrary: "MaterialCommunityIcons",
            label: "Add Retailer",
            description: "Register new retailer",
            onPress: () =>
                navigation.navigate("AppStack", { screen: "AddCustomer" }),
            gradient: ["#3B82F6", "#2563EB"],
        },
        {
            icon: "cog-outline",
            iconLibrary: "MaterialCommunityIcons",
            label: "Settings",
            description: "App preferences",
            onPress: () =>
                navigation.navigate("AppStack", { screen: "Settings" }),
            gradient: ["#F59E0B", "#D97706"],
        },
        {
            icon: "warehouse",
            iconLibrary: "MaterialIcons",
            label: "Godown",
            description: "Manage stock`",
            onPress: () =>
                navigation.navigate("AppStack", { screen: "GodownActivities" }),
            gradient: ["#8B5CF6", "#7C3AED"],
        },
        {
            icon: "cellphone-cog",
            iconLibrary: "MaterialCommunityIcons",
            label: "Device Settings",
            description: "System app settings",
            onPress: () => Linking.openSettings(),
            gradient: ["#EF4444", "#DC2626"],
        },
    ];

    const renderIcon = (iconLibrary, iconName, color = customColors.white) => {
        const size = 22;
        switch (iconLibrary) {
            case "MaterialCommunityIcons":
                return <Icon name={iconName} size={size} color={color} />;
            case "FontAwesome6":
                return (
                    <IconFont name={iconName} size={size - 2} color={color} />
                );
            case "MaterialIcons":
                return (
                    <IconMaterial name={iconName} size={size} color={color} />
                );
            case "AntDesign":
                return (
                    <IconAntDesign
                        name={iconName}
                        size={size - 2}
                        color={color}
                    />
                );
            default:
                return <Icon name={iconName} size={size} color={color} />;
        }
    };

    return (
        <View style={styles.drawerContainer}>
            <StatusBar
                backgroundColor="transparent"
                translucent
                barStyle="light-content"
            />

            {/* Modern Gradient Header */}
            <LinearGradient
                colors={["#0D47A1", "#1565C0", "#1976D2"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.appName}>Pukal {"\n"} Virpanai</Text>
                    <View style={styles.versionBadge}>
                        <Icon name="shield-check" size={14} color="#4ADE80" />
                        <Text style={styles.versionText}>v{APP_VERSION}</Text>
                    </View>
                </View>
            </LinearGradient>

            <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
                {/* Menu Items */}
                <ScrollView
                    style={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={styles.menuSection}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.menuItem,
                                    activeItem === index &&
                                        styles.menuItemActive,
                                ]}
                                onPress={() => {
                                    setActiveItem(index);
                                    item.onPress();
                                }}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={item.gradient}
                                    style={styles.menuIconContainer}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    {renderIcon(item.iconLibrary, item.icon)}
                                </LinearGradient>
                                <View style={styles.menuTextContainer}>
                                    <Text style={styles.menuLabel}>
                                        {item.label}
                                    </Text>
                                    <Text style={styles.menuDescription}>
                                        {item.description}
                                    </Text>
                                </View>
                                <Icon
                                    name="chevron-right"
                                    size={22}
                                    color={
                                        activeItem === index
                                            ? customColors.primary
                                            : customColors.grey300
                                    }
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                {/* Footer with Logout */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={logout}
                        activeOpacity={0.8}
                    >
                        <Icon name="logout" size={20} color="#DC2626" />
                        <Text style={styles.logoutText}>Sign Out</Text>
                    </TouchableOpacity>

                    <View style={styles.footerDivider} />
                    <Text style={styles.footerText}>
                        Pukal Tech | All rights reserved
                    </Text>
                </View>
            </SafeAreaView>
        </View>
    );
};

export default DrawerScreen;

const styles = StyleSheet.create({
    drawerContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    header: {
        paddingTop: StatusBar.currentHeight + responsiveSize(16),
        paddingBottom: responsiveSize(20),
        paddingHorizontal: spacing.lg,
        borderBottomLeftRadius: borderRadius.lg,
        borderBottomRightRadius: borderRadius.lg,
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    appName: {
        ...typography.h4(),
        textAlign: "center",
        color: customColors.white,
        fontWeight: "700",
    },
    versionBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.15)",
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: responsiveSize(16),
        gap: spacing.xs,
    },
    versionText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "600",
    },
    safeArea: {
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
    },
    menuSection: {
        gap: spacing.sm,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey50,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
    },
    menuItemActive: {
        backgroundColor: customColors.primaryFaded,
        borderWidth: 1,
        borderColor: customColors.primaryLight,
    },
    menuIconContainer: {
        width: responsiveSize(42),
        height: responsiveSize(42),
        borderRadius: borderRadius.md,
        justifyContent: "center",
        alignItems: "center",
    },
    menuTextContainer: {
        flex: 1,
        marginLeft: spacing.md,
    },
    menuLabel: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    menuDescription: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: 2,
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        paddingBottom: spacing.xl,
        borderTopWidth: 1,
        borderTopColor: customColors.grey100,
        alignItems: "center",
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.round,
        borderWidth: 1.5,
        borderColor: "#FEE2E2",
        backgroundColor: "#FEF2F2",
        gap: spacing.sm,
    },
    logoutText: {
        ...typography.subtitle2(),
        color: "#DC2626",
        fontWeight: "600",
    },
    footerDivider: {
        width: responsiveSize(40),
        height: 1,
        backgroundColor: customColors.grey200,
        marginVertical: spacing.md,
    },
    footerText: {
        ...typography.caption(),
        color: customColors.grey400,
    },
});
