import {
    AppState,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import AntDesignIcons from "react-native-vector-icons/AntDesign";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { API } from "../Config/Endpoint";
import { fetchBranches } from "../Api/employee";
import { customColors, typography, spacing, shadows } from "../Config/helper";
import BranchFilterModal from "../Components/BranchFilterModal";
import DatePickerButton from "../Components/DatePickerButton";
import { fetchDashboardData } from "../Api/auth";

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

    const [branchModalVisible, setBranchModalVisible] = useState(false);
    const [selectedBranches, setSelectedBranches] = useState([]);

    const POLLING_INTERVAL = 90000; // 90 seconds

    // Load user details once on mount
    useEffect(() => {
        const loadUserDetails = async () => {
            try {
                const [storeUserTypeId, Company_Id, branchId] = await Promise.all([
                    AsyncStorage.getItem("userTypeId"),
                    AsyncStorage.getItem("Company_Id"),
                    AsyncStorage.getItem("branchId"),
                ]);

                setUserDetails({
                    companyId: Company_Id,
                    uIdT: storeUserTypeId,
                });

                if (branchId) {
                    try {
                        // Try parsing as JSON first (in case it was saved as an array from the modal)
                        const parsedBranchIds = JSON.parse(branchId);
                        if (Array.isArray(parsedBranchIds)) {
                            const validBranchIds = parsedBranchIds
                                .map(id => parseInt(id, 10))
                                .filter(id => !isNaN(id));
                            setSelectedBranches(validBranchIds);
                            // console.log("Loaded branches from JSON array:", validBranchIds);
                        } else if (typeof parsedBranchIds === "number") {
                            setSelectedBranches([parsedBranchIds]);
                            // console.log("Loaded single branch from JSON:", [parsedBranchIds]);
                            // Update storage to array format for consistency
                            await AsyncStorage.setItem("branchId", JSON.stringify([parsedBranchIds]));
                        }
                    } catch (parseError) {
                        // If JSON parse fails, treat as single value (legacy format)
                        // console.log("JSON parse failed, treating as single value");
                        const branchIdNum = parseInt(branchId, 10);
                        if (!isNaN(branchIdNum)) {
                            setSelectedBranches([branchIdNum]);
                            // console.log("Loaded single branch:", [branchIdNum]);
                            // Convert to new array format for consistency
                            await AsyncStorage.setItem("branchId", JSON.stringify([branchIdNum]));
                        }
                    }
                } else {
                    // console.log("No branchId found in storage, setting empty array");
                    setSelectedBranches([]);
                }

                // console.log("Initial selected branches:", selectedBranches);
            } catch (err) {
                console.error("Error loading user details:", err);
            }
        };

        loadUserDetails();
    }, []);

    const { data: dashboardDataFetch = [], isLoading: isDashboardLoading, refetch: refetchDashboardData } = useQuery({
        queryKey: ["dashboardData", selectedDate, selectedBranches],
        queryFn: async () => {

            const getBranchIdParam = () => {
                if (selectedBranches.length === 0) {
                    return "";
                } else if (selectedBranches.length === 1) {
                    return selectedBranches[0];
                } else {
                    return selectedBranches.join(", ");
                }
            };

            const branchIdParam = getBranchIdParam();

            const result = await fetchDashboardData(selectedDate, branchIdParam);
            return result;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        retry: 2,
    })

    // Optimized API functions with better error handling
    const apiService = {

        fetchAttendanceInfo: async (from, to, userTypeID, branchId) => {
            const url = `${API.attendanceHistory()}From=${from}&To=${to}&UserTypeID=${userTypeID}&Branch_Id=${branchId}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.success ? data.data : [];
        },

        fetchVisitersLog: async (fromDate, id = "", branchId) => {
            const url = `${API.visitedLog()}?reqDate=${fromDate}&UserId=${id}&Branch_Id=${branchId}`;
            const response = await fetch(url);
            const data = await response.json();

            const existingRetailersMap = {};
            const newRetailersMap = {};
            for (const curr of data.data) {
                // Existing retailer → dedupe by Retailer_Id
                if (curr.IsExistingRetailer === 1 && curr.Retailer_Id !== null) {
                    existingRetailersMap[curr.Retailer_Id] = curr;
                } else {
                    // New retailer → dedupe by Name + Mobile, keep latest EntryAt
                    const name = (curr.Reatailer_Name || "").trim();
                    const mobile = (curr.Contact_Mobile || "").trim();
                    const key = `${name}_${mobile}`;

                    if (
                        !newRetailersMap[key] ||
                        new Date(curr.EntryAt) > new Date(newRetailersMap[key].EntryAt)
                    ) {
                        newRetailersMap[key] = curr;
                    }
                }
            }

            const uniqueEntries = [
                ...Object.values(existingRetailersMap),
                ...Object.values(newRetailersMap),
            ];

            return data.success ? uniqueEntries : [];
        },

        fetchDeliveryData: async (today, branchId) => {
            const url = `${API.todayDelivery()}Fromdate=${today}&Todate=${today}&Branch_Id=${branchId}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.success ? data.data : [];
        },

        fetchTripSheet: async (from, to, branchId) => {
            const url = `${API.deliveryTripSheet()}${from}&Todate=${to}&Branch_Id=${branchId}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.success ? data.data : [];
        },

        fetchExpenseData: async (from, to) => {
            const url = `${API.getExpenseList()}${from}&Todate=${to}`;
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
            selectedBranches
        ],
        queryFn: async () => {
            if (!userDetails.companyId || !userDetails.uIdT) return {};

            try {
                const getBranchIdParam = () => {
                    if (selectedBranches.length === 0) {
                        return ""; // No branch filter
                    } else if (selectedBranches.length === 2) {
                        return "";
                    } else if (selectedBranches.length === 1) {
                        return selectedBranches[0]; // Single branch
                    } else {
                        return selectedBranches.join(",");
                    }
                };

                const branchIdParam = getBranchIdParam();

                // Fetch all data in parallel
                const [
                    visitData,
                    attendanceData,
                    deliveryData,
                    tripSheetData,
                    expenseData,
                ] = await Promise.allSettled([
                    apiService.fetchVisitersLog(selectedDate, "", branchIdParam),
                    apiService.fetchAttendanceInfo(
                        selectedDate,
                        selectedDate,
                        userDetails.uIdT,
                        branchIdParam,
                    ),
                    apiService.fetchDeliveryData(selectedDate, branchIdParam),
                    apiService.fetchTripSheet(selectedDate, selectedDate, branchIdParam),
                    apiService.fetchExpenseData(selectedDate, selectedDate),
                ]);

                // Extract data from settled promises
                const extractData = result =>
                    result.status === "fulfilled" ? result.value : [];

                const finalVisitData = extractData(visitData);
                const finalAttendanceData = extractData(attendanceData);
                const finalDeliveryData = extractData(deliveryData);
                const finalTripSheetData = extractData(tripSheetData);
                const finalExpenseData = extractData(expenseData);
                const totalExpenseAmount = finalExpenseData.reduce(
                    (sum, expense) =>
                        sum + parseFloat(expense?.credit_amount || 0),
                    0,
                );

                return {
                    visitData: finalVisitData,
                    attendanceData: finalAttendanceData,
                    deliveryData: finalDeliveryData,
                    tripSheetData: finalTripSheetData,
                    expenseData: finalExpenseData,
                    totalExpenseAmount,
                };
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                return {};
            }
        },
        enabled: !!(userDetails.companyId && userDetails.uIdT),
        staleTime: 0,             // Always refetch — no stale window so date changes are instant
        cacheTime: 10000,         // 10 s — discard old date entries quickly
        refetchOnWindowFocus: true, // Refetch when user navigates back to dashboard
        refetchInterval: isPollingActive ? POLLING_INTERVAL : false,
        retry: 2,
        retryDelay: 1000,
        onError: (error) => {
            console.error("Dashboard data fetch error: ", error);
        }
    });

    // Calculate total unique salespersons with safety checks
    const allPersonIds = new Set([
        ...(allDashboardData.attendanceData || []).map(person => person.UserId).filter(id => id != null),
        ...(allDashboardData.visitData || []).map(visit => visit.EntryBy).filter(id => id != null),
    ]);

    const totalSalesPersons = allPersonIds.size;
    const totalVisits = (allDashboardData.visitData || []).map(visit => visit.EntryBy).filter(id => id != null).length;

    const { data: branchData = [] } = useQuery({
        queryKey: ["branchData"],
        queryFn: fetchBranches,
        select: (rows) => {
            return rows.map((row) => ({
                label: row.BranchName,
                value: row.BranchId,
            }))
        }
    });

    const handleBranchFilter = useCallback(async (branches) => {
        setSelectedBranches(branches);

        try {
            // Save selected branches to AsyncStorage
            if (branches.length > 0) {
                await AsyncStorage.setItem("branchId", JSON.stringify(branches));
            } else {
                await AsyncStorage.removeItem("branchId");
            }
        } catch (error) {
            console.error("Error saving selected branches:", error);
        }
    }, []);

    const showBranchFilterModal = useCallback(() => {
        setBranchModalVisible(true);
    }, []);

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
                queryClient.invalidateQueries("dashboardData"),
            ]);
            await refetch();
        } catch (error) {
            console.error("Refresh failed:", error);
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

    // Memoized stats data with 3D gradient colors
    const statsData = useMemo(
        () => {
            const getVoucher = (name) =>
                (dashboardDataFetch || []).find(v => v.voucherName === name) || { voucherCount: 0, voucherTotal: 0 };
            const saleOrderVoucher = getVoucher("Sale Order");
            const salesInvoiceVoucher = getVoucher("Sales Invoice");
            const receiptVoucher = getVoucher("Receipt");
            const creditNoteVoucher = getVoucher("Credit Note");
            return [
            {
                icon: "human-greeting-variant",
                iconLibrary: "MaterialCommunityIcons",
                label: "Attendance",
                value: `${totalSalesPersons} ${
                    totalSalesPersons === 1 ? "Person" : "People"
                } | ${totalVisits} ${
                    totalVisits === 1 ? "\nVisit" : "\nVisits"
                }`,
                gradientColors: ["#34D399", "#10B981", "#059669"],
                shadowColor: "#10B981",
                onPress: () => {
                    navigation.navigate("VisitLogHistory", {
                        selectedDate: selectedDate,
                        selectedBranch: selectedBranches.length === 1 ? selectedBranches[0] : "",
                    });
                },
            },
            {
                icon: "chart-areaspline",
                iconLibrary: "MaterialCommunityIcons",
                label: `${selectedDate === new Date().toISOString().split("T")[0] ? "Today's Orders" : `${new Date(selectedDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                })} Sales`}`,
                value: `${saleOrderVoucher.voucherCount} | ₹${((saleOrderVoucher.voucherTotal / 1000).toFixed(1)).toLocaleString("en-IN")}k`,
                gradientColors: ["#60A5FA", "#3B82F6", "#2563EB"],
                shadowColor: "#3B82F6",
                onPress: () =>
                    navigation.navigate("Statistics", {
                        title: "Sales",
                        type: "saleOrder",
                        selectedDate: selectedDate,
                        selectedBranch: selectedBranches.length === 1 ? selectedBranches[0] : "",
                    }),
            },
            {
                icon: "receipt-long",
                iconLibrary: "MaterialIcons",
                label: "Invoice Summary",
                value: `${salesInvoiceVoucher.voucherCount} | ₹${((salesInvoiceVoucher.voucherTotal / 1000).toFixed(1)).toLocaleString("en-IN")}k`,
                gradientColors: ["#FB923C", "#F97316", "#EA580C"],
                shadowColor: "#F97316",
                onPress: () =>
                    navigation.navigate("Statistics", {
                        title: "Invoice",
                        type: "invoice",
                        selectedDate: selectedDate,
                        selectedBranch: selectedBranches.length === 1 ? selectedBranches[0] : "",
                    }),
            },
            {
                icon: "receipt",
                iconLibrary: "MaterialIcons",
                label: "Receipts",
                value: `${receiptVoucher.voucherCount} | ₹${((receiptVoucher.voucherTotal / 1000).toFixed(1) || 0).toLocaleString("en-IN")}k`,
                gradientColors: ["#4ADE80", "#22C55E", "#16A34A"],
                shadowColor: "#22C55E",
                onPress: () =>
                    navigation.navigate("ReceiptAdmin", {
                        selectedDate: selectedDate,
                        selectedBranch: selectedBranches.length === 1 ? selectedBranches[0] : "",
                    }),
            },
            {
                icon: "local-shipping",
                iconLibrary: "MaterialIcons",
                label: `${selectedDate === new Date().toISOString().split("T")[0] ? "Ongoing Delivery" : `${new Date(selectedDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                })} Delivery`}`,
                value: `${allDashboardData.deliveryData?.filter(
                    item =>
                        item.DeliveryStatusName === "Delivered" ||
                        item.DeliveryStatusName === "Pending" || item.DeliveryStatusName === "Return",
                ).length || 0}/${allDashboardData.deliveryData?.length || 0}`,
                gradientColors: ["#A78BFA", "#8B5CF6", "#7C3AED"],
                shadowColor: "#8B5CF6",
                onPress: () =>
                    navigation.navigate("DeliveryReport", {
                        selectedDate: selectedDate,
                        selectedBranch: selectedBranches.length === 1 ? selectedBranches[0] : "",
                    }),
            },
            {
                icon: "truck-delivery",
                iconLibrary: "MaterialCommunityIcons",
                label: "Trips",
                value: allDashboardData.tripSheetData?.length || 0,
                gradientColors: ["#24fbe2", "#22c5c2", "#16a3a3"],
                shadowColor: "#22c5c2",
                onPress: () =>
                    navigation.navigate("TripReport", {
                        selectedDate: selectedDate,
                        selectedBranch: selectedBranches.length === 1 ? selectedBranches[0] : "",
                    }),
            },
            {
                icon: "keyboard-return",
                iconLibrary: "MaterialIcons",
                label: "Credit Notes",
                value: `${creditNoteVoucher.voucherCount} | ₹${((creditNoteVoucher.voucherTotal / 1000).toFixed(1) || 0).toLocaleString("en-IN")}k`,
                gradientColors: ["#FB7185", "#F43F5E", "#E11D48"],
                shadowColor: "#F43F5E",
                onPress: () => navigation.navigate("DeliveryReturn", {
                    selectedDate: selectedDate,
                    selectedBranch: selectedBranches.length === 1 ? selectedBranches[0] : "",
                    showAll: true,
                }),
            },
            {
                icon: "account-balance-wallet",
                iconLibrary: "MaterialIcons",
                label: "Expenses",
                value: `₹${(allDashboardData.totalExpenseAmount || 0).toLocaleString("en-IN")}`,
                gradientColors: ["#ed963a", "#f59e0b", "#d97706"],
                shadowColor: "#f59e0b",
                onPress: () =>
                    navigation.navigate("ExpenseList", {
                        selectedDate: selectedDate,
                        selectedBranch: selectedBranches.length === 1 ? selectedBranches[0] : "",
                        isAdmin: true,
                    }),
            },
            {
                icon: "inventory-2",
                iconLibrary: "MaterialIcons",
                label: "Stock In Hand",
                value: "Godown",
                gradientColors: ["#818CF8", "#6366F1", "#4F46E5"],
                shadowColor: "#6366F1",
                onPress: () => navigation.navigate("StockInHand"),
            },
            {
                icon: "pending-actions",
                iconLibrary: "MaterialIcons",
                label: "Pending",
                value: "Overall",
                gradientColors: ["#F472B6", "#EC4899", "#DB2777"],
                shadowColor: "#EC4899",
                onPress: () => navigation.navigate("PendingDeliveryAdmin", {
                    selectedDate: selectedDate,
                    selectedBranch: selectedBranches.length === 1 ? selectedBranches[0] : "",
                }),
            },
            {
                icon: "bar-chart",
                iconLibrary: "MaterialIcons",
                label: "Analysis",
                value: "Monthly",
                gradientColors: ["#A855F7", "#9333EA", "#7E22CE"],
                shadowColor: "#9333EA",
                onPress: () => navigation.navigate("MonthlyAnalysis"),
            }
            // {
            //     icon: "pie-chart",
            //     iconLibrary: "MaterialIcons",
            //     label: "Analysis",
            //     value: "Monthly",
            //     color: "#F87171",
            //     backgroundColor: "#EDE9FE",
            //     onPress: () => navigation.navigate("MonthlyAnalysis"),
            // },
            ];
        },
        [allDashboardData, navigation, dashboardDataFetch],
    );

    // Memoized 3D icon renderer with gradient background
    const render3DIcon = useCallback((iconLibrary, iconName, gradientColors, shadowColor) => {
        const iconProps = { name: iconName, size: 18, color: "#FFFFFF" };
        
        let IconComponent;
        switch (iconLibrary) {
            case "MaterialIcons":
                IconComponent = <MaterialIcons {...iconProps} />;
                break;
            case "MaterialCommunityIcons":
                IconComponent = <MaterialCommunityIcons {...iconProps} />;
                break;
            case "AntDesign":
                IconComponent = <AntDesignIcons {...iconProps} />;
                break;
            default:
                IconComponent = <MaterialIcons {...iconProps} />;
        }

        return (
            <View style={[styles.icon3DWrapper, { shadowColor }]}>
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.icon3DGradient}>
                    {IconComponent}
                </LinearGradient>
                <View style={[styles.icon3DBottomLayer, { backgroundColor: gradientColors[2] }]} />
            </View>
        );
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
                                    : `Overview for ${new Date(selectedDate).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric"
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
                                onPress={showBranchFilterModal}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons
                                    name="filter-list"
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
                                style={[
                                    styles.statCard,
                                    { shadowColor: stat.shadowColor },
                                ]}
                                onPress={stat.onPress}
                                activeOpacity={0.85}>
                                {render3DIcon(
                                    stat.iconLibrary,
                                    stat.icon,
                                    stat.gradientColors,
                                    stat.shadowColor,
                                )}
                                <View style={styles.statContent}>
                                    <Text
                                        style={[
                                            styles.statValue,
                                            stat.label === "Attendance" && { lineHeight: 22 },
                                        ]}
                                        numberOfLines={stat.label === "Attendance" ? 2 : 1}
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

            <BranchFilterModal
                visible={branchModalVisible}
                onClose={() => setBranchModalVisible(false)}
                branchData={branchData}
                selectedBranches={selectedBranches}
                onApplyFilter={handleBranchFilter}
                title="Select Branches"
            />
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
    gridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "stretch",
        paddingHorizontal: spacing.xs,
        paddingBottom: spacing.xl,
        gap: spacing.sm,
    },
    statCard: {
        width: "47%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: customColors.white,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 8,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 4,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.04)",
        minHeight: 100,
        marginBottom: 8,
    },
    // 3D Icon Styles
    icon3DWrapper: {
        position: "relative",
        width: 40,
        height: 44,
        marginBottom: 4,
    },
    icon3DGradient: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    icon3DBottomLayer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        position: "absolute",
        top: 3,
        left: 0,
        zIndex: 1,
        opacity: 0.5,
    },
    statContent: {
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        marginTop: 4,
    },
    statValue: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "700",
        marginBottom: 2,
        textAlign: "center",
    },
    statLabel: {
        ...typography.caption(),
        fontWeight: "500",
        color: customColors.grey500,
        textAlign: "center",
        paddingHorizontal: spacing.xs,
    },
});
