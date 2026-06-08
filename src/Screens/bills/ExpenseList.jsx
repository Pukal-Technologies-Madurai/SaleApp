import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import AppHeader from "../../Components/AppHeader";
import {
    customColors,
    typography,
    spacing,
    shadows,
    borderRadius,
    iconSizes,
} from "../../Config/helper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FilterModal from "../../Components/FilterModal";
import { useQuery } from "@tanstack/react-query";
import FeatherIcon from "react-native-vector-icons/Feather";
import FontAwesomeIcon from "react-native-vector-icons/FontAwesome";
import { fetchExpenses } from "../../Api/receipt";

const SummaryCard = ({ icon, value, label, color, isActive, onPress, iconLibrary = "Feather" }) => (
    <TouchableOpacity
        style={[styles.summaryCard, isActive && styles.activeSummaryCard]}
        onPress={onPress}
        activeOpacity={0.7}>
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

const StatusBadge = ({ label, color, icon }) => (
    <View style={[styles.statusBadge, { backgroundColor: color + "15" }]}>
        <FeatherIcon name={icon} size={iconSizes.xs} color={color} />
        <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
    </View>
);

const ExpenseList = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { isAdmin = false, selectedDate: passedDate, selectedBranch } = route.params || {};
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    const [modalFromDate, setModalFromDate] = useState(new Date());
    const [modalToDate, setModalToDate] = useState(new Date());
    const [modalVisible, setModalVisible] = useState(false);
    const [activeFilter, setActiveFilter] = useState("all");
    const [showSearch, setShowSearch] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const [userID, setUserID] = useState(null);
    const [createdByOptions, setCreatedByOptions] = useState([
        { label: "All", value: "all" },
    ]);
    const [selectedCreatedBy, setSelectedCreatedBy] = useState({
        label: "All",
        value: "all",
    });

    const formatDateParam = useCallback(date => {
        if (!(date instanceof Date) || isNaN(date)) {
            return new Date().toISOString().split("T")[0];
        }
        return date.toISOString().split("T")[0];
    }, []);

    useEffect(() => {
        (async () => {
            const userId = await AsyncStorage.getItem("UserId");
            setUserID(isAdmin ? "" : userId);

            if (passedDate) {
                const initialDate = new Date(passedDate);
                setSelectedFromDate(initialDate);
                setSelectedToDate(initialDate);
                setModalFromDate(initialDate);
                setModalToDate(initialDate);
            }
        })();
    }, [isAdmin, passedDate]);

    const effectiveCreatedBy =
        isAdmin && selectedCreatedBy.value !== "all"
            ? String(selectedCreatedBy.value)
            : userID;

    const handleCreatedByChange = useCallback(item => {
        setSelectedCreatedBy(item);
    }, []);

    const handleOpenModal = useCallback(() => {
        setModalFromDate(selectedFromDate);
        setModalToDate(selectedToDate);
        setModalVisible(true);
    }, [selectedFromDate, selectedToDate]);

    const handleFromDateChange = useCallback(date => {
        if (date) setModalFromDate(date);
    }, []);

    const handleToDateChange = useCallback(date => {
        if (date) setModalToDate(date);
    }, []);

    const handleApplyFilter = useCallback(() => {
        if (modalFromDate > modalToDate) {
            Alert.alert("Invalid Date Range", "From date cannot be after To date");
            return;
        }
        setSelectedFromDate(modalFromDate);
        setSelectedToDate(modalToDate);
        setModalVisible(false);
    }, [modalFromDate, modalToDate]);

    const handleCloseModal = useCallback(() => {
        setModalVisible(false);
    }, []);

    const {
        data: salespersonExpenses = [],
        error,
        isLoading: isLoadingSalespersonExpenses,
        refetch,
    } = useQuery({
        queryKey: [
            "salespersonExpenses",
            selectedFromDate,
            selectedToDate,
            effectiveCreatedBy,
            isAdmin,
        ],
        queryFn: () =>
            fetchExpenses(
                formatDateParam(selectedFromDate),
                formatDateParam(selectedToDate),
                effectiveCreatedBy,
            ),
        enabled: userID !== null,
    });

    useEffect(() => {
        if (!isAdmin || selectedCreatedBy.value !== "all" || !salespersonExpenses.length) {
            return;
        }

        const creatorMap = new Map();
        salespersonExpenses.forEach(item => {
            const createdBy = item?.created_by;
            if (createdBy === null || createdBy === undefined || createdBy === "") return;

            const label = item?.getCreatedBy || String(createdBy);
            creatorMap.set(String(createdBy), label);
        });

        const dropdownData = [
            { label: "All", value: "all" },
            ...Array.from(creatorMap.entries()).map(([value, label]) => ({
                label,
                value,
            })),
        ];

        setCreatedByOptions(dropdownData);
    }, [isAdmin, selectedCreatedBy.value, salespersonExpenses]);

    const expenseRows = useMemo(() => {
        return (salespersonExpenses || []).filter(item => item.status !== 0);
    }, [salespersonExpenses]);

    const filteredRows = useMemo(() => {
        let rows = expenseRows;

        if (activeFilter === "cash") {
            rows = rows.filter(item => item.transaction_type === "Cash");
        } else if (activeFilter === "upi") {
            rows = rows.filter(item => item.transaction_type === "UPI");
        } else if (activeFilter === "bank") {
            rows = rows.filter(item => item.transaction_type === "Bank");
        }

        if (searchTerm.trim()) {
            const keyword = searchTerm.toLowerCase();
            rows = rows.filter(item =>
                `${item.debit_ledger_name || ""} ${item.remarks || ""} ${item.payment_invoice_no || ""}`
                    .toLowerCase()
                    .includes(keyword),
            );
        }

        return rows;
    }, [expenseRows, activeFilter, searchTerm]);

    const summary = useMemo(() => {
        const totalAmount = expenseRows.reduce((sum, row) => sum + Number(row.credit_amount || 0), 0);
        const cashAmount = expenseRows
            .filter(row => row.transaction_type === "Cash")
            .reduce((sum, row) => sum + Number(row.credit_amount || 0), 0);
        const upiAmount = expenseRows
            .filter(row => row.transaction_type === "UPI")
            .reduce((sum, row) => sum + Number(row.credit_amount || 0), 0);

        return { totalAmount, cashAmount, upiAmount };
    }, [expenseRows]);

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

    const renderExpenseCard = row => (
        <View key={row.pay_id} style={styles.expenseCard}>
            <View style={styles.cardHeader}>
                <View style={styles.cardIconWrap}>
                    <FeatherIcon name="file-text" size={iconSizes.lg} color={customColors.primary} />
                </View>

                <View style={styles.cardHeaderInfo}>
                    <Text style={styles.expenseName} numberOfLines={2}>{row.debit_ledger_name || "-"}</Text>
                    <Text style={styles.invoiceNo}>{row.payment_invoice_no || "-"}</Text>
                </View>

                <View style={styles.cardHeaderRight}>
                    <Text style={styles.amountText}>₹{Number(row.credit_amount || 0).toLocaleString("en-IN")}</Text>
                    <Text style={styles.dateText}>{formatDate(row.payment_date)}</Text>
                </View>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs }}>
                <Text style={{ ...typography.caption(), fontWeight: "bold", color: customColors.infoDark }}>{row.getCreatedBy || "-"}</Text>
            </View>

            <View style={styles.cardDetailsRow}>
                <View style={styles.detailItem}>
                    <FeatherIcon name="credit-card" size={iconSizes.sm} color={customColors.grey500} />
                    <Text style={styles.detailText}>{row.credit_ledger_name || "-"}</Text>
                </View>
                <View style={styles.detailItem}>
                    <FeatherIcon name="message-square" size={iconSizes.sm} color={customColors.grey500} />
                    <Text style={styles.detailText} numberOfLines={1}>{row.remarks || "No remarks"}</Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.timeWrap}>
                    <FeatherIcon name="clock" size={iconSizes.xs} color={customColors.grey500} />
                    <Text style={styles.timeText}>{formatTime(row.created_on)}</Text>
                </View>

                <StatusBadge
                    label={row.transaction_type || "-"}
                    color={customColors.success}
                    icon="check-circle"
                />
            </View>
        </View>
    );

    const renderSearchBar = () => {
        if (!showSearch) return null;

        return (
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <FeatherIcon name="search" size={iconSizes.md} color={customColors.grey500} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by expense/remarks/invoice..."
                        placeholderTextColor={customColors.grey400}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                    {!!searchTerm && (
                        <TouchableOpacity onPress={() => setSearchTerm("")} style={styles.clearButton}>
                            <FeatherIcon name="x" size={iconSizes.sm} color={customColors.grey500} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconContainer}>
                <FeatherIcon name="inbox" size={iconSizes.xxl} color={customColors.grey300} />
            </View>
            <Text style={styles.emptyStateTitle}>No Expenses Found</Text>
            <Text style={styles.emptyStateSubtitle}>
                No expenses found for the selected date range.
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Expense List"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialIcon"
                rightIconName="filter-list"
                onRightPress={handleOpenModal}
                // showFilterDropdown={isAdmin}
                // filterTitle="Sales Person"
                // filterDropdownData={createdByOptions}
                // selectedFilter={selectedCreatedBy.value}
                // onFilterChange={handleCreatedByChange}
            />

            <FilterModal
                visible={modalVisible}
                fromDate={modalFromDate}
                toDate={modalToDate}
                onFromDateChange={handleFromDateChange}
                onToDateChange={handleToDateChange}
                onApply={handleApplyFilter}
                onClose={handleCloseModal}
                showToDate={true}
                title="Select Date Range"
                fromLabel="From Date"
                toLabel="To Date"

                showSalesPerson={isAdmin}
                salesPersonLabel="Select Sales Person"
                salesPersonData={createdByOptions}
                selectedSalesPerson={selectedCreatedBy}
                onSalesPersonChange={handleCreatedByChange}
            />

            <View style={styles.contentContainer}>
                {isLoadingSalespersonExpenses ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={customColors.primary} />
                        <Text style={styles.loadingText}>Loading expenses...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.errorContainer}>
                        <View style={styles.errorIconContainer}>
                            <FeatherIcon name="alert-circle" size={iconSizes.xl} color={customColors.error} />
                        </View>
                        <Text style={styles.errorTitle}>Error Loading Expenses</Text>
                        <Text style={styles.errorText}>
                            {error?.message || "Something went wrong while loading expenses."}
                        </Text>
                        <TouchableOpacity style={styles.retryButton} onPress={refetch} activeOpacity={0.7}>
                            <FeatherIcon name="refresh-cw" size={iconSizes.sm} color={customColors.white} />
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={isLoadingSalespersonExpenses}
                                onRefresh={refetch}
                                colors={[customColors.primary]}
                            />
                        }
                        showsVerticalScrollIndicator={false}>

                        <View style={styles.summaryContainer}>
                            <SummaryCard
                                icon="inr"
                                iconLibrary="FontAwesome"
                                value={`₹${summary.totalAmount.toLocaleString("en-IN")}`}
                                label="Total"
                                color={customColors.accent2}
                                isActive={activeFilter === "all"}
                                onPress={() => setActiveFilter("all")}
                            />
                            <SummaryCard
                                icon="inr"
                                iconLibrary="FontAwesome"
                                value={`₹${summary.cashAmount.toLocaleString("en-IN")}`}
                                label="Cash"
                                color={customColors.primary}
                                isActive={activeFilter === "cash"}
                                onPress={() => setActiveFilter(activeFilter === "cash" ? "all" : "cash")}
                            />
                            <SummaryCard
                                icon="smartphone"
                                value={`₹${summary.upiAmount.toLocaleString("en-IN")}`}
                                label="UPI"
                                color={customColors.success}
                                isActive={activeFilter === "upi"}
                                onPress={() => setActiveFilter(activeFilter === "upi" ? "all" : "upi")}
                            />
                        </View>

                        <View style={styles.listWrap}>
                            {renderSearchBar()}

                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>
                                    {activeFilter === "all" ? "All" : activeFilter.toUpperCase()} Expenses ({filteredRows.length})
                                </Text>

                                <View style={styles.headerActions}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setShowSearch(!showSearch);
                                            if (showSearch) setSearchTerm("");
                                        }}
                                        style={styles.actionButton}>
                                        <FeatherIcon
                                            name={showSearch ? "x" : "search"}
                                            size={iconSizes.md}
                                            color={customColors.primary}
                                        />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate("Expense")}
                                        style={styles.actionButton}>
                                        <FeatherIcon name="plus" size={iconSizes.lg} color={customColors.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {filteredRows.length === 0 ? renderEmptyState() : filteredRows.map(renderExpenseCard)}
                        </View>
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
};

export default ExpenseList;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.grey50,
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
        gap: spacing.sm,
    },
    errorIconContainer: {
        width: 64,
        height: 64,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.errorFaded,
        justifyContent: "center",
        alignItems: "center",
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
    listWrap: {
        paddingHorizontal: spacing.md,
    },
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
    expenseCard: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        ...shadows.small,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    cardIconWrap: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.lg,
        backgroundColor: customColors.primaryFaded,
        justifyContent: "center",
        alignItems: "center",
    },
    cardHeaderInfo: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    cardHeaderRight: {
        alignItems: "flex-end",
    },
    expenseName: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    invoiceNo: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: spacing.xxs,
    },
    amountText: {
        ...typography.h6(),
        color: customColors.primaryDark,
        fontWeight: "700",
    },
    dateText: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: spacing.xxs,
    },
    cardDetailsRow: {
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
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey100,
    },
    timeWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    timeText: {
        ...typography.caption(),
        color: customColors.grey500,
    },
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
    emptyStateContainer: {
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
});
