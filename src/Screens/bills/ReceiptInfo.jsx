import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { fetchUserInvolvedReceipts } from "../../Api/receipt";
import {
    customColors,
    typography,
    spacing,
    shadows,
} from "../../Config/helper";

const ReceiptInfo = () => {
    const navigation = useNavigation();
    const [userId, setUserId] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    const [activeFilter, setActiveFilter] = useState("all"); // 'all', 'cash', 'bank'
    const [searchTerm, setSearchTerm] = useState("");
    const [showSearch, setShowSearch] = useState(false);

    useEffect(() => {
        (async () => {
            const userId = await AsyncStorage.getItem("UserId");
            if (!userId) {
                console.error("User ID not found in AsyncStorage");
                return;
            }
            setUserId(userId);
        })();
    }, []);

    const {
        data: receiptData = [],
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: [
            "userInvolvedReceipts",
            userId,
            selectedFromDate,
            selectedToDate,
        ],
        queryFn: () =>
            fetchUserInvolvedReceipts(userId, selectedFromDate, selectedToDate),
        enabled: !!userId,
        staleTime: 30 * 1000, // 30 seconds
        cacheTime: 5 * 60 * 1000, // 5 minutes
    });

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

    const renderReceiptCard = receipt => (
        <TouchableOpacity
            disabled
            key={receipt.receipt_id}
            style={styles.receiptCard}
            activeOpacity={0.7}>
            {/* Header: Retailer name and amount */}
            <View style={styles.receiptHeader}>
                <Text style={styles.retailerName} numberOfLines={2}>
                    {receipt.credit_ledger_name}
                </Text>
                <Text style={styles.receiptAmount}>
                    ₹{receipt.credit_amount.toLocaleString("en-IN")}
                </Text>
            </View>

            {/* Invoice and Date row */}
            <View style={styles.invoiceDateRow}>
                <Text style={styles.invoiceNumber}>
                    {receipt.receipt_invoice_no}
                </Text>
                <Text style={styles.receiptDate}>
                    {formatDate(receipt.receipt_date)}
                </Text>
            </View>

            {/* Method and Note with icons only */}
            <View style={styles.iconDetailsContainer}>
                <View style={styles.iconDetail}>
                    <MaterialIcons
                        name="account-balance-wallet"
                        size={18}
                        color={customColors.grey600}
                    />
                    <Text style={styles.iconDetailText} numberOfLines={1}>
                        {receipt.debit_ledger_name}
                    </Text>
                </View>

                {receipt.remarks && (
                    <View style={styles.iconDetail}>
                        <MaterialIcons
                            name="note"
                            size={18}
                            color={customColors.grey600}
                        />
                        <Text style={styles.iconDetailText} numberOfLines={1}>
                            {receipt.remarks}
                        </Text>
                    </View>
                )}
            </View>

            {/* Footer with status and time */}
            <View style={styles.receiptFooter}>
                <View style={styles.timestampContainer}>
                    <MaterialIcons
                        name="access-time"
                        size={14}
                        color={customColors.grey500}
                    />
                    <Text style={styles.timestamp}>
                        {formatTime(receipt.created_on)}
                    </Text>
                </View>
                <View
                    style={[
                        styles.statusBadge,
                        {
                            backgroundColor:
                                receipt.status === 1
                                    ? customColors.success + "20"
                                    : customColors.error + "20",
                        },
                    ]}>
                    <Text
                        style={[
                            styles.statusText,
                            {
                                color:
                                    receipt.status === 1
                                        ? customColors.success
                                        : customColors.error,
                            },
                        ]}>
                        {receipt.status === 1 ? "Completed" : "Cancelled"}
                    </Text>
                </View>
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
                No receipts found for the selected date range.{"\n"}
                Try adjusting your filters or create new receipts.
            </Text>

            {/* Add Create Receipt Button */}
            <TouchableOpacity
                style={styles.createReceiptButton}
                onPress={() => navigation.navigate("CreateReceipts")}
                activeOpacity={0.8}>
                <MaterialIcons
                    name="add"
                    size={20}
                    color={customColors.white}
                />
                <Text style={styles.createReceiptButtonText}>
                    Create New Receipt
                </Text>
            </TouchableOpacity>
        </View>
    );

    const getFilteredReceipts = () => {
        const activeReceipts = receiptData.filter(receipt => receipt.status !== 0);

        // Apply payment method filter first
        let filteredReceipts;
        switch (activeFilter) {
            case "cash":
                filteredReceipts = activeReceipts.filter(receipt => receipt.debit_ledger_name === "Cash Note Off");
                break;
            case "bank":
                filteredReceipts = activeReceipts.filter(receipt => receipt.debit_ledger_name === "Canara Bank (795956)");
                break;
            case "all":
            default:
                filteredReceipts = activeReceipts;
                break;
        }

        // Apply search filter if search term exists
        if (searchTerm.trim()) {
            filteredReceipts = filteredReceipts.filter(receipt =>
                receipt.credit_ledger_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filteredReceipts;
    };

    const renderSummaryStats = () => {
        const totalAmount = receiptData.filter(receipt => receipt.status !== 0).reduce(
            (sum, receipt) => sum + receipt.credit_amount,
            0,
        );
        const cashTotal = receiptData.filter(receipt => receipt.status !== 0).reduce(
            (sum, receipt) => sum + (receipt.debit_ledger_name === "Cash Note Off" ? receipt.credit_amount : 0),
            0,
        )
        const bankTotal = receiptData.filter(receipt => receipt.status !== 0).reduce(
            (sum, receipt) => sum + (receipt.debit_ledger_name === "Canara Bank (795956)" ? receipt.credit_amount : 0),
            0,
        )
        const liveReceiptsCount = receiptData.filter(
            receipt => receipt.Voucher_Type === "LIVE_RECEIPT",
        ).length;
        const totalReceipts = receiptData.length;

        return (
            <View style={styles.summaryContainer}>
                <TouchableOpacity
                    style={[
                        styles.summaryCard,
                        activeFilter === "all" && styles.activeSummaryCard
                    ]}
                    onPress={() => setActiveFilter("all")}
                    activeOpacity={0.7}>
                    <MaterialIcons
                        name="currency-rupee"
                        size={24}
                        color={activeFilter === "all" ? customColors.white : customColors.accent2}
                    />
                    <Text style={[
                        styles.summaryNumber,
                        activeFilter === "all" && styles.activeSummaryText
                    ]}>
                        ₹{totalAmount.toLocaleString("en-IN")}
                    </Text>
                    <Text style={[
                        styles.summaryLabel,
                        activeFilter === "all" && styles.activeSummaryText
                    ]}>Total Amount</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.summaryCard,
                        activeFilter === "cash" && styles.activeSummaryCard
                    ]}
                    onPress={() => setActiveFilter(activeFilter === "cash" ? "all" : "cash")}
                    activeOpacity={0.7}>
                    <MaterialIcons
                        name="currency-rupee"
                        size={24}
                        color={activeFilter === "cash" ? customColors.white : customColors.primary}
                    />
                    <Text style={[
                        styles.summaryNumber,
                        activeFilter === "cash" && styles.activeSummaryText
                    ]}>
                        ₹{cashTotal.toLocaleString("en-IN")}
                    </Text>
                    <Text style={[
                        styles.summaryLabel,
                        activeFilter === "cash" && styles.activeSummaryText
                    ]}>Cash</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.summaryCard,
                        activeFilter === "bank" && styles.activeSummaryCard
                    ]}
                    onPress={() => setActiveFilter(activeFilter === "bank" ? "all" : "bank")}
                    activeOpacity={0.7}>
                    <MaterialIcons
                        name="account-balance"
                        size={24}
                        color={activeFilter === "bank" ? customColors.white : customColors.success}
                    />
                    <Text style={[
                        styles.summaryNumber,
                        activeFilter === "bank" && styles.activeSummaryText
                    ]}>
                        ₹{bankTotal.toLocaleString("en-IN")}
                    </Text>
                    <Text style={[
                        styles.summaryLabel,
                        activeFilter === "bank" && styles.activeSummaryText
                    ]}>Bank</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderSearchInput = () => {
        if (!showSearch) return null;

        return (
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <MaterialIcons
                        name="search"
                        size={20}
                        color={customColors.grey500}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by retailer name..."
                        placeholderTextColor={customColors.grey400}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        autoFocus={true}
                    />
                    {searchTerm.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchTerm("")}
                            style={styles.clearButton}>
                            <MaterialIcons
                                name="clear"
                                size={18}
                                color={customColors.grey500}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const handleFromDateChange = date => {
        if (date instanceof Date && !isNaN(date)) {
            const newFromDate = date > selectedToDate ? selectedToDate : date;
            setSelectedFromDate(newFromDate);
        }
    };

    const handleToDateChange = date => {
        if (date instanceof Date && !isNaN(date)) {
            const newToDate = date < selectedFromDate ? selectedFromDate : date;
            setSelectedToDate(newToDate);
        }
    };

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Receipts Summary"
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
                title="Select Date Range"
                fromLabel="From Date"
                toLabel="To Date"
            />

            <View style={styles.contentContainer}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator
                            size="large"
                            color={customColors.primary}
                        />
                        <Text style={styles.loadingText}>
                            Loading receipts...
                        </Text>
                    </View>
                ) : error ? (
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
                            {error.message ||
                                "Something went wrong while loading receipts."}
                        </Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={refetch}>
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={isLoading}
                                onRefresh={refetch}
                                colors={[customColors.primary]}
                            />
                        }
                        showsVerticalScrollIndicator={false}>
                        {receiptData.length > 0 && renderSummaryStats()}

                        {receiptData.length === 0 ? (
                            renderEmptyState()
                        ) : (
                            <ScrollView style={styles.receiptsContainer}>
                                {renderSearchInput()}
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>
                                        {searchTerm.trim() ? "Search Results" :
                                            activeFilter === "all" ? "All" :
                                                activeFilter === "cash" ? "Cash" : "Bank"} Receipts ({getFilteredReceipts().length})
                                    </Text>
                                    <View style={styles.headerActions}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setShowSearch(!showSearch);
                                                if (showSearch) {
                                                    setSearchTerm("");
                                                }
                                            }}
                                            style={styles.actionButton}>
                                            <MaterialIcons
                                                name={showSearch ? "close" : "search"}
                                                size={22}
                                                color={customColors.primary}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() =>
                                                navigation.navigate(
                                                    "CreateReceipts",
                                                )
                                            }
                                            style={styles.actionButton}>
                                            <MaterialIcons
                                                name="add"
                                                size={24}
                                                color={customColors.primary}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                {getFilteredReceipts().map(renderReceiptCard)}
                            </ScrollView>
                        )}
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

export default ReceiptInfo;

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
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
    },
    errorTitle: {
        ...typography.h5(),
        color: customColors.error,
        fontWeight: "600",
    },
    errorText: {
        ...typography.body1(),
        color: customColors.grey600,
        textAlign: "center",
        lineHeight: 22,
    },
    retryButton: {
        backgroundColor: customColors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 8,
        marginTop: spacing.sm,
    },
    retryButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: spacing.xl,
    },
    summaryContainer: {
        flexDirection: "row",
        padding: spacing.md,
        gap: spacing.sm,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        alignItems: "center",
        gap: spacing.xs,
        ...shadows.small,
    },
    activeSummaryCard: {
        backgroundColor: customColors.primary,
        ...shadows.medium,
    },
    activeSummaryText: {
        color: customColors.white,
    },
    summaryNumber: {
        ...typography.h5(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    summaryLabel: {
        ...typography.caption(),
        color: customColors.grey600,
        textAlign: "center",
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    sectionTitle: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "600",
        flex: 1,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    actionButton: {
        padding: spacing.xs,
    },
    searchContainer: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    searchInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.white,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: customColors.grey300,
        gap: spacing.sm,
        ...shadows.small,
    },
    searchInput: {
        flex: 1,
        ...typography.body1(),
        color: customColors.grey900,
        paddingVertical: spacing.xs,
    },
    clearButton: {
        padding: spacing.xs,
    },
    receiptsContainer: {
        paddingHorizontal: spacing.md,
    },
    receiptCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: customColors.grey200,
        ...shadows.small,
    },
    receiptHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: spacing.md,
    },
    retailerName: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: spacing.xs,
        flex: 1,
    },
    invoiceDateRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    invoiceNumber: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: "500",
        flex: 1,
    },
    receiptAmount: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "700",
        marginBottom: spacing.xs,
    },
    receiptDate: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    iconDetailsContainer: {
        // flexDirection: "row",
        // justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    iconDetail: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        flex: 1,
    },
    iconDetailText: {
        ...typography.body2(),
        color: customColors.grey900,
        flex: 1,
        lineHeight: 18,
    },
    receiptFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    timestampContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    timestamp: {
        ...typography.caption(),
        color: customColors.grey500,
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
        letterSpacing: 0.5,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xl,
        marginVertical: spacing.xxl,
        gap: spacing.md,
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
        marginBottom: spacing.lg,
    },
    createReceiptButton: {
        backgroundColor: customColors.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 12,
        gap: spacing.sm,
        ...shadows.medium,
        marginTop: spacing.md,
    },
    createReceiptButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
});
