import React, { useCallback, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Feather from "react-native-vector-icons/Feather";
import AppHeader from "../Components/AppHeader";
import { customColors, typography, spacing, shadows } from "../Config/helper";
import { useQuery } from "@tanstack/react-query";
import { fetchSaleInvoices, fetchSaleOrder } from "../Api/sales";

const StatisticsScreen = ({ route, navigation }) => {
    const {
        title,
        type = "saleOrder", // "saleOrder" | "invoice"
        selectedDate,
        selectedBranch,
    } = route.params;

    const isSaleOrder = type === "saleOrder";

    const [refreshing, setRefreshing] = useState(false);

    const {
        data: saleOrderData = [],
        isLoading: isSaleOrderLoading,
        refetch: refetchSaleOrder,
    } = useQuery({
        queryKey: ["saleOrders", selectedDate, selectedBranch],
        queryFn: () =>
            fetchSaleOrder({
                from: selectedDate,
                to: selectedDate,
                branchId: selectedBranch,
            }),
        enabled: !!selectedDate && isSaleOrder,
    });

    const {
        data: saleInvoiceData = [],
        isLoading: isInvoiceLoading,
        refetch: refetchInvoice,
    } = useQuery({
        queryKey: ["saleInvoices", selectedDate, selectedBranch],
        queryFn: () =>
            fetchSaleInvoices({
                from: selectedDate,
                to: selectedDate,
                branchId: selectedBranch,
            }),
        enabled: !!selectedDate && !isSaleOrder,
    });

    const rawData = isSaleOrder ? saleOrderData : saleInvoiceData;

    // Backend doesn't filter by Branch_Id, so filter client-side
    const activeData = useMemo(() => {
        if (!selectedBranch && selectedBranch !== 0) return rawData;
        return rawData.filter(
            (item) => String(item.Branch_Id) === String(selectedBranch)
        );
    }, [rawData, selectedBranch]);
    const isLoading = isSaleOrder ? isSaleOrderLoading : isInvoiceLoading;

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            if (isSaleOrder) await refetchSaleOrder();
            else await refetchInvoice();
        } finally {
            setRefreshing(false);
        }
    }, [isSaleOrder, refetchSaleOrder, refetchInvoice]);

    // Group raw records by salesperson AND sale type, so the same person's
    // live sales (invoice created + delivered + collected on the spot,
    // Voucher_Type 13) show as a separate card from their converted sale
    // orders (invoiced by admin, Sales_Person_Name carries the person)
    const groupedData = useMemo(() => {
        const map = {};
        for (const item of activeData) {
            const isLiveSale = item.Voucher_Type === "13" && item.VoucherTypeGet === "LIVE_SALES_INVOICE";
            const name = item.Sales_Person_Name === "unknown" ? item.Created_BY_Name || "Unknown" : item.Sales_Person_Name || item.Created_BY_Name || "Unknown";
            const isCreatedByAdmin = item.Created_BY_Name?.toLowerCase() === "admin";
            const id = (!isSaleOrder && isCreatedByAdmin)
                ? item.Sales_Person_Name
                : (item.Sales_Person_Id || item.Created_by);
            const isCancelled = item.Cancel_status === "0";

            const key = `${name}|${isLiveSale ? "live" : "regular"}`;
            if (!map[key]) {
                map[key] = {
                    salesPersonId: id,
                    name,
                    count: 0,
                    totalValue: 0,
                    cancelledCount: 0,
                    activeCount: 0,
                    liveSale: isLiveSale,
                };
            }
            map[key].count++;
            map[key].totalValue += item.Total_Invoice_value || 0;
            if (isCancelled) {
                map[key].cancelledCount++;
            } else {
                map[key].activeCount++;
            }
        }
        return Object.values(map).sort((a, b) => b.totalValue - a.totalValue);
    }, [activeData]);

    const summary = useMemo(() => ({
        // A person with both live and converted invoices has two cards
        // but counts once here
        salesPersonCount: new Set(groupedData.map(p => p.name)).size,
        totalOrders: groupedData.reduce((s, p) => s + p.count, 0),
        totalAmount: groupedData.reduce((s, p) => s + p.totalValue, 0),
    }), [groupedData]);

    // ─── Summary Card ─────────────────────────────────────────────────────────
    const renderSummaryCard = () => {
        const gradientColors = ["#3B82F6", "#2563EB", "#1D4ED8"];

        return (
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                    <View style={styles.summaryIconWrapper}>
                        <MaterialIcons
                            name={isSaleOrder ? "bar-chart" : "receipt-long"}
                            size={24}
                            color="#FFFFFF"
                        />
                    </View>
                    <Text style={styles.summaryTitle}>
                        {selectedDate === new Date().toISOString().split("T")[0]
                            ? "Today's Summary"
                            : new Date(selectedDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })}
                    </Text>
                </View>

                <View style={styles.summaryStatsRow}>
                    <View style={styles.summaryStatItem}>
                        <Text style={styles.summaryStatValue}>
                            {summary.salesPersonCount}
                        </Text>
                        <Text style={styles.summaryStatLabel}>Salespersons</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryStatItem}>
                        <Text style={styles.summaryStatValue}>
                            {summary.totalOrders}
                        </Text>
                        <Text style={styles.summaryStatLabel}>
                            {isSaleOrder ? "Total Orders" : "Total Invoices"}
                        </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryStatItem}>
                        <Text style={styles.summaryStatValue}>
                            ₹{(summary.totalAmount / 1000).toFixed(1)}K
                        </Text>
                        <Text style={styles.summaryStatLabel}>Revenue</Text>
                    </View>
                </View>
            </LinearGradient>
        );
    };

    const renderSectionHeader = () => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
                {isSaleOrder ? "Sales by Person" : "Invoices by Person"}
            </Text>
            <Text style={styles.sectionSubtitle}>
                {summary.salesPersonCount} active
            </Text>
        </View>
    );

    const renderPersonCard = ({ item: person }) => {
        const hasCancelled = person.cancelledCount > 0;

        return (
            <TouchableOpacity
                style={styles.personCard}
                activeOpacity={0.7}
                onPress={() =>
                    navigation.navigate(type === "saleOrder" ? "SalesAdmin" : "SaleInvoiceList", {
                        selectedDate,
                        selectedBranch: selectedBranch || "",
                        selectedSalesPersonId: person.salesPersonId,
                        ...(type !== "saleOrder" && { isAdmin: true }),
                    })
                }>
                <View style={styles.cardHeader}>
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={
                                hasCancelled
                                    ? ["#F87171", "#EF4444"]
                                    : ["#34D399", "#10B981"]
                            }
                            style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {person.name.charAt(0).toUpperCase()}
                            </Text>
                        </LinearGradient>
                    </View>

                    {/* Name + badges */}
                    <View style={styles.cardTitleSection}>
                        <Text style={styles.personName} numberOfLines={1}>
                            {person.name} {person.liveSale ? "(Live Sales)" : ""}
                        </Text>
                        <View style={styles.badgeRow}>
                            <View style={[styles.badge, { backgroundColor: "#DBEAFE" }]}>
                                <Text style={[styles.badgeText, { color: "#2563EB" }]}>
                                    {person.count}{" "}
                                    {isSaleOrder ? "orders" : "invoices"}
                                </Text>
                            </View>
                            {hasCancelled && (
                                <View
                                    style={[
                                        styles.badge,
                                        { backgroundColor: "#FEE2E2" },
                                    ]}>
                                    <Text
                                        style={[
                                            styles.badgeText,
                                            { color: "#DC2626" },
                                        ]}>
                                        {person.cancelledCount} cancelled
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.arrowContainer}>
                        <Feather
                            name="chevron-right"
                            size={20}
                            color={customColors.grey400}
                        />
                    </View>
                </View>

                <View style={styles.cardDivider} />

                {/* Stats row */}
                <View style={styles.cardStats}>
                    <View style={styles.statBlock}>
                        <View style={styles.statIconWrapper}>
                            <MaterialIcons
                                name="receipt-long"
                                size={16}
                                color="#10B981"
                            />
                        </View>
                        <View>
                            <Text style={styles.statBlockLabel}>
                                Active {isSaleOrder ? "Sales" : "Invoices"}
                            </Text>
                            <Text style={styles.statBlockValue}>
                                {person.activeCount}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.statBlock}>
                        <View
                            style={[
                                styles.statIconWrapper,
                                { backgroundColor: "#FEF3C7" },
                            ]}>
                            <MaterialIcons
                                name="currency-rupee"
                                size={16}
                                color="#D97706"
                            />
                        </View>
                        <View>
                            <Text style={styles.statBlockLabel}>Total Value</Text>
                            <Text
                                style={[
                                    styles.statBlockValue,
                                    { color: "#D97706" },
                                ]}>
                                ₹
                                {person.totalValue.toLocaleString("en-IN", {
                                    maximumFractionDigits: 0,
                                })}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // ─── Loading ──────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <AppHeader
                    navigation={navigation}
                    title={`${title} Statistics`}
                    showBackButton={true}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customColors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    // ─── Main ─────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                navigation={navigation}
                title={`${title} Statistics`}
                showBackButton={true}
                showRightIcon={true}
                rightIconLibrary="FeatherIcon"
                rightIconName="arrow-up-right"
                onRightPress={() =>
                    navigation.navigate(type === "saleOrder" ? "SalesAdmin" : "SaleInvoiceList", {
                        selectedDate,
                        selectedBranch: selectedBranch || "",
                        ...(type !== "saleOrder" && { isAdmin: true }),
                    })
                }
            />

            <FlatList
                data={groupedData}
                keyExtractor={(item) =>
                    String(item.salesPersonId) +
                    item.name +
                    (item.liveSale ? "-live" : "")
                }
                renderItem={renderPersonCard}
                ListHeaderComponent={
                    <>
                        {renderSummaryCard()}
                        {groupedData.length > 0 && renderSectionHeader()}
                    </>
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[customColors.primary]}
                        tintColor={customColors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.noDataContainer}>
                        <MaterialCommunityIcons
                            name="chart-box-outline"
                            size={64}
                            color={customColors.grey300}
                        />
                        <Text style={styles.noDataTitle}>No Sales Data</Text>
                        <Text style={styles.noDataText}>
                            No {isSaleOrder ? "orders" : "invoices"} found for this date
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.background,
    },
    listContent: {
        flexGrow: 1,
        padding: spacing.md,
        paddingBottom: spacing.xl,
        backgroundColor: customColors.background,
    },

    // ── Summary Card
    summaryCard: {
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    summaryHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    summaryIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    summaryTitle: {
        ...typography.h6(),
        color: "#FFFFFF",
        fontWeight: "600",
    },
    summaryStatsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    summaryStatItem: {
        flex: 1,
        alignItems: "center",
    },
    summaryStatValue: {
        ...typography.h5(),
        color: "#FFFFFF",
        fontWeight: "700",
        marginBottom: 4,
    },
    summaryStatLabel: {
        ...typography.caption(),
        color: "rgba(255,255,255,0.8)",
    },
    summaryDivider: {
        width: 1,
        height: 40,
        backgroundColor: "rgba(255,255,255,0.2)",
    },

    // ── Section header
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        ...typography.body1(),
        fontWeight: "600",
        color: customColors.grey800,
    },
    sectionSubtitle: {
        ...typography.caption(),
        color: customColors.grey500,
    },

    // ── Person Card
    personCard: {
        backgroundColor: customColors.white,
        borderRadius: 14,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.small,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatarContainer: {
        marginRight: spacing.sm,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        ...typography.h6(),
        color: "#FFFFFF",
        fontWeight: "700",
    },
    cardTitleSection: {
        flex: 1,
    },
    personName: {
        ...typography.body1(),
        fontWeight: "600",
        color: customColors.grey900,
        marginBottom: 4,
    },
    badgeRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeText: {
        ...typography.caption(),
        fontWeight: "500",
    },
    arrowContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: customColors.grey100,
        alignItems: "center",
        justifyContent: "center",
    },
    cardDivider: {
        height: 1,
        backgroundColor: customColors.grey100,
        marginVertical: spacing.sm,
    },
    cardStats: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    statBlock: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    statIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#D1FAE5",
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.sm,
    },
    statBlockLabel: {
        ...typography.caption(),
        color: customColors.grey500,
        marginBottom: 1,
    },
    statBlockValue: {
        ...typography.body2(),
        fontWeight: "600",
        color: "#059669",
    },

    // ── Empty
    noDataContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    noDataTitle: {
        ...typography.h6(),
        color: customColors.grey600,
        marginTop: 16,
        marginBottom: 4,
    },
    noDataText: {
        ...typography.body2(),
        color: customColors.grey400,
        textAlign: "center",
    },
});

export default StatisticsScreen;

