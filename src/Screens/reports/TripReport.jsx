import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import assetImages from "../../Config/Image";
import DatePickerButton from "../../Components/DatePickerButton";

const TripReport = () => {
    const navigation = useNavigation();
    const [logData, setLogData] = useState([]);
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());

    useEffect(() => {
        (async () => {
            const fromDate = selectedFromDate.toISOString().split("T")[0];
            const toDate = selectedToDate.toISOString().split("T")[0];
            fetchTripSheet(fromDate, toDate);
        })();
    }, []);

    const fetchTripSheet = async (from, to) => {
        try {
            const url = `${API.deliveryTripSheet()}${from}&Todate=${to}`;
            // console.log("Fetching from URL:", url);

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (data.success) {
                setLogData(data.data);
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

    const renderItem = useCallback(({ item }) => {
        return <TripSummaryCard trip={item} />;
    }, []);

    // Memoized Trip Summary Component
    const TripSummaryCard = useCallback(
        ({ trip }) => {
            // Create a map of Trip_Details by Do_Id for quick lookup
            const tripDetailsMap = useMemo(() => {
                const map = new Map();
                trip.Trip_Details?.forEach(detail => {
                    map.set(detail.Do_Id, detail);
                });
                return map;
            }, [trip.Trip_Details]);

            const totalInvoiceValue = useMemo(
                () =>
                    trip.Trip_Details?.reduce(
                        (sum, detail) =>
                            sum + parseFloat(detail.Total_Invoice_Value || 0),
                        0,
                    ) || 0,
                [trip.Trip_Details],
            );

            const deliveryStats = useMemo(() => {
                let delivered = 0;
                let pending = 0;
                let totalOrders = trip.Product_Array?.length || 0;

                trip.Product_Array?.forEach(product => {
                    const tripDetail = tripDetailsMap.get(product.Do_Id);
                    if (
                        tripDetail &&
                        Number(tripDetail.Delivery_Status) === 7
                    ) {
                        delivered++;
                    } else {
                        pending++;
                    }
                });

                return { delivered, pending, totalOrders };
            }, [trip.Product_Array, tripDetailsMap]);

            const paymentStats = useMemo(() => {
                let paid = 0;
                let credit = 0;
                let pending = 0;

                trip.Product_Array?.forEach(product => {
                    const tripDetail = tripDetailsMap.get(product.Do_Id);
                    if (tripDetail) {
                        if (Number(tripDetail.Payment_Status) === 3) {
                            paid++;
                        } else if (Number(tripDetail.Payment_Status) === 1) {
                            credit++;
                        } else {
                            pending++;
                        }
                    }
                });

                return { paid, credit, pending };
            }, [trip.Product_Array, tripDetailsMap]);

            // Get delivery person info from the first Trip_Detail
            const deliveryPerson = useMemo(() => {
                const firstDetail = trip.Trip_Details?.[0];
                return {
                    name: firstDetail?.Name || "N/A",
                    id: firstDetail?.User_Id || "N/A",
                };
            }, [trip.Trip_Details]);

            const handleCardPress = () => {
                // Map retailers with their corresponding trip details
                const retailers = trip.Product_Array?.map(product => {
                    const tripDetail = tripDetailsMap.get(product.Do_Id);
                    return {
                        name: product.Retailer_Name,
                        id: product.So_No,
                        location: tripDetail?.Delivery_Location || "",
                        orderValue: product.Products_List?.reduce(
                            (acc, current) => acc + current.Final_Amo,
                            0,
                        ),
                        deliveryTime: tripDetail?.Delivery_Time || 0,
                        deliveryStatus: tripDetail?.Delivery_Status || 0,
                        paymentStatus: tripDetail?.Payment_Status || 0,
                        products: product.Products_List,
                    };
                });

                navigation.navigate("TripDetails", {
                    tripNo: trip.Trip_No || trip.Challan_No,
                    tripDate: trip.Trip_Date,
                    retailers,
                    deliveryPerson,
                });
            };

            return (
                <TouchableOpacity onPress={() => handleCardPress()}>
                    <View style={styles.tripCard}>
                        <View style={styles.tripHeader}>
                            <Text style={styles.tripTitle}>
                                Trip #{trip.Trip_No || trip.Challan_No}
                            </Text>
                            <Text style={styles.tripDate}>
                                {new Date(trip.Trip_Date).toLocaleDateString()}
                            </Text>
                        </View>

                        {/* Add Delivery Person Info */}
                        <View style={styles.deliveryPersonContainer}>
                            <Icon
                                name="person"
                                size={16}
                                color={customColors.primary}
                            />
                            <Text style={styles.deliveryPersonText}>
                                {deliveryPerson.name} (ID: {deliveryPerson.id})
                            </Text>
                        </View>

                        <View style={styles.statsContainer}>
                            {/* Delivery Stats */}
                            <View style={styles.statBox}>
                                <Text style={styles.statTitle}>
                                    Delivery Status
                                </Text>
                                <View style={styles.statDetails}>
                                    <Text style={styles.statValue}>
                                        ✓ {deliveryStats.delivered}/
                                        {deliveryStats.totalOrders}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.statLabel,
                                            { color: customColors.approved },
                                        ]}>
                                        Delivered
                                    </Text>
                                </View>
                                {deliveryStats.pending > 0 && (
                                    <View style={styles.statDetails}>
                                        <Text style={styles.statValue}>
                                            ⏳ {deliveryStats.pending}/
                                            {deliveryStats.totalOrders}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.statLabel,
                                                { color: customColors.pending },
                                            ]}>
                                            Pending
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Payment Stats */}
                            <View style={styles.statBox}>
                                <Text style={styles.statTitle}>
                                    Payment Status
                                </Text>
                                {paymentStats.paid > 0 && (
                                    <View style={styles.statDetails}>
                                        <Text style={styles.statValue}>
                                            ✓ {paymentStats.paid}/
                                            {deliveryStats.totalOrders}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.statLabel,
                                                {
                                                    color: customColors.approved,
                                                },
                                            ]}>
                                            Paid
                                        </Text>
                                    </View>
                                )}
                                {paymentStats.credit > 0 && (
                                    <View style={styles.statDetails}>
                                        <Text style={styles.statValue}>
                                            📝 {paymentStats.credit}/
                                            {deliveryStats.totalOrders}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.statLabel,
                                                { color: customColors.pending },
                                            ]}>
                                            Credit
                                        </Text>
                                    </View>
                                )}
                                {paymentStats.pending > 0 && (
                                    <View style={styles.statDetails}>
                                        <Text style={styles.statValue}>
                                            ⏳ {paymentStats.pending}/
                                            {deliveryStats.totalOrders}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.statLabel,
                                                { color: customColors.pending },
                                            ]}>
                                            Pending
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.totalSection}>
                            <Icon
                                name="account-balance-wallet"
                                size={20}
                                color={customColors.approved}
                            />
                            <Text style={styles.totalAmount}>
                                Total Value: ₹{totalInvoiceValue.toFixed(2)}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        },
        [navigation],
    );

    const keyExtractor = useCallback(
        item => `trip-${item.Trip_Id}-${item.Trip_Date}`,
        [],
    );

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
                        <Text style={styles.headerText}>Trip Report</Text>
                    </View>

                    <View style={styles.datePickerContainer}>
                        <DatePickerButton
                            title="Select Date Range"
                            date={selectedFromDate}
                            onDateChange={handleDateChange}
                        />
                    </View>

                    <View style={styles.content}>
                        <FlatList
                            data={logData}
                            renderItem={renderItem}
                            keyExtractor={keyExtractor}
                            contentContainerStyle={styles.listContainer}
                            removeClippedSubviews={true}
                            maxToRenderPerBatch={10}
                            windowSize={5}
                        />
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
};

export default TripReport;

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
    content: {
        flex: 1,
        backgroundColor: customColors.white,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        overflow: "hidden",
    },
    listContainer: {
        padding: 15,
    },
    tripCard: {
        backgroundColor: customColors.white,
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tripHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    tripTitle: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "bold",
    },
    tripDate: {
        ...typography.body2(),
        color: customColors.grey,
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
    },
    statBox: {
        flex: 1,
        marginHorizontal: 5,
    },
    statTitle: {
        ...typography.caption(),
        color: customColors.grey,
        marginBottom: 5,
    },
    statDetails: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 2,
    },
    statValue: {
        ...typography.body2(),
        color: customColors.grey,
        fontWeight: "600",
        marginRight: 5,
    },
    statLabel: {
        ...typography.caption(),
    },
    totalSection: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        borderTopWidth: 1,
        borderTopColor: "#eee",
        paddingTop: 10,
    },
    totalAmount: {
        ...typography.h6(),
        color: customColors.approved,
        marginLeft: 5,
    },
    deliveryPersonContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    deliveryPersonText: {
        ...typography.body2(),
        color: customColors.primary,
        marginLeft: 8,
    },
});
