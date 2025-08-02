import { ScrollView, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import IconMaterial from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../../Components/AppHeader";
import DatePickerButton from "../../Components/DatePickerButton";
import { fetchSaleOrderRetilerWise } from "../../Api/sales";
import {
    customColors,
    shadows,
    typography,
    spacing,
} from "../../Config/helper";

const SaleHistory = ({ route }) => {
    const { item } = route.params;
    const navigation = useNavigation();

    const toDate = new Date();
    const from = new Date(toDate.getFullYear(), toDate.getMonth(), 1)
        .toISOString()
        .split("T")[0];
    const to = toDate.toISOString().split("T")[0];

    const [selectedFromDate, setSelectedFromDate] = useState(from);
    const [selectedToDate, setSelectedToDate] = useState(to);

    useEffect(() => {
        (async () => {
            setSelectedFromDate(from);
            setSelectedToDate(to);
        })();
    }, []);

    const { data: salesData = [] } = useQuery({
        queryKey: [
            "salesData",
            item.Retailer_Id,
            selectedFromDate,
            selectedToDate,
        ],
        queryFn: () =>
            fetchSaleOrderRetilerWise({
                retailerId: item.Retailer_Id,
                from: selectedFromDate,
                to: selectedToDate,
            }),
        enabled: !!item.Retailer_Id || !!selectedFromDate || !!selectedToDate,
    });

    const handleDateChange = async (date, type) => {
        if (date) {
            const formattedDate = date.toISOString().split("T")[0];
            if (type === "from") {
                setSelectedFromDate(formattedDate);
            } else {
                setSelectedToDate(formattedDate);
            }
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
            <View style={styles.mainContainer}>
                <AppHeader title="Order Summary" navigation={navigation} />

                <View style={styles.datePickerRow}>
                    <View style={styles.datePickerWrapper}>
                        <DatePickerButton
                            date={new Date(selectedFromDate)}
                            onDateChange={date => {
                                handleDateChange(date, "from");
                            }}
                            mode="date"
                            title="From Date"
                            containerStyle={styles.datePickerContainer}
                        />
                    </View>
                    <View style={styles.datePickerWrapper}>
                        <DatePickerButton
                            date={new Date(selectedToDate)}
                            onDateChange={date => {
                                handleDateChange(date, "to");
                            }}
                            mode="date"
                            title="To Date"
                            containerStyle={styles.datePickerContainer}
                        />
                    </View>
                </View>

                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {Object.values(groupedSales).map((group, index) => (
                        <View key={index} style={styles.dateGroup}>
                            <View style={styles.dateHeader}>
                                <View style={styles.dateInfo}>
                                    <IconMaterial
                                        name="event"
                                        size={20}
                                        color={customColors.grey700}
                                    />
                                    <Text style={styles.dateText}>
                                        {group.date}
                                    </Text>
                                </View>
                                <View style={styles.salesPersonInfo}>
                                    <IconMaterial
                                        name="person"
                                        size={20}
                                        color={customColors.grey700}
                                    />
                                    <Text style={styles.salesPersonText}>
                                        {group.salesPerson}
                                    </Text>
                                </View>
                            </View>

                            {group.sales.map(sale => (
                                <View key={sale.So_Id} style={styles.saleCard}>
                                    <View style={styles.orderHeader}>
                                        <Text style={styles.orderNumber}>
                                            Order #{sale.So_Id}
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
                                                            sale.Products_List
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
                                                            numberOfLines={2}>
                                                            {
                                                                product.Product_Name
                                                            }
                                                        </Text>
                                                        <Text
                                                            style={styles.uom}>
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
                                                            x{product.Total_Qty}
                                                        </Text>
                                                        <Text
                                                            style={
                                                                styles.price
                                                            }>
                                                            ₹{product.Final_Amo}
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
        </View>
    );
};

export default SaleHistory;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    mainContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    scrollContent: {
        paddingVertical: spacing.sm,
    },
    datePickerRow: {
        flexDirection: "row",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: customColors.white,
        ...shadows.small,
        marginBottom: spacing.sm,
    },
    datePickerWrapper: {
        flex: 1,
        marginHorizontal: spacing.xs,
    },
    datePickerContainer: {
        width: "100%",
    },
    dateGroup: {
        marginBottom: spacing.md,
        backgroundColor: customColors.white,
        borderRadius: 8,
        ...shadows.small,
        marginHorizontal: spacing.sm,
    },
    dateHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: customColors.grey50,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    dateInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    dateText: {
        ...typography.subtitle1(),
        color: customColors.grey700,
        marginLeft: spacing.xs,
    },
    salesPersonInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    salesPersonText: {
        ...typography.subtitle2(),
        color: customColors.grey700,
        marginLeft: spacing.xs,
    },
    orderHeader: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: spacing.sm,
        backgroundColor: customColors.grey50,
    },
    orderNumber: {
        ...typography.subtitle2(),
        color: customColors.grey700,
        fontWeight: "500",
    },
    saleCard: {
        backgroundColor: customColors.white,
        marginHorizontal: spacing.sm,
        marginTop: spacing.sm,
        borderRadius: 8,
        ...shadows.small,
        overflow: "hidden",
    },
    productsList: {
        padding: spacing.sm,
    },
    productItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: spacing.sm,
    },
    productBorder: {
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    productInfo: {
        flex: 1,
        marginRight: spacing.sm,
    },
    productName: {
        ...typography.body1(),
        color: customColors.grey900,
        marginBottom: spacing.xs,
    },
    uom: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    priceContainer: {
        alignItems: "flex-end",
    },
    quantity: {
        ...typography.body2(),
        color: customColors.grey700,
        marginBottom: spacing.xs,
    },
    price: {
        ...typography.subtitle1(),
        color: customColors.primary,
    },
    totalSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: spacing.sm,
        backgroundColor: customColors.grey50,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    totalLabel: {
        ...typography.subtitle1(),
        color: customColors.grey700,
    },
    totalAmount: {
        ...typography.h6(),
        color: customColors.accent,
    },
});
