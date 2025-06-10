import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import Icon from "react-native-vector-icons/MaterialIcons";
import { customColors, typography } from "../../Config/helper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../../Config/Endpoint";
import AppHeader from "../../Components/AppHeader";

const RetailerStock = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [stockData, setStockData] = useState([]);
    const [expandedAreas, setExpandedAreas] = useState({});
    const [expandedRetailers, setExpandedRetailers] = useState({});
    const [lastUpdatedDate, setLastUpdatedDate] = useState("");
    const [overallTotal, setOverallTotal] = useState(0);
    const [viewMode, setViewMode] = useState("area"); // 'area' or 'brand'
    const [brandData, setBrandData] = useState({});

    useEffect(() => {
        (async () => {
            try {
                const Company_Id = await AsyncStorage.getItem("Company_Id");

                fetchStock(Company_Id);
            } catch (err) {
                console.error(err);
            }
        })();
    }, []);

    const fetchStock = async cID => {
        try {
            const url = `${API.closingStockAreaBased()}${cID}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (data.success) {
                setStockData(data.data);
            } else {
                console.log("Failed to fetch logs: ", data.message);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (stockData.length > 0) {
            calculateOverallTotalAndLatestDate();
            organizeBrandData();
        }
    }, [stockData]);

    const calculateOverallTotalAndLatestDate = () => {
        let total = 0;
        let latestDate = "";

        stockData.forEach(area => {
            area.Retailer.forEach(retailer => {
                retailer.Closing_Stock.forEach(stock => {
                    total += stock.Previous_Balance * stock.Item_Rate;

                    // Find the latest date
                    if (
                        !latestDate ||
                        new Date(stock.Cl_Date) > new Date(latestDate)
                    ) {
                        latestDate = stock.Cl_Date;
                    }
                });
            });
        });

        setOverallTotal(total);
        setLastUpdatedDate(latestDate);
    };

    const toggleArea = areaId => {
        setExpandedAreas(prev => ({
            ...prev,
            [areaId]: !prev[areaId],
        }));
    };

    const toggleRetailer = retailerId => {
        setExpandedRetailers(prev => ({
            ...prev,
            [retailerId]: !prev[retailerId],
        }));
    };

    const calculateAreaTotal = area => {
        let total = 0;
        area.Retailer.forEach(retailer => {
            retailer.Closing_Stock.forEach(stock => {
                total += stock.Previous_Balance * stock.Item_Rate;
            });
        });
        return total;
    };

    const calculateRetailerTotal = retailer => {
        let total = 0;
        retailer.Closing_Stock.forEach(stock => {
            total += stock.Previous_Balance * stock.Item_Rate;
        });
        return total;
    };

    const formatDate = dateString => {
        if (!dateString) return "N/A";
        const options = { year: "numeric", month: "short", day: "numeric" };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const organizeBrandData = () => {
        const brands = {};

        stockData.forEach(area => {
            area.Retailer.forEach(retailer => {
                retailer.Closing_Stock.forEach(stock => {
                    if (!brands[stock.Brand]) {
                        brands[stock.Brand] = {
                            Brand_Name: stock.Brand_Name,
                            products: {},
                            totalAmount: 0,
                        };
                    }

                    if (!brands[stock.Brand].products[stock.Item_Id]) {
                        brands[stock.Brand].products[stock.Item_Id] = {
                            Product_Name: stock.Product_Name,
                            Item_Rate: stock.Item_Rate,
                            totalQuantity: 0,
                            totalValue: 0,
                        };
                    }

                    brands[stock.Brand].products[stock.Item_Id].totalQuantity +=
                        stock.Previous_Balance;
                    brands[stock.Brand].products[stock.Item_Id].totalValue +=
                        stock.Previous_Balance * stock.Item_Rate;
                    brands[stock.Brand].totalAmount +=
                        stock.Previous_Balance * stock.Item_Rate;
                });
            });
        });

        setBrandData(brands);
    };

    const renderBrandView = () => (
        <ScrollView style={styles.container}>
            <View style={styles.summaryContainer}>
                <Text style={styles.lastUpdatedText}>
                    Last Updated: {formatDate(lastUpdatedDate)}
                </Text>
                <Text style={styles.overallTotalText}>
                    Overall Total: ₹{overallTotal.toFixed(2)}
                </Text>
            </View>

            {Object.entries(brandData).map(([brandId, brand]) => (
                <View key={brandId} style={styles.areaContainer}>
                    <TouchableOpacity
                        style={styles.areaHeader}
                        onPress={() => toggleArea(brandId)}>
                        <View style={styles.areaHeaderContent}>
                            <Icon
                                name={
                                    expandedAreas[brandId]
                                        ? "expand-less"
                                        : "expand-more"
                                }
                                size={24}
                                color="#333"
                            />
                            <Text style={styles.areaName}>
                                {brand.Brand_Name}
                            </Text>
                            <Text style={styles.areaTotal}>
                                ₹{brand.totalAmount.toFixed(2)}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {expandedAreas[brandId] && (
                        <View style={styles.stockList}>
                            {Object.entries(brand.products).map(
                                ([productId, product]) => (
                                    <View
                                        key={productId}
                                        style={styles.stockItem}>
                                        <Text style={styles.productName}>
                                            {product.Product_Name}
                                        </Text>
                                        <View style={styles.stockDetails}>
                                            <Text style={styles.stockText}>
                                                Quantity:{" "}
                                                {product.totalQuantity}
                                            </Text>
                                            <Text style={styles.stockText}>
                                                Rate: ₹{product.Item_Rate}
                                            </Text>
                                            <Text style={styles.stockValue}>
                                                Value: ₹
                                                {product.totalValue.toFixed(2)}
                                            </Text>
                                        </View>
                                    </View>
                                ),
                            )}
                        </View>
                    )}
                </View>
            ))}
        </ScrollView>
    );

    return (
        <View style={styles.container}>
            <AppHeader
                navigation={navigation}
                title="Retailers Stock Info"
                showRightIcon={true}
                rightIconLibrary="MaterialIcon"
                rightIconName={viewMode === "area" ? "store" : "local-offer"}
                onRightPress={() =>
                    setViewMode(viewMode === "area" ? "brand" : "area")
                }
            />

            <View style={styles.contentContainer}>
                {loading ? (
                    <ActivityIndicator
                        size="large"
                        color={customColors.primary}
                        style={{ flex: 1 }}
                    />
                ) : viewMode === "area" ? (
                    <ScrollView style={styles.container}>
                        <View style={styles.summaryContainer}>
                            <Text style={styles.lastUpdatedText}>
                                Last Updated: {formatDate(lastUpdatedDate)}
                            </Text>
                            <Text style={styles.overallTotalText}>
                                Overall Total: ₹{overallTotal.toFixed(2)}
                            </Text>
                        </View>

                        {stockData.map(area => (
                            <View
                                key={area.Area_Id}
                                style={styles.areaContainer}>
                                <TouchableOpacity
                                    style={styles.areaHeader}
                                    onPress={() => toggleArea(area.Area_Id)}>
                                    <View style={styles.areaHeaderContent}>
                                        <Icon
                                            name={
                                                expandedAreas[area.Area_Id]
                                                    ? "expand-less"
                                                    : "expand-more"
                                            }
                                            size={24}
                                            color="#333"
                                        />
                                        <Text style={styles.areaName}>
                                            {area.Area_Name ||
                                                `Area ${area.Area_Id}`}
                                        </Text>
                                        <Text style={styles.areaTotal}>
                                            ₹
                                            {calculateAreaTotal(area).toFixed(
                                                2,
                                            )}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                {expandedAreas[area.Area_Id] && (
                                    <View style={styles.retailersList}>
                                        {area.Retailer.map(retailer => (
                                            <View
                                                key={retailer.Retailer_Id}
                                                style={
                                                    styles.retailerContainer
                                                }>
                                                <TouchableOpacity
                                                    style={
                                                        styles.retailerHeader
                                                    }
                                                    onPress={() =>
                                                        toggleRetailer(
                                                            retailer.Retailer_Id,
                                                        )
                                                    }>
                                                    <View
                                                        style={
                                                            styles.retailerHeaderContent
                                                        }>
                                                        <Icon
                                                            name={
                                                                expandedRetailers[
                                                                    retailer
                                                                        .Retailer_Id
                                                                ]
                                                                    ? "remove"
                                                                    : "add"
                                                            }
                                                            size={20}
                                                            color="#666"
                                                        />
                                                        <Text
                                                            style={
                                                                styles.retailerName
                                                            }>
                                                            {
                                                                retailer.Retailer_Name
                                                            }
                                                        </Text>
                                                        <Text
                                                            style={
                                                                styles.retailerTotal
                                                            }>
                                                            ₹
                                                            {calculateRetailerTotal(
                                                                retailer,
                                                            ).toFixed(2)}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>

                                                {expandedRetailers[
                                                    retailer.Retailer_Id
                                                ] && (
                                                    <View
                                                        style={
                                                            styles.stockList
                                                        }>
                                                        {retailer.Closing_Stock.map(
                                                            stock => (
                                                                <View
                                                                    key={
                                                                        stock.Item_Id
                                                                    }
                                                                    style={
                                                                        styles.stockItem
                                                                    }>
                                                                    <Text
                                                                        style={
                                                                            styles.productName
                                                                        }>
                                                                        {
                                                                            stock.Product_Name
                                                                        }
                                                                    </Text>
                                                                    <View
                                                                        style={
                                                                            styles.stockDetails
                                                                        }>
                                                                        <Text
                                                                            style={
                                                                                styles.stockText
                                                                            }>
                                                                            Balance:{" "}
                                                                            {
                                                                                stock.Previous_Balance
                                                                            }
                                                                        </Text>
                                                                        <Text
                                                                            style={
                                                                                styles.stockText
                                                                            }>
                                                                            Rate:
                                                                            ₹
                                                                            {
                                                                                stock.Item_Rate
                                                                            }
                                                                        </Text>
                                                                        <Text
                                                                            style={
                                                                                styles.stockValue
                                                                            }>
                                                                            Value:
                                                                            ₹
                                                                            {(
                                                                                stock.Previous_Balance *
                                                                                stock.Item_Rate
                                                                            ).toFixed(
                                                                                2,
                                                                            )}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                            ),
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    renderBrandView()
                )}
            </View>
        </View>
    );
};

export default RetailerStock;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        width: "100%",
        height: "100%",
        backgroundColor: customColors.white,
        borderRadius: 7.5,
    },
    areaContainer: {
        marginBottom: 8,
        backgroundColor: customColors.white,
        borderRadius: 8,
        overflow: "hidden",
        marginHorizontal: 12,
        marginTop: 8,
        elevation: 2,
    },
    areaHeader: {
        padding: 16,
        backgroundColor: "#f8f8f8",
    },
    areaHeaderContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    areaName: {
        flex: 1,
        ...typography.h6(),
        fontWeight: "bold",
        marginLeft: 8,
    },
    areaTotal: {
        ...typography.h6(),
        fontWeight: "bold",
        color: "#2196F3",
    },
    retailersList: {
        paddingHorizontal: 8,
    },
    retailerContainer: {
        marginVertical: 4,
        backgroundColor: customColors.white,
        borderRadius: 4,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#eee",
    },
    retailerHeader: {
        padding: 12,
    },
    retailerHeaderContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    retailerName: {
        flex: 1,
        fontSize: 14,
        marginLeft: 8,
    },
    retailerTotal: {
        ...typography.body1(),
        color: "#4CAF50",
        fontWeight: "bold",
    },
    stockList: {
        paddingHorizontal: 12,
        paddingBottom: 12,
    },
    stockItem: {
        marginTop: 8,
        padding: 8,
        backgroundColor: "#f5f5f5",
        borderRadius: 4,
    },
    productName: {
        ...typography.body1(),
        fontWeight: "500",
        marginBottom: 4,
    },
    stockDetails: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 4,
    },
    stockText: {
        ...typography.body2(),
        color: "#666",
    },
    stockValue: {
        ...typography.body2(),
        fontWeight: "500",
        color: "#666",
    },

    summaryContainer: {
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 10,
    },
    lastUpdatedText: {
        ...typography.body1(),
        color: "#555",
        marginBottom: 4,
    },
    overallTotalText: {
        ...typography.h6(),
        fontWeight: "bold",
        color: customColors.primary,
    },
    headerButtons: {
        flexDirection: "row",
        alignItems: "center",
        gap: 15,
    },
    viewToggle: {
        marginRight: 5,
    },
});
