import {
    Alert,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useMemo, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { customColors, shadows, spacing, typography } from "../../Config/helper";
import { fetchDeliveryReturnList } from "../../Api/delivery";
import { fetchRetailerInfo } from "../../Api/retailers";

const DeliveryReturn = ({ route }) => {
    const { selectedDate: passedDate, selectedBranch } = route.params || {};

    const navigation = useNavigation();
    const [modalVisible, setModalVisible] = useState(false);
    const [filterDate, setFilterDate] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const currentDate = filterDate || passedDate || new Date().toISOString().split("T")[0];

    const handleDateChange = date => {
        if (date) {
            const formattedDate = date.toISOString().split("T")[0];
            setFilterDate(formattedDate);
        }
    };

    const { data: deliveryReturnData = [], refetch, isLoading } = useQuery({
        queryKey: ["deliveryReturnData", currentDate, selectedBranch],
        queryFn: () => fetchDeliveryReturnList(currentDate, currentDate, selectedBranch),
        enabled: !!currentDate && !!selectedBranch,
    });

    const retailerIds = useMemo(() => {
        const uniqueIds = [...new Set(deliveryReturnData.map(item => item.Retailer_Id))];
        return uniqueIds.filter(id => id)
    }, [deliveryReturnData])

    const { data: retailersData = [], isLoading: isLoadingRetailers } = useQuery({
        queryKey: ["retailersInfo", retailerIds],
        queryFn: async () => {
            if (retailerIds.length === 0) return [];

            const promises = retailerIds.map(id => fetchRetailerInfo(id));
            const results = await Promise.all(promises);

            // Extract all retailer data from the API response structure
            const extractedData = results.flatMap(result => {
                if (result && result.data && Array.isArray(result.data)) {
                    return result.data; // Return the entire data array
                }
                return [];
            });

            return extractedData;
        },
        enabled: retailerIds.length > 0,
    });

    const retailerNamesMap = useMemo(() => {
        const map = {};
        retailersData.forEach(retailer => {
            if (retailer && retailer.Retailer_Id) {
                map[String(retailer.Retailer_Id)] = retailer.Retailer_Name;
            }
        });
        return map;
    }, [retailersData]);

    const groupedData = useMemo(() => {
        const groups = {};
        deliveryReturnData.forEach(item => {
            const orderId = item.Delivery_Order_Id;
            if (!groups[orderId]) {
                groups[orderId] = {
                    orderId,
                    returnDate: item.Ret_Date,
                    godownName: item.Godown_Name,
                    retailerId: item.Retailer_Id,
                    retailerName: retailerNamesMap[String(item.Retailer_Id)] || `Retailer ${item.Retailer_Id}`,
                    doInvNo: item.Do_Inv_No,
                    items: [],
                    totalAmount: 0,
                    totalQuantity: 0,
                };
            }
            groups[orderId].items.push(item);
            groups[orderId].totalAmount += parseFloat(item.Final_Amo || 0);
            groups[orderId].totalQuantity += parseInt(item.Total_Qty || 0);
        });
        return Object.values(groups);
    }, [deliveryReturnData, retailerNamesMap]);

    // Calculate summary statistics
    const summaryStats = useMemo(() => {
        return {
            totalReturns: deliveryReturnData.length,
            totalOrders: groupedData.length,
            totalAmount: deliveryReturnData.reduce((sum, item) => sum + parseFloat(item.Final_Amo || 0), 0),
            totalQuantity: deliveryReturnData.reduce((sum, item) => sum + parseInt(item.Total_Qty || 0), 0),
        };
    }, [deliveryReturnData, groupedData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refetch();
        } catch (error) {
            Alert.alert("Error", "Failed to refresh data");
        } finally {
            setRefreshing(false);
        }
    };

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const renderSummaryCard = () => (
        <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Return Summary</Text>
            <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{summaryStats.totalReturns}</Text>
                    <Text style={styles.summaryLabel}>Total Returns</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{summaryStats.totalOrders}</Text>
                    <Text style={styles.summaryLabel}>Return Orders</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: customColors.error }]}>
                        ₹{summaryStats.totalAmount.toFixed(2)}
                    </Text>
                    <Text style={styles.summaryLabel}>Total Value</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{summaryStats.totalQuantity}</Text>
                    <Text style={styles.summaryLabel}>Total Qty</Text>
                </View>
            </View>
        </View>
    );

    const renderReturnOrderCard = ({ item: orderGroup }) => (
        <TouchableOpacity style={styles.orderCard} disabled>
            <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                    <Text style={styles.orderTitle}>Order #{orderGroup.orderId}</Text>
                    <Text style={styles.orderDate}>
                        {formatDate(orderGroup.returnDate)}
                    </Text>
                </View>
                <View style={styles.orderStatus}>
                    <Icon name="assignment-return" size={24} color={customColors.error} />
                </View>
            </View>

            <View style={styles.retailerInfo}>
                <Icon name="person" size={16} color={customColors.primary} />
                <Text style={styles.retailerText}>{orderGroup.retailerName}</Text>
            </View>

            <View style={styles.godownInfo}>
                <Icon name="store" size={16} color={customColors.primary} />
                <Text style={styles.godownText}>{orderGroup.godownName}</Text>
            </View>

            <View style={styles.itemsSection}>
                <Text style={styles.itemsTitle}>
                    Returned Items ({orderGroup.items.length})
                </Text>
                {orderGroup.items.map((item, index) => (
                    <View key={index} style={styles.productItem}>
                        <View style={styles.productInfo}>
                            <Text style={styles.productName}>{item.Product_Name}</Text>
                            <Text style={styles.productDetails}>
                                HSN: {item.HSN_Code} | Rate: ₹{item.Item_Rate}/{item.Unit_Name}
                            </Text>
                        </View>
                        <View style={styles.quantityInfo}>
                            <Text style={styles.quantityText}>
                                Qty: {item.Total_Qty} {item.Unit_Name}
                            </Text>
                            <Text style={styles.amountText}>
                                ₹{item.Final_Amo}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.orderTotals}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Quantity:</Text>
                    <Text style={styles.totalValue}>{orderGroup.totalQuantity} items</Text>
                </View>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Amount:</Text>
                    <Text style={[styles.totalValue, { color: customColors.error }]}>
                        ₹{orderGroup.totalAmount.toFixed(2)}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Icon name="assignment-return" size={80} color={customColors.grey400} />
            <Text style={styles.emptyTitle}>No Returns Found</Text>
            <Text style={styles.emptyMessage}>
                No delivery returns were found for {filterDate ? new Date(filterDate).toLocaleDateString() : passedDate ? new Date(passedDate).toLocaleDateString() : new Date().toLocaleDateString()}
            </Text>
        </View>
    );

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
                fromDate={filterDate ? new Date(filterDate) : passedDate ? new Date(passedDate) : new Date()}
                onFromDateChange={handleDateChange}
                onApply={() => setModalVisible(false)}
                onClose={handleCloseModal}
                showToDate={false}
                title="Filter options"
                fromLabel="From Date"
            />

            <View style={styles.contentContainer}>
                <FlashList
                    data={groupedData}
                    renderItem={renderReturnOrderCard}
                    keyExtractor={(item) => `return-order-${item.orderId}`}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[customColors.primary]}
                        />
                    }
                    ListHeaderComponent={groupedData.length > 0 ? renderSummaryCard : null}
                    ListEmptyComponent={!isLoading ? renderEmptyState : null}
                />
            </View>

        </SafeAreaView>
    )
}

export default DeliveryReturn

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    listContainer: {
        padding: spacing.md,
        paddingBottom: spacing.xl,
    },

    // Summary Card Styles
    summaryCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        ...shadows.medium,
        borderLeftWidth: 4,
        borderLeftColor: customColors.error,
    },
    summaryTitle: {
        ...typography.h6(),
        fontWeight: "600",
        color: customColors.primary,
        marginBottom: spacing.md,
        textAlign: "center",
    },
    summaryGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    summaryItem: {
        alignItems: "center",
        flex: 1,
    },
    summaryValue: {
        ...typography.h6(),
        fontWeight: "700",
        color: customColors.primary,
        marginBottom: spacing.xs,
    },
    summaryLabel: {
        ...typography.caption(),
        color: customColors.grey600,
        textAlign: "center",
    },

    // Order Card Styles
    orderCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.small,
        borderLeftWidth: 4,
        borderLeftColor: customColors.error,
    },
    orderHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.md,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    orderInfo: {
        flex: 1,
    },
    orderTitle: {
        ...typography.subtitle1(),
        fontWeight: "600",
        color: customColors.primary,
        marginBottom: spacing.xs,
    },
    orderDate: {
        ...typography.body2(),
        color: customColors.grey600,
    },
    orderStatus: {
        padding: spacing.sm,
        backgroundColor: customColors.error + "20",
        borderRadius: 8,
    },

    // Godown Info Styles
    retailerInfo: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    retailerText: {
        ...typography.body2(),
        color: customColors.primary,
        marginLeft: spacing.sm,
        fontWeight: "500",
    },
    godownInfo: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.md,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    godownText: {
        ...typography.body2(),
        color: customColors.primary,
        marginLeft: spacing.sm,
        fontWeight: "500",
    },

    // Items Section Styles
    itemsSection: {
        marginBottom: spacing.md,
    },
    itemsTitle: {
        ...typography.subtitle2(),
        fontWeight: "600",
        color: customColors.primary,
        marginBottom: spacing.sm,
    },
    productItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    productInfo: {
        flex: 1,
        marginRight: spacing.sm,
    },
    productName: {
        ...typography.body2(),
        fontWeight: "600",
        color: customColors.grey800,
        marginBottom: spacing.xs,
    },
    productDetails: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    quantityInfo: {
        alignItems: "flex-end",
    },
    quantityText: {
        ...typography.body2(),
        color: customColors.grey700,
        marginBottom: spacing.xs,
    },
    amountText: {
        ...typography.subtitle2(),
        fontWeight: "600",
        color: customColors.error,
    },

    // Order Totals Styles
    orderTotals: {
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.xs,
    },
    totalLabel: {
        ...typography.body2(),
        color: customColors.grey700,
        fontWeight: "500",
    },
    totalValue: {
        ...typography.body2(),
        fontWeight: "600",
        color: customColors.primary,
    },

    // Empty State Styles
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.xl * 2,
    },
    emptyTitle: {
        ...typography.h6(),
        fontWeight: "600",
        color: customColors.grey700,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    emptyMessage: {
        ...typography.body2(),
        color: customColors.grey600,
        textAlign: "center",
        paddingHorizontal: spacing.xl,
        lineHeight: 22,
    },
})