import {
    FlatList,
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import assetImages from "../../Config/Image";
import DatePickerButton from "../../Components/DatePickerButton";

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

        // Create a map of Trip_Details by Do_Id for quick lookup
        const tripDetailsMap = new Map();
        item.Trip_Details?.forEach(detail => {
            tripDetailsMap.set(detail.Do_Id, detail);
        });

        // Calculate summary statistics
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
            <View
                style={styles.tripCard}
                key={`${item.Trip_Id}-${item.updateTimestamp || ""}`}>
                <TouchableOpacity
                    style={styles.tripHeader}
                    onPress={() => toggleTripExpand(item.Trip_Id)}>
                    <View style={styles.tripHeaderLeft}>
                        <View style={styles.tripBasicInfo}>
                            <Text style={styles.tripId}>
                                Trip #{item.Trip_No}
                            </Text>
                            <View style={styles.timeContainer}>
                                <Icon
                                    name="access-time"
                                    size={14}
                                    color={customColors.grey}
                                />
                                <Text style={styles.tripDate}>{tripTime}</Text>
                            </View>
                        </View>

                        <View style={styles.tripMetricsContainer}>
                            <View style={styles.amountContainer}>
                                <Icon
                                    name="account-balance-wallet"
                                    size={16}
                                    color={customColors.success}
                                />
                                <Text style={styles.tripSummaryAmount}>
                                    ₹{tripSummary.totalAmount.toFixed(2)}
                                </Text>
                            </View>

                            <View style={styles.statusMetrics}>
                                <View style={styles.metricItem}>
                                    <Icon
                                        name="local-shipping"
                                        size={16}
                                        color={
                                            tripSummary.deliveredCount ===
                                            tripSummary.totalOrders
                                                ? customColors.success
                                                : customColors.warning
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.tripStatValue,
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
                                    <Icon
                                        name="payments"
                                        size={16}
                                        color={
                                            tripSummary.paidCount ===
                                            tripSummary.totalOrders
                                                ? customColors.success
                                                : customColors.warning
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.tripStatValue,
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
                                    <Icon
                                        name="shopping-cart-checkout"
                                        size={16}
                                        color={customColors.success}
                                    />
                                    <Text style={styles.tripSummaryAmount}>
                                        {retailerCount} Shops
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.tripDetails}>
                        {item.Product_Array &&
                            item.Product_Array.map(product => {
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
                                        key={`${product.Do_Id}-${product.updateTimestamp || ""}`}
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
                                                            ? "#e8f5e9"
                                                            : tripDetail &&
                                                                (Number(
                                                                    tripDetail.Payment_Status,
                                                                ) === 3 ||
                                                                    Number(
                                                                        tripDetail.Delivery_Status,
                                                                    ) === 7)
                                                              ? "#fff3e0"
                                                              : "#ffffff",
                                                },
                                            ]}
                                            onPress={() =>
                                                toggleProductExpand(
                                                    product.Do_Id,
                                                )
                                            }>
                                            <View
                                                style={
                                                    styles.productHeaderLeft
                                                }>
                                                <Text
                                                    style={styles.productTitle}>
                                                    {product.Retailer_Name}
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.invoiceNumber
                                                    }>
                                                    Order: #{product.Do_Id}
                                                </Text>
                                                <View
                                                    style={
                                                        styles.statusContainer
                                                    }>
                                                    <Text
                                                        style={[
                                                            styles.statusText,
                                                            {
                                                                color:
                                                                    tripDetail &&
                                                                    Number(
                                                                        tripDetail.Delivery_Status,
                                                                    ) === 7
                                                                        ? "green"
                                                                        : "orange",
                                                            },
                                                        ]}>
                                                        {tripDetail &&
                                                        Number(
                                                            tripDetail.Delivery_Status,
                                                        ) === 7
                                                            ? "✓ Delivered"
                                                            : "⏳ Pending Delivery"}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.statusText,
                                                            {
                                                                color:
                                                                    tripDetail &&
                                                                    Number(
                                                                        tripDetail.Payment_Status,
                                                                    ) === 3
                                                                        ? "green"
                                                                        : "orange",
                                                            },
                                                        ]}>
                                                        {tripDetail &&
                                                        Number(
                                                            tripDetail.Payment_Status,
                                                        ) === 3
                                                            ? "✓ Paid"
                                                            : "⏳ Payment Pending"}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View
                                                style={
                                                    styles.productHeaderRight
                                                }>
                                                <Text
                                                    style={styles.totalAmount}>
                                                    ₹{orderValue}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>

                                        {expandedProduct === product.Do_Id && (
                                            <View style={styles.productDetails}>
                                                <View
                                                    style={
                                                        styles.productListContainer
                                                    }>
                                                    {product.Products_List &&
                                                        product.Products_List.map(
                                                            (item, index) => (
                                                                <View
                                                                    key={index}
                                                                    style={
                                                                        styles.productListItem
                                                                    }>
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
                                                                                item.Product_Name
                                                                            }
                                                                        </Text>
                                                                    </View>
                                                                    <View
                                                                        style={
                                                                            styles.quantityInfo
                                                                        }>
                                                                        <Text
                                                                            style={
                                                                                styles.quantityText
                                                                            }>
                                                                            {
                                                                                item.Bill_Qty
                                                                            }{" "}
                                                                            {
                                                                                item.Unit_Name
                                                                            }
                                                                        </Text>
                                                                        <Text
                                                                            style={
                                                                                styles.amountText
                                                                            }>
                                                                            ₹
                                                                            {
                                                                                item.Final_Amo
                                                                            }
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                            ),
                                                        )}
                                                </View>
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
                        <Text style={styles.headerText}>TripSheet Summary</Text>
                    </View>

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
            </ImageBackground>
        </View>
    );
};

export default TripSheet;

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
        flexDirection: "row",
        marginHorizontal: 20,
        justifyContent: "space-between",
        gap: 10,
    },
    tripContent: {
        flex: 1,
        backgroundColor: customColors.white,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        overflow: "hidden",
    },
    flatListContent: {
        padding: 15,
    },
    tripCard: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        marginBottom: 16,
        overflow: "hidden",
        elevation: 2,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    tripHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    tripHeaderLeft: {
        flex: 1,
        gap: 8,
    },
    tripHeaderRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    tripBasicInfo: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    timeContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    tripMetricsContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    amountContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(0,0,0,0.03)",
    },
    statusMetrics: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    metricItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(0,0,0,0.03)",
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    tripId: {
        ...typography.h6(),
        fontWeight: "bold",
        color: customColors.primary,
    },
    tripDate: {
        ...typography.body2(),
        color: customColors.grey,
    },
    tripSummaryAmount: {
        ...typography.body1(),
        color: customColors.success,
        fontWeight: "600",
    },
    tripStatValue: {
        ...typography.body1(),
        fontWeight: "600",
    },
    tripDetails: {
        padding: 16,
        backgroundColor: "#f9f9f9",
    },
    productCard: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        marginVertical: 8,
        elevation: 2,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    productHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        borderRadius: 8,
    },
    productHeaderLeft: {
        flex: 1,
    },
    productHeaderRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    productTitle: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "600",
    },
    invoiceNumber: {
        ...typography.body2(),
        color: customColors.grey,
        marginTop: 4,
    },
    totalAmount: {
        ...typography.h6(),
        color: customColors.success,
        fontWeight: "700",
    },
    productDetails: {
        padding: 12,
        backgroundColor: "#f9f9f9",
    },
    productListContainer: {
        gap: 8,
    },
    productListItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    productInfo: {
        flex: 1,
        marginRight: 8,
    },
    productName: {
        ...typography.body2(),
        color: customColors.black,
        fontWeight: "500",
    },
    brandText: {
        ...typography.caption(),
        color: customColors.grey,
        marginTop: 2,
    },
    quantityInfo: {
        alignItems: "flex-end",
    },
    quantityText: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "500",
    },
    amountText: {
        ...typography.body2(),
        color: customColors.success,
        fontWeight: "600",
        marginTop: 2,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyText: {
        ...typography.h6(),
        color: customColors.grey,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        width: "95%",
        backgroundColor: customColors.white,
        borderRadius: 15,
        padding: 20,
        maxHeight: "80%",
    },
    statusContainer: {
        flexDirection: "row",
        gap: 10,
        marginTop: 4,
    },
    statusText: {
        ...typography.caption(),
        fontWeight: "600",
    },
});
