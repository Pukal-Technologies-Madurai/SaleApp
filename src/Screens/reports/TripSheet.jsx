import {
    ActivityIndicator,
    FlatList,
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { API } from "../../Config/Endpoint";
import assetImages from "../../Config/Image";
import { customColors, typography } from "../../Config/helper";
import DatePickerButton from "../../Components/DatePickerButton";

const TripCard = ({ trip }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={styles.tripCard}>
            <View style={styles.tripHeaderRow}>
                <View style={styles.tripIdContainer}>
                    <Text style={styles.tripIdLabel}>Trip ID</Text>
                    <Text style={styles.tripIdValue}>{trip.Trip_Id}</Text>
                </View>

                <View style={styles.dateContainer}>
                    <MaterialIcon name="event" size={16} color="#666" />
                    <Text style={styles.tripDateText}>
                        {new Date(trip.Trip_Date).toLocaleDateString()}
                    </Text>
                </View>

                <View style={styles.dateContainer}>
                    <MaterialIcon
                        name="person-add-alt"
                        size={16}
                        color="#666"
                    />
                    <Text style={styles.tripDateText}>
                        {trip.Products_List.length}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setExpanded(!expanded)}>
                    <MaterialIcon
                        name={
                            expanded
                                ? "keyboard-arrow-up"
                                : "keyboard-arrow-down"
                        }
                        size={24}
                        color="#4a90e2"
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.vehicleRow}>
                <MaterialIcon name="local-shipping" size={18} color="#666" />
                <Text style={styles.vehicleText}>
                    {trip.Vehicle_No ? trip.Vehicle_No : "No vehicle assigned"}
                </Text>
            </View>

            {expanded && (
                <View style={styles.expandedContent}>
                    <Text style={styles.retailersTitle}>Retailers:</Text>
                    {trip.Products_List &&
                        trip.Products_List.map((product, index) => (
                            <View key={index} style={styles.retailerItem}>
                                <MaterialIcon
                                    name="store"
                                    size={16}
                                    color="#666"
                                />
                                <View style={styles.retailerInfo}>
                                    <Text style={styles.retailerName}>
                                        {product.Retailers_Name}
                                    </Text>
                                    <Text style={styles.retailerAddress}>
                                        {product.Retailers_Address}
                                    </Text>
                                    <Text style={styles.productName}>
                                        {product.Product_Name}
                                    </Text>
                                    <View style={styles.quantityRow}>
                                        <Text style={styles.quantityText}>
                                            Qty: {product.QTY}{" "}
                                            {product.Unit_Name}
                                        </Text>
                                        <Text style={styles.valueText}>
                                            ₹{product.Total_Value}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                </View>
            )}
        </View>
    );
};

const TripSheet = () => {
    const navigation = useNavigation();
    const [logData, setLogData] = useState([]);

    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const fromDate = selectedFromDate.toISOString().split("T")[0];
                const toDate = selectedToDate.toISOString().split("T")[0];
                fetchTripSheet(fromDate, toDate);
            } catch (err) {
                console.error(err);
            }
        })();
    }, []);

    const fetchTripSheet = async (from, to) => {
        try {
            const url = `${API.deliveryTripSheet()}${from}&Todate=${to}`;
            // console.log(url);

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
            }
        } catch (err) {
            console.error(err);
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

    const handleSearch = () => {
        fetchTripSheet(selectedFromDate, selectedToDate);
    };

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headerContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <MaterialIcon
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

                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={handleSearch}>
                            <MaterialIcon
                                name="search"
                                size={20}
                                color="#fff"
                            />
                            <Text style={styles.searchButtonText}>Search</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tripContent}>
                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator
                                    size="large"
                                    color="#4a90e2"
                                />
                                <Text style={styles.loadingText}>
                                    Loading trip data...
                                </Text>
                            </View>
                        ) : logData.length > 0 ? (
                            <FlatList
                                data={logData}
                                keyExtractor={(item, index) =>
                                    `trip-${item.Trip_Id || index}`
                                }
                                renderItem={({ item }) => (
                                    <TripCard trip={item} />
                                )}
                                contentContainerStyle={styles.tripList}
                                showsVerticalScrollIndicator={false}
                            />
                        ) : (
                            <View style={styles.noDataContainer}>
                                <MaterialIcon
                                    name="info-outline"
                                    size={50}
                                    color="#ccc"
                                />
                                <Text style={styles.noDataText}>
                                    No trip data available
                                </Text>
                                <Text style={styles.noDataSubText}>
                                    Try changing the date range to see more
                                    results
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
        backgroundColor: customColors.white,
        width: "100%",
        height: "100%",
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
    },

    filterContainer: {
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    datePickerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    datePickerButtonContainer: {
        marginBottom: 10,
    },
    datePickerLabel: {
        fontSize: 14,
        fontWeight: "500",
        color: customColors.white,
        marginBottom: 6,
    },
    datePickerButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    datePickerButtonText: {
        color: customColors.white,
        fontSize: 14,
    },
    searchButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: customColors.primary,
        borderRadius: 8,
        paddingVertical: 12,
    },
    searchButtonText: {
        color: customColors.white,
        fontWeight: "600",
        fontSize: 16,
        marginLeft: 8,
    },
    tripContent: {
        flex: 1,
        backgroundColor: customColors.white,
        borderRadius: 12,
        overflow: "hidden",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        color: customColors.grey,
        marginTop: 12,
    },
    tripList: {
        padding: 12,
    },
    tripCard: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        marginBottom: 12,
        padding: 16,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    tripHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    tripIdContainer: {
        flexDirection: "column",
    },
    tripIdLabel: {
        fontSize: 12,
        color: customColors.grey,
    },
    tripIdValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: customColors.primary,
    },
    dateContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    tripDateText: {
        marginLeft: 4,
        color: customColors.dark,
        fontSize: 14,
    },
    expandButton: {
        padding: 4,
    },
    vehicleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: customColors.lightGrey,
    },
    vehicleText: {
        marginLeft: 8,
        color: customColors.dark,
        fontSize: 14,
    },
    expandedContent: {
        marginTop: 10,
    },
    retailersTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: customColors.dark,
        marginBottom: 12,
    },
    retailerItem: {
        flexDirection: "row",
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: customColors.lightGrey,
    },
    retailerInfo: {
        flex: 1,
        marginLeft: 10,
    },
    retailerName: {
        fontSize: 15,
        fontWeight: "500",
        color: customColors.dark,
    },
    retailerAddress: {
        fontSize: 13,
        color: customColors.grey,
        marginBottom: 6,
    },
    productName: {
        fontSize: 14,
        color: customColors.dark,
        marginBottom: 4,
    },
    quantityRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    quantityText: {
        fontSize: 13,
        color: customColors.dark,
    },
    valueText: {
        fontSize: 14,
        fontWeight: "600",
        color: customColors.success,
    },
    noDataContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    noDataText: {
        fontSize: 18,
        fontWeight: "500",
        color: customColors.grey,
        marginTop: 16,
    },
    noDataSubText: {
        fontSize: 14,
        color: customColors.grey,
        marginTop: 8,
        textAlign: "center",
    },
});
