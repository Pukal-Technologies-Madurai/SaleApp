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
import FeatherIcon from "react-native-vector-icons/Feather";
import FontAwesomeIcon from "react-native-vector-icons/FontAwesome";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { fetchUserInvolvedReceipts } from "../../Api/receipt";
import {
    customColors,
    typography,
    spacing,
    shadows,
    borderRadius,
    iconSizes,
} from "../../Config/helper";

// Status Badge Component
const StatusBadge = ({ label, color, icon }) => (
    <View style={[styles.statusBadge, { backgroundColor: color + "15" }]}>
        {icon && <FeatherIcon name={icon} size={iconSizes.xs} color={color} />}
        <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
    </View>
);

// Summary Card Component
const SummaryCard = ({ icon, iconLibrary = "Feather", value, label, color, isActive, onPress }) => (
    <TouchableOpacity
        style={[styles.summaryCard, isActive && styles.activeSummaryCard]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.summaryIconContainer, { backgroundColor: isActive ? customColors.white + "20" : color + "15" }]}>
            {iconLibrary === "FontAwesome" ? (
                <FontAwesomeIcon name={icon} size={iconSizes.md} color={isActive ? customColors.white : color} />
            ) : (
                <FeatherIcon name={icon} size={iconSizes.md} color={isActive ? customColors.white : color} />
            )}
        </View>
        <Text style={[styles.summaryNumber, isActive && styles.activeSummaryText]}>{value}</Text>
        <Text style={[styles.summaryLabel, isActive && styles.activeSummaryText]}>{label}</Text>
    </TouchableOpacity>
);

const ReceiptInfo = () => {
    const navigation = useNavigation();
    const [userId, setUserId] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    const [activeFilter, setActiveFilter] = useState("all"); // 'all', 'cash', 'bank'
    const [searchTerm, setSearchTerm] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [receiptFilter, setReceiptFilter] = useState("all"); // 'all', 'liveSale', 'normal'

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

    const renderReceiptCard = receipt => {
        const isCompleted = receipt.status === 1;
        return (
            <View key={receipt.receipt_id} style={styles.receiptCard}>
                {/* Header Row */}
                <View style={styles.receiptHeader}>
                    <View style={styles.receiptIconWrap}>
                        <FeatherIcon name="file-text" size={iconSizes.lg} color={customColors.primary} />
                    </View>
                    <View style={styles.receiptHeaderInfo}>
                        <Text style={styles.retailerName} numberOfLines={2}>
                            {receipt.credit_ledger_name}
                        </Text>
                        <Text style={styles.invoiceNumber}>
                            {receipt.receipt_invoice_no}
                        </Text>
                    </View>
                    <View style={styles.receiptHeaderRight}>
                        <Text style={styles.receiptAmount}>
                            ₹{receipt.credit_amount.toLocaleString("en-IN")}
                        </Text>
                        <View style={styles.dateContainer}>
                            <FeatherIcon name="calendar" size={iconSizes.xs} color={customColors.grey500} />
                            <Text style={styles.receiptDate}>
                                {formatDate(receipt.receipt_date)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Details Row */}
                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <FeatherIcon name="credit-card" size={iconSizes.sm} color={customColors.grey500} />
                        <Text style={styles.detailText} numberOfLines={1}>
                            {receipt.debit_ledger_name}
                        </Text>
                    </View>
                    {receipt.remarks && (
                        <View style={styles.detailItem}>
                            <FeatherIcon name="message-square" size={iconSizes.sm} color={customColors.grey500} />
                            <Text style={styles.detailText} numberOfLines={1}>
                                {receipt.remarks}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Footer with status and time */}
                <View style={styles.receiptFooter}>
                    <View style={styles.timestampContainer}>
                        <FeatherIcon name="clock" size={iconSizes.xs} color={customColors.grey500} />
                        <Text style={styles.timestamp}>
                            {formatTime(receipt.created_on)}
                        </Text>
                    </View>
                    <StatusBadge
                        label={isCompleted ? "Completed" : "Cancelled"}
                        color={isCompleted ? customColors.success : customColors.error}
                        icon={isCompleted ? "check-circle" : "x-circle"}
                    />
                </View>
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconContainer}>
                <FeatherIcon name="file-text" size={iconSizes.xxl} color={customColors.grey300} />
            </View>
            <Text style={styles.emptyStateTitle}>No Receipts Found</Text>
            <Text style={styles.emptyStateSubtitle}>
                No receipts found for the selected date range.{"\n"}
                Try adjusting your filters or create new receipts.
            </Text>

            <TouchableOpacity
                style={styles.createReceiptButton}
                onPress={() => navigation.navigate("CreateReceipts")}
                activeOpacity={0.7}
            >
                <FeatherIcon name="plus" size={iconSizes.md} color={customColors.white} />
                <Text style={styles.createReceiptButtonText}>Create New Receipt</Text>
            </TouchableOpacity>
        </View>
    );

    const getFilteredReceipts = () => {
        let activeReceipts = receiptData.filter(receipt => receipt.status !== 0);

        // Apply receipt type filter
        if (receiptFilter === "liveSale") {
            activeReceipts = activeReceipts.filter(
                receipt => receipt.remarks && receipt.remarks.includes("Live Sale")
            );
        } else if (receiptFilter === "normal") {
            activeReceipts = activeReceipts.filter(
                receipt => !receipt.remarks || !receipt.remarks.includes("Live Sale")
            );
        }

        // Apply payment method filter
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
        let baseReceipts = receiptData.filter(receipt => receipt.status !== 0);
        if (receiptFilter === "liveSale") {
            baseReceipts = baseReceipts.filter(
                receipt => receipt.remarks && receipt.remarks.includes("Live Sale")
            );
        } else if (receiptFilter === "normal") {
            baseReceipts = baseReceipts.filter(
                receipt => !receipt.remarks || !receipt.remarks.includes("Live Sale")
            );
        }

        const totalAmount = baseReceipts.reduce(
            (sum, receipt) => sum + receipt.credit_amount,
            0,
        );
        const cashTotal = baseReceipts.reduce(
            (sum, receipt) => sum + (receipt.debit_ledger_name === "Cash Note Off" ? receipt.credit_amount : 0),
            0,
        );
        const bankTotal = baseReceipts.reduce(
            (sum, receipt) => sum + (receipt.debit_ledger_name === "Canara Bank (795956)" ? receipt.credit_amount : 0),
            0,
        );

        return (
            <View style={styles.summaryContainer}>
                <SummaryCard
                    icon="inr"
                    iconLibrary="FontAwesome"
                    value={`₹${totalAmount.toLocaleString("en-IN")}`}
                    label="Total"
                    color={customColors.accent2}
                    isActive={activeFilter === "all"}
                    onPress={() => setActiveFilter("all")}
                />
                <SummaryCard
                    icon="inr"
                    iconLibrary="FontAwesome"
                    value={`₹${cashTotal.toLocaleString("en-IN")}`}
                    label="Cash"
                    color={customColors.primary}
                    isActive={activeFilter === "cash"}
                    onPress={() => setActiveFilter(activeFilter === "cash" ? "all" : "cash")}
                />
                <SummaryCard
                    icon="home"
                    value={`₹${bankTotal.toLocaleString("en-IN")}`}
                    label="Bank"
                    color={customColors.success}
                    isActive={activeFilter === "bank"}
                    onPress={() => setActiveFilter(activeFilter === "bank" ? "all" : "bank")}
                />
            </View>
        );
    };

    const renderSearchInput = () => {
        if (!showSearch) return null;

        return (
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <FeatherIcon name="search" size={iconSizes.md} color={customColors.grey500} />
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
                            style={styles.clearButton}
                        >
                            <FeatherIcon name="x" size={iconSizes.sm} color={customColors.grey500} />
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
                        <View style={styles.errorIconContainer}>
                            <FeatherIcon name="alert-circle" size={iconSizes.xl} color={customColors.error} />
                        </View>
                        <Text style={styles.errorTitle}>
                            Error Loading Receipts
                        </Text>
                        <Text style={styles.errorText}>
                            {error.message ||
                                "Something went wrong while loading receipts."}
                        </Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={refetch}
                            activeOpacity={0.7}
                        >
                            <FeatherIcon name="refresh-cw" size={iconSizes.sm} color={customColors.white} />
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
                                            receiptFilter === "liveSale" ? "Live Sale" :
                                            receiptFilter === "normal" ? "Normal" :
                                            activeFilter === "all" ? "All" :
                                            activeFilter === "cash" ? "Cash" : "Bank"} Receipts ({getFilteredReceipts().length})
                                    </Text>
                                    <View style={styles.headerActions}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                // Cycle: all -> liveSale -> normal -> all
                                                if (receiptFilter === "all") setReceiptFilter("liveSale");
                                                else if (receiptFilter === "liveSale") setReceiptFilter("normal");
                                                else setReceiptFilter("all");
                                            }}
                                            style={[
                                                styles.actionButton,
                                                receiptFilter === "liveSale" && styles.activeActionButton,
                                                receiptFilter === "normal" && styles.normalFilterButton
                                            ]}
                                        >
                                            <FeatherIcon
                                                name={receiptFilter === "normal" ? "file-text" : "zap"}
                                                size={iconSizes.md}
                                                color={receiptFilter !== "all" ? customColors.white : customColors.primary}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setShowSearch(!showSearch);
                                                if (showSearch) {
                                                    setSearchTerm("");
                                                }
                                            }}
                                            style={styles.actionButton}
                                        >
                                            <FeatherIcon
                                                name={showSearch ? "x" : "search"}
                                                size={iconSizes.md}
                                                color={customColors.primary}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => navigation.navigate("CreateReceipts")}
                                            style={styles.actionButton}
                                        >
                                            <FeatherIcon
                                                name="plus"
                                                size={iconSizes.lg}
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
        backgroundColor: customColors.grey50,
    },
    // Loading State
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
    // Error State
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
    },
    errorIconContainer: {
        width: 64,
        height: 64,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.errorFaded,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    errorTitle: {
        ...typography.h6(),
        color: customColors.grey800,
        fontWeight: "600",
    },
    errorText: {
        ...typography.body2(),
        color: customColors.grey500,
        textAlign: "center",
    },
    retryButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        backgroundColor: customColors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
        marginTop: spacing.md,
    },
    retryButtonText: {
        ...typography.body2(),
        color: customColors.white,
        fontWeight: "600",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: spacing.xl,
    },
    // Summary Cards
    summaryContainer: {
        flexDirection: "row",
        padding: spacing.sm,
        justifyContent: "space-between",
        gap: spacing.sm,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        alignItems: "center",
        // gap: spacing.xs,
        ...shadows.small,
    },
    summaryIconContainer: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
    },
    activeSummaryCard: {
        backgroundColor: customColors.primary,
        ...shadows.medium,
    },
    activeSummaryText: {
        color: customColors.white,
    },
    summaryNumber: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    summaryLabel: {
        ...typography.caption(),
        color: customColors.grey500,
    },
    // Section Header
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        ...typography.body1(),
        color: customColors.grey800,
        fontWeight: "600",
        flex: 1,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.md,
        backgroundColor: customColors.primaryFaded,
        justifyContent: "center",
        alignItems: "center",
    },
    activeActionButton: {
        backgroundColor: customColors.primary,
    },
    normalFilterButton: {
        backgroundColor: customColors.accent2,
    },
    // Search
    searchContainer: {
        marginVertical: spacing.md,
    },
    searchInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
        ...shadows.small,
    },
    searchInput: {
        flex: 1,
        ...typography.body2(),
        color: customColors.grey900,
        paddingVertical: spacing.xs,
    },
    clearButton: {
        padding: spacing.xs,
    },
    // Receipts Container
    receiptsContainer: {
        paddingHorizontal: spacing.md,
    },
    // Receipt Card
    receiptCard: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        ...shadows.small,
    },
    receiptHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    receiptIconWrap: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.lg,
        backgroundColor: customColors.primaryFaded,
        justifyContent: "center",
        alignItems: "center",
    },
    receiptHeaderInfo: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    receiptHeaderRight: {
        alignItems: "flex-end",
    },
    retailerName: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    invoiceNumber: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: spacing.xxs,
    },
    receiptAmount: {
        ...typography.h6(),
        color: customColors.primaryDark,
        fontWeight: "700",
    },
    dateContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xxs,
        marginTop: spacing.xxs,
    },
    receiptDate: {
        ...typography.caption(),
        color: customColors.grey500,
    },
    // Details Row
    detailsRow: {
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey100,
        gap: spacing.sm,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    detailText: {
        ...typography.body2(),
        color: customColors.grey700,
        flex: 1,
    },
    // Receipt Footer
    receiptFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey100,
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
    // Status Badge
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.round,
    },
    statusBadgeText: {
        ...typography.caption(),
        fontWeight: "600",
    },
    // Empty State
    emptyStateContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xl,
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
    emptyStateTitle: {
        ...typography.h6(),
        color: customColors.grey700,
        fontWeight: "600",
        marginBottom: spacing.xs,
    },
    emptyStateSubtitle: {
        ...typography.body2(),
        color: customColors.grey500,
        textAlign: "center",
    },
    createReceiptButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        backgroundColor: customColors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
        marginTop: spacing.lg,
        ...shadows.small,
    },
    createReceiptButtonText: {
        ...typography.body2(),
        color: customColors.white,
        fontWeight: "600",
    },
});
