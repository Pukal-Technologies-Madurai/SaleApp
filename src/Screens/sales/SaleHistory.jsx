import {
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useEffect, useState } from "react";
import IconMaterial from "react-native-vector-icons/MaterialIcons";
import assetImages from "../../Config/Image";
import { customColors, typography } from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import DatePickerButton from "../../Components/DatePickerButton";

const SaleHistory = ({ route }) => {
    const { item } = route.params;

    const [salesData, setSalesData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString()
            .split("T")[0],
    );

    useEffect(() => {
        (async () => {
            const today = new Date();
            const from = new Date(today.getFullYear(), today.getMonth(), 1)
                .toISOString()
                .split("T")[0];
            setSelectedDate(from);
            const to = today.toISOString().split("T")[0];
            fetchSaleOrder(item.Retailer_Id, from, to);
        })();
    }, []);

    const fetchSaleOrder = async (retailerId, from, to) => {
        try {
            const url = `${API.saleOrder()}?Retailer_Id=${retailerId}&Fromdate=${from}&Todate=${to}`;
            console.log(url);
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setSalesData(data.data);
            } else {
                console.error(data.message);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDateChange = async (event, date) => {
        if (date) {
            const formattedDate = date.toISOString().split("T")[0];
            const today = new Date().toISOString().split("T")[0];
            setSelectedDate(formattedDate);

            fetchSaleOrder(item.Retailer_Id, formattedDate, today);
        }
    };

    // Group sales data by date and sales person
    const groupedSales = salesData.reduce((acc, sale) => {
        const date = new Date(sale.So_Date).toLocaleDateString();
        const key = `${date}-${sale.Sales_Person_Name}`;

        if (!acc[key]) {
            acc[key] = {
                date,
                salesPerson: sale.Sales_Person_Name,
                sales: [],
            };
        }
        acc[key].sales.push(sale);
        return acc;
    }, {});

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headerContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <IconMaterial
                                name="arrow-back"
                                size={25}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        <Text
                            style={styles.headerText}
                            maxFontSizeMultiplier={1.2}>
                            Order Summary
                        </Text>
                    </View>

                    <DatePickerButton
                        date={new Date(selectedDate)}
                        onDateChange={(event, date) => {
                            handleDateChange(event, date);
                        }}
                        mode="date"
                        title="Select Date"
                        containerStyle={styles.datePickerContainer}
                    />

                    <ScrollView style={styles.contentContainer}>
                        {Object.values(groupedSales).map((group, index) => (
                            <View key={index} style={styles.dateGroup}>
                                <View style={styles.dateHeader}>
                                    <View style={styles.dateInfo}>
                                        <IconMaterial
                                            name="event"
                                            size={20}
                                            color="#666"
                                        />
                                        <Text style={styles.dateText}>
                                            {group.date}
                                        </Text>
                                    </View>
                                    <View style={styles.salesPersonInfo}>
                                        <IconMaterial
                                            name="person"
                                            size={20}
                                            color="#666"
                                        />
                                        <Text style={styles.salesPersonText}>
                                            {group.salesPerson}
                                        </Text>
                                    </View>
                                </View>

                                {group.sales.map(sale => (
                                    <View
                                        key={sale.So_Id}
                                        style={styles.saleCard}>
                                        <View style={styles.retailerHeader}>
                                            <Text style={styles.retailerName}>
                                                {sale.Retailer_Name}
                                            </Text>
                                            <Text style={styles.orderNumber}>
                                                #{sale.So_Id}
                                            </Text>
                                        </View>

                                        <View style={styles.productsList}>
                                            {sale.Products_List.map(
                                                (product, pIndex) => (
                                                    <View
                                                        key={product.SO_St_Id}
                                                        style={[
                                                            styles.productItem,
                                                            pIndex <
                                                                sale
                                                                    .Products_List
                                                                    .length -
                                                                    1 &&
                                                                styles.productBorder,
                                                        ]}>
                                                        <View
                                                            style={
                                                                styles.productInfo
                                                            }>
                                                            <Text
                                                                style={
                                                                    styles.productName
                                                                }
                                                                numberOfLines={
                                                                    2
                                                                }>
                                                                {
                                                                    product.Product_Name
                                                                }
                                                            </Text>
                                                            <Text
                                                                style={
                                                                    styles.uom
                                                                }>
                                                                {product.UOM}
                                                            </Text>
                                                        </View>
                                                        <View
                                                            style={
                                                                styles.priceContainer
                                                            }>
                                                            <Text
                                                                style={
                                                                    styles.quantity
                                                                }>
                                                                x
                                                                {
                                                                    product.Total_Qty
                                                                }
                                                            </Text>
                                                            <Text
                                                                style={
                                                                    styles.price
                                                                }>
                                                                ₹
                                                                {
                                                                    product.Final_Amo
                                                                }
                                                            </Text>
                                                        </View>
                                                    </View>
                                                ),
                                            )}
                                        </View>

                                        <View style={styles.totalSection}>
                                            <Text style={styles.totalLabel}>
                                                Total Amount
                                            </Text>
                                            <Text style={styles.totalAmount}>
                                                ₹{sale.Total_Invoice_value}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </ImageBackground>
        </View>
    );
};

export default SaleHistory;

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
    datePickerContainer: {
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    contentContainer: {
        width: "100%",
        height: "100%",
        backgroundColor: customColors.white,
        // borderRadius: 25,
    },
    dateGroup: {
        marginBottom: 16,
    },
    dateHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: customColors.white,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    dateInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    dateText: {
        ...typography.body1(),
        fontWeight: "600",
        color: customColors.grey,
        marginLeft: 4,
    },
    salesPersonInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    salesPersonText: {
        ...typography.body1(),
        color: customColors.grey,
        marginLeft: 4,
    },
    saleCard: {
        backgroundColor: customColors.white,
        marginHorizontal: 12,
        marginTop: 8,
        borderRadius: 12,
        elevation: 2,
        overflow: "hidden",
    },
    retailerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#f8f8f8",
    },
    retailerName: {
        ...typography.h6(),
        fontWeight: "bold",
        color: "#333",
    },
    orderNumber: {
        ...typography.body1(),
        color: "#666",
    },
    productsList: {
        padding: 12,
    },
    productItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
    },
    productBorder: {
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    productInfo: {
        flex: 1,
        marginRight: 12,
    },
    productName: {
        ...typography.body1(),
        color: "#333",
        marginBottom: 4,
    },
    uom: {
        ...typography.body2(),
        color: "#666",
    },
    priceContainer: {
        alignItems: "flex-end",
    },
    quantity: {
        ...typography.body1(),
        color: "#666",
        marginBottom: 2,
    },
    price: {
        ...typography.body1(),
        fontWeight: "600",
        color: "#2196F3",
    },
    totalSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#f8f8f8",
        borderTopWidth: 1,
        borderTopColor: "#eee",
    },
    totalLabel: {
        ...typography.body1(),
        color: "#666",
    },
    totalAmount: {
        ...typography.h6(),
        fontWeight: "bold",
        color: "#4CAF50",
    },
});
