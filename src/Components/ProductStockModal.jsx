import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { customColors, typography } from "../Config/helper";

const ProductStockModal = ({ visible, onClose, stockData }) => {
    const [loading, setLoading] = useState(true);
    const [brandData, setBrandData] = useState([]);
    const [overallTotal, setOverallTotal] = useState(0);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [expandedBrands, setExpandedBrands] = useState({});

    useEffect(() => {
        if (visible && stockData) {
            processBrandData();
        }
    }, [visible, stockData]);

    const processBrandData = () => {
        try {
            setLoading(true);
            let total = 0;
            let latestDate = null;
            const brands = {};

            // Process stock data to organize by brand
            stockData.forEach(area => {
                area.Retailer.forEach(retailer => {
                    retailer.Closing_Stock.forEach(stock => {
                        // Update latest date
                        if (
                            !latestDate ||
                            new Date(stock.Cl_Date) > new Date(latestDate)
                        ) {
                            latestDate = stock.Cl_Date;
                        }

                        // Calculate value
                        const value = stock.Previous_Balance * stock.Item_Rate;
                        total += value;

                        // Group by brand
                        if (!brands[stock.Brand_Name]) {
                            brands[stock.Brand_Name] = {
                                brandName: stock.Brand_Name,
                                totalQuantity: 0,
                                totalValue: 0,
                                products: [],
                                retailers: [],
                            };
                        }

                        // Update brand totals
                        brands[stock.Brand_Name].totalQuantity +=
                            stock.Previous_Balance;
                        brands[stock.Brand_Name].totalValue += value;

                        // Track unique products
                        if (
                            !brands[stock.Brand_Name].products.find(
                                p => p.itemId === stock.Item_Id,
                            )
                        ) {
                            brands[stock.Brand_Name].products.push({
                                itemId: stock.Item_Id,
                                itemName: stock.Product_Name,
                                itemRate: stock.Item_Rate,
                                quantity: stock.Previous_Balance,
                            });
                        }

                        // Track retailers with this brand
                        const retailerInfo = {
                            areaName: area.Area_Name,
                            retailerName: retailer.Retailer_Name,
                            quantity: stock.Previous_Balance,
                            value: value,
                        };

                        if (
                            !brands[stock.Brand_Name].retailers.find(
                                r => r.retailerName === retailer.Retailer_Name,
                            )
                        ) {
                            brands[stock.Brand_Name].retailers.push(
                                retailerInfo,
                            );
                        }
                    });
                });
            });

            // Convert to array and sort by brand name
            const brandsArray = Object.values(brands).sort((a, b) =>
                a.brandName.localeCompare(b.brandName),
            );

            setBrandData(brandsArray);
            setOverallTotal(total);
            setLastUpdated(latestDate);
        } catch (error) {
            console.error("Error processing brand data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Format date to a more readable format
    const formatDate = dateString => {
        const options = { year: "numeric", month: "short", day: "numeric" };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const toggleBrand = brandName => {
        setExpandedBrands(prev => ({
            ...prev,
            [brandName]: !prev[brandName],
        }));
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}>
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            Brand-wise Stock Report
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeIcon}>
                            <Icon
                                name="close"
                                size={24}
                                color={customColors.black}
                            />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator
                            size="large"
                            color={customColors.primary}
                        />
                    ) : (
                        <ScrollView style={styles.scrollContent}>
                            <View style={styles.summaryContainer}>
                                <Text style={styles.summaryText}>
                                    Total Stock Value: ₹
                                    {overallTotal.toFixed(2)}
                                </Text>
                                {lastUpdated && (
                                    <Text style={styles.dateText}>
                                        Last Updated: {formatDate(lastUpdated)}
                                    </Text>
                                )}
                            </View>

                            {brandData.map((brand, index) => (
                                <View key={index} style={styles.brandContainer}>
                                    <TouchableOpacity
                                        style={styles.brandHeader}
                                        onPress={() =>
                                            toggleBrand(brand.brandName)
                                        }>
                                        <View
                                            style={styles.brandTitleContainer}>
                                            <Icon
                                                name={
                                                    expandedBrands[
                                                        brand.brandName
                                                    ]
                                                        ? "expand-less"
                                                        : "expand-more"
                                                }
                                                size={24}
                                                color={customColors.primary}
                                            />
                                            <Text style={styles.brandName}>
                                                {brand.brandName}
                                            </Text>
                                        </View>
                                        <View style={styles.brandStats}>
                                            <Text style={styles.statsText}>
                                                Products:{" "}
                                                {brand.products.length}
                                            </Text>
                                            <Text style={styles.statsText}>
                                                Retailers:{" "}
                                                {brand.retailers.length}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    <View style={styles.brandDetails}>
                                        <Text style={styles.detailText}>
                                            Total Quantity:{" "}
                                            {brand.totalQuantity}
                                        </Text>
                                        <Text style={styles.detailText}>
                                            Total Value: ₹
                                            {brand.totalValue.toFixed(2)}
                                        </Text>
                                    </View>

                                    {expandedBrands[brand.brandName] && (
                                        <View style={styles.expandedContent}>
                                            {/* <View style={styles.section}>
                                                <Text
                                                    style={styles.sectionTitle}>
                                                    Products:
                                                </Text>
                                                {brand.products.map(
                                                    (product, pIndex) => (
                                                        <View
                                                            key={pIndex}
                                                            style={
                                                                styles.productItem
                                                            }>
                                                            <View
                                                                style={
                                                                    styles.productNameContainer
                                                                }>
                                                                <Text
                                                                    style={
                                                                        styles.productName
                                                                    }>
                                                                    {
                                                                        product.itemName
                                                                    }
                                                                </Text>
                                                                <Text
                                                                    style={
                                                                        styles.productQuantity
                                                                    }>
                                                                    Qty:{" "}
                                                                    {
                                                                        product.quantity
                                                                    }
                                                                </Text>
                                                            </View>
                                                            <Text
                                                                style={
                                                                    styles.productRate
                                                                }>
                                                                Rate: ₹
                                                                {
                                                                    product.itemRate
                                                                }
                                                            </Text>
                                                        </View>
                                                    ),
                                                )}
                                            </View> */}

                                            <View style={styles.section}>
                                                <Text
                                                    style={styles.sectionTitle}>
                                                    Retailers:
                                                </Text>
                                                {brand.retailers.map(
                                                    (retailer, rIndex) => (
                                                        <View
                                                            key={rIndex}
                                                            style={
                                                                styles.retailerItem
                                                            }>
                                                            <View
                                                                style={
                                                                    styles.retailerHeader
                                                                }>
                                                                <Text
                                                                    style={
                                                                        styles.retailerName
                                                                    }>
                                                                    {
                                                                        retailer.retailerName
                                                                    }
                                                                </Text>
                                                                <Text
                                                                    style={
                                                                        styles.areaName
                                                                    }>
                                                                    {
                                                                        retailer.areaName
                                                                    }
                                                                </Text>
                                                            </View>
                                                            <View
                                                                style={
                                                                    styles.retailerDetails
                                                                }>
                                                                <Text
                                                                    style={
                                                                        styles.retailerText
                                                                    }>
                                                                    Quantity:{" "}
                                                                    {
                                                                        retailer.quantity
                                                                    }
                                                                </Text>
                                                                <Text
                                                                    style={
                                                                        styles.retailerText
                                                                    }>
                                                                    Value: ₹
                                                                    {retailer.value.toFixed(
                                                                        2,
                                                                    )}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ),
                                                )}
                                            </View>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        flex: 1,
        backgroundColor: customColors.white,
        margin: 16,
        borderRadius: 16,
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey,
    },
    modalTitle: {
        ...typography.h5(),
        color: customColors.primary,
        fontWeight: "bold",
    },
    closeIcon: {
        padding: 4,
    },
    scrollContent: {
        flex: 1,
        padding: 16,
    },
    summaryContainer: {
        backgroundColor: customColors.primary,
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    summaryText: {
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "bold",
    },
    dateText: {
        ...typography.body2(),
        color: customColors.white,
        marginTop: 8,
    },
    brandContainer: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: customColors.grey,
    },
    brandHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    brandName: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "bold",
    },
    brandStats: {
        flexDirection: "row",
        gap: 16,
    },
    statsText: {
        ...typography.body2(),
        color: customColors.accent,
    },
    brandDetails: {
        marginTop: 8,
        padding: 8,
        backgroundColor: customColors.grey,
        borderRadius: 4,
    },
    detailText: {
        ...typography.body1(),
        color: customColors.black,
        marginBottom: 4,
    },
    expandedContent: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: customColors.grey,
    },
    section: {
        marginTop: 12,
    },
    sectionTitle: {
        ...typography.body1(),
        color: customColors.primary,
        fontWeight: "bold",
        marginBottom: 8,
    },
    productItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: customColors.lightGrey,
        marginBottom: 4,
        borderRadius: 4,
    },
    productNameContainer: {
        flex: 1,
    },
    productName: {
        ...typography.body2(),
        color: customColors.black,
    },
    productQuantity: {
        ...typography.caption(),
        color: customColors.accent,
        marginTop: 2,
    },
    productRate: {
        ...typography.body2(),
        color: customColors.accent,
    },
    retailerItem: {
        backgroundColor: customColors.lightGrey,
        padding: 8,
        marginBottom: 8,
        borderRadius: 4,
    },
    retailerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    retailerName: {
        ...typography.body1(),
        fontWeight: "bold",
    },
    areaName: {
        ...typography.body2(),
        color: customColors.accent,
    },
    retailerDetails: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    retailerText: {
        ...typography.body2(),
    },
    brandTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
});

export default ProductStockModal;
