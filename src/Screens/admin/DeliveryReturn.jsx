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
import FeatherIcon from "react-native-vector-icons/Feather";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import {
    customColors,
    shadows,
    spacing,
    typography,
} from "../../Config/helper";
import { fetchDeliveryReturnList } from "../../Api/delivery";

const DeliveryReturn = ({ route }) => {
    const { selectedDate: passedDate, selectedBranch } = route.params || {};

    const navigation = useNavigation();
    const [modalVisible, setModalVisible] = useState(false);
    const [filterDate, setFilterDate] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [showProductSummary, setShowProductSummary] = useState(false);

    const currentDate =
        filterDate || passedDate || new Date().toISOString().split("T")[0];

    const handleDateChange = date => {
        if (date) {
            const formattedDate = date.toISOString().split("T")[0];
            setFilterDate(formattedDate);
        }
    };

    const {
        data: deliveryReturnData = [],
        refetch,
        isLoading,
    } = useQuery({
        queryKey: ["deliveryReturnData", currentDate, selectedBranch || ""],
        queryFn: () =>
            fetchDeliveryReturnList(
                currentDate,
                currentDate,
                selectedBranch || "",
            ),
        enabled: !!currentDate,
    });

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
                    retailerName: item.Retailer_Name || "Unknown Retailer",
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
    }, [deliveryReturnData]);

    // Group products by Product_Name for product-wise summary
    const productWiseSummary = useMemo(() => {
        const productGroups = {};
        deliveryReturnData.forEach(item => {
            const productName = item.Product_Name;
            if (!productGroups[productName]) {
                productGroups[productName] = {
                    productName,
                    totalQuantity: 0,
                    totalAmount: 0,
                    unitName: item.Unit_Name,
                    returnCount: 0, // Number of times this product was returned
                };
            }
            productGroups[productName].totalQuantity += parseInt(item.Total_Qty || 0);
            productGroups[productName].totalAmount += parseFloat(item.Final_Amo || 0);
            productGroups[productName].returnCount += 1;
        });
        return Object.values(productGroups).sort((a, b) => b.totalAmount - a.totalAmount);
    }, [deliveryReturnData]);

    // Calculate summary statistics
    const summaryStats = useMemo(() => {
        return {
            totalReturns: deliveryReturnData.length,
            totalOrders: groupedData.length,
            totalAmount: deliveryReturnData.reduce(
                (sum, item) => sum + parseFloat(item.Final_Amo || 0),
                0,
            ),
            totalQuantity: deliveryReturnData.reduce(
                (sum, item) => sum + parseInt(item.Total_Qty || 0),
                0,
            ),
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

    const formatDate = dateString => {
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
                    <Text style={styles.summaryValue}>
                        {summaryStats.totalReturns}
                    </Text>
                    <Text style={styles.summaryLabel}>Total Returns</Text>
                </View>
                {/* <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                        {summaryStats.totalOrders}
                    </Text>
                    <Text style={styles.summaryLabel}>Return Orders</Text>
                </View> */}
                <View style={styles.summaryItem}>
                    <Text
                        style={[
                            styles.summaryValue,
                            { color: customColors.error },
                        ]}
                    >
                        ₹{summaryStats.totalAmount.toFixed(2)}
                    </Text>
                    <Text style={styles.summaryLabel}>Total Value</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                        {summaryStats.totalQuantity}
                    </Text>
                    <Text style={styles.summaryLabel}>Total Qty</Text>
                </View>
            </View>
        </View>
    );

    const renderProductWiseSummary = () => (
        <View style={styles.productSummaryCard}>
            <TouchableOpacity 
                style={styles.productSummaryHeader} 
                onPress={() => setShowProductSummary(!showProductSummary)}
            >
                <Text style={styles.productSummaryTitle}>Product-wise Summary ({productWiseSummary.length})</Text>
                <Icon 
                    name={showProductSummary ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={20} 
                    color={customColors.primary} 
                />
            </TouchableOpacity>
            
            {showProductSummary && (
                <View style={styles.productSummaryList}>
                    {productWiseSummary.slice(0, 10).map((product, index) => (
                        <View key={index} style={styles.productSummaryItem}>
                            <View style={styles.productSummaryLeft}>
                                <Text style={styles.productSummaryName} numberOfLines={2}>
                                    {product.productName}
                                </Text>
                                <Text style={styles.productSummaryDetails}>
                                    {product.returnCount} returns • {product.totalQuantity} {product.unitName}
                                </Text>
                            </View>
                            <Text style={styles.productSummaryAmount}>
                                ₹{product.totalAmount.toFixed(2)}
                            </Text>
                        </View>
                    ))}
                    {productWiseSummary.length > 10 && (
                        <Text style={styles.productSummaryMore}>
                            +{productWiseSummary.length - 10} more products
                        </Text>
                    )}
                </View>
            )}
        </View>
    );

    const renderReturnOrderCard = ({ item: orderGroup }) => (
        <TouchableOpacity style={styles.orderCard} disabled>
            {/* Compact Header */}
            <View style={styles.compactHeader}>
                <View style={styles.headerLeft}>
                    <Text style={styles.orderNumber}>
                        #{orderGroup.orderId}
                    </Text>
                    <Text style={styles.compactDate}>
                        {formatDate(orderGroup.returnDate)}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <Icon
                        name="assignment-return"
                        size={20}
                        color={customColors.error}
                    />
                    <Text style={styles.returnBadge}>RETURNED</Text>
                </View>
            </View>

            {/* Compact Info Row */}
            <View style={styles.infoRow}>
                <Text style={styles.infoText} numberOfLines={1}>
                    <Icon
                        name="person"
                        size={14}
                        color={customColors.primary}
                    />{" "}
                    {orderGroup.retailerName}
                </Text>
            </View>
            <View style={styles.infoRow}>
                <Text style={styles.infoText} numberOfLines={1}>
                    <Icon name="store" size={14} color={customColors.primary} />{" "}
                    {orderGroup.godownName}
                </Text>
            </View>

            {/* Products Summary */}
            <View style={styles.productsSummary}>
                <Text style={styles.summaryText}>
                    {orderGroup.items.length} Products •{" "}
                    {orderGroup.totalQuantity} Items • ₹
                    {orderGroup.totalAmount.toFixed(2)}
                </Text>
            </View>

            {/* Compact Items List */}
            <View style={styles.compactItemsList}>
                {orderGroup.items.map((item, index) => (
                    <View key={index} style={styles.compactProductItem}>
                        <View style={styles.productLeft}>
                            <Text
                                style={styles.compactProductName}
                                numberOfLines={1}
                            >
                                {item.Product_Name}
                            </Text>
                            <Text style={styles.compactProductDetails}>
                                {item.Total_Qty} {item.Unit_Name} × ₹
                                {item.Item_Rate}
                            </Text>
                        </View>
                        <Text style={styles.compactAmount}>
                            ₹{item.Final_Amo}
                        </Text>
                    </View>
                ))}
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Icon
                name="assignment-return"
                size={80}
                color={customColors.grey400}
            />
            <Text style={styles.emptyTitle}>No Returns Found</Text>
            <Text style={styles.emptyMessage}>
                No delivery returns were found for{" "}
                {filterDate
                    ? new Date(filterDate).toLocaleDateString()
                    : passedDate
                      ? new Date(passedDate).toLocaleDateString()
                      : new Date().toLocaleDateString()}
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
                fromDate={
                    filterDate
                        ? new Date(filterDate)
                        : passedDate
                          ? new Date(passedDate)
                          : new Date()
                }
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
                    keyExtractor={item => `return-order-${item.orderId}`}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[customColors.primary]}
                        />
                    }
                    ListHeaderComponent={
                        groupedData.length > 0 ? (
                            <>
                                {renderSummaryCard()}
                                {renderProductWiseSummary()}
                            </>
                        ) : null
                    }
                    ListEmptyComponent={!isLoading ? renderEmptyState : null}
                />
            </View>
        </SafeAreaView>
    );
};

export default DeliveryReturn;

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
        // borderLeftWidth: 4,
        // borderLeftColor: customColors.error,
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
        borderRadius: 8,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.small,
        borderLeftWidth: 3,
        borderLeftColor: customColors.error,
    },
    // Compact Header Styles
    compactHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.sm,
        paddingBottom: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    headerLeft: {
        flex: 1,
    },
    orderNumber: {
        ...typography.subtitle1(),
        fontWeight: "700",
        color: customColors.primary,
        marginBottom: 2,
    },
    compactDate: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    returnBadge: {
        ...typography.caption(),
        fontWeight: "600",
        color: customColors.error,
        marginLeft: spacing.xs,
    },

    // Compact Info Styles
    infoRow: {
        marginBottom: spacing.xs,
    },
    infoText: {
        ...typography.caption(),
        color: customColors.grey700,
        fontSize: 12,
    },

    // Products Summary
    productsSummary: {
        backgroundColor: customColors.error + "10",
        padding: spacing.xs,
        borderRadius: 4,
        marginVertical: spacing.xs,
    },
    summaryText: {
        ...typography.caption(),
        color: customColors.error,
        fontWeight: "600",
        textAlign: "center",
        fontSize: 11,
    },

    // Compact Items List Styles
    compactItemsList: {
        marginTop: spacing.xs,
    },
    compactProductItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.xs,
        borderBottomWidth: 0.5,
        borderBottomColor: customColors.grey200,
    },
    productLeft: {
        flex: 1,
        marginRight: spacing.sm,
    },
    compactProductName: {
        ...typography.caption(),
        fontWeight: "600",
        color: customColors.grey800,
        marginBottom: 2,
        fontSize: 11,
    },
    compactProductDetails: {
        ...typography.caption(),
        color: customColors.grey600,
        fontSize: 10,
    },
    compactAmount: {
        ...typography.caption(),
        fontWeight: "600",
        color: customColors.error,
        fontSize: 11,
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

    // Product Summary Styles
    productSummaryCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        marginBottom: spacing.lg,
        ...shadows.medium,
        borderLeftWidth: 4,
        borderLeftColor: customColors.primary,
    },
    productSummaryHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    productSummaryTitle: {
        ...typography.subtitle1(),
        fontWeight: "600",
        color: customColors.primary,
    },
    productSummaryList: {
        padding: spacing.md,
    },
    productSummaryItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
        borderBottomWidth: 0.5,
        borderBottomColor: customColors.grey200,
    },
    productSummaryLeft: {
        flex: 1,
        marginRight: spacing.sm,
    },
    productSummaryName: {
        ...typography.body2(),
        fontWeight: "600",
        color: customColors.grey800,
        marginBottom: spacing.xs,
    },
    productSummaryDetails: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    productSummaryAmount: {
        ...typography.subtitle1(),
        fontWeight: "600",
        color: customColors.error,
    },
    productSummaryMore: {
        ...typography.caption(),
        color: customColors.primary,
        textAlign: "center",
        fontStyle: "italic",
        marginTop: spacing.sm,
    },
});
