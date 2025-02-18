import {
    ActivityIndicator,
    ImageBackground,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import Icon from "react-native-vector-icons/MaterialIcons";
import assetImages from "../../Config/Image";
import { customColors, typography } from "../../Config/helper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../../Config/Endpoint";

const RetailerStock = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [stockData, setStockData] = useState([]);
    const [expandedAreas, setExpandedAreas] = useState({});
    const [expandedRetailers, setExpandedRetailers] = useState({});

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

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headerContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Icon
                                name="arrow-back"
                                size={25}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        <Text style={styles.headerText}>
                            Retailers Stock Info
                        </Text>
                    </View>

                    <View
                        style={styles.contentContainer}
                        behavior={Platform.OS === "ios" ? "padding" : "height"}>
                        {loading ? (
                            <ActivityIndicator
                                size="large"
                                color={customColors.primary}
                                style={{ flex: 1, justifyContent: "center" }}
                            />
                        ) : (
                            <ScrollView style={styles.container}>
                                {stockData.map(area => (
                                    <View
                                        key={area.Area_Id}
                                        style={styles.areaContainer}>
                                        <TouchableOpacity
                                            style={styles.areaHeader}
                                            onPress={() =>
                                                toggleArea(area.Area_Id)
                                            }>
                                            <View
                                                style={
                                                    styles.areaHeaderContent
                                                }>
                                                <Icon
                                                    name={
                                                        expandedAreas[
                                                            area.Area_Id
                                                        ]
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
                                                    {calculateAreaTotal(
                                                        area,
                                                    ).toFixed(2)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>

                                        {expandedAreas[area.Area_Id] && (
                                            <View style={styles.retailersList}>
                                                {area.Retailer.map(retailer => (
                                                    <View
                                                        key={
                                                            retailer.Retailer_Id
                                                        }
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
                                                                    ).toFixed(
                                                                        2,
                                                                    )}
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
                        )}
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
};

export default RetailerStock;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.2)",
    },
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
    },
    headerText: {
        flex: 1,
        ...typography.h4(),
        color: customColors.white,
        marginHorizontal: 10,
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
});
