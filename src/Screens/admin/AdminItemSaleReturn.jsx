import { StyleSheet, Text, View, TouchableOpacity, RefreshControl } from "react-native";
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { fetchItemSaleReturn } from "../../Api/retailers";
import { customColors, spacing, typography, shadows } from "../../Config/helper";

const AdminItemSaleReturn = () => {
    const navigation = useNavigation();
    const [selectedFromDate, setSelectedFromDate] = React.useState(new Date().toISOString().split("T")[0]);
    const [selectedToDate, setSelectedToDate] = React.useState(new Date().toISOString().split("T")[0]);
    const [modalVisible, setModalVisible] = React.useState(false);
    const [userId, setUserId] = React.useState(null);
    const [expandedItems, setExpandedItems] = React.useState({});

    React.useEffect(() => {
        (async () => {
            const userId = await AsyncStorage.getItem("UserId"); 
            setUserId(userId);
        })();
    }, []);

    const finalUserId = userId || "";

    const {
        data: salesReturns = [],
        isLoading: isLoadingReturns,
        error: returnsError,
        refetch: refetchReturns,
    } = useQuery({
        queryKey: ["salesReturnList", selectedFromDate, selectedToDate, ""],
        queryFn: () => fetchItemSaleReturn(selectedFromDate, selectedToDate, ""),
        enabled: !!selectedFromDate, // Remove finalUserId check to allow empty string
    });

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

    // Loading state
    if (isLoadingReturns) {
        return (
            <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
                <AppHeader title="Item Sale Return" navigation={navigation} />
                <View style={styles.loadingContainer}>
                    <Icon
                        name="hourglass-empty"
                        size={50}
                        color={customColors.primary}
                    />
                    <Text style={styles.loadingText}>
                        Loading item sale returns...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // Error state
    if (returnsError) {
        return (
            <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
                <AppHeader title="Item Sale Return" navigation={navigation} />
                <View style={styles.errorContainer}>
                    <Icon
                        name="error-outline"
                        size={60}
                        color={customColors.error}
                    />
                    <Text style={styles.errorTitle}>Failed to Load</Text>
                    <Text style={styles.errorMessage}>
                        {returnsError.message}
                    </Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => refetchReturns()}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Format date for display
    const formatDate = dateString => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    // Format time for display
    const formatTime = dateString => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    // Get reason color based on type
    const getReasonColor = reason => {
        switch (reason?.toLowerCase()) {
            case "damage":
                return customColors.error;
            case "good":
                return customColors.success;
            case "bad":
                return customColors.warning;
            default:
                return customColors.grey700;
        }
    };

    // Toggle accordion expansion
    const toggleAccordion = (itemId) => {
        setExpandedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    // Calculate summary data
    const getTotalRetailerCount = () => {
        const uniqueRetailers = new Set(salesReturns.map(item => item.retailerId));
        return uniqueRetailers.size;
    };

    const getTotalAmount = () => {
        return salesReturns.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    };

    // Render summary boxes
    const renderSummaryBoxes = () => {
        return (
            <View style={styles.summaryContainer}>
                <View style={styles.summaryBox}>
                    <Icon name="store" size={24} color={customColors.primary} />
                    <Text style={styles.summaryValue}>{getTotalRetailerCount()}</Text>
                    <Text style={styles.summaryLabel}>Total Retailers</Text>
                </View>
                <View style={styles.summaryBox}>
                    <Icon name="currency-rupee" size={24} color={customColors.success} />
                    <Text style={styles.summaryValue}>₹{getTotalAmount().toLocaleString('en-IN')}</Text>
                    <Text style={styles.summaryLabel}>Total Amount</Text>
                </View>
            </View>
        );
    };

    // Render product item within a return
    const renderProductItem = product => {
        return (
            <View key={product.id} style={styles.productItem}>
                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                        {product.productNameGet}
                    </Text>
                    <View style={styles.productDetails}>
                        <Text style={styles.productQty}>
                            Qty: {product.returnQuantity}{" "}
                            {product.returnUnitGet}
                        </Text>
                        <Text style={styles.productRate}>
                            Rate: ₹{product.itemRate}
                        </Text>
                    </View>
                    {product.expireDate && (
                        <Text style={styles.productExpiry}>
                            Expiry: {formatDate(product.expireDate)}
                        </Text>
                    )}
                </View>
                <View style={styles.productAmount}>
                    <Text style={styles.productAmountText}>
                        ₹{product.totalAmount}
                    </Text>
                </View>
            </View>
        );
    };

    // Render main return item
    const renderReturnItem = ({ item }) => {
        const isExpanded = expandedItems[item.id];
        
        return (
            <View style={styles.returnItem}>
                {/* Header Section - Clickable */}
                <TouchableOpacity 
                    style={styles.returnHeader}
                    onPress={() => toggleAccordion(item.id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.returnHeaderContent}>
                        <View style={styles.returnHeaderLeft}>
                            <Text style={styles.retailerName} numberOfLines={2}>
                                {item.retailerNameGet}
                            </Text>
                            <Text style={styles.returnDate}>
                                {formatDate(item.salesReturnDate)} at{" "}
                                {formatTime(item.createdAt)}
                            </Text>
                        </View>
                        <View style={styles.returnHeaderRight}>
                            <Text style={styles.returnTotalAmount}>
                                ₹{item.totalAmount}
                            </Text>
                            <View
                                style={[
                                    styles.reasonBadge,
                                    {
                                        backgroundColor: getReasonColor(
                                            item.reason,
                                        ),
                                    },
                                ]}
                            >
                                <Text style={styles.reasonText}>{item.reason}</Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Products Section - Expandable */}
                {isExpanded && (
                    <View style={styles.productsSection}>
                        <Text style={styles.productsSectionTitle}>
                            Products ({item.products?.length || 0})
                        </Text>
                        {item.products?.map(product => renderProductItem(product))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Item Sale Return"
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
                {salesReturns.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Icon
                            name="assignment-return"
                            size={80}
                            color={customColors.grey500}
                        />
                        <Text style={styles.emptyTitle}>No Returns Found</Text>
                        <Text style={styles.emptySubtitle}>
                            No sales returns have been processed yet
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Summary Boxes */}
                        {renderSummaryBoxes()}
                        
                        {/* Returns List */}
                        <FlashList
                            data={salesReturns}
                            renderItem={renderReturnItem}
                            keyExtractor={item => item.id}
                            style={styles.flatList}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={isLoadingReturns}
                                    onRefresh={refetchReturns}
                                    colors={[customColors.primary]}
                                />
                            }
                        />
                    </>
                )}
            </View>
        </SafeAreaView>
    );
};

export default AdminItemSaleReturn;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.grey100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.background,
        padding: 20,
    },
    loadingText: {
        ...typography.body1(),
        color: customColors.grey700,
        marginTop: 15,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.background,
        padding: 30,
    },
    errorTitle: {
        ...typography.h2(),
        color: customColors.error,
        marginTop: 15,
        textAlign: "center",
    },
    errorMessage: {
        ...typography.body1(),
        color: customColors.grey700,
        marginTop: 8,
        textAlign: "center",
    },
    retryButton: {
        backgroundColor: customColors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 6,
        marginTop: 20,
    },
    retryButtonText: {
        ...typography.body1(),
        color: customColors.white,
        fontWeight: "600",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },
    emptyTitle: {
        ...typography.h2(),
        color: customColors.grey900,
        marginTop: 20,
        textAlign: "center",
    },
    emptySubtitle: {
        ...typography.body1(),
        color: customColors.grey700,
        marginTop: 8,
        textAlign: "center",
    },
    flatList: {
        flex: 1,
        paddingTop: 5,
    },
    listContent: {
        padding: 15,
        paddingBottom: 30,
    },
    summaryContainer: {
        flexDirection: "row",
        paddingHorizontal: 15,
        paddingVertical: 10,
        gap: 10,
    },
    summaryBox: {
        flex: 1,
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: 15,
        alignItems: "center",
        ...shadows.medium,
    },
    summaryValue: {
        ...typography.h3(),
        color: customColors.grey900,
        fontWeight: "700",
        marginTop: 8,
        marginBottom: 4,
    },
    summaryLabel: {
        ...typography.caption(),
        color: customColors.grey700,
        textAlign: "center",
        fontWeight: "600",
    },
    returnItem: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        marginBottom: 15,
        ...shadows.medium,
        overflow: "hidden",
    },
    returnHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: customColors.background,
        borderBottomWidth: 1,
        borderBottomColor: customColors.border,
    },
    returnHeaderContent: {
        flexDirection: "row",
        alignItems: "flex-start",
        flex: 1,
    },
    returnHeaderLeft: {
        flex: 1,
    },
    retailerName: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "600",
    },
    returnDate: {
        ...typography.body2(),
        color: customColors.grey700,
    },
    returnHeaderRight: {
        alignItems: "flex-end",
        marginRight: 10,
    },
    returnTotalAmount: {
        ...typography.h4(),
        color: customColors.success,
        fontWeight: "700",
        marginBottom: 8,
    },
    reasonBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    reasonText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "600",
    },
    retailerInfo: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 15,
        paddingVertical: 10,
        // backgroundColor: customColors.primaryLight,
    },
    productsSection: {
        padding: 15,
    },
    productsSectionTitle: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: 6,
    },
    productItem: {
        flexDirection: "row",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: customColors.border,
    },
    productInfo: {
        flex: 1,
        paddingRight: 10,
    },
    productName: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: 6,
        lineHeight: 18,
    },
    productDetails: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    productQty: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "600",
    },
    productRate: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    productExpiry: {
        ...typography.caption(),
        color: customColors.warning,
        fontStyle: "italic",
    },
    productAmount: {
        justifyContent: "center",
        alignItems: "flex-end",
        minWidth: 60,
    },
    productAmountText: {
        ...typography.body2(),
        color: customColors.success,
        fontWeight: "700",
    },
});
