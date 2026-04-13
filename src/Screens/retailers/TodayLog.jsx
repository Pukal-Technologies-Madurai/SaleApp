import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Linking,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import {
    customColors,
    typography,
    spacing,
    shadows,
    borderRadius,
    iconSizes,
} from "../../Config/helper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchRetailers } from "../../Api/retailers";
import FeatherIcon from "react-native-vector-icons/Feather";
import AppHeader from "../../Components/AppHeader";
import { formatDate, formatTime } from "../../Config/functions";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";

const TodayLog = () => {
    const navigation = useNavigation();
    const [companyId, setCompanyId] = useState();
    const [userId, setUserId] = useState(null);
    const [today, setToday] = useState("");

    useEffect(() => {
        const currentDate = new Date();
        setToday(formatDate(currentDate));

        AsyncStorage.getItem("Company_Id").then(id => {
            setCompanyId(id);
        });
        AsyncStorage.getItem("UserId").then(id => {
            setUserId(id);
        });
    }, []);

    const dailyDate = new Date().toISOString().split("T")[0];

    const { data: logData = [] } = useQuery({
        queryKey: ["retailers", companyId, userId],
        queryFn: () => fetchRetailers(companyId),
        enabled: !!companyId && !!userId,
        select: data => {
            return data.filter(item => {
                const createdDate = item.Created_Date?.split("T")[0];
                return createdDate === dailyDate;
            });
        },
    });

    const renderItem = ({ item }) => (
        <View style={styles.cardContainer}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
                <View style={styles.headerContent}>
                    <Text style={styles.shopName} numberOfLines={2}>
                        {item.Retailer_Name}
                    </Text>
                </View>
                <View style={styles.routeBadge}>
                    <Text style={styles.routeText}>{item.RouteGet || "No Route"}</Text>
                </View>
            </View>

            {/* Card Content */}
            <View style={styles.cardContent}>
                {/* Contact Info */}
                <View style={styles.infoSection}>
                    <TouchableOpacity
                        style={styles.infoRow}
                        onPress={() => Linking.openURL(`tel:${item.Mobile_No}`)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, styles.phoneIcon]}>
                            <FeatherIcon name="phone" size={iconSizes.sm} color={customColors.success} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Contact</Text>
                            <Text style={styles.infoValue}>
                                {item.Contact_Person} • {item.Mobile_No}
                            </Text>
                        </View>
                        <FeatherIcon name="phone-call" size={iconSizes.sm} color={customColors.success} />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View style={[styles.iconContainer, styles.locationIcon]}>
                            <FeatherIcon name="map-pin" size={iconSizes.sm} color={customColors.accent2} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Address</Text>
                            <Text style={styles.infoValue} numberOfLines={2}>
                                {item.Reatailer_Address}
                            </Text>
                            <Text style={styles.cityText}>
                                {item.Reatailer_City} - {item.PinCode}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                    <View style={styles.createdInfo}>
                        <FeatherIcon name="user" size={iconSizes.xs} color={customColors.grey500} />
                        <Text style={styles.createdText}>{item.createdBy}</Text>
                        <View style={styles.dot} />
                        <FeatherIcon name="clock" size={iconSizes.xs} color={customColors.grey500} />
                        <Text style={styles.createdText}>{formatTime(item.Created_Date)}</Text>
                    </View>
                    {item.Latitude && item.Longitude && (
                        <TouchableOpacity
                            style={styles.mapButton}
                            onPress={() => Linking.openURL(`https://www.google.com/maps?q=${item.Latitude},${item.Longitude}`)}
                            activeOpacity={0.8}
                        >
                            <FeatherIcon name="map" size={iconSizes.sm} color={customColors.white} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Today's Log"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="FeatherIcon"
                rightIconName="trending-up"
                onRightPress={() => navigation.navigate("SalesAdmin")}
            />

            <View style={styles.contentContainer}>
                {/* Summary Header */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryLeft}>
                        <View style={styles.summaryText}>
                            <Text style={styles.summaryTitle}>New Retailers</Text>
                            <Text style={styles.summaryDate}>{today}</Text>
                        </View>
                    </View>
                    <View style={styles.countContainer}>
                        <Text style={styles.countNumber}>{logData.length}</Text>
                        <Text style={styles.countLabel}>{logData.length === 1 ? "shop" : "shops"}</Text>
                    </View>
                </View>

                {logData.length > 0 ? (
                    <FlashList
                        data={logData}
                        keyExtractor={(item, index) => item.Retailer_Id?.toString() || index.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <FeatherIcon
                                name="calendar"
                                size={iconSizes.xxl}
                                color={customColors.grey300}
                            />
                        </View>
                        <Text style={styles.emptyText}>
                            No Shops recorded for today
                        </Text>
                        <Text style={styles.emptySubtext}>
                            New retailer entries will appear here
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.grey50,
    },
    // Summary Header
    summaryContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        margin: spacing.md,
        // borderRadius: borderRadius.xl,
        // padding: spacing.lg,
        // backgroundColor: customColors.white,
        // ...shadows.medium,
    },
    summaryLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    summaryText: {
        flex: 1,
    },
    summaryTitle: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    summaryDate: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: spacing.xxs,
    },
    countContainer: {
        alignItems: "center",
        backgroundColor: customColors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.xl,
    },
    countNumber: {
        ...typography.h4(),
        color: customColors.white,
        fontWeight: "800",
    },
    countLabel: {
        ...typography.caption(),
        color: "rgba(255,255,255,0.8)",
        fontWeight: "500",
    },
    listContainer: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.lg,
    },
    // Card Styles
    cardContainer: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.md,
        overflow: "hidden",
        ...shadows.small,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: spacing.sm,
        backgroundColor: customColors.primary,
    },
    headerContent: {
        flex: 1,
        marginRight: spacing.md,
    },
    shopName: {
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "700",
        marginBottom: spacing.xs,
    },
    routeBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.round,
        // alignSelf: "flex-start",
        gap: spacing.xs,
    },
    routeText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "500",
    },
    cardContent: {
        padding: spacing.xs,
    },
    infoSection: {
        backgroundColor: customColors.grey50,
        borderRadius: borderRadius.lg,
        overflow: "hidden",
        // marginBottom: spacing.md,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.sm,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.round,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
    },
    phoneIcon: {
        backgroundColor: "rgba(76, 175, 80, 0.12)",
    },
    locationIcon: {
        backgroundColor: "rgba(255, 87, 34, 0.12)",
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        ...typography.caption(),
        color: customColors.grey500,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: spacing.xxs,
    },
    infoValue: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "500",
    },
    cityText: {
        ...typography.caption(),
        color: customColors.grey600,
        marginTop: spacing.xxs,
    },
    divider: {
        height: 1,
        backgroundColor: customColors.grey200,
        marginHorizontal: spacing.md,
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: spacing.sm,
    },
    createdInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        gap: spacing.xs,
    },
    createdText: {
        ...typography.caption(),
        color: customColors.grey500,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: customColors.grey300,
    },
    mapButton: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.accent2,
        justifyContent: "center",
        alignItems: "center",
        ...shadows.small,
    },
    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.xl,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.lg,
    },
    emptyText: {
        ...typography.h6(),
        color: customColors.grey700,
        marginBottom: spacing.xs,
        textAlign: "center",
    },
    emptySubtext: {
        ...typography.body2(),
        color: customColors.grey500,
        textAlign: "center",
    },
});

export default TodayLog;
