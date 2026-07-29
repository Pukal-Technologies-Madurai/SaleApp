import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import React from "react";
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import FontAwesomeIcon from "react-native-vector-icons/FontAwesome";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { customColors, typography } from "../../Config/helper";
import { fetchPendingDeliveryList, fetchPendingSalesList } from "../../Api/delivery";
import { fetchSaleInvoices } from "../../Api/sales";

const PendingDeliveryAdmin = ({ route }) => {
    const { selectedDate: passedDate, selectedBranch } = route.params || {};

    const navigation = useNavigation();
    const [modalVisible, setModalVisible] = React.useState(false);

    const toYMD = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const [selectedFromDate, setSelectedFromDate] = React.useState(() => {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return toYMD(firstOfMonth);
    });

    const [selectedToDate, setSelectedToDate] = React.useState(() => {
        if (passedDate) {
            return passedDate;
        }
        return new Date().toISOString().split("T")[0];
    });

    const [activeTab, setActiveTab] = React.useState("delivery");
    const [showCancelled, setShowCancelled] = React.useState(false);

    const { data: pendingDelivery = [], isLoading: isLoadingPendingDelivery } = useQuery({
        queryKey: ["pendingDeliveryList", selectedFromDate, selectedToDate, selectedBranch || ""],
        queryFn: async () => 
            fetchSaleInvoices({
                from: selectedFromDate,
                to: selectedToDate,
                branchId: selectedBranch,
                userId: "",
                retailerId: "",
            }),
            // fetchPendingDeliveryList(selectedFromDate, selectedToDate, selectedBranch || "", ""),
        enabled: !!selectedFromDate && !!selectedToDate,
    });

    const { data: pendingSales = [], isLoading: isLoadingPendingSales } =
            useQuery({
                queryKey: [
                    "pendingSalesOrder",
                    selectedFromDate,
                    selectedToDate,
                    selectedBranch || "",
                ],
                queryFn: () =>
                    fetchPendingSalesList(
                        selectedFromDate,
                        selectedToDate,
                        selectedBranch || "",
                    ),
                enabled: !!selectedFromDate && !!selectedToDate,
                select: data => {
                    // Keep cancelled orders (Cancel_status === 0) in the base list — the
                    // "Show Cancelled" checkbox decides whether they're displayed.
                    // Sorted by So_Date ascending (01 to 31)
                    return data
                        .filter(item => item.isConverted !== 2)
                        .sort((a, b) => new Date(a.So_Date) - new Date(b.So_Date));
                },
            });

    // Cancel_status === 0 (or "0") means the order was cancelled.
    const visiblePendingSales = pendingSales.filter(
        item => showCancelled || Number(item.Cancel_status) !== 0,
    );

    // Delivery_Status: 1 = New/Pending (sorted by Do_Date ascending: 01 to 31)
    const pendingDeliveries = pendingDelivery
        .filter(item => item.Delivery_Status === 1)
        .sort((a, b) => new Date(a.Do_Date) - new Date(b.Do_Date));

    // Delivery_Status: 6 = Returned (sorted by Do_Date ascending: 01 to 31)
    const returnedDeliveries = pendingDelivery
        .filter(item => item.Delivery_Status === 6)
        .sort((a, b) => new Date(a.Do_Date) - new Date(b.Do_Date));

    const handleFromDateChange = date => {
        if (date) {
            const newFromDate = date > selectedToDate ? selectedToDate : date;
            setSelectedFromDate(newFromDate);
        }
    };

    const handleToDateChange = date => {
        if (date) {
            const newToDate = date < selectedFromDate ? selectedFromDate : date;
            setSelectedToDate(newToDate);
        }
    };

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    const formatDate = dateString => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB");
    };

    const formatCurrency = amount => {
        return `₹${parseFloat(amount).toFixed(2)}`;
    };

    const sumValue = list =>
        list.reduce((sum, item) => sum + parseFloat(item.Total_Invoice_value || 0), 0);

    const summaryTiles = [
        { icon: "shopping-cart", iconSet: "material", color: customColors.primary, value: visiblePendingSales.length, label: "Sales" },
        { icon: "inr", iconSet: "fa", color: customColors.primary, value: formatCurrency(sumValue(visiblePendingSales)), label: "S.Value" },
        { icon: "local-shipping", iconSet: "material", color: customColors.warning, value: pendingDeliveries.length, label: "Delivery" },
        { icon: "inr", iconSet: "fa", color: customColors.success, value: formatCurrency(sumValue(pendingDeliveries)), label: "D.Value" },
        { icon: "assignment-return", iconSet: "material", color: customColors.error, value: returnedDeliveries.length, label: "Return" },
        { icon: "inr", iconSet: "fa", color: customColors.error, value: formatCurrency(sumValue(returnedDeliveries)), label: "R.Value" },
    ];

    const SummaryCard = () => (
        <View style={styles.summaryGrid}>
            {summaryTiles.map((tile, index) => (
                <View key={index} style={styles.summaryTile}>
                    <View style={[styles.summaryIconBox, { backgroundColor: `${tile.color}1A` }]}>
                        {tile.iconSet === "fa" ? (
                            <FontAwesomeIcon name={tile.icon} size={14} color={tile.color} />
                        ) : (
                            <Icon name={tile.icon} size={14} color={tile.color} />
                        )}
                    </View>
                    <View>
                        <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
                            {tile.value}
                        </Text>
                        <Text style={styles.summaryLabel}>{tile.label}</Text>
                    </View>
                </View>
            ))}
        </View>
    );

    const TabView = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[
                    styles.tab,
                    activeTab === "sales" && styles.activeTab,
                ]}
                onPress={() => setActiveTab("sales")}>
                <Icon
                    name="shopping-cart"
                    size={18}
                    color={
                        activeTab === "sales"
                            ? customColors.white
                            : customColors.grey900
                    }
                />
                <Text
                    style={[
                        styles.tabText,
                        activeTab === "sales" && styles.activeTabText,
                    ]}>
                    Sales ({visiblePendingSales.length})
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.tab,
                    activeTab === "delivery" && styles.activeTab,
                ]}
                onPress={() => setActiveTab("delivery")}>
                <Icon
                    name="local-shipping"
                    size={18}
                    color={
                        activeTab === "delivery"
                            ? customColors.white
                            : customColors.grey900
                    }
                />
                <Text
                    style={[
                        styles.tabText,
                        activeTab === "delivery" && styles.activeTabText,
                    ]}>
                    Delivery ({pendingDeliveries.length})
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.tab,
                    activeTab === "returned" && styles.activeTab,
                ]}
                onPress={() => setActiveTab("returned")}>
                <Icon
                    name="assignment-return"
                    size={18}
                    color={
                        activeTab === "returned"
                            ? customColors.white
                            : customColors.grey900
                    }
                />
                <Text
                    style={[
                        styles.tabText,
                        activeTab === "returned" && styles.activeTabText,
                    ]}>
                    Returns ({returnedDeliveries.length})
                </Text>
            </TouchableOpacity>
        </View>
    );

    const SalesItem = ({ item }) => {
        const isCancelled = Number(item.Cancel_status) === 0;

        return (
            <View
                style={[
                    styles.deliveryCard,
                    isCancelled && styles.deliveryCardCancelled,
                ]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.retailerName} numberOfLines={1}>
                        {item.Retailer_Name}
                    </Text>
                    <Text style={styles.invoiceValue}>
                        {formatCurrency(item.Total_Invoice_value)}
                    </Text>
                </View>

                <View style={styles.subHeaderRow}>
                    <Text style={styles.subHeaderCol} numberOfLines={1}>{item.So_Inv_No}</Text>
                    <Text style={[styles.subHeaderCol, styles.subHeaderColRight]} numberOfLines={1}>
                        {item.Sales_Person_Name}
                    </Text>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.infoRow}>
                        <Icon
                            name="date-range"
                            size={16}
                            color={customColors.grey900}
                            style={styles.icon}
                        />
                        <Text style={styles.value}>{formatDate(item.So_Date)}</Text>
                    </View>

                    {item.Narration && (
                        <View style={styles.infoRow}>
                            <Icon
                                name="note"
                                size={16}
                                color={customColors.grey900}
                                style={styles.icon}
                            />
                            <Text style={styles.value} numberOfLines={1}>
                                {item.Narration}
                            </Text>
                        </View>
                    )}
                </View>

                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: isCancelled ? customColors.error : customColors.primary },
                    ]}>
                    <Text style={styles.statusText}>{isCancelled ? "Cancelled" : "Pending"}</Text>
                </View>
            </View>
        );
    };

    const DeliveryItem = ({ item }) => (
        <View style={styles.deliveryCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.retailerName} numberOfLines={2}>
                    {item.Retailer_Name}
                </Text>
                <Text style={styles.invoiceValue}>
                    {formatCurrency(item.Total_Invoice_value)}
                </Text>
            </View>

            <View style={styles.subHeaderRow}>
                <Text style={styles.subHeaderCol} numberOfLines={1}>{item.Do_Inv_No}</Text>
                <Text style={[styles.subHeaderCol, styles.subHeaderColRight]} numberOfLines={1}>
                    {item.Sales_Person_Name}
                </Text>
            </View>

            <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                    <Icon
                        name="date-range"
                        size={16}
                        color={customColors.grey900}
                        style={styles.icon}
                    />
                    <Text style={styles.value}>{formatDate(item.Do_Date)}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Icon
                        name="delivery-dining"
                        size={16}
                        color={customColors.grey900}
                        style={styles.icon}
                    />
                    <Text style={styles.value}>
                        {item.Delivery_Person_Name}
                    </Text>
                </View>

                {item.Narration && (
                    <View style={styles.infoRow}>
                        <Icon
                            name="note"
                            size={16}
                            color={customColors.grey900}
                            style={styles.icon}
                        />
                        <Text style={[styles.value, { color: customColors.error }]} numberOfLines={1}>
                            {item.Narration}
                        </Text>
                    </View>
                )}
            </View>

            <View
                style={[
                    styles.statusBadge,
                    { backgroundColor: `${item.Delivery_Status === 6 ? customColors.error : customColors.warning}` },
                ]}>
                <Text style={styles.statusText}>{`${item.Delivery_Status === 6 ? "Return" : "Pending"}`}</Text>
            </View>
        </View>
    );

    const ReturnedItem = ({ item }) => (
        <View style={styles.deliveryCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.retailerName} numberOfLines={2}>
                    {item.Retailer_Name}
                </Text>
                <Text style={styles.invoiceValue}>
                    {formatCurrency(item.Total_Invoice_value)}
                </Text>
            </View>

            <View style={styles.subHeaderRow}>
                <Text style={styles.subHeaderCol} numberOfLines={1}>{item.Do_Inv_No}</Text>
                <Text style={[styles.subHeaderCol, styles.subHeaderColRight]} numberOfLines={1}>
                    {item.Sales_Person_Name}
                </Text>
            </View>

            <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                    <Icon
                        name="date-range"
                        size={16}
                        color={customColors.grey900}
                        style={styles.icon}
                    />
                    <Text style={styles.value}>{formatDate(item.Do_Date)}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Icon
                        name="delivery-dining"
                        size={16}
                        color={customColors.grey900}
                        style={styles.icon}
                    />
                    <Text style={styles.value}>
                        {item.Delivery_Person_Name}
                    </Text>
                </View>

                {item.Delivery_Time && (
                    <View style={styles.infoRow}>
                        <Icon
                            name="schedule"
                            size={16}
                            color={customColors.grey900}
                            style={styles.icon}
                        />
                        <Text style={styles.value}>
                            Returned: {formatDate(item.Delivery_Time)}
                        </Text>
                    </View>
                )}

                {item.Narration && (
                    <View style={styles.infoRow}>
                        <Icon
                            name="error-outline"
                            size={16}
                            color={customColors.error}
                            style={styles.icon}
                        />
                        <Text style={[styles.value, { color: customColors.error }]} numberOfLines={2}>
                            {item.Narration.replace("Delivery cancelled - Reason: ", "")}
                        </Text>
                    </View>
                )}
            </View>

            <View
                style={[
                    styles.statusBadge,
                    { backgroundColor: customColors.error },
                ]}>
                <Text style={styles.statusText}>Returned</Text>
            </View>
        </View>
    );

    const isLoading = activeTab === "sales" ? isLoadingPendingSales : isLoadingPendingDelivery;

    const renderContent = () => {
        let data, renderItem, keyExtractor;

        if (activeTab === "sales") {
            data = visiblePendingSales;
            renderItem = SalesItem;
            keyExtractor = item => item.So_Id?.toString();
        } else if (activeTab === "delivery") {
            data = pendingDeliveries;
            renderItem = DeliveryItem;
            keyExtractor = item => item.Do_Id?.toString() || item.Delivery_Order_id?.toString();
        } else if (activeTab === "returned") {
            data = returnedDeliveries;
            renderItem = ReturnedItem;
            keyExtractor = item => item.Do_Id?.toString() || item.Delivery_Order_id?.toString();
        }

        if (isLoading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customColors.primary} />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            );
        }

        if (data && data.length > 0) {
            return (
                <FlashList
                    data={data}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    estimatedItemSize={150}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                />
            );
        } else {
            const emptyText = activeTab === "sales" 
                ? "pending sales" 
                : activeTab === "returned" 
                    ? "returned deliveries" 
                    : "pending delivery";
            return (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                        No {emptyText} found
                    </Text>
                </View>
            );
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Overall Pending"
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
                title="Filter options"
                fromLabel="From Date"
                toLabel="To Date"
            />

            <View style={styles.contentContainer}>
                <SummaryCard />
                <TabView />

                {activeTab === "sales" && (
                    <TouchableOpacity
                        style={styles.cancelToggleRow}
                        onPress={() => setShowCancelled(prev => !prev)}
                        activeOpacity={0.7}>
                        <View
                            style={[
                                styles.checkbox,
                                showCancelled && styles.checkboxChecked,
                            ]}>
                            {showCancelled && (
                                <Icon name="check" size={14} color={customColors.white} />
                            )}
                        </View>
                        <Text style={styles.cancelToggleText}>Show Cancelled Orders</Text>
                    </TouchableOpacity>
                )}

                {renderContent()}
            </View>
        </SafeAreaView>
    );
};

export default PendingDeliveryAdmin;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    summaryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 4,
        gap: 6,
    },
    summaryTile: {
        width: "48%",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.white,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        elevation: 1,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
    },
    summaryIconBox: {
        width: 28,
        height: 28,
        borderRadius: 7,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    summaryValue: {
        ...typography.body2(),
        fontWeight: "bold",
        color: customColors.primaryDark,
        lineHeight: 16,
    },
    summaryLabel: {
        ...typography.caption(),
        color: customColors.grey900,
        lineHeight: 14,
    },
    tabContainer: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 8,
        backgroundColor: "#f5f5f5",
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 6,
    },
    activeTab: {
        backgroundColor: customColors.primary,
    },
    tabText: {
        marginLeft: 6,
        ...typography.caption(),
        fontWeight: "400",
        color: customColors.grey900,
    },
    activeTabText: {
        color: customColors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    loadingText: {
        ...typography.body1(),
        color: customColors.grey600,
        textAlign: "center",
    },
    cancelToggleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        marginBottom: 8,
        gap: 8,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: customColors.grey400,
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxChecked: {
        backgroundColor: customColors.error,
        borderColor: customColors.error,
    },
    cancelToggleText: {
        ...typography.body2(),
        color: customColors.grey800,
        fontWeight: "600",
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    deliveryCard: {
        backgroundColor: customColors.white,
        marginBottom: 8,
        borderRadius: 8,
        elevation: 2,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        borderLeftWidth: 4,
        borderLeftColor: customColors.primary,
    },
    deliveryCardCancelled: {
        borderLeftColor: customColors.error,
        opacity: 0.7,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 4,
    },
    retailerName: {
        ...typography.body2(),
        fontWeight: "bold",
        color: customColors.primaryDark,
        flex: 1,
        marginRight: 8,
    },
    invoiceValue: {
        ...typography.body2(),
        fontWeight: "bold",
        color: customColors.success,
    },
    subHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingBottom: 6,
    },
    subHeaderCol: {
        ...typography.caption(),
        color: customColors.grey700,
        flex: 1,
    },
    subHeaderColRight: {
        textAlign: "right",
    },
    cardContent: {
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 4,
        alignItems: "center",
    },
    icon: {
        marginRight: 8,
        width: 20,
    },
    value: {
        ...typography.body2(),
        color: customColors.primaryDark,
        flex: 1,
    },
    statusBadge: {
        position: "absolute",
        top: 54,
        right: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    statusText: {
        ...typography.overline(),
        color: customColors.white,
        fontWeight: "bold",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    emptyText: {
        ...typography.body1(),
        color: customColors.grey900,
        textAlign: "center",
    },
});
