import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Image,
    ScrollView,
    ImageBackground,
    ActivityIndicator,
    AppState,
    RefreshControl,
} from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import AntDesignIcons from "react-native-vector-icons/AntDesign";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import Icon from "react-native-vector-icons/FontAwesome6";
import { customColors, typography } from "../Config/helper";
import { API } from "../Config/Endpoint";
import AttendanceInfo from "./attendance/AttendanceInfo";
import assetImages from "../Config/Image";
import DatePickerButton from "../Components/DatePickerButton";
import CountModal from "../Components/CountModal";
import SalesModal from "../Components/SalesModal";

const HomeScreen = () => {
    const navigation = useNavigation();
    const [isPollingActive, setIsPollingActive] = useState(true);
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [companyId, setCompanyId] = useState();
    const [uIdT, setUIdT] = useState(null);

    const [saleData, setSaleData] = useState([]);
    const [visitData, setVisitData] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
    const [deliveryData, setDeliveryData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0],
    );

    const [userCount, setUserCount] = useState({});
    const [saleCount, setSaleCount] = useState({});
    const [attendanceCount, setAttendanceCount] = useState({});
    const [kilometersCount, setKilometersCount] = useState({});

    const [isAttendanceModalVisible, setIsAttendanceModalVisible] =
        useState(false);
    const [isVisitDataModalVisible, setIsVisitDataModalVisible] =
        useState(false);
    const [isSalesModalVisible, setIsSalesModalVisible] = useState(false);
    const [isProductVisible, setProductVisible] = useState(false);
    const [deliveryVisible, setDeliveryVisible] = useState(false);

    const [productSummary, setProductSummary] = useState([]);
    const [totalOrderAmount, setTotalOrderAmount] = useState(0);
    const [totalProductsSold, setTotalProductsSold] = useState(0);

    const POLLING_INTERVAL = 90000;
    const [activeModal, setActiveModal] = useState(null);

    const isAnyModalOpen = activeModal !== null;

    const fetchAllData = async () => {
        if (!isAdmin || !companyId || !uIdT) return;

        const today = new Date().toISOString().split("T")[0];
        try {
            await Promise.all([
                fetchVisitersLog(today),
                fetchSaleOrder(today, today, companyId),
                fetchAttendanceInfo(today, today, uIdT),
                fetchDeliveryData(today),
            ]);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    useEffect(() => {
        (async () => {
            try {
                const storeUserTypeId =
                    await AsyncStorage.getItem("userTypeId");
                const userName = await AsyncStorage.getItem("Name");
                const UserId = await AsyncStorage.getItem("UserId");
                const Company_Id = await AsyncStorage.getItem("Company_Id");

                setCompanyId(Company_Id);
                setName(userName);
                setUIdT(storeUserTypeId);

                const isAdminUser =
                    storeUserTypeId === "0" ||
                    storeUserTypeId === "1" ||
                    storeUserTypeId === "2";
                setIsAdmin(isAdminUser);

                if (isAdminUser) {
                    await fetchAllData();
                    //   const today = new Date().toISOString().split('T')[0];

                    //   await Promise.all([
                    //     fetchVisitersLog(today),
                    //     fetchSaleOrder(today, today, Company_Id),
                    //     fetchAttendanceInfo(today, today, storeUserTypeId),
                    //   ]);
                }
            } catch (err) {
                console.log(err);
            }
        })();
    }, []);

    useEffect(() => {
        let intervalId;

        if (isAdmin && isPollingActive) {
            // Initial fetch
            fetchAllData();

            // Set up interval for subsequent fetches
            intervalId = setInterval(fetchAllData, POLLING_INTERVAL);
        }

        // Cleanup function
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isAdmin, isPollingActive, companyId, uIdT]);

    const openModal = modalName => {
        setActiveModal(modalName);
        setIsPollingActive(false); // Pause polling when modal opens
    };

    const closeModal = () => {
        setActiveModal(null);
        setIsPollingActive(true); // Resume polling when modal closes
        // Fetch latest data immediately when modal closes
        fetchAllData();
    };

    // Handle app state changes
    useEffect(() => {
        const subscription = AppState.addEventListener(
            "change",
            nextAppState => {
                // Enable polling when app comes to foreground
                if (nextAppState === "active") {
                    setIsPollingActive(true);
                    fetchAllData(); // Immediate fetch when returning to app
                }
                // Disable polling when app goes to background
                else if (nextAppState === "background") {
                    setIsPollingActive(false);
                }
            },
        );

        return () => {
            subscription.remove();
        };
    }, []);

    // Add function to manually refresh data
    const handleManualRefresh = async () => {
        const today = new Date().toISOString().split("T")[0];
        if (selectedDate === today) {
            setIsLoading(true);
            await fetchAllData();
            setIsLoading(false);
        }
    };

    // Modified polling useEffect
    useEffect(() => {
        let intervalId;

        if (isAdmin && isPollingActive && !isAnyModalOpen) {
            intervalId = setInterval(fetchAllData, POLLING_INTERVAL);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isAdmin, isPollingActive, isAnyModalOpen]);

    const fetchSaleOrder = async (from, to, company, userId = "") => {
        setIsLoading(true);

        setSaleData([]);
        setSaleCount({});
        setProductSummary([]);
        setTotalOrderAmount(0);
        setTotalProductsSold(0);

        try {
            let url = `${API.saleOrder()}?Fromdate=${from}&Todate=${to}&Company_Id=${company}&Created_by=${userId}&Sales_Person_Id=${userId}`;
            // console.log(url)
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

        setProductSummary(Object.values(summary));
        setTotalOrderAmount(totalAmount);
        setTotalProductsSold(productCount);
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

            if (isAdmin) {
                setIsPollingActive(false);
                await Promise.all([
                    fetchVisitersLog(formattedDate),
                    fetchSaleOrder(formattedDate, formattedDate, companyId),
                    fetchAttendanceInfo(formattedDate, formattedDate, uIdT),
                    fetchDeliveryData(formattedDate),
                ]);
            }
        }
    };

    const returnToToday = async () => {
        const today = new Date().toISOString().split("T")[0];
        setSelectedDate(today);
        setIsPollingActive(true); // Resume polling when returning to today
        await fetchAllData();
    };

    const buttons = [
        {
            title: "Retailers",
            icon: assetImages.retailer,
            navigate: "Customers",
        },
        {
            title: "Visit Log",
            icon: assetImages.visitLog,
            navigate: "RetailerLog",
        },
        {
            title: "Sale List",
            icon: assetImages.salesOrder,
            navigate: "OrderPreview",
        },
        {
            title: "Stock List",
            icon: assetImages.inventoryStore,
            navigate: "StockInfo",
        },
        {
            title: "Delivery",
            icon: assetImages.attendance,
            navigate: "DeliveryCheck",
        },
    ];

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
                onPress: () => setIsAttendanceModalVisible(true),
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
                onPress: () => setIsVisitDataModalVisible(true),
            },
            {
                icon: (
                    <Ionicons name="cube-outline" size={40} color="#F39C12" />
                ),
                label: "Products Sold",
                value: totalProductsSold,
                onPress: () => setProductVisible(true),
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
                onPress: () => setIsSalesModalVisible(true),
            },
            {
                icon: (
                    <MaterialIcons
                        name="currency-rupee"
                        size={40}
                        color="#2ECC71"
                    />
                ),
                label: "Total Order Amount",
                value: `₹ ${totalOrderAmount.toFixed(2)}`,
                onPress: () => navigation.navigate("OrderPreview"),
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
        ],
        [
            attendanceCount,
            visitData,
            saleData,
            totalProductsSold,
            totalOrderAmount,
            deliveryData,
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
            <StatusBar backgroundColor={customColors.background} />
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headerContainer}>
                        <TouchableOpacity
                            onPress={() => navigation.openDrawer()}>
                            <Icon
                                name="bars"
                                color={customColors.white}
                                size={23}
                            />
                        </TouchableOpacity>
                        <Text
                            style={styles.headerText}
                            maxFontSizeMultiplier={1.2}>
                            Welcome,
                            <Text
                                style={{
                                    color: customColors.secondary,
                                    fontWeight: "bold",
                                }}>
                                {" "}
                                {name}!
                            </Text>
                        </Text>
                        <TouchableOpacity
                            onPress={() =>
                                navigation.navigate("RetailerHistory")
                            }>
                            <AntDesignIcons
                                name="bells"
                                color={customColors.white}
                                size={23}
                            />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        refreshControl={
                            selectedDate ===
                            new Date().toISOString().split("T")[0] ? (
                                <RefreshControl
                                    refreshing={isLoading}
                                    onRefresh={handleManualRefresh}
                                />
                            ) : null
                        }>
                        {isAdmin ? (
                            <View style={styles.isAdminContainer}>
                                <DatePickerButton
                                    date={new Date(selectedDate)}
                                    onDateChange={(event, date) => {
                                        handleDateChange(event, date);
                                    }}
                                    mode="date"
                                    title="Select Date"
                                    containerStyle={styles.datePickerContainer}
                                />
                                {selectedDate !==
                                    new Date().toISOString().split("T")[0] && (
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
                                                <View
                                                    style={
                                                        styles.statIconContainer
                                                    }>
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
                            </View>
                        ) : (
                            <AttendanceInfo />
                        )}

                        {!isAdmin && (
                            <View style={styles.buttonContainer}>
                                {buttons.map((button, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.button}
                                        onPress={() =>
                                            navigation.navigate(button.navigate)
                                        }>
                                        <View style={styles.iconContainer}>
                                            <Image
                                                source={button.icon}
                                                style={styles.icon}
                                            />
                                        </View>
                                        <Text
                                            style={styles.buttonText}
                                            maxFontSizeMultiplier={1.2}>
                                            {button.title}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <CountModal
                            title="Attendance"
                            userCount={attendanceCount}
                            isVisible={isAttendanceModalVisible}
                            kilometersCount={kilometersCount}
                            onClose={() => setIsAttendanceModalVisible(false)}
                        />

                        <CountModal
                            title="Check-In's"
                            userCount={userCount}
                            isVisible={isVisitDataModalVisible}
                            onClose={() => setIsVisitDataModalVisible(false)}
                            visitData={visitData}
                        />

                        <CountModal
                            userCount={productSummary.reduce(
                                (result, product) => {
                                    result[product.productName] =
                                        product.totalQty;
                                    return result;
                                },
                                {},
                            )}
                            title="Product"
                            isVisible={isProductVisible}
                            onClose={() => setProductVisible(false)}
                        />

                        <CountModal
                            title="Delivery Status"
                            userCount={deliveryData.reduce((acc, item) => {
                                const name = item.Delivery_Person_Name;
                                if (!acc[name]) {
                                    acc[name] = 0; // Initialize with just a number
                                }
                                acc[name]++; // Increment the count
                                return acc;
                            }, {})}
                            isVisible={deliveryVisible}
                            onClose={() => setDeliveryVisible(false)}
                            deliveryData={deliveryData}
                        />

                        <SalesModal
                            saleData={saleData}
                            saleCount={saleCount}
                            isSalesModalVisible={isSalesModalVisible}
                            setIsSalesModalVisible={setIsSalesModalVisible}
                        />
                    </ScrollView>
                </View>
            </ImageBackground>
        </View>
    );
};

export default HomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
        alignItems: "center",
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
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
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    isAdminContainer: {
        backgroundColor: "#F7F9FC",
        borderRadius: 16,
        margin: 16,
    },
    datePickerContainer: {
        backgroundColor: customColors.background,
        borderRadius: 15,
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    statsContainer: {
        padding: 14,
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
        padding: 16,
        marginBottom: 12,
        alignItems: "center",
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statIconContainer: {
        marginBottom: 12,
        alignItems: "center",
    },
    statLabel: {
        ...typography.h6(),
        color: "#7F8C8D",
        marginBottom: 6,
        textAlign: "center",
    },
    statValue: {
        ...typography.h5(),
        fontWeight: "bold",
        color: "#2C3E50",
        textAlign: "center",
    },
    buttonContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        backgroundColor: customColors.white,
        borderRadius: 15,
        padding: 15,
        marginHorizontal: 20,
        marginVertical: 10,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    button: {
        width: "48%",
        aspectRatio: 1,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 15,
        borderRadius: 12,
        backgroundColor: "#ccc",
    },
    buttonText: {
        textAlign: "center",
        ...typography.h6,
        fontWeight: "bold",
        color: customColors.black,
    },
    icon: {
        width: 40,
        height: 40,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: customColors.white,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    todayButton: {
        backgroundColor: customColors.primary,
        marginLeft: "auto",
        marginRight: "auto",
        padding: 8,
        borderRadius: 10,
    },
    todayButtonText: {
        ...typography.h6,
        color: "white",
        fontWeight: "500",
    },
});
