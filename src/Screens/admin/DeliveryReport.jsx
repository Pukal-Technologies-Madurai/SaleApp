import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import DatePickerButton from "../../Components/DatePickerButton";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { SafeAreaView } from "react-native-safe-area-context";

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

    const totalDelivery = deliveryData.filter(
        item => item.Delivery_Status === 7,
    ).length;

    const pendingDelivery = deliveryData.filter(
        item => item.Delivery_Status === 1,
    ).length;

    return (
        <View style={styles.tableContainer}>
            {/* Statistics Cards */}
            <View style={styles.statsContainer}>
                <View style={styles.statsCard}>
                    <Text style={styles.statsNumber}>
                        {deliveryData.length}
                    </Text>
                    <Text style={styles.statsLabel}>Total Orders</Text>
                </View>
                <View style={styles.statsCard}>
                    <Text style={styles.statsNumber}>{totalDelivery}</Text>
                    <Text style={styles.statsLabel}>Delivered</Text>
                </View>
                <View style={styles.statsCard}>
                    <Text style={styles.statsNumber}>{pendingDelivery}</Text>
                    <Text style={styles.statsLabel}>Pending</Text>
                </View>
            </View>

            <FilterButtons />

            {/* Table Header */}
            <View style={styles.headerRow}>
                <Text style={[styles.headerCell, { flex: 1 }]}>SaleDt</Text>
                <Text style={[styles.headerCell, { flex: 3 }]}>Retailer</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>
                    Delivery By
                </Text>
                <Text style={[styles.headerCell, { flex: 1.5 }]}>Status</Text>
            </View>

            {/* Table Body */}
            <ScrollView style={styles.tableBody}>
                {filteredData.map((item, index) => (
                    <View key={item.Do_Id} style={styles.row}>
                        <Text style={[styles.cell, { flex: 1 }]}>
                            {formatDate(item.SalesDate)}
                        </Text>
                        <Text
                            style={[styles.cell, { flex: 3 }]}
                            numberOfLines={4}>
                            {item.Retailer_Name}
                        </Text>
                        <Text style={[styles.cell, { flex: 2, fontSize: 12 }]}>
                            {item.Delivery_Person_Name}
                        </Text>
                        <View style={[styles.statusContainer, { flex: 2 }]}>
                            <View
                                style={[
                                    styles.statusBadge,
                                    item.DeliveryStatusName === "Delivered"
                                        ? styles.deliveredBadge
                                        : styles.pendingBadge,
                                ]}>
                                <Text style={styles.statusText}>
                                    {item.DeliveryStatusName === "Delivered"
                                        ? "Delivered"
                                        : "Pending"}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const DeliveryReport = () => {
    const navigation = useNavigation();
    const [deliveryData, setDeliveryData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

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
                setDeliveryData([]);
            }
            setIsLoading(false);
        } catch (err) {
            console.log(err);
        }
    };

    const handleDateChange = async date => {
        if (date) {
            const formattedDate = date.toISOString().split("T")[0];
            setSelectedDate(formattedDate);
            await fetchDeliveryData(formattedDate);
        }
    };

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Delivery Status"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialIcon"
                rightIconName="filter-list"
                onRightPress={() => setModalVisible(true)}
            />

            <FilterModal
                visible={modalVisible}
                fromDate={selectedDate}
                onFromDateChange={handleDateChange}
                onApply={() => setModalVisible(false)}
                onClose={handleCloseModal}
                showToDate={false}
                title="Filter options"
                fromLabel="From Date"
            />

            <View style={styles.contentContainer}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0000ff" />
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                ) : (
                    <DeliveryTable deliveryData={deliveryData} />
                )}
            </View>
        </SafeAreaView>
    );
};

export default DeliveryReport;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.white,
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
    tableContainer: {
        flex: 1,
        backgroundColor: customColors.white,
        // marginHorizontal: 16,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: "hidden",
        elevation: 2,
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: customColors.white,
        borderRadius: 12,
        margin: 16,
        elevation: 2,
    },
    statsCard: {
        alignItems: "center",
        flex: 1,
    },
    statsNumber: {
        ...typography.h4(),
        color: customColors.primary,
        fontWeight: "bold",
    },
    statsLabel: {
        ...typography.body2(),
        color: "#666",
        marginTop: 4,
    },
    filterContainer: {
        flexDirection: "row",
        backgroundColor: customColors.white,
        justifyContent: "space-around",
        marginBottom: 16,
        // padding: 16,
        // marginHorizontal: 16,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 25,
        backgroundColor: "#f5f5f5",
    },
    filterButtonActive: {
        backgroundColor: customColors.primary,
    },
    filterText: {
        ...typography.body2(),
        color: "#666",
        fontWeight: "500",
    },
    filterTextActive: {
        color: customColors.white,
    },
    headerRow: {
        flexDirection: "row",
        backgroundColor: "#f8f9fa",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    headerCell: {
        textAlign: "left",
        ...typography.caption(),
        fontWeight: "600",
        color: "#444",
        paddingHorizontal: 8,
    },
    tableBody: {
        backgroundColor: customColors.white,
    },
    row: {
        flexDirection: "row",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
        backgroundColor: customColors.white,
    },
    cell: {
        ...typography.tableCell(),
        color: "#444",
        textAlign: "left",
        paddingHorizontal: 8,
    },
    statusContainer: {
        alignItems: "center",
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    deliveredBadge: {
        backgroundColor: "#e6f4ea",
    },
    pendingBadge: {
        backgroundColor: "#fff3e0",
    },
    statusText: {
        ...typography.caption(),
        fontWeight: "600",
        color: "#1b5e20",
    },
});
