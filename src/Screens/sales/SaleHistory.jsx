import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    LayoutAnimation,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import FeatherIcon from "react-native-vector-icons/Feather";
import FontAwesomeIcon from "react-native-vector-icons/FontAwesome";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { fetchSaleInvoices } from "../../Api/sales";
import {
    customColors,
    shadows,
    typography,
    spacing,
    borderRadius,
    iconSizes,
} from "../../Config/helper";
import { toYMD } from "../../Config/functions";

/* ─── Status helpers ─────────────────────────────────────── */

const PAYMENT_MODE = {
    1: { label: "Cash", icon: "inr" },
    2: { label: "G-Pay", icon: "smartphone" },
    3: { label: "Credit", icon: "credit-card" },
};

const PAYMENT_STATUS = {
    0: { label: "Pending", color: customColors.warning, bg: customColors.warningFaded },
    1: { label: "Pending", color: customColors.warning, bg: customColors.warningFaded },
    3: { label: "Completed", color: customColors.success, bg: customColors.successFaded },
};

const DELIVERY_STATUS = {
    0: { label: "Cancelled", color: customColors.error },
    1: { label: "New", color: customColors.info },
    5: { label: "Pending", color: customColors.warning },
    6: { label: "Returned", color: customColors.accent2 },
    7: { label: "Delivered", color: customColors.success },
};

const StatusBadge = ({ label, color, bg }) => (
    <View style={[styles.badge, { backgroundColor: bg || color + "15" }]}>
        <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
);

/* ─── Expandable Invoice Card ─────────────────────────────── */
const InvoiceCard = ({ sale }) => {
    const [expanded, setExpanded] = useState(false);

    const toggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(v => !v);
    };

    const paymentModeInfo = PAYMENT_MODE[sale.Payment_Mode] || { label: "—", icon: "inr" };
    const paymentStatusInfo = PAYMENT_STATUS[sale.Payment_Status] || { label: "—", color: customColors.grey500, bg: customColors.grey100 };
    const deliveryInfo = DELIVERY_STATUS[sale.Delivery_Status] || { label: "—", color: customColors.grey500 };

    const formattedDate = sale.Do_Date
        ? new Date(sale.Do_Date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
        : "—";

    return (
        <View style={styles.card}>
            {/* ── Card Header ── */}
            <TouchableOpacity
                style={styles.cardHeader}
                onPress={toggle}
                activeOpacity={0.8}>
                <View style={styles.headerLeft}>
                    <View style={styles.invoiceIconWrap}>
                        <FeatherIcon name="file-text" size={iconSizes.lg} color={customColors.primary} />
                    </View>
                    <View>
                        <Text style={styles.invoiceNo}>{sale.Do_Inv_No || `#${sale.Do_No}`}</Text>
                        <Text style={styles.invoiceDate}>{formattedDate}</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.totalValue}>₹{sale.Total_Invoice_value?.toFixed(2)}</Text>
                    <FeatherIcon
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={iconSizes.md}
                        color={customColors.grey500}
                    />
                </View>
            </TouchableOpacity>

            {/* ── Status Row ── */}
            <View style={styles.statusRow}>
                <View style={[styles.badge, { backgroundColor: deliveryInfo.color + "15" }]}>
                    <Text style={[styles.badgeText, { color: deliveryInfo.color }]}>
                        {deliveryInfo.label}
                    </Text>
                </View>
                <StatusBadge {...paymentStatusInfo} />
                <View style={styles.paymentModeChip}>
                    <FontAwesomeIcon name={paymentModeInfo.icon} size={iconSizes.xs} color={customColors.grey600} />
                    <Text style={styles.paymentModeText}>{paymentModeInfo.label}</Text>
                </View>
            </View>

            {/* ── Expanded: Products ── */}
            {expanded && (
                <View style={styles.expandedSection}>
                    {/* Products */}
                    <Text style={styles.sectionLabel}>Products</Text>
                    {(sale.Products_List || []).map((product, idx) => (
                        <View
                            key={product.DO_St_Id || idx}
                            style={[
                                styles.productRow,
                                idx < sale.Products_List.length - 1 && styles.productRowBorder,
                            ]}>
                            <View style={styles.productLeft}>
                                <View style={styles.sNoCircle}>
                                    <Text style={styles.sNoText}>{product.S_No}</Text>
                                </View>
                                <View style={styles.productInfo}>
                                    <Text style={styles.productName} numberOfLines={2}>
                                        {product.Product_Name}
                                    </Text>
                                    <View style={styles.productMeta}>
                                        <Text style={styles.metaTag}>{product.BrandGet}</Text>
                                        <Text style={styles.metaTag}>{product.UOM}</Text>
                                        <Text style={styles.metaTag}>HSN: {product.HSN_Code}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.productRight}>
                                <Text style={styles.productQty}>×{product.Act_Qty}</Text>
                                <Text style={styles.productRate}>₹{product.Item_Rate}/u</Text>
                                <Text style={styles.productTotal}>₹{product.Final_Amo?.toFixed(2)}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

/* ─── Main Screen ─────────────────────────────────────────── */
const SaleHistory = ({ route }) => {
    const { item } = route.params;
    const navigation = useNavigation();

    const toDate = new Date();
    const from = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
    toYMD(from);
    const to = toDate.toISOString().split("T")[0];

    const [selectedFromDate, setSelectedFromDate] = useState(from);
    const [selectedToDate, setSelectedToDate] = useState(to);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        setSelectedFromDate(from);
        setSelectedToDate(to);
    }, []);

    const { data: salesData = [], isLoading } = useQuery({
        queryKey: ["salesData", item.Retailer_Id, selectedFromDate, selectedToDate],
        queryFn: () =>
            fetchSaleInvoices({
                retailerId: item.Retailer_Id,
                from: selectedFromDate,
                to: selectedToDate,
            }),
        enabled: !!item.Retailer_Id,
    });

    const handleFromDateChange = date => {
        if (date instanceof Date && !isNaN(date)) {
            setSelectedFromDate(date > selectedToDate ? selectedToDate : date);
        }
    };

    const handleToDateChange = date => {
        if (date instanceof Date && !isNaN(date)) {
            setSelectedToDate(date < selectedFromDate ? selectedFromDate : date);
        }
    };

    /* Summary totals */
    const totalInvoices = salesData.length;
    const grandTotal = salesData.reduce((s, d) => s + (d.Total_Invoice_value || 0), 0);

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title={item.Retailer_Name}
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="FeatherIcon"
                rightIconName="filter"
                onRightPress={() => setModalVisible(true)}
            />

            <FilterModal
                visible={modalVisible}
                fromDate={selectedFromDate}
                toDate={selectedToDate}
                onFromDateChange={handleFromDateChange}
                onToDateChange={handleToDateChange}
                onApply={() => setModalVisible(false)}
                onClose={() => setModalVisible(false)}
                showToDate={true}
                title="Select Date Range"
                fromLabel="From Date"
                toLabel="To Date"
            />

            <View style={styles.contentContainer}>
                {/* ── Summary Bar ── */}
                {totalInvoices > 0 && (
                    <View style={styles.summaryBar}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryNum}>{totalInvoices}</Text>
                            <Text style={styles.summaryLbl}>Invoices</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryNum}>₹{grandTotal.toFixed(2)}</Text>
                            <Text style={styles.summaryLbl}>Grand Total</Text>
                        </View>
                    </View>
                )}

                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={[
                        styles.scrollContent,
                        salesData.length === 0 && styles.emptyContent,
                    ]}
                    showsVerticalScrollIndicator={false}>
                    {isLoading ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <FeatherIcon name="loader" size={iconSizes.xxl} color={customColors.grey300} />
                            </View>
                            <Text style={styles.emptyText}>Loading...</Text>
                        </View>
                    ) : salesData.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <FeatherIcon name="file-text" size={iconSizes.xxl} color={customColors.grey300} />
                            </View>
                            <Text style={styles.emptyTitle}>No Invoices Found</Text>
                            <Text style={styles.emptyText}>Try adjusting the date range</Text>
                        </View>
                    ) : (
                        salesData.map((sale, idx) => (
                            <InvoiceCard key={sale.Do_Id || idx} sale={sale} />
                        ))
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

export default SaleHistory;

/* ─── Styles ──────────────────────────────────────────────── */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.grey50,
    },

    /* Summary bar */
    summaryBar: {
        flexDirection: "row",
        backgroundColor: customColors.white,
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        borderRadius: borderRadius.xl,
        paddingVertical: spacing.md,
        ...shadows.small,
        marginBottom: spacing.sm,
    },
    summaryItem: {
        flex: 1,
        alignItems: "center",
    },
    summaryNum: {
        ...typography.h6(),
        fontWeight: "700",
        color: customColors.primary,
    },
    summaryLbl: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: spacing.xxs,
    },
    summaryDivider: {
        width: 1,
        backgroundColor: customColors.grey200,
        marginVertical: spacing.xs,
    },

    /* Scroll */
    scrollContainer: { flex: 1 },
    scrollContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xl,
    },
    emptyContent: {
        flex: 1,
        justifyContent: "center",
    },

    /* Empty state */
    emptyState: {
        alignItems: "center",
        paddingVertical: spacing.xxl,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    emptyTitle: {
        ...typography.h6(),
        color: customColors.grey700,
        fontWeight: "600",
        marginBottom: spacing.xs,
    },
    emptyText: {
        ...typography.body2(),
        color: customColors.grey500,
    },

    /* Card */
    card: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.md,
        ...shadows.small,
        overflow: "hidden",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: spacing.md,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        gap: spacing.sm,
    },
    invoiceIconWrap: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.lg,
        backgroundColor: customColors.primaryFaded,
        justifyContent: "center",
        alignItems: "center",
    },
    invoiceNo: {
        ...typography.body1(),
        fontWeight: "700",
        color: customColors.grey900,
    },
    invoiceDate: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: spacing.xxs,
    },
    headerRight: {
        alignItems: "flex-end",
        gap: spacing.xs,
    },
    totalValue: {
        ...typography.body1(),
        fontWeight: "700",
        color: customColors.primary,
    },

    /* Status row */
    statusRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.round,
    },
    badgeText: {
        ...typography.caption(),
        fontWeight: "600",
    },
    paymentModeChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey100,
    },
    paymentModeText: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "600",
    },

    /* Expanded section */
    expandedSection: {
        padding: spacing.md,
        backgroundColor: customColors.grey50,
    },
    sectionLabel: {
        ...typography.caption(),
        fontWeight: "700",
        color: customColors.grey500,
        letterSpacing: 0.8,
        textTransform: "uppercase",
        marginBottom: spacing.sm,
    },

    /* Product row */
    productRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: spacing.sm,
    },
    productRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    productLeft: {
        flexDirection: "row",
        flex: 1,
        gap: spacing.sm,
        alignItems: "flex-start",
    },
    sNoCircle: {
        width: 24,
        height: 24,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.primaryFaded,
        justifyContent: "center",
        alignItems: "center",
        marginTop: spacing.xxs,
    },
    sNoText: {
        ...typography.caption(),
        fontWeight: "700",
        color: customColors.primary,
    },
    productInfo: { flex: 1 },
    productName: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: spacing.xs,
    },
    productMeta: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.xs,
    },
    metaTag: {
        ...typography.caption(),
        color: customColors.grey500,
        backgroundColor: customColors.grey100,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.sm,
    },
    productRight: {
        alignItems: "flex-end",
        gap: spacing.xxs,
    },
    productQty: {
        ...typography.caption(),
        color: customColors.grey500,
        fontWeight: "600",
    },
    productRate: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    productTotal: {
        ...typography.body2(),
        fontWeight: "700",
        color: customColors.grey900,
    },
});
