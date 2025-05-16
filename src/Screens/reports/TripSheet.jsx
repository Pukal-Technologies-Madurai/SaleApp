import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../../Config/Endpoint";
import {
    customColors,
    typography,
    shadows,
    spacing,
} from "../../Config/helper";
import DatePickerButton from "../../Components/DatePickerButton";
import AppHeader from "../../Components/AppHeader";
import { useQuery } from "@tanstack/react-query";

const TripSheet = () => {
    const navigation = useNavigation();
    const [logData, setLogData] = useState([]);

    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    const [expandedTrip, setExpandedTrip] = useState(null);
    const [expandedProduct, setExpandedProduct] = useState(null);

    useEffect(() => {
        refreshData();
    }, [selectedFromDate, selectedToDate]);

    const refreshData = async () => {
        try {
            const userId = await AsyncStorage.getItem("UserId");
            const fromDate = selectedFromDate.toISOString().split("T")[0];
            const toDate = selectedToDate.toISOString().split("T")[0];
            await fetchTripSheet(fromDate, toDate, userId);
        } catch (error) {
            console.error("Error refreshing data:", error);
        }
    };

    const fetchTripSheet = async (from, to, uId) => {
        try {
            const url = `${API.deliveryTripSheet()}${from}&Todate=${to}&User_Id=${uId}`;
            // console.log("Fetching from URL:", url);

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (data.success) {
                const filteredData = await filterTripsByUserId(data.data);
                setLogData(filteredData);
            } else {
                // console.log("Failed to fetch logs: ", data.message);
                Alert.alert("Error", data.message);
            }
        } catch (err) {
            console.error("Error fetching trip sheet:", err);
            Alert.alert("Error", "Failed to refresh data");
        }
    };

    const filterTripsByUserId = async trips => {
        try {
            const userId = await AsyncStorage.getItem("UserId");
            const numericUserId = Number(userId);

            return trips.filter(trip =>
                trip.Trip_Details?.some(
                    detail => Number(detail.User_Id) === numericUserId,
                ),
            );
        } catch (error) {
            console.error("Error filtering trips:", error);
            return trips; // Return unfiltered data if there's an error
        }
    };

    const handleDateChange = (event, date) => {
        setSelectedFromDate(date);
        setSelectedToDate(date);
        fetchTripSheet(
            date.toISOString().split("T")[0],
            date.toISOString().split("T")[0],
        );
    };

    const toggleTripExpand = tripId => {
        setExpandedTrip(expandedTrip === tripId ? null : tripId);
        setExpandedProduct(null); // Reset product expansion when toggling trip
    };

    const toggleProductExpand = productId => {
        setExpandedProduct(expandedProduct === productId ? null : productId);
    };

    function formatTime(dateString) {
        const date = new Date(dateString);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;

        return `${formattedHours}:${String(minutes).padStart(2, "0")} ${ampm}`;
    }

    const renderTripItem = ({ item }) => {
        const isExpanded = expandedTrip === item.Trip_Id;
        const tripTime = formatTime(item.Trip_Date);
        const retailerCount = item.Trip_Details ? item.Trip_Details.length : 0;

        const tripDetailsMap = new Map();
        item.Trip_Details?.forEach(detail => {
            tripDetailsMap.set(detail.Do_Id, detail);
        });

        const tripSummary = item.Product_Array?.reduce(
            (acc, product) => {
                const tripDetail = tripDetailsMap.get(product.Do_Id);
                const orderValue =
                    product.Products_List?.reduce(
                        (sum, item) => sum + item.Final_Amo,
                        0,
                    ) || 0;

                acc.totalAmount += orderValue;
                acc.deliveredCount +=
                    tripDetail && Number(tripDetail.Delivery_Status) === 7
                        ? 1
                        : 0;
                acc.paidCount +=
                    tripDetail && Number(tripDetail.Payment_Status) === 3
                        ? 1
                        : 0;
                acc.totalOrders += 1;
                return acc;
            },
            { totalAmount: 0, deliveredCount: 0, paidCount: 0, totalOrders: 0 },
        );

        return (
            <View style={styles.tripCard}>
                <TouchableOpacity
                    style={styles.tripHeader}
                    onPress={() => toggleTripExpand(item.Trip_Id)}>
                    <View style={styles.tripHeaderContent}>
                        <View style={styles.tripBasicInfo}>
                            <Text style={styles.tripId}>
                                Trip #{item.Trip_No}
                            </Text>
                            <View style={styles.timeContainer}>
                                <MaterialCommunityIcons
                                    name="clock-outline"
                                    size={16}
                                    color={customColors.grey700}
                                />
                                <Text style={styles.tripDate}>{tripTime}</Text>
                            </View>
                        </View>

                        <View style={styles.tripMetricsContainer}>
                            <View style={styles.metricItem}>
                                <MaterialCommunityIcons
                                    name="currency-inr"
                                    size={20}
                                    color={customColors.primary}
                                />
                                <Text style={styles.metricValue}>
                                    {tripSummary.totalAmount.toFixed(2)}
                                </Text>
                            </View>

                            <View style={styles.metricItem}>
                                <MaterialCommunityIcons
                                    name="truck-delivery"
                                    size={20}
                                    color={
                                        tripSummary.deliveredCount ===
                                        tripSummary.totalOrders
                                            ? customColors.success
                                            : customColors.warning
                                    }
                                />
                                <Text
                                    style={[
                                        styles.metricValue,
                                        {
                                            color:
                                                tripSummary.deliveredCount ===
                                                tripSummary.totalOrders
                                                    ? customColors.success
                                                    : customColors.warning,
                                        },
                                    ]}>
                                    {tripSummary.deliveredCount}/
                                    {tripSummary.totalOrders}
                                </Text>
                            </View>

                            <View style={styles.metricItem}>
                                <MaterialCommunityIcons
                                    name="cash-multiple"
                                    size={20}
                                    color={
                                        tripSummary.paidCount ===
                                        tripSummary.totalOrders
                                            ? customColors.success
                                            : customColors.warning
                                    }
                                />
                                <Text
                                    style={[
                                        styles.metricValue,
                                        {
                                            color:
                                                tripSummary.paidCount ===
                                                tripSummary.totalOrders
                                                    ? customColors.success
                                                    : customColors.warning,
                                        },
                                    ]}>
                                    {tripSummary.paidCount}/
                                    {tripSummary.totalOrders}
                                </Text>
                            </View>

                            <View style={styles.metricItem}>
                                <MaterialCommunityIcons
                                    name="store"
                                    size={20}
                                    color={customColors.primary}
                                />
                                <Text style={styles.metricValue}>
                                    {retailerCount}
                                </Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.tripDetails}>
                        {item.Product_Array?.map(product => {
                            const tripDetail = tripDetailsMap.get(
                                product.Do_Id,
                            );
                            const orderValue =
                                product.Products_List?.reduce(
                                    (sum, item) => sum + item.Final_Amo,
                                    0,
                                ) || 0;

                            return (
                                <View
                                    key={product.Do_Id}
                                    style={styles.productCard}>
                                    <TouchableOpacity
                                        style={[
                                            styles.productHeader,
                                            {
                                                backgroundColor:
                                                    tripDetail &&
                                                    Number(
                                                        tripDetail.Payment_Status,
                                                    ) === 3 &&
                                                    Number(
                                                        tripDetail.Delivery_Status,
                                                    ) === 7
                                                        ? customColors.success50
                                                        : tripDetail &&
                                                            (Number(
                                                                tripDetail.Payment_Status,
                                                            ) === 3 ||
                                                                Number(
                                                                    tripDetail.Delivery_Status,
                                                                ) === 7)
                                                          ? customColors.warning50
                                                          : customColors.white,
                                            },
                                        ]}
                                        onPress={() =>
                                            toggleProductExpand(product.Do_Id)
                                        }>
                                        <View
                                            style={styles.productHeaderContent}>
                                            <View style={styles.productInfo}>
                                                <Text
                                                    style={styles.retailerName}>
                                                    {product.Retailer_Name}
                                                </Text>
                                                <Text style={styles.orderId}>
                                                    Order #{product.Do_Id}
                                                </Text>
                                                <View
                                                    style={
                                                        styles.statusContainer
                                                    }>
                                                    <View
                                                        style={
                                                            styles.statusBadge
                                                        }>
                                                        <MaterialCommunityIcons
                                                            name="truck-delivery"
                                                            size={14}
                                                            color={
                                                                tripDetail &&
                                                                Number(
                                                                    tripDetail.Delivery_Status,
                                                                ) === 7
                                                                    ? customColors.success
                                                                    : customColors.warning
                                                            }
                                                        />
                                                        <Text
                                                            style={[
                                                                styles.statusText,
                                                                {
                                                                    color:
                                                                        tripDetail &&
                                                                        Number(
                                                                            tripDetail.Delivery_Status,
                                                                        ) === 7
                                                                            ? customColors.success
                                                                            : customColors.warning,
                                                                },
                                                            ]}>
                                                            {tripDetail &&
                                                            Number(
                                                                tripDetail.Delivery_Status,
                                                            ) === 7
                                                                ? "Delivered"
                                                                : "Pending"}
                                                        </Text>
                                                    </View>
                                                    <View
                                                        style={
                                                            styles.statusBadge
                                                        }>
                                                        <MaterialCommunityIcons
                                                            name="cash-multiple"
                                                            size={14}
                                                            color={
                                                                tripDetail &&
                                                                Number(
                                                                    tripDetail.Payment_Status,
                                                                ) === 3
                                                                    ? customColors.success
                                                                    : customColors.warning
                                                            }
                                                        />
                                                        <Text
                                                            style={[
                                                                styles.statusText,
                                                                {
                                                                    color:
                                                                        tripDetail &&
                                                                        Number(
                                                                            tripDetail.Payment_Status,
                                                                        ) === 3
                                                                            ? customColors.success
                                                                            : customColors.warning,
                                                                },
                                                            ]}>
                                                            {tripDetail &&
                                                            Number(
                                                                tripDetail.Payment_Status,
                                                            ) === 3
                                                                ? "Paid"
                                                                : "Pending"}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <Text style={styles.orderAmount}>
                                                ₹{orderValue.toFixed(2)}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {expandedProduct === product.Do_Id && (
                                        <View style={styles.productDetails}>
                                            <View
                                                style={
                                                    styles.productListHeader
                                                }>
                                                <Text
                                                    style={
                                                        styles.productListTitle
                                                    }>
                                                    Products
                                                </Text>
                                            </View>
                                            {product.Products_List?.map(
                                                (item, index) => (
                                                    <View
                                                        key={index}
                                                        style={
                                                            styles.productListItem
                                                        }>
                                                        <View
                                                            style={
                                                                styles.productItemInfo
                                                            }>
                                                            <Text
                                                                style={
                                                                    styles.productName
                                                                }
                                                                numberOfLines={
                                                                    2
                                                                }>
                                                                {
                                                                    item.Product_Name
                                                                }
                                                            </Text>
                                                            <Text
                                                                style={
                                                                    styles.productUnit
                                                                }>
                                                                {item.Unit_Name}
                                                            </Text>
                                                        </View>
                                                        <View
                                                            style={
                                                                styles.productItemDetails
                                                            }>
                                                            <Text
                                                                style={
                                                                    styles.productQuantity
                                                                }>
                                                                {item.Bill_Qty}
                                                            </Text>
                                                            <Text
                                                                style={
                                                                    styles.productAmount
                                                                }>
                                                                ₹
                                                                {item.Final_Amo.toFixed(
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
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <AppHeader title="TripSheet Summary" navigation={navigation} />

            <View style={styles.contentContainer}>
                <View style={styles.datePickerContainer}>
                    <DatePickerButton
                        title="Select the Date"
                        date={selectedFromDate}
                        onDateChange={handleDateChange}
                    />
                </View>

                <View style={styles.tripContent}>
                    {logData.length > 0 ? (
                        <FlatList
                            data={logData}
                            renderItem={renderTripItem}
                            keyExtractor={item => item.Trip_Id.toString()}
                            contentContainerStyle={styles.flatListContent}
                            onRefresh={refreshData}
                            refreshing={false}
                        />
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                No trips found for selected date
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

export default TripSheet;

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
    datePickerContainer: {
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
    },
    tripContent: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    flatListContent: {
        padding: spacing.sm,
    },
    tripCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        marginBottom: spacing.sm,
        ...shadows.medium,
    },
    tripHeader: {
        padding: spacing.md,
    },
    tripHeaderContent: {
        gap: spacing.sm,
    },
    tripBasicInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    tripId: {
        ...typography.h6(),
        color: customColors.grey900,
    },
    timeContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    tripDate: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    tripMetricsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    metricItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    metricValue: {
        ...typography.subtitle2(),
        color: customColors.grey900,
    },
    tripDetails: {
        padding: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    productCard: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        marginBottom: spacing.sm,
        ...shadows.small,
    },
    productHeader: {
        padding: spacing.md,
        borderRadius: 8,
    },
    productHeaderContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    productInfo: {
        flex: 1,
        gap: spacing.xs,
    },
    retailerName: {
        ...typography.subtitle1(),
        color: customColors.grey900,
    },
    orderId: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    statusContainer: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: customColors.grey50,
        borderRadius: 4,
    },
    statusText: {
        ...typography.caption(),
    },
    orderAmount: {
        ...typography.h6(),
        color: customColors.primary,
    },
    productDetails: {
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    productListHeader: {
        marginBottom: spacing.sm,
    },
    productListTitle: {
        ...typography.subtitle2(),
        color: customColors.grey900,
    },
    productListItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    productItemInfo: {
        flex: 1,
        gap: spacing.xs,
    },
    productName: {
        ...typography.body2(),
        color: customColors.grey900,
    },
    productUnit: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    productItemDetails: {
        alignItems: "flex-end",
        gap: spacing.xs,
    },
    productQuantity: {
        ...typography.body2(),
        color: customColors.grey900,
    },
    productAmount: {
        ...typography.subtitle2(),
        color: customColors.primary,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.xl,
    },
    emptyText: {
        ...typography.body1(),
        color: customColors.grey700,
        textAlign: "center",
    },
});
