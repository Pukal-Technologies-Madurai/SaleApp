import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { customColors, spacing, typography } from "../../Config/helper";
import AppHeader from "../../Components/AppHeader";

const SalesAdminDetail = ({ route }) => {
    const { order } = route.params;

    return (
        <View style={{ flex: 1, backgroundColor: customColors.background }}>
            <AppHeader title="Sale order details" />
            <View style={styles.retailerContent}>
                <View style={styles.orderHeader}>
                    <Text style={styles.orderId}>Order #{order.So_Id}</Text>
                    <Text style={styles.orderDate}>
                        {new Date(order.So_Date).toLocaleDateString()}
                    </Text>
                </View>

                <View style={styles.productsList}>
                    <View style={styles.productHeader}>
                        <Text
                            style={[
                                styles.retailerProductCell,
                                styles.retailerProductNameCell,
                            ]}>
                            Product
                        </Text>
                        <Text style={styles.retailerProductCell}>Qty</Text>
                        <Text style={styles.retailerProductCell}>Amount</Text>
                    </View>

                    {order.Products_List.map((product, pIndex) => (
                        <View key={pIndex} style={styles.productRow}>
                            <Text
                                style={[
                                    styles.retailerProductCell,
                                    styles.retailerProductNameCell,
                                ]}>
                                {product.Product_Name}
                            </Text>
                            <Text style={styles.retailerProductCell}>
                                {product.Bill_Qty}
                            </Text>
                            <Text style={styles.retailerProductCell}>
                                ₹{product.Amount}
                            </Text>
                        </View>
                    ))}

                    <View style={styles.orderTotal}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalAmount}>
                            ₹{order.Total_Invoice_value}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    retailerContent: {
        padding: spacing.md,
    },
    orderHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: spacing.sm,
        paddingBottom: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    orderId: {
        ...typography.subtitle2(),
        color: customColors.grey900,
    },
    orderDate: {
        ...typography.body2(),
        color: customColors.grey700,
    },
    productsList: {
        marginTop: spacing.sm,
    },
    productHeader: {
        flexDirection: "row",
        backgroundColor: customColors.grey400,
        padding: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey300,
    },
    productRow: {
        flexDirection: "row",
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
        alignItems: "center",
    },
    retailerProductCell: {
        flex: 1,
        textAlign: "right",
        ...typography.body2(),
        color: customColors.grey800,
    },
    retailerProductNameCell: {
        flex: 2,
        textAlign: "left",
        flexWrap: "wrap",
        color: customColors.black,
    },
    orderTotal: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: customColors.grey300,
    },
    totalLabel: {
        ...typography.subtitle2(),
        color: customColors.grey900,
    },
    totalAmount: {
        ...typography.subtitle2(),
        color: customColors.primary,
        fontWeight: "600",
    },
});

export default SalesAdminDetail;
