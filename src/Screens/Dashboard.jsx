import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    AppState,
    RefreshControl,
    ScrollView,
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
    const [newReceiptData, setNewReceiptData] = useState([]);

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
                fetchReceiptData(today, today),
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

    // Fix the fetchReceiptData function
    const fetchReceiptData = async (from, to) => {
        try {
            const url = `${API.getReceipt()}${from}&Todate=${to}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.data) {
                // Fix: Properly calculate the total sum
                const total = data.data.reduce((sum, receipt) => {
                    return sum + (receipt.credit_amount || 0); // Fixed: added return
                }, 0);
                setNewReceiptData(total);
            } else {
                setNewReceiptData(0); // Set to 0 instead of empty array
            }
        } catch (error) {
            console.error("Error fetching receipt data:", error);
            setNewReceiptData(0);
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

    const handleDateChange = async date => {
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
                fetchReceiptData(formattedDate, formattedDate),
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
                icon: "human-greeting-variant",
                iconLibrary: "MaterialCommunityIcons",
                label: "Attendance",
                value: Object.keys(attendanceCount).length,
                color: "#10B981",
                backgroundColor: "#ECFDF5",
                onPress: () =>
                    navigation.navigate("Statistics", {
                        title: "Attendance",
                        userCount: attendanceCount,
                        kilometersCount: kilometersCount,
                    }),
            },
            {
                icon: "map-marker-account-outline",
                iconLibrary: "MaterialCommunityIcons",
                label: "Check-ins",
                value: visitData.length,
                color: "#8B5CF6",
                backgroundColor: "#F3E8FF",
                onPress: () =>
                    navigation.navigate("Statistics", {
                        title: "Check-In's",
                        userCount: userCount,
                        visitData: visitData,
                    }),
            },
            {
                icon: "chart-areaspline",
                iconLibrary: "MaterialCommunityIcons",
                label: "Total Sales",
                value: saleData.length,
                color: "#3B82F6",
                backgroundColor: "#DBEAFE",
                onPress: () =>
                    navigation.navigate("Statistics", {
                        title: "Sales",
                        userCount: saleCount,
                    }),
            },
            {
                icon: "currency-rupee",
                iconLibrary: "MaterialIcons",
                label: "Sales Amount",
                value: `₹${totalOrderAmount.toLocaleString("en-IN")}`,
                color: "#EF4444",
                backgroundColor: "#FEF2F2",
                onPress: () => navigation.navigate("SalesAdmin"),
            },
            {
                icon: "receipt-long",
                iconLibrary: "MaterialIcons",
                label: "Bills",
                value: `₹${receipts
                    .map(total => total.total_amount)
                    .reduce((acc, curr) => acc + curr, 0)
                    .toLocaleString("en-IN")}`,
                color: "#059669",
                backgroundColor: "#D1FAE5",
                onPress: () => navigation.navigate("BillAdminView"),
            },
            {
                icon: "receipt",
                iconLibrary: "MaterialIcons",
                label: "Receipts",
                value: `₹${newReceiptData.toLocaleString("en-IN")}`, // Fixed: Format as currency
                color: "#EC4899",
                backgroundColor: "#FDF2F8",
                onPress: () => navigation.navigate("ReceiptAdmin"),
            },
            {
                icon: "local-shipping",
                iconLibrary: "MaterialIcons",
                label: "Delivery",
                value: `${
                    deliveryData.filter(
                        item =>
                            item.DeliveryStatusName === "Delivered" ||
                            item.DeliveryStatusName === "Pending",
                    ).length
                }/${deliveryData.length || 0}`,
                color: "#DC2626",
                backgroundColor: "#FEE2E2",
                onPress: () => navigation.navigate("DeliveryReport"),
            },
            {
                icon: "truck-delivery",
                iconLibrary: "MaterialCommunityIcons",
                label: "Trip Count",
                value: tripSheetData.length,
                color: "#F59E0B",
                backgroundColor: "#FEF3C7",
                onPress: () => navigation.navigate("TripReport"),
            },
            {
                icon: "warehouse",
                iconLibrary: "MaterialCommunityIcons",
                label: "Outlet Stock",
                value: "",
                color: "#7C3AED",
                backgroundColor: "#EDE9FE",
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
            newReceiptData, // Added to dependency array
        ],
    );

    const renderIcon = (iconLibrary, iconName, color) => {
        const iconProps = {
            name: iconName,
            size: 24,
            color: color,
        };

        switch (iconLibrary) {
            case "MaterialIcons":
                return <MaterialIcons {...iconProps} />;
            case "MaterialCommunityIcons":
                return <MaterialCommunityIcons {...iconProps} />;
            case "AntDesign":
                return <AntDesignIcons {...iconProps} />;
            default:
                return <MaterialIcons {...iconProps} />;
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={customColors.primary} />
                <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[customColors.primary]}
                        tintColor={customColors.primary}
                        title="Pull to refresh..."
                        titleColor={customColors.grey700}
                    />
                }>
                {/* Date Picker */}
                <View style={styles.dateSection}>
                    <DatePickerButton
                        date={new Date(selectedDate)}
                        onDateChange={handleDateChange}
                        mode="date"
                        title="Select Date"
                        containerStyle={styles.datePickerContainer}
                    />

                    {selectedDate !==
                        new Date().toISOString().split("T")[0] && (
                        <TouchableOpacity
                            style={styles.todayButton}
                            onPress={returnToToday}
                            activeOpacity={0.8}>
                            <MaterialIcons
                                name="today"
                                size={20}
                                color={customColors.white}
                                style={styles.todayIcon}
                            />
                            <Text style={styles.todayButtonText}>
                                Return to Today
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Stats Grid */}
                <View style={styles.statsContainer}>
                    <Text style={styles.sectionTitle}>Analytics</Text>
                    <View style={styles.gridContainer}>
                        {statsData.map((stat, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.statCard}
                                onPress={stat.onPress}
                                activeOpacity={0.7}>
                                <View
                                    style={[
                                        styles.iconContainer,
                                        {
                                            backgroundColor:
                                                stat.backgroundColor,
                                        },
                                    ]}>
                                    {renderIcon(
                                        stat.iconLibrary,
                                        stat.icon,
                                        stat.color,
                                    )}
                                </View>
                                <View style={styles.statContent}>
                                    <Text
                                        style={styles.statValue}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit>
                                        {stat.value}
                                    </Text>
                                    <Text
                                        style={styles.statLabel}
                                        numberOfLines={2}>
                                        {stat.label}
                                    </Text>
                                </View>
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
    },
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: spacing.md,
    },
    loadingText: {
        ...typography.body1(),
        color: customColors.grey600,
    },
    dateSection: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        alignSelf: "center",
        gap: spacing.xs,
        ...shadows.small,
    },
    todayIcon: {
        marginRight: spacing.xs,
    },
    todayButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
    statsContainer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.h5(),
        color: customColors.grey900,
        fontWeight: "700",
        marginBottom: spacing.sm,
        letterSpacing: 0.3,
    },
    gridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "stretch",
        padding: spacing.sm,
    },
    statCard: {
        width: "46.5%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: customColors.white,
        borderRadius: 20,
        padding: spacing.sm,
        ...shadows.medium,
        borderWidth: 1,
        borderColor: customColors.grey100,
        minHeight: 95,
        marginBottom: spacing.md,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        margin: spacing.xs,
    },
    statContent: {
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        marginTop: spacing.sm,
    },
    statValue: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "800",
        marginBottom: spacing.xs,
        textAlign: "center",
        lineHeight: 20,
    },
    statLabel: {
        ...typography.body2(),
        fontWeight: "600",
        color: customColors.grey600,
        lineHeight: 16,
        textAlign: "center",
        paddingHorizontal: spacing.xs,
    },
});
