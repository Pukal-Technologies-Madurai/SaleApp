import {
    StyleSheet,
    Text,
    View,
    ImageBackground,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import assetImages from "../../Config/Image";
import DatePickerButton from "../../Components/DatePickerButton";

const DeliveryCheck = () => {
    const navigation = useNavigation();
    const [deliveryData, setDeliveryData] = useState({
        totalOrders: 0,
        totalAmount: 0,
        deliveredOrders: 0,
        pendingOrders: 0,
        retailers: [],
    });
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());

    useEffect(() => {
        fetchDeliveryData();
    }, [selectedFromDate, selectedToDate]);

    const fetchDeliveryData = async () => {
        try {
            const userId = await AsyncStorage.getItem("UserId");
            const fromDate = selectedFromDate.toISOString().split("T")[0];
            const toDate = selectedToDate.toISOString().split("T")[0];

            const url = userId
                ? `${API.delivery()}${userId}&Fromdate=${fromDate}&Todate=${toDate}`
                : `${API.delivery()}&Fromdate=${fromDate}&Todate=${toDate}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                const summary = processDeliveryData(data.data);
                setDeliveryData(summary);
            }
        } catch (error) {
            console.error("Error fetching delivery data:", error);
        }
    };

    const processDeliveryData = data => {
        const summary = {
            totalOrders: data.length,
            totalAmount: data.reduce(
                (sum, order) => sum + order.Total_Invoice_value,
                0,
            ),
            deliveredOrders: data.filter(order => order.Delivery_Status === 7)
                .length,
            pendingOrders: data.filter(order => order.Delivery_Status !== 7)
                .length,
            retailers: data.map(order => ({
                name: order.Retailer_Name,
                amount: order.Total_Invoice_value,
                status: order.DeliveryStatusName,
                date: new Date(order.Do_Date).toLocaleDateString(),
                orderNo: order.Do_No,
            })),
        };
        return summary;
    };

    const handleDateChange = (date, isFromDate) => {
        if (isFromDate) {
            setSelectedFromDate(date);
        } else {
            setSelectedToDate(date);
        }
    };

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    {/* Header */}
                    <View style={styles.headerContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <MaterialIcon
                                name="arrow-back"
                                size={25}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        <Text style={styles.headerText}>Delivery Summary</Text>
                    </View>

                    {/* Date Picker */}
                    <View style={styles.datePickerContainer}>
                        <DatePickerButton
                            title="From"
                            date={selectedFromDate}
                            onDateChange={(_, date) =>
                                handleDateChange(date, true)
                            }
                            containerStyle={styles.datePicker}
                        />
                        <DatePickerButton
                            title="To"
                            date={selectedToDate}
                            onDateChange={(_, date) =>
                                handleDateChange(date, false)
                            }
                            containerStyle={styles.datePicker}
                        />
                    </View>

                    <ScrollView style={styles.contentContainer}>
                        {/* Summary Cards */}
                        <View style={styles.summaryContainer}>
                            <View
                                style={[
                                    styles.summaryCard,
                                    { backgroundColor: "#4CAF50" },
                                ]}>
                                <Text style={styles.cardTitle}>
                                    Total Orders
                                </Text>
                                <Text style={styles.cardValue}>
                                    {deliveryData.totalOrders}
                                </Text>
                            </View>
                            <View
                                style={[
                                    styles.summaryCard,
                                    { backgroundColor: "#2196F3" },
                                ]}>
                                <Text style={styles.cardTitle}>
                                    Total Amount
                                </Text>
                                <Text style={styles.cardValue}>
                                    ₹{deliveryData.totalAmount}
                                </Text>
                            </View>
                            <View
                                style={[
                                    styles.summaryCard,
                                    { backgroundColor: "#FFC107" },
                                ]}>
                                <Text style={styles.cardTitle}>Delivered</Text>
                                <Text style={styles.cardValue}>
                                    {deliveryData.deliveredOrders}
                                </Text>
                            </View>
                            <View
                                style={[
                                    styles.summaryCard,
                                    { backgroundColor: "#F44336" },
                                ]}>
                                <Text style={styles.cardTitle}>Pending</Text>
                                <Text style={styles.cardValue}>
                                    {deliveryData.pendingOrders}
                                </Text>
                            </View>
                        </View>

                        {/* Recent Orders */}
                        <View style={styles.recentOrdersContainer}>
                            <Text style={styles.sectionTitle}>
                                Recent Orders
                            </Text>
                            {deliveryData.retailers.map((retailer, index) => (
                                <View key={index} style={styles.orderCard}>
                                    <View style={styles.orderHeader}>
                                        <Text style={styles.retailerName}>
                                            {retailer.name}
                                        </Text>
                                        <Text style={styles.orderDate}>
                                            {retailer.date}
                                        </Text>
                                    </View>
                                    <View style={styles.orderDetails}>
                                        <Text style={styles.orderNo}>
                                            Order #{retailer.orderNo}
                                        </Text>
                                        <Text style={styles.orderAmount}>
                                            ₹{retailer.amount}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.orderStatus,
                                                {
                                                    color:
                                                        retailer.status ===
                                                        "Delivered"
                                                            ? "#4CAF50"
                                                            : "#F44336",
                                                },
                                            ]}>
                                            {retailer.status === "Delivered"
                                                ? "Delivered"
                                                : "Pending"}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </ImageBackground>
        </View>
    );
};

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
        backgroundColor: "rgba(0, 0, 0, 0.3)",
    },
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
    },
    headerText: {
        ...typography.h4(),
        color: customColors.white,
        marginLeft: 15,
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
    contentContainer: {
        flex: 1,
        // padding: 20,
    },
    summaryContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        // marginBottom: 5,
        marginHorizontal: 20,
    },
    summaryCard: {
        width: "48%",
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        elevation: 3,
    },
    cardTitle: {
        ...typography.body2(),
        color: customColors.white,
        marginBottom: 5,
    },
    cardValue: {
        ...typography.h4(),
        color: customColors.white,
        fontWeight: "bold",
    },
    recentOrdersContainer: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: 10,
        padding: 15,
    },
    sectionTitle: {
        ...typography.h5(),
        color: customColors.black,
        marginBottom: 15,
    },
    orderCard: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        elevation: 2,
    },
    orderHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    retailerName: {
        ...typography.body1(),
        color: customColors.black,
        fontWeight: "500",
        flex: 1,
    },
    orderDate: {
        ...typography.body2(),
        color: customColors.grey,
    },
    orderDetails: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    orderNo: {
        ...typography.body2(),
        color: customColors.grey,
    },
    orderAmount: {
        ...typography.body1(),
        color: customColors.black,
        fontWeight: "500",
    },
    orderStatus: {
        ...typography.body2(),
        fontWeight: "500",
    },
});

export default DeliveryCheck;
