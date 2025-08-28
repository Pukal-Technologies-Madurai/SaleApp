import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../../Components/AppHeader";
import { customColors, typography } from "../../Config/helper";
import FilterModal from "../../Components/FilterModal";
import { useQuery } from "@tanstack/react-query";
import {
    fetchRetailerClosingInfo,
    fetchRetailersClosingDropDown,
    fetchRetailerSoldItems,
    fetchProductsAvailableInRetailer,
} from "../../Api/retailers";
import EnhancedDropdown from "../../Components/EnhancedDropdown";

const RetailerStock = () => {
    const navigation = useNavigation();
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedFromDate, setSelectedFromDate] = useState(() => {
        const currentDate = new Date();
        const day = currentDate.getDate();
        const previousMonthDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            day,
        );
        return previousMonthDate;
    });
    const [selectedToDate, setSelectedToDate] = useState(new Date());

    const [selectedRetailer, setSelectedRetailer] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [searchType, setSearchType] = useState("retailer"); // "retailer" or "item"

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

    const handleSearchTypeChange = type => {
        setSearchType(type);
        setSelectedRetailer(null);
        setSelectedProduct(null);
    };

    const { data: retailersInfo = [] } = useQuery({
        queryKey: ["retailersInfo"],
        queryFn: fetchRetailersClosingDropDown,
    });

    const { data: productsInfo = [] } = useQuery({
        queryKey: ["productsInfo"],
        queryFn: fetchRetailerSoldItems,
        select: data => {
            return data?.data || [];
        },
        enabled: searchType === "item",
    });

    const { data: retailerStockData = [] } = useQuery({
        queryKey: [
            "fetchRetailerSoldItems",
            selectedRetailer,
            selectedFromDate?.toISOString(),
            selectedToDate?.toISOString(),
        ],
        queryFn: () =>
            fetchRetailerClosingInfo(
                selectedRetailer,
                selectedFromDate?.toISOString().split("T")[0], // Format for API
                selectedToDate?.toISOString().split("T")[0], // Format for API
            ),
        enabled:
            !!selectedRetailer &&
            !!selectedFromDate &&
            !!selectedToDate &&
            searchType === "retailer",
        select: data => {
            return data?.data || [];
        },
    });

    const { data: itemStockData = [] } = useQuery({
        queryKey: [
            "fetchProductsAvailableInRetailer",
            selectedProduct,
            selectedFromDate?.toISOString(),
            selectedToDate?.toISOString(),
        ],
        queryFn: () =>
            fetchProductsAvailableInRetailer(
                selectedProduct,
                selectedFromDate?.toISOString().split("T")[0], // Format for API
                selectedToDate?.toISOString().split("T")[0], // Format for API
            ),
        enabled:
            !!selectedProduct &&
            !!selectedFromDate &&
            !!selectedToDate &&
            searchType === "item",
        select: data => {
            return data?.data || [];
        },
    });

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    const renderStockCard = ({ item }) => {
        const isRetailerSearch = searchType === "retailer";

        return (
            <View style={styles.stockCard}>
                <View style={styles.stockHeader}>
                    <Text style={styles.productName} numberOfLines={2}>
                        {searchType === "item"
                            ? item.Retailer_Name?.trim() || "Unknown Retailer"
                            : item.Product_Name?.trim() || "Unknown Product"}
                    </Text>
                    <View style={styles.stockBadge}>
                        <Text style={styles.stockBadgeText}>
                            {isRetailerSearch
                                ? item.ClosingQTY || item.Bill_Qty
                                : item.stockQuantityOfItem}{" "}
                            units
                        </Text>
                    </View>
                </View>

                <View style={styles.stockDetails}>
                    <View style={styles.stockRow}>
                        <View style={styles.stockItem}>
                            <Text style={styles.stockLabel}>Rate:</Text>
                            <Text style={styles.stockValue}>
                                ₹
                                {isRetailerSearch
                                    ? item.Product_Rate
                                    : item.stockRateOfItem}
                            </Text>
                        </View>
                        <View style={styles.stockItem}>
                            <Text style={styles.stockLabel}>Value:</Text>
                            <Text style={styles.stockValue}>
                                ₹
                                {isRetailerSearch
                                    ? (
                                          (item.ClosingQTY || item.Bill_Qty) *
                                          item.Product_Rate
                                      ).toFixed(2)
                                    : item.stockValueOfItem?.toFixed(2)}
                            </Text>
                        </View>
                    </View>

                    {isRetailerSearch && (
                        <View style={styles.stockRow}>
                            <View style={styles.stockItem}>
                                <Text style={styles.stockLabel}>
                                    Billed Qty:
                                </Text>
                                <Text style={styles.stockValue}>
                                    {item.Bill_Qty || 0}
                                </Text>
                            </View>
                            <View style={styles.stockItem}>
                                <Text style={styles.stockLabel}>
                                    Closing Qty:
                                </Text>
                                <Text style={styles.stockValue}>
                                    {item.ClosingQTY || 0}
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.dateRow}>
                        {item.deliveryDisplayDate && (
                            <Text style={styles.dateText}>
                                Delivery: {item.deliveryDisplayDate}
                            </Text>
                        )}
                        {item.closingDisplayDate && (
                            <Text style={styles.dateText}>
                                Closing: {item.closingDisplayDate}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const getSummaryData = () => {
        const data =
            searchType === "retailer" ? retailerStockData : itemStockData;

        const totalItems = data.length;
        const totalQuantity = data.reduce((sum, item) => {
            return (
                sum +
                (searchType === "retailer"
                    ? item.ClosingQTY || item.Bill_Qty || 0
                    : item.stockQuantityOfItem || 0)
            );
        }, 0);
        const totalValue = data.reduce((sum, item) => {
            return (
                sum +
                (searchType === "retailer"
                    ? (item.ClosingQTY || item.Bill_Qty || 0) *
                      (item.Product_Rate || 0)
                    : item.stockValueOfItem || 0)
            );
        }, 0);

        return { totalItems, totalQuantity, totalValue };
    };

    const renderSummaryCard = (
        icon,
        title,
        value,
        color = customColors.primary,
    ) => (
        <View style={styles.summaryCard}>
            <View
                style={[
                    styles.summaryIconContainer,
                    { backgroundColor: color + "20" },
                ]}>
                <Icon name={icon} size={24} color={color} />
            </View>
            <Text style={styles.summaryTitle}>{title}</Text>
            <Text style={[styles.summaryValue, { color }]}>{value}</Text>
        </View>
    );

    const currentData =
        searchType === "retailer" ? retailerStockData : itemStockData;
    const { totalItems, totalQuantity, totalValue } = getSummaryData();

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                navigation={navigation}
                title="Stock Summary"
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
                {/* Search Type Toggle */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            searchType === "retailer" &&
                                styles.toggleButtonActive,
                        ]}
                        onPress={() => handleSearchTypeChange("retailer")}>
                        <Icon
                            name="store"
                            size={18}
                            color={
                                searchType === "retailer"
                                    ? customColors.white
                                    : customColors.grey600
                            }
                        />
                        <Text
                            style={[
                                styles.toggleButtonText,
                                searchType === "retailer" &&
                                    styles.toggleButtonTextActive,
                            ]}>
                            By Retailer
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            searchType === "item" && styles.toggleButtonActive,
                        ]}
                        onPress={() => handleSearchTypeChange("item")}>
                        <Icon
                            name="inventory"
                            size={18}
                            color={
                                searchType === "item"
                                    ? customColors.white
                                    : customColors.grey600
                            }
                        />
                        <Text
                            style={[
                                styles.toggleButtonText,
                                searchType === "item" &&
                                    styles.toggleButtonTextActive,
                            ]}>
                            By Item
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Dropdowns */}
                <View style={styles.dropdownsContainer}>
                    {searchType === "retailer" ? (
                        <EnhancedDropdown
                            data={retailersInfo}
                            labelField="Retailer_Name"
                            valueField="Retailer_Id"
                            placeholder="Select Retailer"
                            value={selectedRetailer}
                            onChange={value => {
                                setSelectedRetailer(value.Retailer_Id);
                            }}
                            containerStyle={styles.dropdown}
                        />
                    ) : (
                        <EnhancedDropdown
                            data={productsInfo}
                            labelField="Item_Name"
                            valueField="Item_Id"
                            placeholder="Select Product"
                            value={selectedProduct}
                            onChange={value => {
                                setSelectedProduct(value.Item_Id);
                            }}
                            containerStyle={styles.dropdown}
                        />
                    )}
                </View>

                {/* Summary Cards */}
                {currentData.length > 0 && (
                    <View style={styles.summaryContainer}>
                        {renderSummaryCard("list", "Items", totalItems)}
                        {renderSummaryCard(
                            "shopping-cart",
                            "Quantity",
                            totalQuantity.toFixed(1),
                            customColors.success,
                        )}
                        {renderSummaryCard(
                            "attach-money",
                            "Value",
                            `₹${totalValue.toFixed(2)}`,
                            customColors.warning,
                        )}
                    </View>
                )}

                {/* Stock List */}
                <FlatList
                    data={currentData}
                    renderItem={renderStockCard}
                    keyExtractor={(item, index) => `${item.Item_Id}-${index}`}
                    contentContainerStyle={styles.stockList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Icon
                                name="inventory-2"
                                size={64}
                                color={customColors.grey400}
                            />
                            <Text style={styles.emptyTitle}>No Stock Data</Text>
                            <Text style={styles.emptySubtitle}>
                                {searchType === "retailer"
                                    ? "Select a retailer to view stock information"
                                    : "Select a product to view availability"}
                            </Text>
                        </View>
                    )}
                />
            </View>
        </SafeAreaView>
    );
};

export default RetailerStock;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
        padding: 16,
    },
    toggleContainer: {
        flexDirection: "row",
        backgroundColor: customColors.grey100,
        borderRadius: 8,
        padding: 4,
        marginBottom: 16,
    },
    toggleButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        gap: 6,
    },
    toggleButtonActive: {
        backgroundColor: customColors.primary,
    },
    toggleButtonText: {
        ...typography.body2(),
        color: customColors.grey600,
        fontWeight: "500",
    },
    toggleButtonTextActive: {
        color: customColors.white,
        fontWeight: "600",
    },
    dropdownsContainer: {
        marginBottom: 16,
    },
    dropdown: {
        marginBottom: 8,
    },
    summaryContainer: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        elevation: 2,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    summaryIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    summaryTitle: {
        ...typography.caption(),
        color: customColors.grey600,
        marginBottom: 4,
    },
    summaryValue: {
        ...typography.subtitle2(),
        fontWeight: "bold",
    },
    stockList: {
        paddingBottom: 20,
    },
    stockCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    stockHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    productName: {
        ...typography.subtitle1(),
        fontWeight: "600",
        color: customColors.grey900,
        flex: 1,
        marginRight: 12,
    },
    stockBadge: {
        backgroundColor: customColors.primary + "20",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    stockBadgeText: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "600",
    },
    stockDetails: {
        gap: 8,
    },
    stockRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    stockItem: {
        flex: 1,
    },
    stockLabel: {
        ...typography.caption(),
        color: customColors.grey600,
        marginBottom: 2,
    },
    stockValue: {
        ...typography.body2(),
        fontWeight: "600",
        color: customColors.grey900,
    },
    dateRow: {
        flexDirection: "row",
        gap: 16,
        marginTop: 4,
    },
    dateText: {
        ...typography.caption(),
        color: customColors.grey500,
        fontStyle: "italic",
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    emptyTitle: {
        ...typography.h6(),
        color: customColors.grey600,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        ...typography.body2(),
        color: customColors.grey500,
        textAlign: "center",
        paddingHorizontal: 32,
    },
});
