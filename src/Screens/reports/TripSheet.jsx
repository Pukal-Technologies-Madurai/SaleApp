import {
    FlatList,
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    Alert,
    TextInput,
    Dimensions,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import assetImages from "../../Config/Image";
import DatePickerButton from "../../Components/DatePickerButton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LocationIndicator from "../../Components/LocationIndicator";
import EnhancedDropdown from "../../Components/EnhancedDropdown";

const TripSheet = () => {
    const navigation = useNavigation();
    const [logData, setLogData] = useState([]);

    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    const [expandedTrip, setExpandedTrip] = useState(null);
    const [expandedProduct, setExpandedProduct] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
    });

    const deliveryStatus = { 5: "Pending", 7: "Delivered" };
    const paymentMode = { 1: "Cash", 2: "G-Pay", 3: "Credit" };
    const paymentStatus = { 0: "Pending", 3: "Completed" };

    useEffect(() => {
        refreshData();
    }, [selectedFromDate, selectedToDate]);

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
                // Filter the data before setting it to state
                const filteredData = await filterTripsByUserId(data.data);
                setLogData(filteredData);
            } else {
                console.log("Failed to fetch logs: ", data.message);
                Alert.alert("Error", "Failed to fetch updated data");
            }
        } catch (err) {
            console.error("Error fetching trip sheet:", err);
            Alert.alert("Error", "Failed to refresh data");
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

    const formatDate = dateString => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    function formatTime(dateString) {
        const date = new Date(dateString);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;

        return `${formattedHours}:${String(minutes).padStart(2, "0")} ${ampm}`;
    }

    const handleUpdate = async (item, dropdownValue) => {
        try {
            if (!item || !item.Do_Id) {
                Alert.alert("Error", "Invalid delivery item selected");
                return;
            }

            const userId = await AsyncStorage.getItem("UserId");
            const locationString =
                location.latitude && location.longitude
                    ? `${location.latitude},${location.longitude}`
                    : "Madurai";

            let paymentStatus = "0";
            let paymentRefNo = "";
            let paymentMode = "0";

            if (item.paymentMode === "2") {
                paymentStatus = "3";
                paymentRefNo = item.paymentRefNo || "GPay";
                paymentMode = "2";
            } else if (item.paymentMode === "1") {
                paymentStatus = "3";
                paymentRefNo = "CASH";
                paymentMode = "1";
            } else if (item.paymentMode === "3") {
                paymentStatus = "1";
                paymentRefNo = "CREDIT";
                paymentMode = "0";
            }

            const updatePayload = {
                Do_Id: item.Do_Id,
                Do_No: item.Do_No || "",
                Do_Date: item.Do_Date || new Date().toISOString(),
                Retailer_Id: item.Retailer_Id || "",
                Delivery_Time: new Date().toISOString(),
                Delivery_Location: locationString,
                Delivery_Latitude: location.latitude || null,
                Delivery_Longitude: location.longitude || null,
                Delivery_Person_Id: userId,
                Collected_By: userId,
                Collected_Status: "1",
                Payment_Mode: paymentMode,
                Payment_Status: paymentStatus,
                Payment_Ref_No: paymentRefNo,
                Branch_Id: item.Branch_Id,
                GST_Inclusive: item.GST_Inclusive,
                Total_Invoice_value: item.Total_Invoice_value,
                Delivery_Status: dropdownValue || "5",
                Created_by: userId,
                Alter_Id: item.Alter_Id,
            };

            const response = await fetch(API.deliveryPut(), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatePayload),
            });

            const responseData = await response.json();

            if (responseData.success) {
                Alert.alert("Success", responseData.message, [
                    {
                        text: "OK",
                        onPress: async () => {
                            const fromDate = selectedFromDate
                                .toISOString()
                                .split("T")[0];
                            const toDate = selectedToDate
                                .toISOString()
                                .split("T")[0];
                            await fetchTripSheet(fromDate, toDate, userId);

                            setSelectedItem(null);
                            setIsUpdateModalVisible(false);
                            setExpandedTrip(null);
                            setExpandedProduct(null);
                        },
                    },
                ]);
            } else {
                Alert.alert(
                    "Error",
                    responseData.message || "Failed to update delivery.",
                );
            }
        } catch (error) {
            console.error("Unexpected Error in handleUpdate:", error);
            Alert.alert("Error", "An unexpected error occurred");
        }
    };

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

    const renderTripItem = ({ item }) => {
        const isExpanded = expandedTrip === item.Trip_Id;
        const tripTime = formatTime(item.Trip_Date);
        const retailerCount = item.Trip_Details ? item.Trip_Details.length : 0;
        const deliveryPerson =
            item.Employees_Involved && item.Employees_Involved.length > 0
                ? item.Employees_Involved[0].Emp_Name
                : "Not Assigned";

        // Calculate summary statistics
        const tripSummary = item.Product_Array?.reduce(
            (acc, product) => {
                acc.totalAmount += parseFloat(product.Total_Invoice_value || 0);
                acc.deliveredCount +=
                    Number(product.Delivery_Status) === 7 ? 1 : 0;
                acc.paidCount += Number(product.Payment_Status) === 3 ? 1 : 0;
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
                                        {retailerCount} Outlets
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.tripDetails}>
                        {item.Product_Array &&
                            item.Product_Array.map(product => (
                                <View
                                    key={`${product.Do_Id}-${product.updateTimestamp || ""}`}
                                    style={styles.productCard}>
                                    <TouchableOpacity
                                        style={[
                                            styles.productHeader,
                                            {
                                                backgroundColor:
                                                    Number(
                                                        product.Payment_Status,
                                                    ) === 3 &&
                                                    Number(
                                                        product.Delivery_Status,
                                                    ) === 7
                                                        ? "#e8f5e9"
                                                        : Number(
                                                                product.Payment_Status,
                                                            ) === 3 ||
                                                            Number(
                                                                product.Delivery_Status,
                                                            ) === 7
                                                          ? "#fff3e0"
                                                          : "#ffffff",
                                            },
                                        ]}
                                        onPress={() =>
                                            toggleProductExpand(product.Do_Id)
                                        }>
                                        <View style={styles.productHeaderLeft}>
                                            <Text style={styles.productTitle}>
                                                {product.Retailer_Name}
                                            </Text>
                                            <Text style={styles.invoiceNumber}>
                                                Order: #{product.Do_Id}
                                            </Text>
                                            <View
                                                style={styles.statusContainer}>
                                                <Text
                                                    style={[
                                                        styles.statusText,
                                                        {
                                                            color:
                                                                Number(
                                                                    product.Delivery_Status,
                                                                ) === 7
                                                                    ? "green"
                                                                    : "orange",
                                                        },
                                                    ]}>
                                                    {Number(
                                                        product.Delivery_Status,
                                                    ) === 7
                                                        ? "✓ Delivered"
                                                        : "⏳ Pending Delivery"}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.statusText,
                                                        {
                                                            color:
                                                                Number(
                                                                    product.Payment_Status,
                                                                ) === 3
                                                                    ? "green"
                                                                    : "orange",
                                                        },
                                                    ]}>
                                                    {Number(
                                                        product.Payment_Status,
                                                    ) === 3
                                                        ? "✓ Paid"
                                                        : "⏳ Payment Pending"}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.productHeaderRight}>
                                            <Text style={styles.totalAmount}>
                                                ₹{product.Total_Invoice_value}
                                            </Text>
                                            <TouchableOpacity
                                                style={[
                                                    styles.updateButton,
                                                    {
                                                        backgroundColor:
                                                            Number(
                                                                product.Payment_Status,
                                                            ) === 3 &&
                                                            Number(
                                                                product.Delivery_Status,
                                                            ) === 7
                                                                ? customColors.grey
                                                                : customColors.primary,
                                                    },
                                                ]}
                                                disabled={
                                                    Number(
                                                        product.Payment_Status,
                                                    ) === 3 &&
                                                    Number(
                                                        product.Delivery_Status,
                                                    ) === 7
                                                }
                                                onPress={() => {
                                                    setSelectedItem({
                                                        ...product,
                                                        deliveryStatus: Number(
                                                            product.Delivery_Status,
                                                        ),
                                                        paymentMode: Number(
                                                            product.Payment_Mode,
                                                        ),
                                                        paymentRefNo:
                                                            product.Payment_Ref_No,
                                                    });
                                                    setIsUpdateModalVisible(
                                                        true,
                                                    );
                                                }}>
                                                <Text
                                                    style={
                                                        styles.updateButtonText
                                                    }>
                                                    {Number(
                                                        product.Payment_Status,
                                                    ) === 3 &&
                                                    Number(
                                                        product.Delivery_Status,
                                                    ) === 7
                                                        ? "Completed"
                                                        : "Update"}
                                                </Text>
                                            </TouchableOpacity>
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
                                                                    <Text
                                                                        style={
                                                                            styles.brandText
                                                                        }>
                                                                        {
                                                                            item.BrandGet
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
                                                                            item.UOM
                                                                        }
                                                                    </Text>
                                                                    <Text
                                                                        style={
                                                                            styles.amountText
                                                                        }>
                                                                        ₹
                                                                        {
                                                                            item.Amount
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
                            ))}
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
                        <Text style={styles.headerText}>TripSheet</Text>
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

                <Modal
                    visible={isUpdateModalVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setIsUpdateModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            {/* Location Indicator */}
                            <LocationIndicator
                                onLocationUpdate={locationData => {
                                    setLocation(prevLocation => ({
                                        latitude: locationData.latitude,
                                        longitude: locationData.longitude,
                                    }));
                                }}
                                autoFetch={true}
                                autoFetchOnMount={true}
                            />

                            {/* Delivery Status Dropdown */}
                            <EnhancedDropdown
                                data={Object.keys(deliveryStatus).map(key => ({
                                    label: deliveryStatus[key],
                                    value: key,
                                }))}
                                labelField="label"
                                valueField="value"
                                placeholder="Select Delivery Status"
                                value={selectedItem?.deliveryStatus}
                                onChange={item => {
                                    setSelectedItem(prev => ({
                                        ...prev,
                                        deliveryStatus: item.value,
                                    }));
                                }}
                            />

                            {/* Payment Status Dropdown */}
                            <EnhancedDropdown
                                data={Object.keys(paymentMode).map(key => ({
                                    label: paymentMode[key],
                                    value: key,
                                }))}
                                labelField="label"
                                valueField="value"
                                placeholder="Select Payment Status"
                                value={selectedItem?.paymentMode}
                                onChange={item => {
                                    setSelectedItem(prev => ({
                                        ...prev,
                                        paymentMode: item.value,
                                    }));
                                }}
                            />

                            {selectedItem?.paymentMode === "2" && (
                                <TextInput
                                    style={styles.gpayReferenceInput}
                                    placeholder="Enter G-Pay Reference Number"
                                    value={selectedItem?.paymentRefNo}
                                    onChangeText={text => {
                                        setSelectedItem(prev => ({
                                            ...prev,
                                            paymentRefNo: text,
                                        }));
                                    }}
                                    keyboardType="default"
                                />
                            )}

                            {/* Save and Cancel Buttons */}
                            <View style={styles.modalButtonContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.modalButton,
                                        {
                                            backgroundColor:
                                                customColors.primary,
                                        },
                                    ]}
                                    onPress={() => {
                                        // console.log(
                                        //     "Delivery",
                                        //     selectedItem.deliveryStatus,
                                        // );
                                        // console.log(
                                        //     "payment",
                                        //     selectedItem.paymentStatus,
                                        // );
                                        handleUpdate(
                                            selectedItem,
                                            selectedItem?.deliveryStatus,
                                        );
                                        setIsUpdateModalVisible(false);
                                    }}>
                                    <Text style={styles.buttonText}>Save</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.modalButton,
                                        { backgroundColor: customColors.grey },
                                    ]}
                                    onPress={() =>
                                        setIsUpdateModalVisible(false)
                                    }>
                                    <Text style={styles.buttonText}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
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
        gap: 12,
    },
    metricItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(0,0,0,0.03)",
        paddingHorizontal: 8,
        paddingVertical: 4,
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
        ...typography.h6(),
        color: customColors.success,
        fontWeight: "600",
    },
    tripStatValue: {
        ...typography.body2(),
        fontWeight: "600",
    },
    retailerCount: {
        ...typography.body1(),
        color: "#0066cc",
        marginRight: 8,
    },
    tripDetails: {
        padding: 16,
        backgroundColor: "#f9f9f9",
    },
    deliveryInfo: {
        flexDirection: "row",
        marginBottom: 16,
    },
    infoLabel: {
        ...typography.body2(),
        fontWeight: "bold",
        color: "#333",
        marginRight: 8,
    },
    infoValue: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "700",
    },
    sectionTitle: {
        ...typography.body1(),
        fontWeight: "bold",
        marginBottom: 12,
        color: "#333",
    },
    retailersSection: {
        marginBottom: 16,
    },
    retailerItem: {
        backgroundColor: customColors.white,
        padding: 12,
        borderRadius: 6,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#0066cc",
    },
    retailerInfo: {
        ...typography.body1(),
        color: "#333",
        marginBottom: 4,
    },
    retailerDate: {
        ...typography.body2(),
        color: "#666",
    },
    productsSection: {
        marginTop: 8,
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
    updateButton: {
        backgroundColor: customColors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    updateButtonText: {
        color: customColors.white,
        ...typography.body2(),
        fontWeight: "600",
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
        color: "#666",
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
    modalButtonContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        marginHorizontal: 5,
        padding: 15,
        borderRadius: 5,
        alignItems: "center",
    },
    button: {
        padding: 15,
        borderRadius: 5,
        backgroundColor: customColors.primary,
    },
    buttonText: {
        color: customColors.white,
        ...typography.body2(),
        fontWeight: "bold",
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
    tripSummaryContainer: {
        backgroundColor: "#f5f5f5",
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    tripSummaryHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    tripSummaryTitle: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "600",
    },
    tripStatsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: customColors.white,
        borderRadius: 6,
        padding: 10,
    },
    tripStatItem: {
        flex: 1,
        alignItems: "center",
    },
    tripStatLabel: {
        ...typography.caption(),
        color: customColors.grey,
        marginBottom: 4,
    },
    gpayReferenceInput: {
        borderWidth: 1,
        borderColor: customColors.grey,
        borderRadius: 5,
        padding: 10,
        marginTop: 10,
    },
});
