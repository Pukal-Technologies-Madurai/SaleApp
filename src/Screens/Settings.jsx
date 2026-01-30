import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import React from "react";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../Components/AppHeader";
import { customColors, typography, spacing, shadows } from "../Config/helper";

const Settings = () => {
    const navigation = useNavigation();

    const settingsOptions = [
        {
            id: 1,
            title: "Set Route",
            subtitle: "Configure delivery routes",
            icon: "route",
            iconColor: customColors.primary,
            onPress: () => navigation.navigate("RoutePath")
        },
        {
            id: 2,
            title: "Master Data",
            subtitle: "Manage system data",
            icon: "storage",
            iconColor: customColors.success,
            onPress: () => navigation.navigate("MasterData")
        },
        {
            id: 3,
            title: "Set Stock Godown",
            subtitle: "Configure warehouse settings",
            icon: "warehouse",
            iconColor: customColors.accent2,
            onPress: () => navigation.navigate("MasterGodown")
        }
    ];

    const renderSettingsItem = (item) => (
        <TouchableOpacity
            key={item.id}
            style={styles.settingsCard}
            onPress={item.onPress}
            activeOpacity={0.7}>
            <View style={styles.iconContainer}>
                <MaterialIcons
                    name={item.icon}
                    size={24}
                    color={item.iconColor}
                />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.settingsTitle}>{item.title}</Text>
                <Text style={styles.settingsSubtitle}>{item.subtitle}</Text>
            </View>
            <MaterialIcons
                name="chevron-right"
                size={24}
                color={customColors.grey400}
            />
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
                    <Text style={styles.sectionTitle}>Configuration</Text>
                    <View style={styles.settingsGroup}>
                        {settingsOptions.map(renderSettingsItem)}
                    </View>
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
        backgroundColor: customColors.background,
    },
    settingsSection: {
        padding: spacing.lg,
    },
    sectionTitle: {
        ...typography.h6(),
        color: customColors.grey700,
        fontWeight: "600",
        marginBottom: spacing.md,
        paddingHorizontal: spacing.xs,
    },
    settingsGroup: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        overflow: "hidden",
        ...shadows.small,
    },
    settingsCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: customColors.grey50,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
    },
    textContainer: {
        flex: 1,
    },
    settingsTitle: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: spacing.xs,
    },
    settingsSubtitle: {
        ...typography.body2(),
        color: customColors.grey600,
        lineHeight: 18,
    },
})