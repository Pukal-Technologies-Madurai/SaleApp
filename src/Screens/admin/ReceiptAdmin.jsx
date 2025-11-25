import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import React, { useEffect, useState } from "react";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../../Components/AppHeader";
import { useNavigation } from "@react-navigation/native";
import FilterModal from "../../Components/FilterModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import {
    customColors,
    typography,
    spacing,
    shadows,
} from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import { SafeAreaView } from "react-native-safe-area-context";

const ReceiptAdmin = ({ route }) => {
    const { selectedDate: passedDate, selectedBranch } = route.params || {};

    const navigation = useNavigation();
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    const [salesPersonData, setSalesPersonData] = useState([]);
    const [selectedSalesPerson, setSelectedSalesPerson] = useState({
        label: "All",
        value: "all",
    });
    const [selectedPaymentFilter, setSelectedPaymentFilter] = useState("all"); // New state for payment filter

    useEffect(() => {
        (async () => {
            const companyId = await AsyncStorage.getItem("Company_Id");
            if (companyId) {
                fetchSalesPerson(companyId);
            }

            if (passedDate) {
                const initialDate = new Date(passedDate);
                setSelectedFromDate(initialDate);
                setSelectedToDate(initialDate);
            }
        })();
    }, [passedDate]);

    const fetchSalesPerson = async companyId => {
        try {
            const url = `${API.salesPerson()}${companyId}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.success === true) {
                const dropdownData = [
                    { label: "All", value: "all" },
                    ...data.data.map(item => ({
                        label: item.Name,
                        value: item.UserId,
                    })),
                ];
                setSalesPersonData(dropdownData);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchReceiptData = async () => {
        const fromDate = selectedFromDate.toISOString().split("T")[0];
        const toDate = selectedToDate.toISOString().split("T")[0];

        const createdByParam =
            selectedSalesPerson.value === "all"
                ? ""
                : selectedSalesPerson.value;

        const url = `${API.userInvoltedReceipts()}${createdByParam}&Fromdate=${fromDate}&Todate=${toDate}&Branch_Id=${selectedBranch || ""}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    };

    // Fetch receipt data
    const {
        data: receiptData = [],
        isLoading: isReceiptLoading,
        refetch,
        isError: isReceiptError,
    } = useQuery({
        queryKey: [
            "receiptData",
            selectedSalesPerson.value,
            selectedFromDate.toISOString().split("T")[0],
            selectedToDate.toISOString().split("T")[0],
        ],
        queryFn: fetchReceiptData,
        enabled: !!selectedFromDate && !!selectedToDate,
        retry: 1,
        select: data => {
            if (data && Array.isArray(data)) {
                return data;
            }
            if (data && data.data && Array.isArray(data.data)) {
                return data.data;
            }
            return [];
        },
    });

    // Filter receipts based on payment method
    const getFilteredReceiptsByPayment = () => {
        if (selectedPaymentFilter === "all") {
            return receiptData;
        } else if (selectedPaymentFilter === "bank") {
            return receiptData.filter(
                receipt =>
                    receipt.debit_ledger_name &&
                    receipt.debit_ledger_name.includes("Canara Bank"),
            );
        } else if (selectedPaymentFilter === "cash") {
            return receiptData.filter(
                receipt =>
                    receipt.debit_ledger_name &&
                    receipt.debit_ledger_name.includes("Cash Note Off"),
            );
        }
        return receiptData;
    };

    const filteredReceiptData = getFilteredReceiptsByPayment();

    // Calculate stats for different payment methods
    const bankReceipts = receiptData.filter(
        receipt =>
            receipt.debit_ledger_name &&
            receipt.debit_ledger_name.includes("Canara Bank"),
    );
    const cashReceipts = receiptData.filter(
        receipt =>
            receipt.debit_ledger_name &&
            receipt.debit_ledger_name.includes("Cash Note Off"),
    );

    const bankAmount = bankReceipts.reduce(
        (sum, receipt) => sum + (receipt.credit_amount || 0),
        0,
    );
    const cashAmount = cashReceipts.reduce(
        (sum, receipt) => sum + (receipt.credit_amount || 0),
        0,
    );
    const totalAmount = receiptData.reduce(
        (sum, receipt) => sum + (receipt.credit_amount || 0),
        0,
    );

    const handleFromDateChange = date => {
        if (date) {
            setSelectedFromDate(date);
            if (date > selectedToDate) {
                setSelectedToDate(date);
            }
        }
    };

    const handleToDateChange = date => {
        if (date) {
            setSelectedToDate(date);
            if (date < selectedFromDate) {
                setSelectedFromDate(date);
            }
        }
    };

    const handleSalesPersonChange = item => {
        setSelectedSalesPerson(item);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    const formatDate = dateString => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const formatTime = dateString => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC",
        });
    };

    // Payment filter buttons
    const renderPaymentFilters = () => (
        <View style={styles.paymentFiltersContainer}>
            <TouchableOpacity
                style={[
                    styles.filterButton,
                    selectedPaymentFilter === "all" &&
                    styles.activeFilterButton,
                ]}
                onPress={() => setSelectedPaymentFilter("all")}
                activeOpacity={0.7}>
                <MaterialIcons
                    name="all-inclusive"
                    size={16}
                    color={
                        selectedPaymentFilter === "all"
                            ? customColors.white
                            : customColors.grey600
                    }
                />
                <Text
                    style={[
                        styles.filterButtonText,
                        selectedPaymentFilter === "all" &&
                        styles.activeFilterButtonText,
                    ]}>
                    All ({receiptData.length})
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.filterButton,
                    selectedPaymentFilter === "bank" &&
                    styles.activeFilterButton,
                ]}
                onPress={() => setSelectedPaymentFilter("bank")}
                activeOpacity={0.7}>
                <MaterialIcons
                    name="account-balance"
                    size={16}
                    color={
                        selectedPaymentFilter === "bank"
                            ? customColors.white
                            : customColors.grey600
                    }
                />
                <Text
                    style={[
                        styles.filterButtonText,
                        selectedPaymentFilter === "bank" &&
                        styles.activeFilterButtonText,
                    ]}>
                    Bank ({bankReceipts.length})
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.filterButton,
                    selectedPaymentFilter === "cash" &&
                    styles.activeFilterButton,
                ]}
                onPress={() => setSelectedPaymentFilter("cash")}
                activeOpacity={0.7}>
                <MaterialIcons
                    name="money"
                    size={16}
                    color={
                        selectedPaymentFilter === "cash"
                            ? customColors.white
                            : customColors.grey600
                    }
                />
                <Text
                    style={[
                        styles.filterButtonText,
                        selectedPaymentFilter === "cash" &&
                        styles.activeFilterButtonText,
                    ]}>
                    Cash ({cashReceipts.length})
                </Text>
            </TouchableOpacity>
        </View>
    );

    // Enhanced summary stats with payment breakdown
    const renderSummaryStats = () => (
        <View style={styles.summaryContainer}>
            <View style={styles.statCard}>
                <MaterialIcons
                    name="receipt-long"
                    size={24}
                    color={customColors.primary}
                />
                <View style={styles.statContent}>
                    <Text style={styles.statValue}>
                        {filteredReceiptData.length}
                    </Text>
                    <Text style={styles.statLabel}>
                        {selectedPaymentFilter === "all"
                            ? "Total Receipts"
                            : selectedPaymentFilter === "bank"
                                ? "Bank Receipts"
                                : "Cash Receipts"}
                    </Text>
                </View>
            </View>

            <View style={styles.statCard}>
                <MaterialIcons
                    name="currency-rupee"
                    size={24}
                    color={customColors.success}
                />
                <View style={styles.statContent}>
                    <Text style={styles.statValue}>
                        ₹
                        {(selectedPaymentFilter === "all"
                            ? totalAmount
                            : selectedPaymentFilter === "bank"
                                ? bankAmount
                                : cashAmount
                        ).toLocaleString("en-IN")}
                    </Text>
                    <Text style={styles.statLabel}>Total Amount</Text>
                </View>
            </View>
        </View>
    );

    const renderReceiptCard = receipt => (
        <TouchableOpacity
            key={receipt.receipt_id}
            style={styles.receiptCard}
            activeOpacity={0.7}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <Text style={styles.receiptNumber}>
                        {receipt.receipt_invoice_no}
                    </Text>
                    <Text style={styles.receiptDate}>
                        {formatDate(receipt.receipt_date)}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.amount}>
                        ₹{receipt.credit_amount.toLocaleString("en-IN")}
                    </Text>
                    <View
                        style={[
                            styles.statusBadge,
                            {
                                backgroundColor:
                                    receipt.status === 1
                                        ? customColors.success + "20"
                                        : customColors.warning + "20",
                            },
                        ]}>
                        <Text
                            style={[
                                styles.statusText,
                                {
                                    color:
                                        receipt.status === 1
                                            ? customColors.success
                                            : customColors.warning,
                                },
                            ]}>
                            {receipt.status === 1 ? "Completed" : "Pending"}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Customer Info */}
            <View style={styles.customerInfo}>
                <MaterialIcons
                    name="store"
                    size={16}
                    color={customColors.grey600}
                />
                <Text style={styles.customerName} numberOfLines={2}>
                    {receipt.credit_ledger_name}
                </Text>
            </View>

            {/* Payment Method */}
            <View style={styles.paymentInfo}>
                <MaterialIcons
                    name={
                        receipt.debit_ledger_name?.includes("Canara Bank")
                            ? "account-balance"
                            : "money"
                    }
                    size={16}
                    color={
                        receipt.debit_ledger_name?.includes("Canara Bank")
                            ? customColors.info
                            : customColors.warning
                    }
                />
                <Text style={styles.paymentMethod} numberOfLines={1}>
                    {receipt.debit_ledger_name}
                </Text>
            </View>

            {/* Sales Person Info */}
            {selectedSalesPerson.value === "all" && (
                <View style={styles.salesPersonInfo}>
                    <MaterialIcons
                        name="person"
                        size={16}
                        color={customColors.grey600}
                    />
                    <Text style={styles.salesPersonText} numberOfLines={1}>
                        {salesPersonData.find(
                            sp => sp.value === receipt.created_by.toString(),
                        )?.label || `User ID: ${receipt.created_by}`}
                    </Text>
                </View>
            )}

            {/* Footer */}
            <View style={styles.cardFooter}>
                <View style={styles.timeInfo}>
                    <MaterialIcons
                        name="access-time"
                        size={14}
                        color={customColors.grey500}
                    />
                    <Text style={styles.timeText}>
                        {formatTime(receipt.created_on)}
                    </Text>
                </View>
                <Text style={styles.voucherType}>{receipt.Voucher_Type}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyStateContainer}>
            <MaterialIcons
                name="receipt-long"
                size={64}
                color={customColors.grey400}
            />
            <Text style={styles.emptyStateTitle}>No Receipts Found</Text>
            <Text style={styles.emptyStateSubtitle}>
                No receipts found for the selected filters.{"\n"}
                Try adjusting your date range, sales person, or payment method
                filter.
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Receipt Collections"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialIcon"
                rightIconName="filter-list"
                onRightPress={() => setModalVisible(true)}
            />

            <FilterModal
                visible={modalVisible}
                fromDate={selectedFromDate}
                toDate={selectedToDate}
                onFromDateChange={handleFromDateChange}
                onToDateChange={handleToDateChange}
                onApply={() => setModalVisible(false)}
                onClose={handleCloseModal}
                showToDate={true}
                title="Filter Receipts"
                fromLabel="From Date"
                toLabel="To Date"
                showSalesPerson={true}
                salesPersonLabel="Select Sales Person"
                salesPersonData={salesPersonData}
                selectedSalesPerson={selectedSalesPerson}
                onSalesPersonChange={handleSalesPersonChange}
            />

            <View style={styles.contentContainer}>
                {isReceiptLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator
                            size="large"
                            color={customColors.primary}
                        />
                        <Text style={styles.loadingText}>
                            Loading receipts...
                        </Text>
                    </View>
                ) : isReceiptError ? (
                    <View style={styles.errorContainer}>
                        <MaterialIcons
                            name="error-outline"
                            size={48}
                            color={customColors.error}
                        />
                        <Text style={styles.errorTitle}>
                            Error Loading Receipts
                        </Text>
                        <Text style={styles.errorText}>
                            Failed to load receipt data. Please try again.
                        </Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={refetch}>
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={isReceiptLoading}
                                onRefresh={refetch}
                                colors={[customColors.primary]}
                            />
                        }
                        showsVerticalScrollIndicator={false}>
                        {/* Payment Filter Buttons */}
                        {receiptData.length > 0 && renderPaymentFilters()}

                        {/* Summary Stats */}
                        {receiptData.length > 0 && renderSummaryStats()}

                        {/* Receipts List */}
                        {filteredReceiptData.length === 0 ? (
                            renderEmptyState()
                        ) : (
                            <View style={styles.receiptsContainer}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>
                                        {selectedPaymentFilter === "all"
                                            ? "All Receipts"
                                            : selectedPaymentFilter === "bank"
                                                ? "Bank Receipts"
                                                : "Cash Receipts"}
                                        ({filteredReceiptData.length})
                                    </Text>
                                </View>
                                {filteredReceiptData.map(renderReceiptCard)}
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
};

export default ReceiptAdmin;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: spacing.md,
    },
    loadingText: {
        ...typography.body1(),
        color: customColors.grey600,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    errorTitle: {
        ...typography.h6(),
        color: customColors.error,
        fontWeight: "600",
    },
    errorText: {
        ...typography.body2(),
        color: customColors.grey600,
        textAlign: "center",
    },
    retryButton: {
        backgroundColor: customColors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 8,
        marginTop: spacing.sm,
    },
    retryButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
    // New payment filter styles
    paymentFiltersContainer: {
        flexDirection: "row",
        gap: spacing.sm,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.xs,
    },
    filterButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: 8,
        backgroundColor: customColors.grey100,
        borderWidth: 1,
        borderColor: customColors.grey200,
        gap: spacing.xs,
    },
    activeFilterButton: {
        backgroundColor: customColors.primary,
        borderColor: customColors.primary,
    },
    filterButtonText: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "600",
    },
    activeFilterButtonText: {
        color: customColors.white,
    },
    // Payment breakdown styles
    breakdownContainer: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
        ...shadows.small,
    },
    breakdownTitle: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: spacing.sm,
        textAlign: "center",
    },
    breakdownRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    breakdownItem: {
        flex: 1,
        alignItems: "center",
        gap: spacing.xs,
    },
    breakdownDivider: {
        width: 1,
        height: 40,
        backgroundColor: customColors.grey200,
        marginHorizontal: spacing.md,
    },
    breakdownLabel: {
        ...typography.caption(),
        color: customColors.grey600,
        textAlign: "center",
    },
    breakdownValue: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "600",
        textAlign: "center",
    },
    salesPersonInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    salesPersonText: {
        ...typography.body2(),
        color: customColors.grey700,
        flex: 1,
        fontStyle: "italic",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.md,
        gap: spacing.md,
    },
    summaryContainer: {
        flexDirection: "row",
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    statCard: {
        flex: 1,
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        ...shadows.small,
    },
    statContent: {
        flex: 1,
    },
    statValue: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    statLabel: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    receiptsContainer: {
        gap: spacing.sm,
    },
    sectionHeader: {
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    receiptCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: customColors.grey200,
        ...shadows.small,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: spacing.sm,
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        alignItems: "flex-end",
        gap: spacing.xs,
    },
    receiptNumber: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    receiptDate: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    amount: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "700",
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 12,
    },
    statusText: {
        ...typography.caption(),
        fontWeight: "600",
        textTransform: "uppercase",
    },
    customerInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    customerName: {
        ...typography.body2(),
        color: customColors.grey800,
        flex: 1,
    },
    paymentInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    paymentMethod: {
        ...typography.body2(),
        color: customColors.grey700,
        flex: 1,
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    timeInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    timeText: {
        ...typography.caption(),
        color: customColors.grey500,
    },
    voucherType: {
        ...typography.caption(),
        color: customColors.grey600,
        fontStyle: "italic",
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
        minHeight: 300,
    },
    emptyStateTitle: {
        ...typography.h5(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    emptyStateSubtitle: {
        ...typography.body1(),
        color: customColors.grey500,
        textAlign: "center",
        lineHeight: 22,
    },
});
