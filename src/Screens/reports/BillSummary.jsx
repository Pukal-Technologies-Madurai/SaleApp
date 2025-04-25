import {
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Ionicons";
import AntDesignIcons from "react-native-vector-icons/AntDesign";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import DatePickerButton from "../../Components/DatePickerButton";
import assetImages from "../../Config/Image";

const BillSummary = () => {
    const navigation = useNavigation();
    const [logData, setLogData] = useState([]);
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                const fromDate = selectedFromDate.toISOString().split("T")[0];
                const toDate = selectedToDate.toISOString().split("T")[0];
                fetchCollectionReceipts(fromDate, toDate, userId);
            } catch (err) {
                console.error(err);
            }
        })();
    }, [selectedFromDate, selectedToDate]);

    const fetchCollectionReceipts = async (from, to, uid) => {
        try {
            const url = `${API.paymentCollection()}?Fromdate=${from}&Todate=${to}&collected_by=${uid}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.success) {
                setLogData(data.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleFromDateChange = (event, date) => {
        if (date) {
            setSelectedFromDate(date);
        }
    };

    const handleToDateChange = (event, date) => {
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
                        <Text style={styles.headerText}>Bills Summary</Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate("BillPayment")}>
                            <AntDesignIcons
                                name="addfile"
                                color={customColors.white}
                                size={23}
                            />
                        </TouchableOpacity>
                    </View>

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
                                <Text style={styles.summaryLabel}>
                                    Total Bills
                                </Text>
                                <Text style={styles.summaryValue}>
                                    {logData.length}
                                </Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>
                                    Total Amount
                                </Text>
                                <Text style={styles.summaryValue}>
                                    ₹
                                    {logData
                                        .map(total => total.total_amount)
                                        .reduce((acc, cur) => acc + cur, 0)}
                                </Text>
                            </View>
                        </View>
                        <ScrollView>
                            {logData?.map((collection, index) => (
                                <View key={index} style={styles.collectionCard}>
                                    <View style={styles.cardTop}>
                                        <View style={styles.topLeft}>
                                            <View
                                                style={styles.invoiceContainer}>
                                                <Icon
                                                    name="receipt-outline"
                                                    size={18}
                                                    color={customColors.primary}
                                                />
                                                <Text style={styles.invoiceNo}>
                                                    #
                                                    {
                                                        collection.collection_inv_no
                                                    }
                                                </Text>
                                            </View>
                                            <View style={styles.dateContainer}>
                                                <Icon
                                                    name="calendar-outline"
                                                    size={16}
                                                    color={customColors.grey}
                                                />
                                                <Text style={styles.date}>
                                                    {formatDate(
                                                        collection.collection_date,
                                                    )}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.cardMiddle}>
                                        <View style={styles.retailerContainer}>
                                            <Icon
                                                name="storefront-outline"
                                                size={18}
                                                color={customColors.primary}
                                            />
                                            <Text style={styles.retailerName}>
                                                {collection.RetailerGet}
                                            </Text>
                                        </View>
                                        <View style={styles.paymentContainer}>
                                            <Icon
                                                name="card-outline"
                                                size={16}
                                                color={customColors.grey}
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
                                                        style={
                                                            styles.receiptInfo
                                                        }>
                                                        <View
                                                            style={
                                                                styles.receiptInvoiceContainer
                                                            }>
                                                            <Icon
                                                                name="document-text-outline"
                                                                size={16}
                                                                color={
                                                                    customColors.primary
                                                                }
                                                            />
                                                            <Text
                                                                style={
                                                                    styles.receiptInvoice
                                                                }>
                                                                #
                                                                {
                                                                    receipt.Do_Inv_No
                                                                }
                                                            </Text>
                                                        </View>
                                                        <View
                                                            style={
                                                                styles.receiptAmountContainer
                                                            }>
                                                            <Icon
                                                                name="cash-outline"
                                                                size={16}
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
                                                        <Icon
                                                            name="checkmark-circle-outline"
                                                            size={18}
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
            </ImageBackground>
        </View>
    );
};

export default BillSummary;

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
    content: {
        flex: 1,
        backgroundColor: customColors.white,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        overflow: "hidden",
        padding: 15,
    },
    datePickerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    datePicker: {
        width: "48%",
    },
    collectionCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        margin: 10,
        padding: 12,
        elevation: 2,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: customColors.lightGray,
    },
    topLeft: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
    },
    invoiceContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    dateContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    amountContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginLeft: 16,
    },
    invoiceNo: {
        ...typography.body1(),
        color: customColors.primary,
        fontWeight: "800",
    },
    date: {
        ...typography.body2(),
        color: customColors.grey,
        fontWeight: "800",
    },
    cardMiddle: {
        // marginBottom: 12,
    },
    retailerContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
    },
    retailerName: {
        ...typography.body1(),
        color: customColors.primary,
        fontWeight: "800",
    },
    paymentContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    paymentType: {
        ...typography.body2(),
        color: customColors.grey,
    },
    receiptsContainer: {
        backgroundColor: customColors.lightGrey,
        borderRadius: 10,
        padding: 8,
    },
    receiptItem: {
        backgroundColor: customColors.white,
        borderRadius: 6,
        padding: 8,
        marginBottom: 8,
    },
    receiptInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    receiptInvoiceContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    receiptAmountContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    receiptInvoice: {
        ...typography.caption(),
        color: customColors.dark,
        fontWeight: "600",
    },
    receiptAmount: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "800",
    },
    collectedContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        justifyContent: "flex-end",
    },
    collectedAmount: {
        ...typography.caption(),
        color: customColors.success,
        fontWeight: "800",
    },
    summaryBox: {
        flexDirection: "row",
        backgroundColor: customColors.white,
        borderRadius: 10,
        padding: 15,
        margin: 10,
        marginBottom: 15,
        elevation: 3,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        justifyContent: "space-around",
        alignItems: "center",
    },
    summaryItem: {
        alignItems: "center",
        flex: 1,
    },
    summaryLabel: {
        ...typography.body2(),
        color: customColors.grey,
        marginBottom: 5,
    },
    summaryValue: {
        ...typography.h4(),
        color: customColors.primary,
        fontWeight: "bold",
    },
    summaryDivider: {
        width: 1,
        height: "100%",
        backgroundColor: customColors.grey,
        marginHorizontal: 10,
    },
});
