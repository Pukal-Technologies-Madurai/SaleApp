import React, { useEffect, useState } from "react";
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/FontAwesome";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import {
    customColors,
    typography,
    shadows,
    spacing,
} from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import AppHeader from "../../Components/AppHeader";
import { SafeAreaView } from "react-native-safe-area-context";

const SalesReport = ({ navigation, route }) => {
    const {
        logData,
        selectedDate,
        isNotAdmin = true,
    } = route.params;

    const [visitLogLength, setVisitLogLength] = useState(0);
    const [selectedBrand, setSelectedBrand] = useState("All");
    const [brandOptions, setBrandOptions] = useState([]);

    // console.log(
    //     "Product Summary:",
    //     logData.map(item => item.Products_List),
    // );

    const calculateProductSummary = () => {
        const productMap = {};

        logData.forEach(order => {
            order.Products_List.forEach(product => {
                const productName = product.Product_Name.trim();

                if (productMap[productName]) {
                    productMap[productName].totalQty += product.Total_Qty || product.Bill_Qty;
                    productMap[productName].totalAmount += parseFloat(product.Final_Amo || product.Amount);
                } else {
                    productMap[productName] = {
                        productName: productName,
                        totalQty: product.Total_Qty || product.Bill_Qty,
                        totalAmount: parseFloat(product.Final_Amo || product.Amount)
                    };
                }
            });
        });

        return Object.values(productMap);
    };

    const productSummary = calculateProductSummary();

    useEffect(() => {
        if (selectedDate) {
            fetchVisitLog();
        }
    }, [selectedDate]);

    useEffect(() => {
        if (logData && logData.length > 0) {
            const allBrands = logData.flatMap(order =>
                order.Products_List.map(p => p.BrandGet?.trim()),
            );

            const uniqueBrands = ["All", ...new Set(allBrands.filter(Boolean))];
            setBrandOptions(uniqueBrands);
        }
    }, [logData]);

    const fetchVisitLog = async () => {
        try {
            const storeUserTypeId = await AsyncStorage.getItem("userTypeId");
            const userId = await AsyncStorage.getItem("UserId");
            const formattedDate = new Date(selectedDate)
                .toISOString()
                .split("T")[0];

            const isAdminUser = ["0", "1", "2"].includes(storeUserTypeId);
            const userIdParam = isAdminUser ? "" : userId;

            const url = `${API.visitedLog()}?reqDate=${formattedDate}&UserId=${userIdParam}`;
            const response = await fetch(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const data = await response.json();
            if (data.success) {
                setVisitLogLength(data.data?.length || 0);
            } else {
                console.log("Failed to fetch logs:", data.message);
                setVisitLogLength(0);
            }
        } catch (error) {
            console.error("Error fetching logs:", error);
            setVisitLogLength(0);
        }
    };

    const selectedDateObj = new Date(selectedDate);

    const fromDate = selectedDateObj.toLocaleDateString().split("T")[0];
    const fromTime = selectedDateObj.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
    });

    const filteredSummary = productSummary.filter(item =>
        selectedBrand === "All"
            ? true
            : logData.some(order =>
                order.Products_List.some(
                    p =>
                        p.Product_Name.trim() === item.productName.trim() &&
                        p.BrandGet?.trim() === selectedBrand,
                ),
            ),
    );

    const filteredQuantity = filteredSummary.reduce(
        (sum, item) => sum + item.totalQty,
        0,
    );
    const filteredAmount = filteredSummary.reduce(
        (sum, item) => sum + parseFloat(item.totalAmount),
        0,
    );

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Sales Report"
                navigation={navigation}
                showBackButton={true}
            />

            <ScrollView style={styles.contentContainer}>
                <View style={styles.statsContainer}>
                    <View style={styles.statRow}>
                        <Icon
                            name="calendar"
                            size={20}
                            color={customColors.primary}
                        />
                        <Text style={styles.statValue}>
                            {fromDate} • {fromTime}
                        </Text>
                    </View>

                    {isNotAdmin === true ? (
                        <View>
                            <View style={styles.statRow}>
                                <MaterialCommunityIcons
                                    name="bike"
                                    size={24}
                                    color={customColors.success}
                                />
                                <Text style={styles.statValue}>
                                    Shops Visited:{" "}
                                    <Text
                                        style={{
                                            color: customColors.success,
                                            fontWeight: "bold",
                                        }}>
                                        {visitLogLength}
                                        <Text
                                            style={[
                                                styles.statValue,
                                                { color: customColors.grey800 },
                                            ]}>
                                            {" "}
                                            | Sales:
                                            <Text
                                                style={{
                                                    color: customColors.error,
                                                    fontWeight: "bold",
                                                }}>
                                                {" "}
                                                {logData.length}
                                            </Text>
                                        </Text>
                                    </Text>
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.checkOrderText}>
                            Orders: {logData.length}
                        </Text>
                    )}
                </View>

                <ScrollView
                    horizontal
                    style={{
                        paddingHorizontal: spacing.md,
                        marginVertical: spacing.sm,
                    }}>
                    {brandOptions.map((brand, index) => (
                        <TouchableOpacity
                            key={index}
                            style={{
                                paddingVertical: spacing.xs,
                                paddingHorizontal: spacing.md,
                                marginRight: spacing.sm,
                                borderRadius: 20,
                                backgroundColor:
                                    selectedBrand === brand
                                        ? customColors.primary
                                        : customColors.grey200,
                            }}
                            onPress={() => setSelectedBrand(brand)}>
                            <Text
                                style={{
                                    color:
                                        selectedBrand === brand
                                            ? customColors.white
                                            : customColors.grey800,
                                    ...typography.caption(),
                                }}>
                                {brand}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <View style={styles.headerRow}>
                            <View style={styles.productHeaderCell}>
                                <Text style={styles.headerText}>Product</Text>
                            </View>
                            <View style={styles.quantityHeaderCell}>
                                <Text style={styles.headerText}>Quantity</Text>
                            </View>
                            <View style={styles.amountHeaderCell}>
                                <Text style={styles.headerText}>Total</Text>
                            </View>
                        </View>

                        <View style={styles.summaryRow}>
                            <View style={styles.productHeaderCell}>
                                <Text style={styles.summaryText}>
                                    {filteredSummary.length} Products
                                </Text>
                            </View>
                            <View style={styles.quantityHeaderCell}>
                                <Text style={styles.summaryText}>
                                    {filteredQuantity}
                                </Text>
                            </View>
                            <View style={styles.amountHeaderCell}>
                                <Text style={styles.summaryText}>
                                    ₹{filteredAmount.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {productSummary
                        .filter(item =>
                            selectedBrand === "All"
                                ? true
                                : logData.some(order =>
                                    order.Products_List.some(
                                        p =>
                                            p.Product_Name.trim() ===
                                            item.productName.trim() &&
                                            p.BrandGet?.trim() ===
                                            selectedBrand,
                                    ),
                                ),
                        )
                        .map((item, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.tableRow,
                                    index % 2 === 0
                                        ? styles.evenRow
                                        : styles.oddRow,
                                ]}>
                                <Text
                                    style={[
                                        styles.tableCell,
                                        styles.productCell,
                                    ]}
                                    numberOfLines={3}>
                                    {item.productName}
                                </Text>
                                <Text
                                    style={[
                                        styles.tableCell,
                                        styles.quantityCell,
                                    ]}>
                                    {item.totalQty}
                                </Text>
                                <Text
                                    style={[
                                        styles.tableCell,
                                        styles.amountCell,
                                    ]}>
                                    ₹{parseFloat(item.totalAmount).toFixed(2)}
                                </Text>
                            </View>
                        ))}

                    {/* {productSummary.map((item, index) => (
                        <View
                            key={index}
                            style={[
                                styles.tableRow,
                                index % 2 === 0
                                    ? styles.evenRow
                                    : styles.oddRow,
                            ]}>
                            <Text
                                style={[styles.tableCell, styles.productCell]}
                                numberOfLines={2}>
                                {item.productName}
                            </Text>
                            <Text
                                style={[styles.tableCell, styles.quantityCell]}>
                                {item.totalQty}
                            </Text>
                            <Text style={[styles.tableCell, styles.amountCell]}>
                                ₹{parseFloat(item.totalAmount).toFixed(2)}
                            </Text>
                        </View>
                    ))} */}
                </View>
                <View style={styles.bottomSpacer} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        padding: spacing.sm,
        backgroundColor: customColors.white,
    },
    statsContainer: {
        marginBottom: spacing.sm,
        backgroundColor: customColors.white,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        ...shadows.small,
    },
    statRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    statValue: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
        paddingHorizontal: spacing.md,
    },
    tableContainer: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: customColors.grey200,
        overflow: "hidden",
        ...shadows.small,
    },
    tableHeader: {
        backgroundColor: customColors.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    headerRow: {
        flexDirection: "row",
        marginBottom: spacing.xs,
    },
    summaryRow: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.2)",
        paddingTop: spacing.xs,
    },
    headerText: {
        ...typography.subtitle2(),
        color: customColors.white,
        fontWeight: "700",
    },
    summaryText: {
        ...typography.subtitle2(),
        color: customColors.white,
        opacity: 0.9,
    },
    productHeaderCell: {
        flex: 2,
    },
    quantityHeaderCell: {
        flex: 1,
        alignItems: "center",
    },
    amountHeaderCell: {
        flex: 1,
        alignItems: "flex-end",
    },
    tableCell: {
        ...typography.body2(),
        color: customColors.grey900,
    },
    productCell: {
        flex: 2,
    },
    quantityCell: {
        flex: 1,
        textAlign: "center",
    },
    amountCell: {
        flex: 1,
        textAlign: "right",
    },
    evenRow: {
        backgroundColor: customColors.white,
    },
    oddRow: {
        backgroundColor: customColors.grey50,
    },
    checkOrderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        marginRight: spacing.sm,
        marginTop: spacing.sm,
    },
    checkOrderText: {
        ...typography.body2(),
        color: customColors.grey700,
        marginLeft: spacing.md,
        fontWeight: "600",
    },
    bottomSpacer: {
        height: spacing.xxl * 2,
    },
});

export default SalesReport;
