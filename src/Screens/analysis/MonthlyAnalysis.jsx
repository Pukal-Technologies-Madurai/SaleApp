import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { customColors, typography, spacing, shadows, borderRadius } from "../../Config/helper";
import { fetchMonthlyAttance, fetchMonthlyCollection, fetchMonthlyDelivery, fetchMonthlySalesInvoice, fetchMonthlySalesOrder, fetchSalesPerson } from "../../Api/analysis";

const PAYMENT_MODE = {
    1: { label: "Cash", icon: "cash", color: customColors.success },
    2: { label: "G-Pay", icon: "cellphone", color: customColors.primary },
    3: { label: "Credit", icon: "credit-card-outline", color: customColors.warning },
};

const PAYMENT_STATUS = {
    0: { label: "Pending", color: customColors.warning },
    1: { label: "Pending", color: customColors.warning },
    3: { label: "Completed", color: customColors.success },
};

const DELIVERY_STATUS = {
    0: { label: "Cancelled", color: customColors.error },
    1: { label: "New", color: customColors.info },
    5: { label: "Pending", color: customColors.warning },
    6: { label: "Returned", color: customColors.accent2 },
    7: { label: "Delivered", color: customColors.success },
};

const formatINR = value => `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
const safePct = (part, total) => (total > 0 ? Math.min(100, Math.round((part / total) * 100)) : 0);

const StatCard = ({ icon, label, value, color }) => (
    <View style={styles.statCard}>
        <View style={[styles.statIconWrapper, { backgroundColor: `${color}1A` }]}>
            <MaterialCommunityIcons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {value}
        </Text>
        <Text style={styles.statLabel} numberOfLines={2}>
            {label}
        </Text>
    </View>
);

const SectionCard = ({ icon, title, children }) => (
    <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name={icon} size={18} color={customColors.primary} />
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {children}
    </View>
);

const FunnelRow = ({ label, value, sub, percent, color }) => (
    <View style={styles.funnelRow}>
        <View style={styles.funnelLabelRow}>
            <Text style={styles.funnelLabel}>{label}</Text>
            <Text style={styles.funnelValue}>
                {value}
                {sub ? <Text style={styles.funnelSub}>{`  ${sub}`}</Text> : null}
            </Text>
        </View>
        <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]} />
        </View>
    </View>
);

const BreakdownRow = ({ icon, label, count, value, color }) => (
    <View style={styles.breakdownRow}>
        <View style={styles.breakdownLeft}>
            <View style={[styles.breakdownDot, { backgroundColor: color }]} />
            {icon ? <MaterialCommunityIcons name={icon} size={14} color={customColors.grey600} style={styles.breakdownIcon} /> : null}
            <Text style={styles.breakdownLabel}>{label}</Text>
        </View>
        <View style={styles.breakdownRight}>
            <Text style={styles.breakdownCount}>{count}</Text>
            {value !== undefined ? <Text style={styles.breakdownValue}>{formatINR(value)}</Text> : null}
        </View>
    </View>
);

const EmptyRow = ({ text }) => <Text style={styles.emptyText}>{text}</Text>;

const MonthlyAnalysis = () => {
    const navigation = useNavigation();
    const [modalVisible, setModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const toDate = new Date();
    const from = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
    const to = toDate;

    const [uID, setUID] = useState(null);
    const [userTypeId, setUserTypeId] = useState(null);
    const [userName, setUserName] = useState(null);

    const [selectedFromDate, setSelectedFromDate] = useState(from);
    const [selectedToDate, setSelectedToDate] = useState(to);

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                const userTypeId = await AsyncStorage.getItem("userTypeId");
                const User_Name = await AsyncStorage.getItem("Name");

                setUID(userId);
                setUserTypeId(userTypeId);
                setUserName(User_Name);
            } catch (err) {
                console.log(err);
            }
        })();
        setSelectedFromDate(from);
        setSelectedToDate(to);
    }, []);

    const handleFromDateChange = date => {
        if (date instanceof Date && !isNaN(date)) {
            setSelectedFromDate(date > selectedToDate ? selectedToDate : date);
        }
    };

    const handleToDateChange = date => {
        if (date instanceof Date && !isNaN(date)) {
            setSelectedToDate(
                date < selectedFromDate ? selectedFromDate : date,
            );
        }
    };

    const ADMIN_USER_TYPES = ["0", "1", "2"];
    const isAdmin = ADMIN_USER_TYPES.includes(userTypeId);

    const [selectedSalesPerson, setSelectedSalesPerson] = useState(null);

    const { data: salesPerson = [], isLoading: isSalesPersonLoading } = useQuery({
        queryKey: ["salesPerson"],
        queryFn: () => fetchSalesPerson(),
        enabled: isAdmin,
    });

    const salesPersonOptions = useMemo(
        () => salesPerson.map(item => ({ label: item.Name, value: String(item.UserId) })),
        [salesPerson],
    );

    // Admins don't have their own sales data — nothing should fetch until they pick a salesperson.
    // Non-admins always see their own stats via uID.
    const effectiveUID = isAdmin ? (selectedSalesPerson?.value || null) : uID;
    const displayName = isAdmin ? (selectedSalesPerson?.label || null) : userName;

    const handleSalesPersonChange = item => {
        setSelectedSalesPerson(item);
    };

    const { data: attendanceData = [], isLoading: isAttendanceDataLoading, refetch: refetchAttendanceData } = useQuery({
        queryKey: ["attendance", selectedFromDate, selectedToDate, effectiveUID],
        queryFn: () => fetchMonthlyAttance(
            selectedFromDate.toISOString().split("T")[0],
            selectedToDate.toISOString().split("T")[0],
            effectiveUID,
            userTypeId
        ),
        select: data => data.filter(item => item.Cancel_status !== "0" && item.Cancel_status !== 0),
        enabled: !!selectedFromDate && !!selectedToDate && !!effectiveUID && !!userTypeId,
    });

    const { data: saleData = [], isLoading: isSaleDataLoading, refetch: refetchSaleData } = useQuery({
        queryKey: ["saleOrders", selectedFromDate, selectedToDate, effectiveUID],
        queryFn: () => fetchMonthlySalesOrder(
            selectedFromDate.toISOString().split("T")[0],
            selectedToDate.toISOString().split("T")[0],
            effectiveUID
        ),
        select: data => data.filter(item => item.Cancel_status !== "0" && item.Cancel_status !== 0),
        enabled: !!selectedFromDate && !!selectedToDate && !!effectiveUID,
    });

    const { data: invoiceData = [], isLoading: isInvoiceDataLoading, refetch: refetchInvoiceData } = useQuery({
        queryKey: ["saleInvoices", selectedFromDate, selectedToDate, effectiveUID],
        queryFn: () => fetchMonthlySalesInvoice(
            selectedFromDate.toISOString().split("T")[0],
            selectedToDate.toISOString().split("T")[0],
            effectiveUID
        ),
        select: data => data.filter(item => item.Cancel_status !== "0" && item.Cancel_status !== 0),
        enabled: !!selectedFromDate && !!selectedToDate && !!effectiveUID,
    });

    const { data: collectionData = [], isLoading: isCollectionDataLoading, refetch: refetchCollectionData } = useQuery({
        queryKey: ["collections", selectedFromDate, selectedToDate, effectiveUID],
        queryFn: () => fetchMonthlyCollection(
            selectedFromDate.toISOString().split("T")[0],
            selectedToDate.toISOString().split("T")[0],
            effectiveUID
        ),
        select: data => data.filter(item => item.status !== "0" && item.status !== 0),
        enabled: !!selectedFromDate && !!selectedToDate && !!effectiveUID,
    });

    const { data: deliveryData = [], isLoading: isDeliveryDataLoading, refetch: refetchDeliveryData } = useQuery({
        queryKey: ["deliveries", selectedFromDate, selectedToDate, effectiveUID],
        queryFn: () => fetchMonthlyDelivery(
            effectiveUID,
            selectedFromDate.toISOString().split("T")[0],
            selectedToDate.toISOString().split("T")[0]
        ),
        select: data => data.filter(item => item.Cancel_status !== "0" && item.Cancel_status !== 0),
        enabled: !!effectiveUID && !!selectedFromDate && !!selectedToDate,
    });

    const isInitialLoading =
        isAttendanceDataLoading || isSaleDataLoading || isInvoiceDataLoading || isCollectionDataLoading || isDeliveryDataLoading;

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                refetchAttendanceData(),
                refetchSaleData(),
                refetchInvoiceData(),
                refetchCollectionData(),
                refetchDeliveryData(),
            ]);
        } finally {
            setRefreshing(false);
        }
    }, [refetchAttendanceData, refetchSaleData, refetchInvoiceData, refetchCollectionData, refetchDeliveryData]);

    // ---- Attendance ----
    const attendanceStats = useMemo(() => {
        const daysPresent = attendanceData.length;
        const totalKm = attendanceData.reduce((sum, entry) => {
            const distance = Number(entry.End_KM) - Number(entry.Start_KM);
            return sum + (distance > 0 ? distance : 0);
        }, 0);
        const avgKm = daysPresent > 0 ? totalKm / daysPresent : 0;

        return { daysPresent, totalKm, avgKm };
    }, [attendanceData]);

    // ---- Sales Order funnel ----
    const orderStats = useMemo(() => {
        const totalOrders = saleData.length;
        const totalOrderValue = saleData.reduce((sum, o) => sum + (Number(o.Total_Invoice_value) || 0), 0);

        const convertedOrders = saleData.filter(o => Array.isArray(o.ConvertedInvoice) && o.ConvertedInvoice.length > 0);
        const convertedCount = convertedOrders.length;
        const pendingCount = totalOrders - convertedCount;

        const convertedInvoices = convertedOrders.flatMap(o => o.ConvertedInvoice);
        const convertedInvoiceValue = convertedInvoices.reduce((sum, inv) => sum + (Number(inv.invValue) || 0), 0);

        const deliveredCount = convertedInvoices.filter(inv => inv.deliveryStatusGet === "Delivered").length;
        const inTransitCount = convertedInvoices.length - deliveredCount;

        return {
            totalOrders,
            totalOrderValue,
            convertedCount,
            pendingCount,
            convertedInvoiceCount: convertedInvoices.length,
            convertedInvoiceValue,
            deliveredCount,
            inTransitCount,
        };
    }, [saleData]);

    // ---- Live Sales Invoice ----
    const invoiceStats = useMemo(() => {
        const liveInvoices = invoiceData.filter(
            inv => inv.Voucher_Type === "13" || inv.VoucherTypeGet === "LIVE_SALES_INVOICE",
        );

        const totalCount = liveInvoices.length;
        const totalValue = liveInvoices.reduce((sum, inv) => sum + (Number(inv.Total_Invoice_value) || 0), 0);

        const paymentStatusCounts = {};
        const paymentModeCounts = {};
        const deliveryStatusCounts = {};
        let completedValue = 0;

        liveInvoices.forEach(inv => {
            const pStatus = PAYMENT_STATUS[inv.Payment_Status] ? inv.Payment_Status : 0;
            paymentStatusCounts[pStatus] = (paymentStatusCounts[pStatus] || 0) + 1;
            if (Number(pStatus) === 3) completedValue += Number(inv.Total_Invoice_value) || 0;

            const pMode = PAYMENT_MODE[inv.Payment_Mode] ? inv.Payment_Mode : 1;
            paymentModeCounts[pMode] = (paymentModeCounts[pMode] || 0) + 1;

            const dStatus = DELIVERY_STATUS[inv.Delivery_Status] ? inv.Delivery_Status : 1;
            deliveryStatusCounts[dStatus] = (deliveryStatusCounts[dStatus] || 0) + 1;
        });

        return {
            totalCount,
            totalValue,
            completedValue,
            pendingValue: totalValue - completedValue,
            paymentStatusCounts,
            paymentModeCounts,
            deliveryStatusCounts,
        };
    }, [invoiceData]);

    // ---- Deliveries ----
    const deliveryStats = useMemo(() => {
        const totalCount = deliveryData.length;
        const totalValue = deliveryData.reduce((sum, d) => sum + (Number(d.Total_Invoice_value) || 0), 0);

        const paymentModeCounts = {};
        const deliveryStatusCounts = {};
        let completedValue = 0;
        let deliveredCount = 0;

        deliveryData.forEach(d => {
            const pStatus = PAYMENT_STATUS[d.Payment_Status] ? d.Payment_Status : 0;
            if (Number(pStatus) === 3) completedValue += Number(d.Total_Invoice_value) || 0;

            const pMode = PAYMENT_MODE[d.Payment_Mode] ? d.Payment_Mode : 1;
            paymentModeCounts[pMode] = (paymentModeCounts[pMode] || 0) + 1;

            const dStatus = DELIVERY_STATUS[d.Delivery_Status] ? d.Delivery_Status : 1;
            deliveryStatusCounts[dStatus] = (deliveryStatusCounts[dStatus] || 0) + 1;
            if (Number(dStatus) === 7) deliveredCount += 1;
        });

        return {
            totalCount,
            totalValue,
            completedValue,
            pendingValue: totalValue - completedValue,
            deliveredCount,
            paymentModeCounts,
            deliveryStatusCounts,
        };
    }, [deliveryData]);

    // ---- Payment Collection ----
    const collectionStats = useMemo(() => {
        const totalCollected = collectionData.reduce((sum, r) => sum + r.credit_amount, 0);
        const cashCollected = collectionData
            .filter(r => (r.debit_ledger_name || "").toLowerCase().includes("cash"))
            .reduce((sum, r) => sum + (Number(r.credit_amount) || 0), 0);
        const bankCollected = totalCollected - cashCollected;

        return {
            receiptCount: collectionData.length,
            totalCollected,
            cashCollected,
            bankCollected,
        };
    }, [collectionData]);

    const summaryStats = [
        {
            icon: "calendar-check",
            label: "Days Present",
            value: attendanceStats.daysPresent,
            color: customColors.info,
        },
        {
            icon: "map-marker-distance",
            label: "Distance Travelled",
            value: `${Math.round(attendanceStats.totalKm)} km`,
            color: customColors.accent,
        },
        {
            icon: "cart-outline",
            label: "Sale Orders",
            value: `${orderStats.totalOrders} | ${formatINR(orderStats.totalOrderValue / 1000)}k`,
            color: customColors.primary,
        },
        {
            icon: "truck-delivery",
            label: "Deliveries",
            value: `${deliveryStats.deliveredCount}/${deliveryStats.totalCount}`,
            color: "#8B5CF6",
        },
        {
            icon: "receipt",
            label: "Live Invoices",
            value: `${invoiceStats.totalCount} | ${formatINR(invoiceStats.totalValue / 1000)}k`,
            color: customColors.warning,
        },
        {
            icon: "cash-multiple",
            label: "Collected",
            value: formatINR(collectionStats.totalCollected / 1000) + "k",
            color: customColors.success,
        },
    ];

    const dateRangeLabel = `${selectedFromDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} - ${selectedToDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Monthly Analysis"
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
                showSalesPerson={isAdmin}
                salesPersonData={salesPersonOptions}
                selectedSalesPerson={selectedSalesPerson}
                onSalesPersonChange={handleSalesPersonChange}
                salesPersonLabel="Select Sales Person"
            />

            {isAdmin && !selectedSalesPerson ? (
                <View style={styles.loaderContainer}>
                    <MaterialCommunityIcons name="account-search" size={48} color={customColors.grey400} />
                    <Text style={styles.emptyTitle}>Choose a Salesperson</Text>
                    <Text style={styles.loadingText}>Select a salesperson to view their monthly analysis</Text>
                    <TouchableOpacity
                        style={styles.chooseButton}
                        onPress={() => setModalVisible(true)}
                        activeOpacity={0.8}>
                        <MaterialCommunityIcons name="filter-variant" size={18} color={customColors.white} />
                        <Text style={styles.chooseButtonText}>Select Sales Person</Text>
                    </TouchableOpacity>
                </View>
            ) : isInitialLoading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={customColors.primary} />
                    <Text style={styles.loadingText}>Loading analysis...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[customColors.primary]}
                            tintColor={customColors.primary}
                        />
                    }>
                    <View style={styles.periodBanner}>
                        <MaterialCommunityIcons name="account-circle" size={18} color={customColors.primary} />
                        <Text style={styles.periodText}>
                            {displayName ? `${displayName}  •  ` : ""}{dateRangeLabel}
                        </Text>
                    </View>

                    {/* Overview */}
                    <View style={styles.gridContainer}>
                        {summaryStats.map((stat, index) => (
                            <StatCard key={index} {...stat} />
                        ))}
                    </View>

                    {/* Attendance */}
                    <SectionCard icon="calendar-check" title="Attendance">
                        {attendanceStats.daysPresent === 0 ? (
                            <EmptyRow text="No attendance recorded in this period" />
                        ) : (
                            <>
                                <BreakdownRow label="Days Present" count={attendanceStats.daysPresent} color={customColors.info} />
                                <BreakdownRow label="Total Distance" count={`${Math.round(attendanceStats.totalKm)} km`} color={customColors.accent} />
                                <BreakdownRow label="Average / Day" count={`${Math.round(attendanceStats.avgKm)} km`} color={customColors.accent2} />
                            </>
                        )}
                    </SectionCard>

                    {/* Sales Order Funnel */}
                    <SectionCard icon="cart-arrow-right" title="Sales Order Funnel">
                        {orderStats.totalOrders === 0 ? (
                            <EmptyRow text="No sale orders in this period" />
                        ) : (
                            <>
                                <FunnelRow
                                    label="Orders Placed"
                                    value={orderStats.totalOrders}
                                    sub={formatINR(orderStats.totalOrderValue)}
                                    percent={100}
                                    color={customColors.primary}
                                />
                                <FunnelRow
                                    label="Converted to Invoice"
                                    value={orderStats.convertedCount}
                                    sub={`${safePct(orderStats.convertedCount, orderStats.totalOrders)}%`}
                                    percent={safePct(orderStats.convertedCount, orderStats.totalOrders)}
                                    color={customColors.warning}
                                />
                                <FunnelRow
                                    label="Delivered"
                                    value={orderStats.deliveredCount}
                                    sub={`${safePct(orderStats.deliveredCount, orderStats.totalOrders)}%`}
                                    percent={safePct(orderStats.deliveredCount, orderStats.totalOrders)}
                                    color={customColors.success}
                                />
                                <View style={styles.divider} />
                                <BreakdownRow
                                    label="Pending Conversion"
                                    count={orderStats.pendingCount}
                                    color={customColors.grey400}
                                />
                                <BreakdownRow
                                    label="In Transit"
                                    count={orderStats.inTransitCount}
                                    color={customColors.info}
                                />
                            </>
                        )}
                    </SectionCard>

                    {/* Payment Collection */}
                    <SectionCard icon="cash-multiple" title="Payment Collection">
                        {collectionStats.receiptCount === 0 ? (
                            <EmptyRow text="No collections in this period" />
                        ) : (
                            <>
                                <FunnelRow
                                    label="Total Collected"
                                    value={formatINR(collectionStats.totalCollected)}
                                    sub={`${collectionStats.receiptCount} receipts`}
                                    percent={100}
                                    color={customColors.success}
                                />
                                <View style={styles.divider} />
                                <BreakdownRow
                                    icon="cash"
                                    label="Cash"
                                    count={`${safePct(collectionStats.cashCollected, collectionStats.totalCollected)}%`}
                                    value={collectionStats.cashCollected}
                                    color={customColors.success}
                                />
                                <BreakdownRow
                                    icon="bank-transfer"
                                    label="Bank / UPI"
                                    count={`${safePct(collectionStats.bankCollected, collectionStats.totalCollected)}%`}
                                    value={collectionStats.bankCollected}
                                    color={customColors.primary}
                                />
                            </>
                        )}
                    </SectionCard>

                    {/* Deliveries */}
                    <SectionCard icon="truck-delivery" title="Deliveries">
                        {deliveryStats.totalCount === 0 ? (
                            <EmptyRow text="No deliveries in this period" />
                        ) : (
                            <>
                                <FunnelRow
                                    label="Delivered"
                                    value={deliveryStats.deliveredCount}
                                    sub={`of ${deliveryStats.totalCount} • ${safePct(deliveryStats.deliveredCount, deliveryStats.totalCount)}%`}
                                    percent={safePct(deliveryStats.deliveredCount, deliveryStats.totalCount)}
                                    color={customColors.success}
                                />
                                <FunnelRow
                                    label="Payment Completed"
                                    value={formatINR(deliveryStats.completedValue)}
                                    sub={`of ${formatINR(deliveryStats.totalValue)}`}
                                    percent={safePct(deliveryStats.completedValue, deliveryStats.totalValue)}
                                    color={customColors.primary}
                                />

                                <View style={styles.divider} />
                                <Text style={styles.subHeading}>Delivery Status</Text>
                                {Object.entries(DELIVERY_STATUS).map(([key, status]) => (
                                    deliveryStats.deliveryStatusCounts[key] ? (
                                        <BreakdownRow
                                            key={key}
                                            label={status.label}
                                            count={deliveryStats.deliveryStatusCounts[key] || 0}
                                            color={status.color}
                                        />
                                    ) : null
                                ))}

                                <View style={styles.divider} />
                                <Text style={styles.subHeading}>Payment Mode</Text>
                                {Object.entries(PAYMENT_MODE).map(([key, mode]) => (
                                    deliveryStats.paymentModeCounts[key] ? (
                                        <BreakdownRow
                                            key={key}
                                            icon={mode.icon}
                                            label={mode.label}
                                            count={deliveryStats.paymentModeCounts[key] || 0}
                                            color={mode.color}
                                        />
                                    ) : null
                                ))}
                            </>
                        )}
                    </SectionCard>

                    {/* Live Sales Invoice */}
                    <SectionCard icon="receipt" title="Live Sales Invoice">
                        {invoiceStats.totalCount === 0 ? (
                            <EmptyRow text="No live sales invoices in this period" />
                        ) : (
                            <>
                                <FunnelRow
                                    label="Payment Completed"
                                    value={formatINR(invoiceStats.completedValue)}
                                    sub={`of ${formatINR(invoiceStats.totalValue)}`}
                                    percent={safePct(invoiceStats.completedValue, invoiceStats.totalValue)}
                                    color={customColors.success}
                                />

                                <View style={styles.divider} />
                                <Text style={styles.subHeading}>Payment Mode</Text>
                                {Object.entries(PAYMENT_MODE).map(([key, mode]) => (
                                    invoiceStats.paymentModeCounts[key] ? (
                                        <BreakdownRow
                                            key={key}
                                            icon={mode.icon}
                                            label={mode.label}
                                            count={invoiceStats.paymentModeCounts[key] || 0}
                                            color={mode.color}
                                        />
                                    ) : null
                                ))}

                                <View style={styles.divider} />
                                <Text style={styles.subHeading}>Delivery Status</Text>
                                {Object.entries(DELIVERY_STATUS).map(([key, status]) => (
                                    invoiceStats.deliveryStatusCounts[key] ? (
                                        <BreakdownRow
                                            key={key}
                                            label={status.label}
                                            count={invoiceStats.deliveryStatusCounts[key] || 0}
                                            color={status.color}
                                        />
                                    ) : null
                                ))}
                            </>
                        )}
                    </SectionCard>

                    <View style={{ height: spacing.xl }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

export default MonthlyAnalysis;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.grey50,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: spacing.md,
        backgroundColor: customColors.grey50,
        paddingHorizontal: spacing.xl,
    },
    loadingText: {
        ...typography.body1(),
        color: customColors.grey600,
        textAlign: "center",
    },
    emptyTitle: {
        ...typography.h5(),
        color: customColors.grey800,
        fontWeight: "700",
    },
    chooseButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        backgroundColor: customColors.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        marginTop: spacing.sm,
        ...shadows.small,
    },
    chooseButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
    periodBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    periodText: {
        ...typography.body2(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    gridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    statCard: {
        width: "31%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        marginBottom: spacing.sm,
        minHeight: 92,
        ...shadows.small,
    },
    statIconWrapper: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.xs,
    },
    statValue: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "700",
        textAlign: "center",
    },
    statLabel: {
        ...typography.caption(),
        color: customColors.grey500,
        textAlign: "center",
        marginTop: 2,
    },
    sectionCard: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        padding: spacing.md,
        ...shadows.small,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    subHeading: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginBottom: spacing.xs,
    },
    funnelRow: {
        marginBottom: spacing.sm,
    },
    funnelLabelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    funnelLabel: {
        ...typography.body2(),
        color: customColors.grey700,
    },
    funnelValue: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    funnelSub: {
        ...typography.caption(),
        color: customColors.grey500,
        fontWeight: "500",
    },
    progressTrack: {
        height: 8,
        borderRadius: 4,
        backgroundColor: customColors.grey100,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 4,
    },
    divider: {
        height: 1,
        backgroundColor: customColors.grey100,
        marginVertical: spacing.sm,
    },
    breakdownRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 6,
    },
    breakdownLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        flex: 1,
    },
    breakdownDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    breakdownIcon: {
        marginLeft: 2,
    },
    breakdownLabel: {
        ...typography.body2(),
        color: customColors.grey700,
    },
    breakdownRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    breakdownCount: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    breakdownValue: {
        ...typography.caption(),
        color: customColors.grey500,
        minWidth: 60,
        textAlign: "right",
    },
    emptyText: {
        ...typography.body2(),
        color: customColors.grey500,
        textAlign: "center",
        paddingVertical: spacing.md,
    },
});
