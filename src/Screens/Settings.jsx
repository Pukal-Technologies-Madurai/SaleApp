import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import React from "react";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import FeatherIcon from "react-native-vector-icons/Feather";
import AppHeader from "../Components/AppHeader";
import { customColors, typography, spacing, shadows, borderRadius, iconSizes } from "../Config/helper";
import { appVersion } from "../Api/auth";

const Settings = () => {
    const navigation = useNavigation();
    const APPVERSION = appVersion();

    const settingsOptions = [
        {
            id: 1,
            title: "Set Route",
            subtitle: "Configure delivery routes",
            icon: "map-pin",
            iconColor: customColors.primary,
            bgColor: customColors.primaryFaded,
            onPress: () => navigation.navigate("RoutePath")
        },
        {
            id: 2,
            title: "Master Data",
            subtitle: "Manage system data",
            icon: "database",
            iconColor: customColors.success,
            bgColor: customColors.successFaded,
            onPress: () => navigation.navigate("MasterData")
        },
        {
            id: 3,
            title: "Set Stock Godown",
            subtitle: "Configure warehouse settings",
            icon: "package",
            iconColor: customColors.info,
            bgColor: customColors.infoFaded,
            onPress: () => navigation.navigate("MasterGodown")
        },
        {
            id: 4,
            title: "Set Stock Transfer",
            subtitle: "Manage stock transfers",
            icon: "repeat",
            iconColor: customColors.warning,
            bgColor: customColors.warningFaded,
            onPress: () => navigation.navigate("GodownTransfer")
        }
    ];

    const renderSettingsItem = (item, index) => (
        <TouchableOpacity
            key={item.id}
            style={[
                styles.settingsCard,
                index === settingsOptions.length - 1 && styles.lastCard
            ]}
            onPress={item.onPress}
            activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
                <FeatherIcon
                    name={item.icon}
                    size={iconSizes.lg}
                    color={item.iconColor}
                />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.settingsTitle}>{item.title}</Text>
                <Text style={styles.settingsSubtitle}>{item.subtitle}</Text>
            </View>
            <View style={styles.arrowContainer}>
                <FeatherIcon
                    name="chevron-right"
                    size={iconSizes.md}
                    color={customColors.grey400}
                />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <AppHeader
                navigation={navigation}
                title="Settings"
            />

            <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.settingsSection}>
                    <View style={styles.settingsGroup}>
                        {settingsOptions.map((item, index) => renderSettingsItem(item, index))}
                    </View>
                </View>

                {/* App Info */}
                <View style={styles.appInfoSection}>
                <Text style={styles.appVersion}>Version: {APPVERSION}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default Settings

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.grey50,
    },
    settingsSection: {
        padding: spacing.md,
    },
    settingsGroup: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        overflow: "hidden",
        ...shadows.small,
    },
    settingsCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    lastCard: {
        borderBottomWidth: 0,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
    },
    textContainer: {
        flex: 1,
    },
    settingsTitle: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: spacing.xxs,
    },
    settingsSubtitle: {
        ...typography.caption(),
        color: customColors.grey500,
        lineHeight: 16,
    },
    arrowContainer: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey50,
        justifyContent: "center",
        alignItems: "center",
    },
    appInfoSection: {
        alignItems: "center",
        paddingVertical: spacing.xl,
    },
    appVersion: {
        ...typography.caption(),
        color: customColors.grey400,
    },
})