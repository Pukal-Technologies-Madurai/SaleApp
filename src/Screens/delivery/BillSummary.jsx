import { StyleSheet, Text, View, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import AppHeader from "../../Components/AppHeader";
import DatePickerButton from "../../Components/DatePickerButton";
import { fetchPaymentReceipts } from "../../Api/payment";
import {
    customColors,
    typography,
    shadows,
    spacing,
} from "../../Config/helper";

const BillSummary = () => {
    const navigation = useNavigation();
    const [userId, setUserId] = useState(null);
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                setUserId(userId);
            } catch (err) {
                console.error(err);
            }
        })();
    }, []);

    const { data: logData = [] } = useQuery({
        queryKey: ["collectionReceipts", selectedFromDate, selectedToDate],
        queryFn: async () =>
            fetchPaymentReceipts({
                from: selectedFromDate.toISOString().split("T")[0],
                to: selectedToDate.toISOString().split("T")[0],
                uId: userId,
            }),
        enabled: !!selectedFromDate && !!selectedToDate && !!userId,
        // refetchOnWindowFocus: false,
    });

    const handleFromDateChange = date => {
        if (date) {
            setSelectedFromDate(date);
        }
    };

    const handleToDateChange = date => {
        if (date) {
            setSelectedToDate(date);
        }
    };

    const formatDate = dateString => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB");
    };

    return (
        <View style={styles.container}>
            <AppHeader
                title="Bills Summary"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialCommunityIcons"
                rightIconName="file-plus"
                onRightPress={() => navigation.navigate("BillPayment")}
            />

            <View style={styles.contentContainer}>
                <View style={styles.datePickerContainer}>
                    <DatePickerButton
                        title="From Date"
                        date={selectedFromDate}
                        onDateChange={handleFromDateChange}
                        containerStyle={styles.datePicker}
                    />
                    <DatePickerButton
                        title="To Date"
                        date={selectedToDate}
                        onDateChange={handleToDateChange}
                        containerStyle={styles.datePicker}
                    />
                </View>

                <View style={styles.content}>
                    <View style={styles.summaryBox}>
                        <View style={styles.summaryItem}>
                            <MaterialCommunityIcons
                                name="file-document-multiple"
                                size={24}
                                color={customColors.primary}
                            />
                            <Text style={styles.summaryLabel}>Total Bills</Text>
                            <Text style={styles.summaryValue}>
                                {logData.length}
                            </Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <MaterialCommunityIcons
                                name="currency-inr"
                                size={24}
                                color={customColors.success}
                            />
                            <Text style={styles.summaryLabel}>
                                Total Amount
                            </Text>
                            <Text
                                style={[
                                    styles.summaryValue,
                                    { color: customColors.success },
                                ]}>
                                ₹
                                {logData
                                    .map(total => total.total_amount)
                                    .reduce((acc, cur) => acc + cur, 0)
                                    .toFixed(2)}
                            </Text>
                        </View>
                    </View>

                    <ScrollView style={styles.scrollView}>
                        {logData?.map((collection, index) => (
                            <View key={index} style={styles.collectionCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.headerLeft}>
                                        <View style={styles.invoiceContainer}>
                                            <MaterialCommunityIcons
                                                name="receipt"
                                                size={20}
                                                color={customColors.primary}
                                            />
                                            <Text style={styles.invoiceNo}>
                                                #{collection.collection_inv_no}
                                            </Text>
                                        </View>
                                        <View style={styles.dateContainer}>
                                            <MaterialCommunityIcons
                                                name="calendar"
                                                size={18}
                                                color={customColors.grey700}
                                            />
                                            <Text style={styles.date}>
                                                {formatDate(
                                                    collection.collection_date,
                                                )}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.cardBody}>
                                    <View style={styles.retailerContainer}>
                                        <MaterialCommunityIcons
                                            name="store"
                                            size={20}
                                            color={customColors.primary}
                                        />
                                        <Text style={styles.retailerName}>
                                            {collection.RetailerGet}
                                        </Text>
                                    </View>
                                    <View style={styles.paymentContainer}>
                                        <MaterialCommunityIcons
                                            name="credit-card"
                                            size={18}
                                            color={customColors.grey700}
                                        />
                                        <Text style={styles.paymentType}>
                                            {collection.collection_type}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.receiptsContainer}>
                                    {collection.Receipts?.map(
                                        (receipt, rIndex) => (
                                            <View
                                                key={rIndex}
                                                style={styles.receiptItem}>
                                                <View
                                                    style={styles.receiptInfo}>
                                                    <View
                                                        style={
                                                            styles.receiptInvoiceContainer
                                                        }>
                                                        <MaterialCommunityIcons
                                                            name="file-document"
                                                            size={18}
                                                            color={
                                                                customColors.primary
                                                            }
                                                        />
                                                        <Text
                                                            style={
                                                                styles.receiptInvoice
                                                            }>
                                                            #{receipt.Do_Inv_No}
                                                        </Text>
                                                    </View>
                                                    <View
                                                        style={
                                                            styles.receiptAmountContainer
                                                        }>
                                                        <MaterialCommunityIcons
                                                            name="cash"
                                                            size={18}
                                                            color={
                                                                customColors.primary
                                                            }
                                                        />
                                                        <Text
                                                            style={
                                                                styles.receiptAmount
                                                            }>
                                                            ₹
                                                            {
                                                                receipt.bill_amount
                                                            }
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View
                                                    style={
                                                        styles.collectedContainer
                                                    }>
                                                    <MaterialCommunityIcons
                                                        name="check-circle"
                                                        size={20}
                                                        color={
                                                            customColors.success
                                                        }
                                                    />
                                                    <Text
                                                        style={
                                                            styles.collectedAmount
                                                        }>
                                                        Collected: ₹
                                                        {
                                                            receipt.collected_amount
                                                        }
                                                    </Text>
                                                </View>
                                            </View>
                                        ),
                                    )}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </View>
    );
};

export default BillSummary;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    contentContainer: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.white,
    },
    content: {
        flex: 1,
        backgroundColor: customColors.white,
        padding: spacing.md,
    },
    datePickerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: spacing.md,
        marginTop: spacing.sm,
        gap: spacing.xs,
    },
    datePicker: {
        width: "48%",
    },
    summaryBox: {
        flexDirection: "row",
        backgroundColor: customColors.white,
        marginHorizontal: spacing.xs,
        borderRadius: 8,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        ...shadows.medium,
    },
    summaryItem: {
        flex: 1,
        alignItems: "center",
        gap: spacing.xs,
    },
    summaryLabel: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    summaryValue: {
        ...typography.body1(),
        color: customColors.primary,
        fontWeight: "800",
    },
    summaryDivider: {
        width: 1,
        height: "100%",
        backgroundColor: customColors.grey200,
        marginHorizontal: spacing.xs,
    },
    scrollView: {
        flex: 1,
    },
    collectionCard: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        marginBottom: spacing.sm,
        ...shadows.small,
        marginHorizontal: spacing.xs,
    },
    cardHeader: {
        padding: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    headerLeft: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    invoiceContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    dateContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    invoiceNo: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "600",
    },
    date: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    cardBody: {
        padding: spacing.sm,
        gap: spacing.xs,
    },
    retailerContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    retailerName: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "600",
        flex: 1,
        flexWrap: "wrap",
    },
    paymentContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    paymentType: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    receiptsContainer: {
        backgroundColor: customColors.grey50,
        borderRadius: 6,
        padding: spacing.xs,
        margin: spacing.sm,
    },
    receiptItem: {
        backgroundColor: customColors.white,
        borderRadius: 6,
        padding: spacing.xs,
        marginBottom: spacing.xs,
        ...shadows.small,
    },
    receiptInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.xs,
    },
    receiptInvoiceContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    receiptAmountContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    receiptInvoice: {
        ...typography.caption(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    receiptAmount: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "600",
    },
    collectedContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        justifyContent: "flex-end",
    },
    collectedAmount: {
        ...typography.caption(),
        color: customColors.success,
        fontWeight: "600",
    },
});
