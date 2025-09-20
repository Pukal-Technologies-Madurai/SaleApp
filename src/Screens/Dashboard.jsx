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
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AntDesignIcons from "react-native-vector-icons/AntDesign";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import DatePickerButton from "../Components/DatePickerButton";
import { API } from "../Config/Endpoint";
import { customColors, typography, spacing, shadows } from "../Config/helper";
import { fetchRoutes } from "../Api/retailers";

const Dashboard = () => {
    const navigation = useNavigation();
    const queryClient = useQueryClient();

    // Reduced state variables - combine related states
    const [userDetails, setUserDetails] = useState({
        companyId: null,
        uIdT: null,
    });
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0],
    );
    const [isPollingActive, setIsPollingActive] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Consolidated dashboard data state
    const [dashboardData, setDashboardData] = useState({
        attendanceData: [],
        attendanceCount: {},
        routeData: [],
        visitData: [],
        userCount: {},
        saleData: [],
        saleCount: {},
        totalProductsSold: 0,
        totalOrderAmount: 0,
        deliveryData: [],
        tripSheetData: [],
        kilometersCount: {},
        newReceiptData: 0,
    });

    const POLLING_INTERVAL = 90000; // 90 seconds

    // Load user details once on mount
    useEffect(() => {
        const loadUserDetails = async () => {
            try {
                const [storeUserTypeId, Company_Id] = await Promise.all([
                    AsyncStorage.getItem("userTypeId"),
                    AsyncStorage.getItem("Company_Id"),
                ]);

                setUserDetails({
                    companyId: Company_Id,
                    uIdT: storeUserTypeId,
                });
            } catch (err) {
                console.error("Error loading user details:", err);
            }
        };

        loadUserDetails();
    }, []);

    // Optimized API functions with better error handling
    const apiService = {
        fetchVisitersLog: async (fromDate, id = "") => {
            const url = `${API.visitedLog()}?reqDate=${fromDate}&UserId=${id}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.success ? data.data : [];
        },

        fetchSaleOrder: async (from, to, company, userId = "") => {
            const url = `${API.saleOrder()}?Fromdate=${from}&Todate=${to}&Company_Id=${company}&Created_by=${userId}&Sales_Person_Id=${userId}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.success ? data.data : [];
        },

        fetchAttendanceInfo: async (from, to, userTypeID) => {
            const url = `${API.attendanceHistory()}From=${from}&To=${to}&UserTypeID=${userTypeID}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.success ? data.data : [];
        },

        fetchDeliveryData: async today => {
            const url = `${API.todayDelivery()}Fromdate=${today}&Todate=${today}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.success ? data.data : [];
        },

        fetchTripSheet: async (from, to) => {
            const url = `${API.deliveryTripSheet()}${from}&Todate=${to}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.success ? data.data : [];
        },

        fetchReceiptData: async (from, to) => {
            const url = `${API.getReceipt()}${from}&Todate=${to}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.success && data.data) {
                return data.data.reduce(
                    (sum, receipt) => sum + (receipt.credit_amount || 0),
                    0,
                );
            }
            return 0;
        },

        fetchCollectionReceipts: async (from, to) => {
            const url = `${API.paymentCollection()}?Fromdate=${from}&Todate=${to}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.success ? data.data : [];
        },

        fetchUserRoutes: async (today, userId) => {
            const url = `${API.setRoutePath()}?date=${today}&User_Id=${userId}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.success ? data.data : [];
        },
    };

    // Consolidated data fetching with React Query
    const {
        data: allDashboardData = {},
        isLoading,
        refetch,
        isRefetching,
    } = useQuery({
        queryKey: [
            "dashboardData",
            selectedDate,
            userDetails.companyId,
            userDetails.uIdT,
        ],
        queryFn: async () => {
            if (!userDetails.companyId || !userDetails.uIdT) return {};

            try {
                // Fetch all data in parallel
                const [
                    visitData,
                    saleData,
                    attendanceData,
                    deliveryData,
                    tripSheetData,
                    newReceiptData,
                    collectionReceiptData,
                ] = await Promise.allSettled([
                    apiService.fetchVisitersLog(selectedDate),
                    apiService.fetchSaleOrder(
                        selectedDate,
                        selectedDate,
                        userDetails.companyId,
                    ),
                    apiService.fetchAttendanceInfo(
                        selectedDate,
                        selectedDate,
                        userDetails.uIdT,
                    ),
                    apiService.fetchDeliveryData(selectedDate),
                    apiService.fetchTripSheet(selectedDate, selectedDate),
                    apiService.fetchReceiptData(selectedDate, selectedDate),
                    apiService.fetchCollectionReceipts(
                        selectedDate,
                        selectedDate,
                    ),
                ]);

                // Extract data from settled promises
                const extractData = result =>
                    result.status === "fulfilled" ? result.value : [];
                const extractValue = result =>
                    result.status === "fulfilled" ? result.value : 0;

                const finalVisitData = extractData(visitData);
                const finalSaleData = extractData(saleData);
                const finalAttendanceData = extractData(attendanceData);
                const finalDeliveryData = extractData(deliveryData);
                const finalTripSheetData = extractData(tripSheetData);
                const finalReceiptData = extractValue(newReceiptData);

                // Process attendance data and fetch routes
                let routeData = [];
                let attendanceCount = {};
                let kilometersCount = {};

                if (finalAttendanceData.length > 0) {
                    const uniqueAttendance = finalAttendanceData.filter(
                        (item, index, self) =>
                            index ===
                            self.findIndex(t => t.User_Name === item.User_Name),
                    );

                    // Process attendance count
                    attendanceCount = uniqueAttendance.reduce((entry, item) => {
                        const userName = item.User_Name || "Unknown";
                        const userId = item.UserId || "Unknown";
                        entry[userName] = { count: 1, userId };
                        return entry;
                    }, {});

                    // Fetch routes for all users in parallel
                    const routePromises = uniqueAttendance.map(async item => {
                        try {
                            const routes = await apiService.fetchUserRoutes(
                                selectedDate,
                                item.UserId,
                            );
                            return {
                                userId: item.UserId,
                                userName: item.User_Name,
                                routes: routes,
                            };
                        } catch (error) {
                            return {
                                userId: item.UserId,
                                userName: item.User_Name,
                                routes: [],
                            };
                        }
                    });

                    routeData = await Promise.all(routePromises);

                    // Calculate kilometers
                    kilometersCount = finalAttendanceData.reduce(
                        (entry, item) => {
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
                        },
                        {},
                    );
                }

                // Process visit data
                const userCount = finalVisitData.reduce((entry, item) => {
                    const userName = item.EntryByGet;
                    entry[userName] = (entry[userName] || 0) + 1;
                    return entry;
                }, {});

                // Process sale data
                const saleCount = finalSaleData.reduce((entry, item) => {
                    const salesPerson = item.Sales_Person_Name;
                    if (entry[salesPerson]) {
                        entry[salesPerson].count++;
                        entry[salesPerson].totalValue +=
                            item.Total_Invoice_value;
                    } else {
                        entry[salesPerson] = {
                            count: 1,
                            totalValue: item.Total_Invoice_value,
                        };
                    }
                    return entry;
                }, {});

                // Calculate totals
                const totalOrderAmount = finalSaleData.reduce(
                    (sum, order) => sum + order.Total_Invoice_value,
                    0,
                );
                const totalProductsSold = finalSaleData.reduce(
                    (count, order) => {
                        return (
                            count +
                            order.Products_List.reduce(
                                (productCount, product) => {
                                    return productCount + product.Total_Qty;
                                },
                                0,
                            )
                        );
                    },
                    0,
                );

                // Extract the collection data
                const finalCollectionReceiptData = extractData(
                    collectionReceiptData,
                );

                const totalCollectionAmount = finalCollectionReceiptData.reduce(
                    (sum, receipt) =>
                        sum + (receipt.total_amount || receipt.amount || 0),
                    0,
                );

                return {
                    visitData: finalVisitData,
                    saleData: finalSaleData,
                    attendanceData: finalAttendanceData,
                    deliveryData: finalDeliveryData,
                    tripSheetData: finalTripSheetData,
                    newReceiptData: finalReceiptData,
                    collectionReceiptData: extractData(collectionReceiptData),
                    routeData,
                    attendanceCount,
                    kilometersCount,
                    userCount,
                    saleCount,
                    totalOrderAmount,
                    totalProductsSold,
                    totalCollectionAmount,
                };
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                return {};
            }
        },
        enabled: !!(userDetails.companyId && userDetails.uIdT),
        staleTime: 30000, // 30 seconds
        cacheTime: 60000, // Changed from 200000 to 60000 (1 minute)
        refetchInterval: isPollingActive ? POLLING_INTERVAL : false,
        retry: 2, // Add retry option
        retryDelay: 1000, // Add retry delay
        onError: (error) => {
            console.error('Dashboard data fetch error:', error);
        }
    });

    // Fetch route names separately as it doesn't change often
    const { data: fetchUserIndividualRoute = [] } = useQuery({
        queryKey: ["fetchUserIndividualRoute"],
        queryFn: fetchRoutes,
        staleTime: 600000, // 10 minutes
        cacheTime: 1800000, // 30 minutes
    });

    // Optimized route names function
    const getUserRouteNames = useCallback(() => {
        if (!allDashboardData.routeData || !fetchUserIndividualRoute.length)
            return {};

        const userRouteMapping = {};
        allDashboardData.routeData.forEach(user => {
            const routeNames = user.routes.map(route => {
                const routeInfo = fetchUserIndividualRoute.find(
                    r => r.Route_Id === route.Route_Id,
                );
                return routeInfo ? routeInfo.Route_Name : "Unknown Route";
            });

            userRouteMapping[user.userName] = {
                userId: user.userId,
                routeNames,
                routeIds: user.routes.map(r => r.Route_Id),
            };
        });

        return userRouteMapping;
    }, [allDashboardData.routeData, fetchUserIndividualRoute]);

    // Handle date change
    const handleDateChange = useCallback(async date => {
        if (date) {
            const formattedDate = date.toISOString().split("T")[0];
            setSelectedDate(formattedDate);
            setIsPollingActive(false);
            // Query will automatically refetch due to key change
        }
    }, []);

    // Return to today
    const returnToToday = useCallback(() => {
        const today = new Date().toISOString().split("T")[0];
        setSelectedDate(today);
        setIsPollingActive(true);
    }, []);

    // Handle refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            // Invalidate and refetch all queries
            await Promise.all([
                queryClient.invalidateQueries('dashboardData'),
                queryClient.invalidateQueries('fetchUserIndividualRoute')
            ]);
            await refetch();
        } catch (error) {
            console.error('Refresh failed:', error);
        } finally {
            setRefreshing(false);
        }
    }, [queryClient, refetch]);

    // Handle app state changes
    useEffect(() => {
        const subscription = AppState.addEventListener(
            "change",
            nextAppState => {
                if (nextAppState === "active") {
                    setIsPollingActive(true);
                } else if (nextAppState === "background") {
                    setIsPollingActive(false);
                }
            },
        );

        return () => subscription.remove();
    }, []);

    // Memoized stats data
    const statsData = useMemo(
        () => [
            {
                icon: "human-greeting-variant",
                iconLibrary: "MaterialCommunityIcons",
                label: "Attendance",
                value: Object.keys(allDashboardData.attendanceCount || {})
                    .length,
                color: "#10B981",
                backgroundColor: "#ECFDF5",
                onPress: () => {
                    const routeNames = getUserRouteNames();
                    navigation.navigate("Statistics", {
                        title: "Attendance",
                        userCount: allDashboardData.attendanceCount,
                        kilometersCount: allDashboardData.kilometersCount,
                        routeData: routeNames,
                    });
                },
            },
            {
                icon: "map-marker-account-outline",
                iconLibrary: "MaterialCommunityIcons",
                label: "Check-ins",
                value: allDashboardData.visitData?.length || 0,
                color: "#8B5CF6",
                backgroundColor: "#F3E8FF",
                onPress: () =>
                    navigation.navigate("Statistics", {
                        title: "Check-In's",
                        userCount: allDashboardData.userCount,
                        visitData: allDashboardData.visitData,
                    }),
            },
            {
                icon: "chart-areaspline",
                iconLibrary: "MaterialCommunityIcons",
                label: "Total Sales",
                value: allDashboardData.saleData?.length || 0,
                color: "#3B82F6",
                backgroundColor: "#DBEAFE",
                onPress: () =>
                    navigation.navigate("Statistics", {
                        title: "Sales",
                        userCount: allDashboardData.saleCount,
                    }),
            },
            {
                icon: "currency-rupee",
                iconLibrary: "MaterialIcons",
                label: "Sales Amount",
                value: `₹${(allDashboardData.totalOrderAmount || 0).toLocaleString("en-IN")}`,
                color: "#EF4444",
                backgroundColor: "#FEF2F2",
                onPress: () =>
                    navigation.navigate("SalesAdmin", {
                        selectedDate: selectedDate,
                    }),
            },
            {
                icon: "receipt",
                iconLibrary: "MaterialIcons",
                label: "Receipts",
                value: `₹${(allDashboardData.newReceiptData || 0).toLocaleString("en-IN")}`,
                color: "#059669",
                backgroundColor: "#D1FAE5",
                onPress: () =>
                    navigation.navigate("ReceiptAdmin", {
                        selectedDate: selectedDate,
                    }),
            },
            // {
            //     icon: "receipt-long",
            //     iconLibrary: "MaterialIcons",
            //     label: "Bills",
            //     value: `₹${(allDashboardData.totalCollectionAmount || 0).toLocaleString("en-IN")}`,
            //     color: "#EC4899",
            //     backgroundColor: "#FDF2F8",
            //     onPress: () => navigation.navigate("BillAdminView"),
            // },
            {
                icon: "local-shipping",
                iconLibrary: "MaterialIcons",
                label: "Delivery",
                value: `${allDashboardData.deliveryData?.filter(
                    item =>
                        item.DeliveryStatusName === "Delivered" ||
                        item.DeliveryStatusName === "Pending",
                ).length || 0
                    }/${allDashboardData.deliveryData?.length || 0}`,
                color: "#DC2626",
                backgroundColor: "#FEE2E2",
                onPress: () =>
                    navigation.navigate("DeliveryReport", {
                        selectedDate: selectedDate,
                    }),
            },
            {
                icon: "truck-delivery",
                iconLibrary: "MaterialCommunityIcons",
                label: "Trip Count",
                value: allDashboardData.tripSheetData?.length || 0,
                color: "#F59E0B",
                backgroundColor: "#FEF3C7",
                onPress: () =>
                    navigation.navigate("TripReport", {
                        selectedDate: selectedDate,
                    }),
            },
            {
                icon: "warehouse",
                iconLibrary: "MaterialCommunityIcons",
                label: "Stock",
                value: "Retailer's",
                color: "#7C3AED",
                backgroundColor: "#EDE9FE",
                onPress: () => navigation.navigate("RetailerStock"),
            },
            {
                icon: "receipt",
                iconLibrary: "MaterialIcons",
                label: "Orders",
                value: "Pending",
                color: "#EC4899",
                backgroundColor: "#FDF2F8",
                onPress: () => navigation.navigate("PendingSales"),
            },
        ],
        [allDashboardData, getUserRouteNames, navigation],
    );

    // Memoized icon renderer
    const renderIcon = useCallback((iconLibrary, iconName, color) => {
        const iconProps = { name: iconName, size: 24, color };

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
    }, []);

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
                        refreshing={refreshing || isRefetching}
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
                    <View style={styles.sectionHeader} >
                        <View style={styles.titleContainer}>
                            <Text style={styles.sectionTitle}>Analytics</Text>
                            <Text style={styles.sectionSubtitle}>
                                {selectedDate === new Date().toISOString().split("T")[0]
                                    ? "Today's Overview"
                                    : `Overview for ${new Date(selectedDate).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}`
                                }
                            </Text>
                        </View>
                        <View style={styles.headerButtonContainer}>
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={onRefresh}
                                activeOpacity={0.7}
                            >
                                <AntDesignIcons
                                    name="reload1"
                                    size={18}
                                    color={customColors.primary}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={() => navigation.navigate("SwitchCompany")}
                                activeOpacity={0.7}
                            >
                                <AntDesignIcons
                                    name="swap"
                                    size={18}
                                    color={customColors.primary}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

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

// Keep existing styles...
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
        paddingVertical: "50%",
    },
    loadingText: {
        textAlign: "center",
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
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.xs,
    },
    titleContainer: {
        flex: 1,
        marginRight: spacing.md,
    },
    sectionTitle: {
        ...typography.h5(),
        color: customColors.grey900,
        fontWeight: "700",
        marginBottom: spacing.xs,
        letterSpacing: 0.3,
    },
    sectionSubtitle: {
        ...typography.body2(),
        color: customColors.grey600,
        fontWeight: "500",
        lineHeight: 16,
    },
    headerButtonContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.xs,
        ...shadows.small,
        borderWidth: 1,
        borderColor: customColors.grey100,
    },
    headerButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: customColors.grey50,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: customColors.grey200,
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
