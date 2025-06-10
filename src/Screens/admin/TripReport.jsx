import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
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
import DatePickerButton from "../../Components/DatePickerButton";
import AppHeader from "../../Components/AppHeader";

const TripReport = () => {
    const navigation = useNavigation();
    const [logData, setLogData] = useState([]);
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());

    useEffect(() => {
        const fromDate = selectedFromDate.toISOString().split("T")[0];
        const toDate = selectedToDate.toISOString().split("T")[0];
        fetchTripSheet(fromDate, toDate);
    }, []);

    const fetchTripSheet = async (from, to) => {
        try {
            const url = `${API.deliveryTripSheet()}${from}&Todate=${to}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setLogData(data.data);
            } else {
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

    const TripSummaryCard = useCallback(
        ({ trip }) => {
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

            const deliveryPerson = useMemo(() => {
                const firstDetail = trip.Trip_Details?.[0];
                return {
                    name: firstDetail?.Name || "N/A",
                    id: firstDetail?.User_Id || "N/A",
                };
            }, [trip.Trip_Details]);

            const handleCardPress = () => {
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
                <TouchableOpacity onPress={handleCardPress}>
                    <View style={styles.tripCard}>
                        <View style={styles.tripHeader}>
                            <Text style={styles.tripTitle}>
                                Trip #{trip.Trip_No || trip.Challan_No}
                            </Text>
                            <Text style={styles.tripDate}>
                                {new Date(trip.Trip_Date).toLocaleDateString()}
                            </Text>
                        </View>

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
                            <View style={styles.statBox}>
                                <Text style={styles.statTitle}>
                                    Delivery Status
                                </Text>
                                <View style={styles.statDetails}>
                                    <Text
                                        style={[
                                            styles.statValue,
                                            { color: customColors.success },
                                        ]}>
                                        ✓ {deliveryStats.delivered}/
                                        {deliveryStats.totalOrders}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.statLabel,
                                            { color: customColors.success },
                                        ]}>
                                        Delivered
                                    </Text>
                                </View>
                                {deliveryStats.pending > 0 && (
                                    <View style={styles.statDetails}>
                                        <Text
                                            style={[
                                                styles.statValue,
                                                { color: customColors.warning },
                                            ]}>
                                            ⏳ {deliveryStats.pending}/
                                            {deliveryStats.totalOrders}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.statLabel,
                                                { color: customColors.warning },
                                            ]}>
                                            Pending
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.statBox}>
                                <Text style={styles.statTitle}>
                                    Payment Status
                                </Text>
                                {paymentStats.paid > 0 && (
                                    <View style={styles.statDetails}>
                                        <Text
                                            style={[
                                                styles.statValue,
                                                { color: customColors.success },
                                            ]}>
                                            ✓ {paymentStats.paid}/
                                            {deliveryStats.totalOrders}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.statLabel,
                                                { color: customColors.success },
                                            ]}>
                                            Paid
                                        </Text>
                                    </View>
                                )}
                                {paymentStats.credit > 0 && (
                                    <View style={styles.statDetails}>
                                        <Text
                                            style={[
                                                styles.statValue,
                                                { color: customColors.warning },
                                            ]}>
                                            📝 {paymentStats.credit}/
                                            {deliveryStats.totalOrders}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.statLabel,
                                                { color: customColors.warning },
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
                                color={customColors.success}
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
            <AppHeader title="TripSheet Summary" navigation={navigation} />
            <View style={styles.contentContainer}>
                <View style={styles.datePickerContainer}>
                    <DatePickerButton
                        title="Select Date Range"
                        date={selectedFromDate}
                        onDateChange={handleDateChange}
                        containerStyle={styles.datePicker}
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    datePickerContainer: {
        padding: 16,
    },
    datePicker: {
        width: "100%",
    },
    content: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    listContainer: {
        padding: 16,
    },
    tripCard: {
        backgroundColor: customColors.grey200,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        ...customColors.shadow,
    },
    tripHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    tripTitle: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "600",
    },
    tripDate: {
        ...typography.body2(),
        color: customColors.grey,
    },
    deliveryPersonContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    deliveryPersonText: {
        ...typography.body2(),
        color: customColors.primary,
        marginLeft: 8,
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    statBox: {
        flex: 1,
        marginHorizontal: 4,
    },
    statTitle: {
        ...typography.caption(),
        color: customColors.grey,
        marginBottom: 4,
    },
    statDetails: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 2,
    },
    statValue: {
        ...typography.body2(),
        color: customColors.grey,
        fontWeight: "700",
        marginRight: 4,
    },
    statLabel: {
        ...typography.caption(),
    },
    totalSection: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
        paddingTop: 12,
    },
    totalAmount: {
        ...typography.h6(),
        color: customColors.success,
        marginLeft: 4,
    },
});

export default TripReport;
