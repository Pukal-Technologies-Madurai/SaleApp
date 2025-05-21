import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    AppState,
    RefreshControl,
    ScrollView
} from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import DatePickerButton from "../Components/DatePickerButton";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AntDesignIcons from "react-native-vector-icons/AntDesign";
import { API } from "../Config/Endpoint";
import { customColors, typography, spacing, shadows } from "../Config/helper";

const Dashboard = () => {
    const navigation = useNavigation();
    const [isPollingActive, setIsPollingActive] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [companyId, setCompanyId] = useState();
    const [uIdT, setUIdT] = useState(null);
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0],
    );

    const [attendanceData, setAttendanceData] = useState([]);
    const [attendanceCount, setAttendanceCount] = useState({});
    const [visitData, setVisitData] = useState([]);
    const [userCount, setUserCount] = useState({});
    const [saleData, setSaleData] = useState([]);
    const [saleCount, setSaleCount] = useState({});
    const [totalProductsSold, setTotalProductsSold] = useState(0);
    const [totalOrderAmount, setTotalOrderAmount] = useState(0);
    const [deliveryData, setDeliveryData] = useState([]);
    const [tripSheetData, setTripSheetData] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [kilometersCount, setKilometersCount] = useState({});
    const [refreshing, setRefreshing] = useState(false);

    const POLLING_INTERVAL = 90000; // 90 seconds

    useEffect(() => {
        const loadUserDetails = async () => {
            try {
                const storeUserTypeId =
                    await AsyncStorage.getItem("userTypeId");
                const Company_Id = await AsyncStorage.getItem("Company_Id");

                setCompanyId(Company_Id);

                setUIdT(storeUserTypeId);

                await fetchAllData();
            } catch (err) {
                console.log(err);
            }
        };

        loadUserDetails();
    }, []);

    const fetchAllData = async () => {
        if (!companyId || !uIdT) return;

        const today = new Date().toISOString().split("T")[0];
        try {
            await Promise.all([
                fetchVisitersLog(today),
                fetchSaleOrder(today, today, companyId),
                fetchAttendanceInfo(today, today, uIdT),
                fetchDeliveryData(today),
                fetchTripSheet(today, today),
                fetchCollectionReceipts(today, today),
            ]);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const fetchVisitersLog = async (fromDate, id = "") => {
        setIsLoading(true);
        // Clear the visit data before fetching new data
        setVisitData([]);
        setUserCount({}); // Also clear the user count

        try {
            const url = `${API.visitedLog()}?reqDate=${fromDate}&UserId=${id}`;
            // console.log(url)

            const response = await fetch(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const data = await response.json();
            if (data.success === true) {
                setVisitData(data.data);
            } else {
                console.log("Failed to fetch logs:", data.message);
            }
            setIsLoading(false);
        } catch (error) {
            console.log("Error fetching logs:", error);
        }
    };

    const fetchSaleOrder = async (from, to, company, userId = "") => {
        setIsLoading(true);

        setSaleData([]);
        setSaleCount({});
        setTotalOrderAmount(0);
        setTotalProductsSold(0);

        try {
            let url = `${API.saleOrder()}?Fromdate=${from}&Todate=${to}&Company_Id=${company}&Created_by=${userId}&Sales_Person_Id=${userId}`;
            // console.log(url);
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();

            if (data.success === true) {
                setSaleData(data.data);
                calculateProductSummaryAndTotals(data.data);
            } else {
                console.log("Failed to fetch logs: ", data.message);
            }
            setIsLoading(false);
        } catch (error) {
            console.log("Error fetching logs: ", error);
        }
    };

    const calculateProductSummaryAndTotals = orders => {
        const summary = {};
        let totalAmount = 0;
        let productCount = 0;

        orders.forEach(order => {
            totalAmount += order.Total_Invoice_value;

            order.Products_List.forEach(product => {
                productCount += product.Total_Qty;

                if (!summary[product.Product_Name]) {
                    summary[product.Product_Name] = {
                        productName: product.Product_Name,
                        totalQty: 0,
                        totalAmount: 0,
                        timesSold: 0,
                    };
                }

                summary[product.Product_Name].totalQty += product.Total_Qty;
                summary[product.Product_Name].totalAmount += product.Amount;
                summary[product.Product_Name].timesSold += 1;
            });
        });

        setTotalOrderAmount(totalAmount);
        setTotalProductsSold(productCount);
    };

    const fetchAttendanceInfo = async (from, to, userTypeID) => {
        setIsLoading(true);
        try {
            const url = `${API.attendanceHistory()}From=${from}&To=${to}&UserTypeID=${userTypeID}`;
            // console.log(url);

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();
            if (data?.success) {
                setAttendanceData(data.data || []);
            } else {
                // Reset attendance data if fetch fails
                setAttendanceData([]);
            }
            setIsLoading(false);
        } catch (err) {
            console.log(err);
        }
    };

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

    const fetchTripSheet = async (from, to) => {
        setIsLoading(true);
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
                setTripSheetData(data.data || []);
            } else {
                setTripSheetData([]);
            }
            setIsLoading(false);
        } catch (err) {
            console.error("Error fetching trip sheet:", err);
        }
    };

    const fetchCollectionReceipts = async (from, to) => {
        try {
            const url = `${API.paymentCollection()}?Fromdate=${from}&Todate=${to}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.success) {
                setReceipts(data.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        let intervalId;

        if (isPollingActive) {
            fetchAllData();
            intervalId = setInterval(fetchAllData, POLLING_INTERVAL);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isPollingActive, companyId, uIdT]);

    useEffect(() => {
        const subscription = AppState.addEventListener(
            "change",
            nextAppState => {
                if (nextAppState === "active") {
                    setIsPollingActive(true);
                    fetchAllData();
                } else if (nextAppState === "background") {
                    setIsPollingActive(false);
                }
            },
        );

        return () => {
            subscription.remove();
        };
    }, []);

    const getAttendanceCount = () => {
        if (!attendanceData || attendanceData.length === 0) {
            setAttendanceCount({});
            return;
        }

        const uniqueAttendance = attendanceData.filter(
            (item, index, self) =>
                index === self.findIndex(t => t.User_Name === item.User_Name),
        );

        const count = uniqueAttendance.reduce((entry, item) => {
            const userName = item.User_Name || "Unknown";
            entry[userName] = (entry[userName] || 0) + 1;
            return entry;
        }, {});

        setAttendanceCount(count);
    };

    const getVisitUserBasedCount = () => {
        const count = visitData.reduce((entry, item) => {
            if (entry[item.EntryByGet]) {
                entry[item.EntryByGet]++;
            } else {
                entry[item.EntryByGet] = 1;
            }
            return entry;
        }, {});
        setUserCount(count);
    };

    const getSaleUserCount = () => {
        const result = saleData.reduce((entry, item) => {
            if (entry[item.Sales_Person_Name]) {
                entry[item.Sales_Person_Name].count++;
                entry[item.Sales_Person_Name].totalValue +=
                    item.Total_Invoice_value;
            } else {
                entry[item.Sales_Person_Name] = {
                    count: 1,
                    totalValue: item.Total_Invoice_value,
                };
            }

            return entry;
        }, {});
        setSaleCount(result);
    };

    useEffect(() => {
        if (visitData && visitData.length > 0) {
            getVisitUserBasedCount();
        }
        if (saleData && saleData.length > 0) {
            getSaleUserCount();
        }
        if (attendanceData && attendanceData.length > 0) {
            getAttendanceCount();
            calculateAttendanceStats();
        } else {
            // Reset attendance count if no data
            setAttendanceCount({});
        }
    }, [visitData, saleData, attendanceData]);

    const calculateAttendanceStats = () => {
        if (!attendanceData || attendanceData.length === 0) {
            setAttendanceCount({});
            setKilometersCount({});
            return;
        }

        // Calculate unique users and their attendance count
        const uniqueAttendance = attendanceData.filter(
            (item, index, self) =>
                index === self.findIndex(t => t.User_Name === item.User_Name),
        );

        const attendCount = uniqueAttendance.reduce((entry, item) => {
            const userName = item.User_Name || "Unknown";
            entry[userName] = (entry[userName] || 0) + 1;
            return entry;
        }, {});

        // Calculate kilometers for each user
        const kmCount = attendanceData.reduce((entry, item) => {
            const userName = item.User_Name || "Unknown";
            const kmTraveled =
                item.End_KM && item.Start_KM
                    ? Math.max(0, item.End_KM - item.Start_KM)
                    : 0;

            if (!entry[userName]) {
                entry[userName] = {
                    totalKm: kmTraveled,
                    details: [
                        {
                            startKm: item.Start_KM,
                            endKm: item.End_KM,
                            date: item.Start_Date,
                        },
                    ],
                };
            } else {
                entry[userName].totalKm += kmTraveled;
                entry[userName].details.push({
                    startKm: item.Start_KM,
                    endKm: item.End_KM,
                    date: item.Start_Date,
                });
            }
            return entry;
        }, {});

        setAttendanceCount(attendCount);
        setKilometersCount(kmCount);
    };

    const handleDateChange = async (event, date) => {
        if (date) {
            const formattedDate = date.toISOString().split("T")[0];
            setSelectedDate(formattedDate);
            setIsPollingActive(false);
            await Promise.all([
                fetchVisitersLog(formattedDate),
                fetchSaleOrder(formattedDate, formattedDate, companyId),
                fetchAttendanceInfo(formattedDate, formattedDate, uIdT),
                fetchCollectionReceipts(formattedDate, formattedDate),
                fetchDeliveryData(formattedDate),
                fetchTripSheet(formattedDate, formattedDate),
            ]);
        }
    };

    const returnToToday = async () => {
        const today = new Date().toISOString().split("T")[0];
        setSelectedDate(today);
        setIsPollingActive(true);
        await fetchAllData();
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchAllData();
        } catch (error) {
            console.error("Error refreshing data:", error);
        } finally {
            setRefreshing(false);
        }
    }, [companyId, uIdT]);

    const statsData = useMemo(
        () => [
            {
                icon: (
                    <MaterialCommunityIcons
                        name="human-greeting-variant"
                        size={40}
                        color="#2ECC71"
                        style={styles.materialIcon}
                    />
                ),
                label: "Attendance",
                value: Object.keys(attendanceCount).length,
                onPress: () =>
                    navigation.navigate("Statistics", {
                        title: "Attendance",
                        userCount: attendanceCount,
                        kilometersCount: kilometersCount,
                    }),
            },
            {
                icon: (
                    <MaterialCommunityIcons
                        name="map-marker-account-outline"
                        size={40}
                        color="#9B59B6"
                    />
                ),
                label: "Check-ins",
                value: visitData.length,
                onPress: () =>
                    navigation.navigate("Statistics", {
                        title: "Check-In's",
                        userCount: userCount,
                        visitData: visitData,
                    }),
            },
            {
                icon: (
                    <MaterialCommunityIcons
                        name="chart-areaspline"
                        size={40}
                        color="#4A90E2"
                    />
                ),
                label: "Total Sales",
                value: saleData.length,
                onPress: () =>
                    navigation.navigate("Statistics", {
                        title: "Sales",
                        userCount: saleCount,
                    }),
            },
            {
                icon: (
                    <MaterialIcons
                        name="currency-rupee"
                        size={40}
                        color="#E74C3C"
                    />
                ),
                label: "Total Order Amount",
                value: `₹ ${totalOrderAmount.toFixed(2)}`,
                onPress: () => navigation.navigate("SalesAdmin"),
            },
            {
                icon: (
                    <MaterialCommunityIcons
                        name="currency-rupee"
                        size={40}
                        color="#2ECC71"
                    />
                ),
                label: "Collection amount",
                value: `₹ ${receipts.map(total => total.total_amount).reduce((acc, curr) => acc + curr, 0)}`,
                onPress: () => navigation.navigate("BillAdminView"),
            },
            {
                icon: (
                    <MaterialIcons
                        name="delivery-dining"
                        size={40}
                        color="#E74C3C"
                    />
                ),
                label: "Delivery",
                value: `${
                    deliveryData.filter(
                        item =>
                            item.DeliveryStatusName === "Delivered" ||
                            item.DeliveryStatusName === "Pending",
                    ).length
                }/${deliveryData.length || 0}`,
                onPress: () => navigation.navigate("DeliveryReport"),
            },
            {
                icon: (
                    <MaterialIcons
                        name="directions-bike"
                        size={40}
                        color="#F39C12"
                    />
                ),
                label: "Trip Count",
                value: tripSheetData.length,
                onPress: () => navigation.navigate("TripReport"),
            },
            {
                icon: (
                    <AntDesignIcons name="dropbox" size={40} color="#E74C3C" />
                ),
                label: "Outlet Stock",
                onPress: () => navigation.navigate("RetailerStock"),
            },
        ],
        [
            attendanceCount,
            visitData,
            saleData,
            totalProductsSold,
            totalOrderAmount,
            deliveryData,
            tripSheetData,
            receipts,
        ],
    );

    if (isLoading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView 
                style={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[customColors.primary]}
                        tintColor={customColors.primary}
                        title="Pull to refresh..."
                        titleColor={customColors.grey700}
                    />
                }
            >
                <DatePickerButton
                    date={new Date(selectedDate)}
                    onDateChange={handleDateChange}
                    mode="date"
                    title="Select Date"
                    containerStyle={styles.datePickerContainer}
                />
                {selectedDate !== new Date().toISOString().split("T")[0] && (
                    <TouchableOpacity
                        style={styles.todayButton}
                        onPress={returnToToday}>
                        <Text style={styles.todayButtonText}>
                            Return to Today
                        </Text>
                    </TouchableOpacity>
                )}

                <View style={styles.statsContainer}>
                    <View style={styles.gridContainer}>
                        {statsData.map((stat, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.statItem}
                                onPress={stat.onPress}>
                                <View style={styles.statIconContainer}>
                                    {stat.icon}
                                </View>
                                <Text style={styles.statLabel}>
                                    {stat.label}
                                </Text>
                                <Text style={styles.statValue}>
                                    {stat.value}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

export default Dashboard;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    datePickerContainer: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        ...shadows.small,
    },
    todayButton: {
        backgroundColor: customColors.primary,
        marginTop: spacing.sm,
        padding: spacing.sm,
        borderRadius: 8,
        alignSelf: "center",
    },
    todayButtonText: {
        ...typography.button(),
        color: customColors.white,
    },
    statsContainer: {
        marginTop: spacing.md,
    },
    gridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    statItem: {
        width: "48%",
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.small,
    },
    statIconContainer: {
        marginBottom: spacing.sm,
        alignItems: "center",
    },
    statLabel: {
        ...typography.caption(),
        color: customColors.textSecondary,
        textAlign: "center",
        marginBottom: spacing.xs,
    },
    statValue: {
        ...typography.h6(),
        color: customColors.textPrimary,
        textAlign: "center",
        fontWeight: "bold",
    },
    materialIcon: {
        marginBottom: spacing.sm,
    },
});
