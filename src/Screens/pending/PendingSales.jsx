import {
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

const PendingSales = ({ route }) => {
    const { selectedDate: passedDate, selectedBranch } = route.params || {};

    const navigation = useNavigation();
    const [modalVisible, setModalVisible] = React.useState(false);
    const [selectedFromDate, setSelectedFromDate] = React.useState(() => {
        if (passedDate) {
            return passedDate;
        }
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return firstOfMonth.toISOString().split("T")[0];
    });
    const [selectedToDate, setSelectedToDate] = React.useState(new Date().toISOString().split("T")[0]);
    const [activeTab, setActiveTab] = React.useState("delivery");

    const { data: pendingDelivery = [] } = useQuery({
        queryKey: ["pendingDeliveryList", selectedFromDate, selectedToDate, selectedBranch],
        queryFn: () =>
            fetchPendingDeliveryList(selectedFromDate, selectedToDate, selectedBranch),
        enabled: !!selectedFromDate && !!selectedToDate && !!selectedBranch,
    });

    const { data: pendingSales = [] } = useQuery({
        queryKey: ["pendingSalesOrder", selectedFromDate, selectedToDate, selectedBranch],
        queryFn: () => fetchPendingSalesList(selectedFromDate, selectedToDate, selectedBranch),
        enabled: !!selectedFromDate && !!selectedToDate && !!selectedBranch,
    });

    // Filter only pending deliveries (Delivery_Status !== 7)
    const pendingDeliveries = pendingDelivery.filter(
        item => item.Delivery_Status !== 7,
    );

    const pendingSalesOrders = pendingSales.filter(
        item => item.isConverted !== 2,
    );

    // Get all products from pending deliveries
    const pendingProducts = pendingDelivery
        .filter(item => item.Delivery_Status !== 7)
        .flatMap(
            delivery =>
                delivery.Products_List?.map(product => ({
                    ...product,
                    Delivery_Order_id: delivery.Delivery_Order_id,
                    Do_Inv_No: delivery.Do_Inv_No,
                    Retailer_Name: delivery.Retailer_Name,
                    Do_Date: delivery.Do_Date,
                    Delivery_Status: delivery.Delivery_Status,
                    DeliveryStatusName: delivery.DeliveryStatusName,
                    Narration: delivery.Narration,
                })) || [],
        );

    const handleFromDateChange = date => {
        if (date) {
            const newFromDate = date > selectedToDate ? selectedToDate : date;
            setSelectedFromDate(newFromDate.toISOString().split("T")[0]);
        }
    };

    const handleToDateChange = date => {
        if (date) {
            const newToDate = date < selectedFromDate ? selectedFromDate : date;
            setSelectedToDate(newToDate.toISOString().split("T")[0]);
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

    const SummaryCard = () => (
        <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                    <View style={styles.summaryIconBox}>
                        <Icon
                            name="local-shipping"
                            size={18}
                            color={customColors.warning}
                        />
                    </View>
                    <View style={styles.summaryText}>
                        <Text style={styles.summaryValue}>
                            {pendingDeliveries.length}
                        </Text>
                        <Text style={styles.summaryLabel}>Delivery</Text>
                    </View>
                </View>

                <View style={styles.summaryVerticalDivider} />

                <View style={styles.summaryItem}>
                    <View style={styles.summaryIconBox}>
                        <FontAwesomeIcon
                            name="inr"
                            size={18}
                            color={customColors.success}
                        />
                    </View>
                    <View style={styles.summaryText}>
                        <Text style={styles.summaryValue}>
                            {formatCurrency(
                                pendingDeliveries.reduce(
                                    (sum, item) =>
                                        sum +
                                        parseFloat(
                                            item.Total_Invoice_value || 0,
                                        ),
                                    0,
                                ),
                            )}
                        </Text>
                        <Text style={styles.summaryLabel}>D.Value</Text>
                    </View>
                </View>
            </View>

            <View style={styles.summaryHorizontalDivider} />

            <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                    <View style={styles.summaryIconBox}>
                        <Icon
                            name="shopping-cart"
                            size={18}
                            color={customColors.primary}
                        />
                    </View>
                    <View style={styles.summaryText}>
                        <Text style={styles.summaryValue}>
                            {pendingSalesOrders.length}
                        </Text>
                        <Text style={styles.summaryLabel}>Sales</Text>
                    </View>
                </View>

                <View style={styles.summaryVerticalDivider} />

                <View style={styles.summaryItem}>
                    <View style={styles.summaryIconBox}>
                        <Icon
                            name="trending-down"
                            size={18}
                            color={customColors.info}
                        />
                    </View>
                    <View style={styles.summaryText}>
                        <Text style={styles.summaryValue}>
                            {formatCurrency(
                                pendingSalesOrders.reduce(
                                    (sum, item) =>
                                        sum +
                                        parseFloat(
                                            item.Total_Invoice_value || 0,
                                        ),
                                    0,
                                ),
                            )}
                        </Text>
                        <Text style={styles.summaryLabel}>S.Value</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const TabView = () => (
        <View style={styles.tabContainer}>
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
                style={[styles.tab, activeTab === "sales" && styles.activeTab]}
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
                    Sales ({pendingSalesOrders.length})
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.tab,
                    activeTab === "products" && styles.activeTab,
                ]}
                onPress={() => setActiveTab("products")}>
                <Icon
                    name="inventory"
                    size={18}
                    color={
                        activeTab === "products"
                            ? customColors.white
                            : customColors.grey900
                    }
                />
                <Text
                    style={[
                        styles.tabText,
                        activeTab === "products" && styles.activeTabText,
                    ]}>
                    Products ({pendingProducts.length})
                </Text>
            </TouchableOpacity>
        </View>
    );

    const DeliveryItem = ({ item }) => (
        <View style={styles.deliveryCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.invoiceNumber}>{item.Do_Inv_No}</Text>
                <Text style={styles.invoiceValue}>
                    {formatCurrency(item.Total_Invoice_value)}
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
                        name="store"
                        size={16}
                        color={customColors.grey900}
                        style={styles.icon}
                    />
                    <Text style={styles.value} numberOfLines={1}>
                        {item.Retailer_Name}
                    </Text>
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
                    { backgroundColor: `${item.DeliveryStatusName === "Return" ? customColors.error : customColors.warning}` },
                ]}>
                <Text style={styles.statusText}>{`${item.DeliveryStatusName === "Return" ? "Return" : "Pending"}`}</Text>
            </View>
        </View>
    );

    const SalesItem = ({ item }) => (
        <View style={styles.deliveryCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.invoiceNumber}>{item.So_Inv_No}</Text>
                <Text style={styles.invoiceValue}>
                    {formatCurrency(item.Total_Invoice_value)}
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

                <View style={styles.infoRow}>
                    <Icon
                        name="store"
                        size={16}
                        color={customColors.grey900}
                        style={styles.icon}
                    />
                    <Text style={styles.value} numberOfLines={2}>
                        {item.Retailer_Name}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Icon
                        name="person"
                        size={16}
                        color={customColors.grey900}
                        style={styles.icon}
                    />
                    <Text style={styles.value}>{item.Sales_Person_Name}</Text>
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
                    { backgroundColor: customColors.primary },
                ]}>
                <Text style={styles.statusText}>Pending</Text>
            </View>
        </View>
    );

    const ProductItem = ({ item }) => {
        const isReturn = item.Delivery_Status === 6;
        const isPending = item.Delivery_Status === 5;

        return (
            <View style={styles.deliveryCard}>
                <View style={styles.cardHeader}>
                    <Text style={styles.invoiceNumber} numberOfLines={2}>{item.Product_Name}</Text>
                    <Text style={styles.invoiceValue}>
                        {formatCurrency(item.Final_Amount || item.Amount)}
                    </Text>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.infoRow}>
                        <Icon
                            name="branding-watermark"
                            size={16}
                            color={customColors.grey900}
                            style={styles.icon}
                        />
                        <Text style={styles.value}>{item.BrandGet || "N/A"}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Icon
                            name="receipt"
                            size={16}
                            color={customColors.grey900}
                            style={styles.icon}
                        />
                        <Text style={styles.value} numberOfLines={1}>
                            {item.Do_Inv_No}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Icon
                            name="store"
                            size={16}
                            color={customColors.grey900}
                            style={styles.icon}
                        />
                        <Text style={styles.value} numberOfLines={1}>
                            {item.Retailer_Name}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Icon
                            name="production-quantity-limits"
                            size={16}
                            color={customColors.grey900}
                            style={styles.icon}
                        />
                        <Text style={styles.value}>
                            Qty: {item.Bill_Qty} {item.Unit_Name}
                        </Text>
                    </View>
                </View>

                {isReturn && item.Narration && (
                    <View style={[styles.infoRow, { paddingHorizontal: 12, paddingBottom: 8 }]}>
                        <Icon
                            name="error-outline"
                            size={16}
                            color={customColors.error}
                            style={styles.icon}
                        />
                        <Text style={[styles.value, { color: customColors.error }]} numberOfLines={2}>
                            Reason: {item.Narration.replace("Delivery cancelled - Reason: ", "")}
                        </Text>
                    </View>
                )}

                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: isReturn ? customColors.error : customColors.warning, marginTop: 12 },
                    ]}>
                    <Text style={styles.statusText}>{isReturn ? "Return" : "Pending"}</Text>
                </View>
            </View>
        )
    };

    const renderContent = () => {
        let data, renderItem;

        if (activeTab === "delivery") {
            data = pendingDeliveries;
            renderItem = DeliveryItem;
        } else if (activeTab === "sales") {
            data = pendingSalesOrders;
            renderItem = SalesItem;
        } else {
            data = pendingProducts;
            renderItem = ProductItem;
        }

        if (data.length > 0) {
            return (
                <FlashList
                    data={data}
                    keyExtractor={item => {
                        if (activeTab === "delivery") {
                            return item.Delivery_Order_id.toString();
                        } else if (activeTab === "sales") {
                            return item.S_Id.toString();
                        } else {
                            return `${item.Delivery_Order_id}_${item.DO_St_Id}`;
                        }
                    }}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                />
            );
        } else {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                        No pending {activeTab} found
                    </Text>
                </View>
            );
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Pending Details"
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
                {renderContent()}
            </View>
        </SafeAreaView>
    );
};

export default PendingSales;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    summaryCard: {
        backgroundColor: customColors.white,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        padding: 12,
        borderRadius: 8,
        elevation: 2,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    summaryItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
    },
    summaryIconBox: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: "#f8f9fa",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    summaryText: {
        alignItems: "flex-start",
    },
    summaryValue: {
        ...typography.body1(),
        fontWeight: "bold",
        color: customColors.primaryDark,
        lineHeight: 18,
    },
    summaryLabel: {
        ...typography.caption(),
        color: customColors.grey900,
        marginTop: 2,
    },
    summaryVerticalDivider: {
        width: 1,
        height: 32,
        backgroundColor: "#e0e0e0",
        marginHorizontal: 8,
    },
    summaryHorizontalDivider: {
        height: 1,
        backgroundColor: "#e0e0e0",
        marginVertical: 8,
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
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        paddingBottom: 8,
    },
    invoiceNumber: {
        ...typography.body2(),
        fontWeight: "bold",
        color: customColors.primaryDark,
        flex: 1,
    },
    invoiceValue: {
        ...typography.body2(),
        fontWeight: "bold",
        color: customColors.success,
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
        top: 32,
        right: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    statusText: {
        color: customColors.white,
        ...typography.overline(),
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
