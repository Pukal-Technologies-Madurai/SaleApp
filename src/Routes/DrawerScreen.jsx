import {
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
    StatusBar,
    Linking,
    ScrollView,
} from "react-native";
import React, { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import IconAntDesign from "react-native-vector-icons/AntDesign";
import IconFont from "react-native-vector-icons/FontAwesome6";
import IconMaterial from "react-native-vector-icons/MaterialIcons";
import { customColors, typography, shadows, spacing } from "../Config/helper";

const DrawerScreen = ({ navigation }) => {
    const [activeItem, setActiveItem] = useState(null);

    const logout = async () => {
        try {
            await AsyncStorage.multiRemove([
                "Autheticate_Id",
                "userToken",
                "UserId",
                "userName",
                "Name",
                "UserType",
                "branchId",
                "branchName",
                "userTypeId",
            ]);
            ToastAndroid.show("Log out Successfully", ToastAndroid.LONG);

            navigation.reset({
                index: 0,
                routes: [{ name: "LoginPortal" }],
            });
            navigation.closeDrawer();
        } catch (err) {
            console.error("Error clearing AsyncStorage: ", err);
        }
    };

    const menuItems = [
        {
            icon: "account-circle",
            iconLibrary: "MaterialCommunityIcons",
            label: "Account",
            onPress: () => navigation.navigate("ProfileScreen"),
            bgColor: "#E8F5E8",
            iconColor: "#4CAF50",
        },
        {
            icon: "account-plus",
            iconLibrary: "MaterialCommunityIcons",
            label: "Add Retailer",
            onPress: () => navigation.navigate("AddCustomer"),
            bgColor: "#E3F2FD",
            iconColor: "#2196F3",
        },
        {
            icon: "map-marker-path",
            iconLibrary: "MaterialCommunityIcons",
            label: "Set Route",
            onPress: () => navigation.navigate("RoutePath"),
            bgColor: "#FFF3E0",
            iconColor: "#FF9800",
        },
        {
            icon: "cog",
            iconLibrary: "MaterialCommunityIcons",
            label: "Master Info",
            onPress: () => navigation.navigate("MasterData"),
            bgColor: "#F3E5F5",
            iconColor: "#9C27B0",
        },
        {
            icon: "receipt-long",
            iconLibrary: "MaterialIcons",
            label: "Collection",
            onPress: () => navigation.navigate("BillSummary"),
            bgColor: "#FDF2F8",
            iconColor: "#EC4899",
        },
        {
            icon: "cellphone-cog",
            iconLibrary: "MaterialCommunityIcons",
            label: "App Settings",
            onPress: () => Linking.openSettings(),
            bgColor: "#FFEBEE",
            iconColor: "#F44336",
        },
    ];

    const renderIcon = (iconLibrary, iconName, color) => {
        switch (iconLibrary) {
            case "MaterialCommunityIcons":
                return <Icon name={iconName} size={22} color={color} />;
            case "FontAwesome6":
                return <IconFont name={iconName} size={20} color={color} />;
            case "MaterialIcons":
                return <IconMaterial name={iconName} size={20} color={color} />;
            case "AntDesign":
                return (
                    <IconAntDesign name={iconName} size={20} color={color} />
                );
            default:
                return <Icon name={iconName} size={22} color={color} />;
        }
    };

    const pkg = require("../../package.json");
    const appVersion = pkg.version;

    return (
        <View style={styles.drawerContainer}>
            <StatusBar backgroundColor={customColors.primaryDark} translucent />

            {/* Modern Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.appName}>Pukal Virpanai</Text>
                        <Text style={styles.appSubtitle}>Sales Management</Text>
                    </View>
                    <View style={styles.versionContainer}>
                        <Text style={styles.appVersion}>v{appVersion}</Text>
                    </View>
                </View>
            </View>

            {/* Modern Menu */}
            <ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}>
                <View style={styles.menuSection}>
                    {menuItems.map((item, index) => (
                        <DrawerItem
                            key={index}
                            item={item}
                            isActive={activeItem === index}
                            onPress={() => {
                                setActiveItem(index);
                                item.onPress();
                            }}
                            renderIcon={renderIcon}
                        />
                    ))}
                </View>
            </ScrollView>

            {/* Modern Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={logout}
                    activeOpacity={0.8}>
                    <View style={styles.logoutIconContainer}>
                        <Icon
                            name="logout"
                            size={20}
                            color={customColors.white}
                        />
                    </View>
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const DrawerItem = ({ item, isActive, onPress, renderIcon }) => (
    <TouchableOpacity
        style={[styles.drawerItem, isActive && styles.activeDrawerItem]}
        onPress={onPress}
        activeOpacity={0.7}>
        <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
            {renderIcon(item.iconLibrary, item.icon, item.iconColor)}
        </View>
        <Text
            style={[
                styles.drawerItemText,
                isActive && styles.activeDrawerItemText,
            ]}>
            {item.label}
        </Text>
        <Icon
            name="chevron-right"
            size={16}
            color={isActive ? customColors.primary : customColors.grey400}
        />
    </TouchableOpacity>
);

export default DrawerScreen;

const styles = StyleSheet.create({
    drawerContainer: {
        flex: 1,
        backgroundColor: customColors.white,
        marginBottom: spacing.md,
    },
    header: {
        backgroundColor: customColors.primaryDark,
        paddingTop: StatusBar.currentHeight + 30,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTextContainer: {
        flex: 1,
    },
    appName: {
        ...typography.h5(),
        color: customColors.white,
        fontWeight: "800",
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    appSubtitle: {
        ...typography.body2(),
        color: customColors.white + "CC", // 80% opacity
        fontWeight: "400",
        letterSpacing: 0.3,
    },
    versionContainer: {
        backgroundColor: "rgba(255,255,255,0.15)",
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },
    appVersion: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "600",
        fontSize: 11,
        letterSpacing: 0.5,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: spacing.lg,
    },
    menuSection: {
        paddingTop: spacing.lg,
    },
    drawerItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        marginHorizontal: spacing.sm,
        marginVertical: 2,
        borderRadius: 12,
        backgroundColor: "transparent",
    },
    activeDrawerItem: {
        backgroundColor: customColors.primary + "08",
        borderLeftWidth: 3,
        borderLeftColor: customColors.primary,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.md,
    },
    drawerItemText: {
        ...typography.body1(),
        color: customColors.grey800,
        fontWeight: "500",
        flex: 1,
        letterSpacing: 0.2,
    },
    activeDrawerItemText: {
        color: customColors.primary,
        fontWeight: "600",
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: "#F0F0F0",
        backgroundColor: customColors.white,
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        ...shadows.medium,
    },
    logoutIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.sm,
    },
    logoutText: {
        ...typography.body1(),
        color: customColors.white,
        fontWeight: "600",
        flex: 1,
        letterSpacing: 0.3,
    },
});
