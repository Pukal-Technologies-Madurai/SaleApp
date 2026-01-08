import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../../Components/AppHeader";
import { useNavigation } from "@react-navigation/native";
import {
    customColors,
    typography,
    spacing,
    shadows,
} from "../../Config/helper";
import FilterModal from "../../Components/FilterModal";
import { useQuery } from "@tanstack/react-query";
import { fetchPendingDeliveryList } from "../../Api/delivery";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toYMD } from "../../Config/functions";

const PendingDeliveryIndividual = () => {
    const navigation = useNavigation();
    const [userId, setUserId] = React.useState(null);
    const [branchId, setBranchId] = React.useState(null);
    const [modalVisible, setModalVisible] = React.useState(false);
    const [expandedOrders, setExpandedOrders] = React.useState(new Set());

    const [selectedFromDate, setSelectedFromDate] = React.useState(() => {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return toYMD(firstOfMonth);
    });

    const [selectedToDate, setSelectedToDate] = React.useState(
        new Date().toISOString().split("T")[0],
    );

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

    const toggleOrderExpansion = (orderId) => {
        const newExpanded = new Set(expandedOrders);
        if (newExpanded.has(orderId)) {
            newExpanded.delete(orderId);
        } else {
            newExpanded.add(orderId);
        }
        setExpandedOrders(newExpanded);
    };

    React.useEffect(() => {
        (async () => {
            const userId = await AsyncStorage.getItem("UserId");
            const branchId = await AsyncStorage.getItem("branchId");
            let parsedBranchId = branchId;

            if (typeof branchId === "string") {
                parsedBranchId = parseInt(branchId.replace(/[\[\]]/g, ""));
            } else {
                parsedBranchId = parseInt(branchId);
            }
            setBranchId(parsedBranchId);
            setUserId(userId);
        })();
    }, [selectedFromDate, selectedToDate, branchId, userId]);

    const { data: pendingDelivery = [], isLoading: isLoadingPendingDelivery } =
        useQuery({
            queryKey: [
                "pendingDeliveryList",
                selectedFromDate,
                selectedToDate,
                branchId,
                userId,
            ],
            queryFn: () =>
                fetchPendingDeliveryList(
                    selectedFromDate,
                    selectedToDate,
                    branchId,
                    userId,
                ),
            enabled:
                !!selectedFromDate &&
                !!selectedToDate &&
                !!branchId &&
                !!userId,
            select: data => {
                if (!data) return [];
                return data.filter(
                    item =>
                        item.Delivery_Status === "6" ||
                        item.DeliveryStatusName === "Return",
                );
            },
        });

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Delivery Return"
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
                {isLoadingPendingDelivery ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator
                            size="large"
                            color={customColors.primary}
                        />
                        <Text style={styles.loadingText}>
                            Loading return deliveries...
                        </Text>
                    </View>
                ) : (
                    <ScrollView style={styles.scrollContainer}>
                        {/* Summary Stats */}
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>
                                Return Delivery Summary
                            </Text>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>
                                        {pendingDelivery.length}
                                    </Text>
                                    <Text style={styles.statLabel}>
                                        Total Orders
                                    </Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text
                                        style={[
                                            styles.statNumber,
                                            { color: customColors.error },
                                        ]}
                                    >
                                        ₹
                                        {pendingDelivery
                                            .reduce(
                                                (sum, item) =>
                                                    sum +
                                                    (parseFloat(
                                                        item.Total_Invoice_value,
                                                    ) || 0),
                                                0,
                                            )
                                            .toFixed(2)}
                                    </Text>
                                    <Text style={styles.statLabel}>
                                        Total Value
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Return Orders List */}
                        {pendingDelivery.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Icon
                                    name="assignment-return"
                                    size={80}
                                    color={customColors.grey400}
                                />
                                <Text style={styles.emptyTitle}>
                                    No Return Deliveries
                                </Text>
                                <Text style={styles.emptyMessage}>
                                    No return deliveries found for the selected
                                    date range.
                                </Text>
                            </View>
                        ) : (
                            pendingDelivery.map((order, index) => {
                                const isExpanded = expandedOrders.has(order.Do_Id);
                                return (
                                    <TouchableOpacity 
                                        key={order.Do_Id} 
                                        style={styles.orderRow}
                                        onPress={() => toggleOrderExpansion(order.Do_Id)}
                                        activeOpacity={0.7}
                                    >
                                        {/* Single Compact Row */}
                                        <View style={styles.orderMainInfo}>
                                            <View style={styles.orderLeft}>
                                                <View style={styles.orderTitleRow}>
                                                    <Text style={styles.orderNumber}>
                                                        #{order.Do_Inv_No}
                                                    </Text>
                                                </View>
                                                <Text style={styles.retailerName} numberOfLines={1}>
                                                    {order.Retailer_Name}
                                                </Text>
                                            </View>
                                            <View style={styles.orderRight}>
                                                <Text style={styles.orderAmount}>
                                                    ₹{order.Total_Invoice_value}
                                                </Text>
                                                <Text style={styles.orderDate}>
                                                    {new Date(order.Do_Date).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Compact Highlight Info */}
                                        {order.Narration && (
                                            <View style={styles.reasonRow}>
                                                <Text style={styles.reasonLabel}>Reason: </Text>
                                                <Text style={styles.reasonText} numberOfLines={2}>
                                                    {order.Narration}
                                                </Text>
                                            </View>
                                        )}
                                        
                                        {/* Delivery Person Info */}
                                        {order.Delivery_Person_Name && (
                                            <View style={styles.reasonRow}>
                                                <Text style={styles.reasonLabel}>Delivery Person: </Text>
                                                <Text style={styles.reasonText} numberOfLines={1}>
                                                    {order.Delivery_Person_Name}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Products Table - Only show when expanded */}
                                        {isExpanded && order.Products_List && order.Products_List.length > 0 && (
                                            <View style={styles.productsTable}>
                                                <View style={styles.tableHeader}>
                                                    <Text style={[styles.tableHeaderText, {width: "45%",}]}>Product</Text>
                                                    <Text style={[styles.tableHeaderText, styles.qtyHeader]}>Qty</Text>
                                                    <Text style={[styles.tableHeaderText, styles.amountHeader]}>Amount</Text>
                                                </View>
                                                {order.Products_List.map((product, idx) => (
                                                    <View key={idx} style={styles.tableRow}>
                                                        <Text style={styles.productNameCell} numberOfLines={2}>
                                                            {product.Product_Name}
                                                        </Text>
                                                        <Text style={styles.qtyCellText}>
                                                            {product.Total_Qty}
                                                        </Text>
                                                        <Text style={styles.amountCellText}>
                                                            ₹{product.Final_Amo}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
};

export default PendingDeliveryIndividual;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.xl,
    },
    loadingText: {
        ...typography.body2(),
        color: customColors.grey600,
        marginTop: spacing.md,
    },
    scrollContainer: {
        flex: 1,
        padding: spacing.md,
    },

    // Summary Card Styles
    summaryCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        elevation: 6,
        // ...shadows.small,
        // borderLeftWidth: 4,
        // borderLeftColor: customColors.primaryLight,
    },
    summaryTitle: {
        ...typography.subtitle1(),
        fontWeight: "700",
        color: customColors.primary,
        marginBottom: spacing.md,
        textAlign: "center",
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    statItem: {
        alignItems: "center",
    },
    statNumber: {
        ...typography.h5(),
        fontWeight: "700",
        color: customColors.primary,
        marginBottom: spacing.xs,
    },
    statLabel: {
        ...typography.caption(),
        color: customColors.grey600,
    },

    // Minimal Order Row Styles
    orderRow: {
        backgroundColor: customColors.white,
        borderRadius: 6,
        padding: spacing.sm,
        marginBottom: 12,
        ...shadows.small,
        borderLeftWidth: 2,
        borderLeftColor: customColors.error,
    },
    orderMainInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    orderLeft: {
        flex: 1,
    },
    orderTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 2,
    },
    orderNumber: {
        ...typography.body2(),
        fontWeight: "700",
        color: customColors.primary,
        marginRight: spacing.sm,
    },
    retailerName: {
        ...typography.caption(),
        color: customColors.grey800,
        fontWeight: "500",
    },
    orderRight: {
        alignItems: "flex-end",
    },
    orderAmount: {
        ...typography.body2(),
        fontWeight: "700",
        color: customColors.error,
        marginBottom: 1,
    },
    orderDate: {
        ...typography.caption(),
        color: customColors.grey600,
    },

    // Compact Reason Row
    reasonRow: {
        flexDirection: "row",
        marginTop: spacing.xs,
        paddingTop: spacing.xs,
        borderTopWidth: 0.5,
        borderTopColor: customColors.grey200,
    },
    reasonLabel: {
        ...typography.caption(),
        fontWeight: "700",
        color: customColors.grey700,
        marginRight: spacing.xs
    },
    reasonText: {
        width: "75%",
        ...typography.caption(),
        color: customColors.grey700,
        // flex: 1,
        fontStyle: "italic",
    },

    // Products Table Styles
    productsTable: {
        marginTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
        paddingTop: spacing.sm,
    },
    tableHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: customColors.grey100,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: 4,
        marginBottom: spacing.xs,
    },
    tableHeaderText: {
        ...typography.caption(),
        fontWeight: "700",
        color: customColors.primary,
    },
    qtyHeader: {
        width: 50,
        textAlign: "right",
    },
    amountHeader: {
        width: 75,
        textAlign: "left",
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 0.5,
        borderBottomColor: customColors.grey200,
        alignItems: "center",
    },
    productNameCell: {
        ...typography.caption(),
        color: customColors.grey800,
        // flex: 1,
        width: "60%",
        marginRight: spacing.xs,
    },
    qtyCellText: {
        ...typography.caption(),
        color: customColors.grey700,
        width: 40,
        textAlign: "center",
        fontWeight: "600",
    },
    amountCellText: {
        ...typography.caption(),
        color: customColors.error,
        width: 60,
        textAlign: "right",
        fontWeight: "600",
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.xl,
    },
    emptyTitle: {
        ...typography.subtitle1(),
        fontWeight: "600",
        color: customColors.grey700,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    emptyMessage: {
        ...typography.body2(),
        color: customColors.grey600,
        textAlign: "center",
        paddingHorizontal: spacing.lg,
        lineHeight: 20,
    },
});
