import {
    ActivityIndicator,
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import DatePickerButton from "../../Components/DatePickerButton";
import assetImages from "../../Config/Image";

const DeliveryTable = ({ deliveryData }) => {
    const [selectedFilter, setSelectedFilter] = useState("all");

    // Filter data based on selected status
    const filteredData = deliveryData.filter(item => {
        if (selectedFilter === "all") return true;
        if (selectedFilter === "delivered") {
            return item.DeliveryStatusName === "Delivered";
        }
        if (selectedFilter === "pending") {
            return item.DeliveryStatusName === "New"; // Show items with pending payment
        }
        return true;
    });

    const formatDate = dateString => {
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
    };

    // Filter buttons component
    const FilterButtons = () => (
        <View style={styles.filterContainer}>
            <TouchableOpacity
                style={[
                    styles.filterButton,
                    selectedFilter === "all" && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedFilter("all")}>
                <Text
                    style={[
                        styles.filterText,
                        selectedFilter === "all" && styles.filterTextActive,
                    ]}>
                    All
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[
                    styles.filterButton,
                    selectedFilter === "delivered" && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedFilter("delivered")}>
                <Text
                    style={[
                        styles.filterText,
                        selectedFilter === "delivered" &&
                            styles.filterTextActive,
                    ]}>
                    Delivered
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[
                    styles.filterButton,
                    selectedFilter === "pending" && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedFilter("pending")}>
                <Text
                    style={[
                        styles.filterText,
                        selectedFilter === "pending" && styles.filterTextActive,
                    ]}>
                    Pending
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.tableContainer}>
            <FilterButtons />

            {/* Table Header */}
            <View style={styles.headerRow}>
                <Text style={[styles.headerCell, { flex: 2 }]}>Sales Date</Text>
                <Text style={[styles.headerCell, { flex: 3 }]}>Retailer</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>
                    Delivery Person
                </Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>Status</Text>
            </View>

            {/* Table Body */}
            <ScrollView>
                {filteredData.map((item, index) => (
                    <View
                        key={item.Do_Id}
                        style={[
                            styles.row,
                            index % 2 === 0 ? styles.evenRow : styles.oddRow,
                        ]}>
                        <Text style={[styles.cell, { flex: 2 }]}>
                            {formatDate(item.SalesDate)}
                        </Text>
                        <Text
                            style={[styles.cell, { flex: 3 }]}
                            numberOfLines={2}>
                            {item.Retailer_Name}
                        </Text>
                        <Text style={[styles.cell, { flex: 2 }]}>
                            {item.Delivery_Person_Name}
                        </Text>
                        <Text
                            style={[
                                styles.cell,
                                { flex: 2 },
                                styles.statusCell,
                                item.DeliveryStatusName === "Delivered" &&
                                    styles.deliveredStatus,
                            ]}>
                            {item.DeliveryStatusName} {"\n"} (
                            {item.Payment_Mode === 0
                                ? "Pending"
                                : item.Payment_Mode === 1
                                  ? "Cash"
                                  : "G-Pay"}
                            )
                        </Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const DeliveryReport = () => {
    const [deliveryData, setDeliveryData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0],
    );

    useEffect(() => {
        (async () => {
            try {
                const today = new Date().toISOString().split("T")[0];
                fetchDeliveryData(today);
            } catch (err) {
                console.log(err);
            }
        })();
    }, []);

    const fetchDeliveryData = async today => {
        setIsLoading(true);
        try {
            const url = `${API.todayDelivery()}Fromdate=${today}&Todate=${today}`;
            // console.log(url);

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();
            if (data?.success) {
                setDeliveryData(data.data || []);
            } else {
                // Reset delivery data if fetch fails
                setDeliveryData([]);
            }
            setIsLoading(false);
        } catch (err) {
            console.log(err);
        }
    };

    const handleDateChange = async (event, date) => {
        if (date) {
            const formattedDate = date.toISOString().split("T")[0];
            setSelectedDate(formattedDate);
            await fetchDeliveryData(formattedDate);
        }
    };

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headersContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <MaterialIcon
                                name="arrow-back"
                                size={25}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        <Text
                            style={styles.headersText}
                            maxFontSizeMultiplier={1.2}>
                            Delivery info
                        </Text>
                    </View>
                    <View style={styles.datePickerContainer}>
                        <DatePickerButton
                            date={new Date(selectedDate)}
                            onDateChange={(event, date) => {
                                handleDateChange(event, date);
                            }}
                            mode="date"
                            title="Select Date"
                        />
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#0000ff" />
                            <Text style={styles.loadingText}>Loading...</Text>
                        </View>
                    ) : (
                        <DeliveryTable deliveryData={deliveryData} />
                    )}
                </View>
            </ImageBackground>
        </View>
    );
};

export default DeliveryReport;

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
    headersContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
    },
    headersText: {
        ...typography.h4(),
        color: customColors.white,
        marginHorizontal: 10,
    },
    datePickerContainer: {
        ...typography.h6(),
        marginHorizontal: 25,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        minHeight: 200,
    },
    loadingText: {
        marginTop: 10,
        ...typography.h6(),
        color: "#666",
    },
    filterContainer: {
        flexDirection: "row",
        padding: 10,
        backgroundColor: "#f5f5f5",
        justifyContent: "space-around",
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: customColors.white,
        borderWidth: 1,
        borderColor: "#ddd",
    },
    filterButtonActive: {
        backgroundColor: "#007AFF",
        borderColor: "#007AFF",
    },
    filterText: {
        color: "#666",
        ...typography.body1(),
        fontWeight: "500",
    },
    filterTextActive: {
        color: "#fff",
    },
    tableContainer: {
        flex: 1,
        backgroundColor: customColors.primary,
        marginHorizontal: 15,
        borderRadius: 15,
    },
    headerRow: {
        flexDirection: "row",
        backgroundColor: customColors.secondary,
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: customColors.lightGrey,
    },
    headerCell: {
        textAlign: "center",
        ...typography.body1(),
        fontWeight: "600",
        color: "#333",
    },
    row: {
        flexDirection: "row",
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    evenRow: {
        backgroundColor: customColors.white,
    },
    oddRow: {
        backgroundColor: "#f9f9f9",
    },
    cell: {
        ...typography.body2(),
        textAlign: "center",
        fontSize: 13,
        color: "#444",
    },
    statusCell: {
        ...typography.body2(),
        fontWeight: "600",
    },
    deliveredStatus: {
        ...typography.body2(),
        fontWeight: "600",
        color: "#4CAF50",
    },
});
