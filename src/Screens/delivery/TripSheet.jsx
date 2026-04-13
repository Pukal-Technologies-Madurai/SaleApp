import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
    LayoutAnimation,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FeatherIcon from "react-native-vector-icons/Feather";
import FontAwesomeIcon from "react-native-vector-icons/FontAwesome";
import { API } from "../../Config/Endpoint";
import {
    customColors,
    typography,
    shadows,
    spacing,
    borderRadius,
    iconSizes,
} from "../../Config/helper";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";

// Status helpers
const DELIVERY_STATUS = {
    5: { label: "Pending", color: customColors.warning, icon: "clock" },
    6: { label: "Cancelled", color: customColors.error, icon: "x-circle" },
    7: { label: "Delivered", color: customColors.success, icon: "check-circle" },
};

const PAYMENT_STATUS = {
    0: { label: "Pending", color: customColors.warning },
    3: { label: "Completed", color: customColors.success },
};

const PAYMENT_MODE = {
    1: { label: "Cash", icon: "inr", iconLibrary: "FontAwesome" },
    2: { label: "G-Pay", icon: "smartphone", iconLibrary: "Feather" },
    3: { label: "Credit", icon: "credit-card", iconLibrary: "Feather" },
};

const StatusBadge = ({ label, color, icon, iconLibrary = "Feather" }) => (
    <View style={[styles.badge, { backgroundColor: color + "15" }]}>
        {icon && (
            iconLibrary === "FontAwesome" ? (
                <FontAwesomeIcon name={icon} size={iconSizes.xs} color={color} />
            ) : (
                <FeatherIcon name={icon} size={iconSizes.xs} color={color} />
            )
        )}
        <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
);

const MetricCard = ({ icon, value, color, label, iconLibrary = "Feather" }) => (
    <View style={styles.metricCard}>
        <View style={[styles.metricIconContainer, { backgroundColor: color + "15" }]}>
            {iconLibrary === "FontAwesome" ? (
                <FontAwesomeIcon name={icon} size={iconSizes.sm} color={color} />
            ) : (
                <FeatherIcon name={icon} size={iconSizes.sm} color={color} />
            )}
        </View>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        {label && <Text style={styles.metricLabel}>{label}</Text>}
    </View>
);

const TripSheet = () => {
    const navigation = useNavigation();
    const [logData, setLogData] = useState([]);
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    const [expandedTrip, setExpandedTrip] = useState(null);
    const [expandedProduct, setExpandedProduct] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        refreshData();
    }, [selectedFromDate, selectedToDate]);

    const refreshData = async () => {
        try {
            const userId = await AsyncStorage.getItem("UserId");
            const fromDate = selectedFromDate.toISOString().split("T")[0];
            const toDate = selectedToDate.toISOString().split("T")[0];
            await fetchTripSheet(fromDate, toDate, userId);
        } catch (error) {
            console.error("Error refreshing data:", error);
            Alert.alert("Error", "Failed to refresh data");
        }
    };

    const fetchTripSheet = async (from, to, uId) => {
        try {
            const url = `${API.deliveryTripSheet()}${from}&Todate=${to}&User_Id=${uId}`;
            const response = await fetch(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const data = await response.json();

            if (data.success) {
                setLogData(data.data);
            } else {
                Alert.alert("Error", data.message || "Failed to fetch trip data");
            }
        } catch (err) {
            console.error("Error fetching trip sheet:", err);
            Alert.alert("Error", "Failed to fetch trip data");
        }
    };

    const handleFromDateChange = date => {
        if (date) {
            const newFromDate = date > selectedToDate ? selectedToDate : date;
            setSelectedFromDate(newFromDate);
        }
    };

    const handleToDateChange = date => {
        if (date) {
            const newToDate = date < selectedFromDate ? selectedFromDate : date;
            setSelectedToDate(newToDate);
        }
    };

    const toggleTripExpand = tripId => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedTrip(expandedTrip === tripId ? null : tripId);
        setExpandedProduct(null);
    };

    const toggleProductExpand = productId => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedProduct(expandedProduct === productId ? null : productId);
    };

    function formatTime(dateString) {
        const date = new Date(dateString);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
        return `${formattedHours}:${String(minutes).padStart(2, "0")} ${ampm}`;
    }

    const renderTripItem = ({ item }) => {
        const isExpanded = expandedTrip === item.Trip_Id;
        const tripTime = formatTime(item.Trip_Date);
        const retailerCount = item.Trip_Details ? item.Trip_Details.length : 0;

        const tripDetailsMap = new Map();
        item.Trip_Details?.forEach(detail => {
            tripDetailsMap.set(detail.Do_Id, detail);
        });

        const tripSummary = item.Product_Array?.reduce(
            (acc, product) => {
                const tripDetail = tripDetailsMap.get(product.Do_Id);
                const orderValue = product.Products_List?.reduce(
                    (sum, item) => sum + item.Final_Amo, 0
                ) || 0;

                acc.totalAmount += orderValue;
                acc.deliveredCount += tripDetail && Number(tripDetail.Delivery_Status) === 7 ? 1 : 0;
                acc.paidCount += tripDetail && Number(tripDetail.Payment_Status) === 3 ? 1 : 0;
                acc.totalOrders += 1;
                acc.returnedCount += tripDetail && Number(tripDetail.Delivery_Status) === 6 ? 1 : 0;
                return acc;
            },
            { totalAmount: 0, deliveredCount: 0, paidCount: 0, totalOrders: 0, returnedCount: 0 }
        );

        const costCenters = [...new Set(item.Trip_Details?.map(detail => detail.Cost_Center_Name))].join(", ");

        return (
            <View style={styles.tripCard}>
                {/* Trip Header */}
                <TouchableOpacity
                    style={styles.tripHeader}
                    onPress={() => toggleTripExpand(item.Trip_Id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.tripHeaderTop}>
                        <View style={styles.tripIconWrap}>
                            <FeatherIcon name="truck" size={iconSizes.lg} color={customColors.primary} />
                        </View>
                        <View style={styles.tripHeaderInfo}>
                            <Text style={styles.tripId}>Trip #{item.Trip_No} - ({retailerCount} Shops)</Text>
                            <Text style={styles.costCenterNames} numberOfLines={1}>{costCenters}</Text>
                        </View>
                        <View style={styles.tripHeaderRight}>
                            <View style={styles.timeContainer}>
                                <FeatherIcon name="clock" size={iconSizes.xs} color={customColors.grey500} />
                                <Text style={styles.tripTime}>{tripTime}</Text>
                            </View>
                            <FeatherIcon
                                name={isExpanded ? "chevron-up" : "chevron-down"}
                                size={iconSizes.md}
                                color={customColors.grey400}
                            />
                        </View>
                    </View>

                    {/* Metrics Row */}
                    <View style={styles.metricsRow}>
                        <MetricCard
                            icon="inr"
                            iconLibrary="FontAwesome"
                            value={`₹${tripSummary.totalAmount.toFixed(0)}`}
                            color={customColors.primary}
                        />
                        <MetricCard
                            icon="truck"
                            value={`${tripSummary.deliveredCount}/${tripSummary.totalOrders}`}
                            color={tripSummary.deliveredCount === tripSummary.totalOrders ? customColors.success : customColors.warning}
                        />
                        <MetricCard
                            icon="inr"
                            iconLibrary="FontAwesome"
                            value={`${tripSummary.paidCount}/${tripSummary.totalOrders}`}
                            color={tripSummary.paidCount === tripSummary.totalOrders ? customColors.success : customColors.warning}
                        />
                        <MetricCard
                            icon="rotate-ccw"
                            value={tripSummary.returnedCount}
                            color={customColors.error}
                        />
                        {/* <MetricCard
                            icon="users"
                            value={retailerCount}
                            color={customColors.accent}
                        /> */}
                    </View>
                </TouchableOpacity>

                {/* Expanded Trip Details */}
                {isExpanded && (
                    <View style={styles.tripDetails}>
                        {item.Product_Array?.map(product => {
                            const tripDetail = tripDetailsMap.get(product.Do_Id);
                            const orderValue = product.Products_List?.reduce(
                                (sum, item) => sum + item.Final_Amo, 0
                            ) || 0;

                            const deliveryStatus = DELIVERY_STATUS[tripDetail?.Delivery_Status] || DELIVERY_STATUS[5];
                            const paymentStatus = PAYMENT_STATUS[tripDetail?.Payment_Status] || PAYMENT_STATUS[0];
                            const paymentMode = PAYMENT_MODE[tripDetail?.Payment_Mode] || { label: "N/A", icon: "help-circle" };

                            const isCompleted = tripDetail &&
                                Number(tripDetail.Payment_Status) === 3 &&
                                Number(tripDetail.Delivery_Status) === 7;

                            return (
                                <View key={product.Do_Id} style={styles.orderCard}>
                                    <TouchableOpacity
                                        style={[
                                            styles.orderHeader,
                                            isCompleted && styles.orderHeaderCompleted,
                                        ]}
                                        onPress={() => toggleProductExpand(product.Do_Id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.orderInfo}>
                                            <Text style={styles.retailerName} numberOfLines={1}>
                                                {product.Products_List[0]?.Retailer_Name}
                                            </Text>
                                            <Text style={styles.orderId}>Order #{product.Do_Id}</Text>
                                            <View style={styles.statusRow}>
                                                <StatusBadge
                                                    label={deliveryStatus.label}
                                                    color={deliveryStatus.color}
                                                    icon={deliveryStatus.icon}
                                                />
                                                <StatusBadge
                                                    label={paymentStatus.label}
                                                    color={paymentStatus.color}
                                                />
                                                <StatusBadge
                                                    label={paymentMode.label}
                                                    color={customColors.grey600}
                                                    icon={paymentMode.icon}
                                                    iconLibrary={paymentMode.iconLibrary}
                                                />
                                            </View>
                                        </View>
                                        <View style={styles.orderRight}>
                                            <Text style={styles.orderAmount}>₹{orderValue.toFixed(2)}</Text>
                                            <FeatherIcon
                                                name={expandedProduct === product.Do_Id ? "chevron-up" : "chevron-down"}
                                                size={iconSizes.sm}
                                                color={customColors.grey400}
                                            />
                                        </View>
                                    </TouchableOpacity>

                                    {/* Expanded Products List */}
                                    {expandedProduct === product.Do_Id && (
                                        <View style={styles.productsList}>
                                            <Text style={styles.productsTitle}>PRODUCTS</Text>
                                            {product.Products_List?.map((item, index) => (
                                                <View
                                                    key={index}
                                                    style={[
                                                        styles.productItem,
                                                        index < product.Products_List.length - 1 && styles.productItemBorder,
                                                    ]}
                                                >
                                                    <View style={styles.productItemLeft}>
                                                        <View style={styles.sNoCircle}>
                                                            <Text style={styles.sNoText}>{index + 1}</Text>
                                                        </View>
                                                        <View style={styles.productItemInfo}>
                                                            <Text style={styles.productName} numberOfLines={2}>
                                                                {item.Product_Name}
                                                            </Text>
                                                            <Text style={styles.productUnit}>{item.Unit_Name}</Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.productItemRight}>
                                                        <Text style={styles.productQty}>×{item.Bill_Qty}</Text>
                                                        <Text style={styles.productAmount}>₹{item.Final_Amo.toFixed(2)}</Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="TripSheet Summary"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="FeatherIcon"
                rightIconName="filter"
                onRightPress={() => setModalVisible(true)}
            />

            <FilterModal
                visible={modalVisible}
                fromDate={selectedFromDate}
                toDate={selectedToDate}
                onFromDateChange={handleFromDateChange}
                onToDateChange={handleToDateChange}
                onApply={() => setModalVisible(false)}
                onClose={() => setModalVisible(false)}
                showToDate={true}
                title="Filter Options"
                fromLabel="From Date"
                toLabel="To Date"
            />

            <View style={styles.contentContainer}>
                {/* Map View Button */}
                <TouchableOpacity
                    style={styles.mapButton}
                    onPress={() => navigation.navigate("RetailerMapView")}
                    activeOpacity={0.7}
                >
                    <FeatherIcon name="map-pin" size={iconSizes.sm} color={customColors.primary} />
                    <Text style={styles.mapButtonText}>Map View</Text>
                </TouchableOpacity>

                {/* Trip List */}
                {logData.length > 0 ? (
                    <FlatList
                        data={logData}
                        renderItem={renderTripItem}
                        keyExtractor={item => item.Trip_Id.toString()}
                        contentContainerStyle={styles.listContent}
                        onRefresh={refreshData}
                        refreshing={false}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <FeatherIcon name="truck" size={iconSizes.xxl} color={customColors.grey300} />
                        </View>
                        <Text style={styles.emptyTitle}>No Trips Found</Text>
                        <Text style={styles.emptyText}>No trips available for selected date</Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

export default TripSheet;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.grey50,
    },
    // Map Button
    mapButton: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-end",
        gap: spacing.xs,
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: customColors.primaryFaded,
        borderRadius: borderRadius.round,
    },
    mapButtonText: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "600",
    },
    listContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xl,
    },
    // Trip Card
    tripCard: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.md,
        ...shadows.small,
        overflow: "hidden",
    },
    tripHeader: {
        padding: spacing.md,
    },
    tripHeaderTop: {
        flexDirection: "row",
        alignItems: "center",
    },
    tripIconWrap: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.lg,
        backgroundColor: customColors.primaryFaded,
        justifyContent: "center",
        alignItems: "center",
    },
    tripHeaderInfo: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    tripId: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    costCenterNames: {
        ...typography.subtitle2(),
        color: customColors.grey500,
        marginTop: spacing.xxs,
    },
    tripHeaderRight: {
        alignItems: "flex-end",
        gap: spacing.xs,
    },
    timeContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    tripTime: {
        ...typography.caption(),
        color: customColors.grey500,
        fontWeight: "500",
    },
    // Metrics Row
    metricsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: customColors.grey100,
    },
    metricCard: {
        alignItems: "center",
        gap: spacing.xxs,
    },
    metricIconContainer: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.md,
        justifyContent: "center",
        alignItems: "center",
    },
    metricValue: {
        ...typography.caption(),
        fontWeight: "700",
    },
    metricLabel: {
        ...typography.caption(),
        color: customColors.grey500,
        fontSize: 10,
    },
    // Trip Details
    tripDetails: {
        padding: spacing.sm,
        backgroundColor: customColors.grey50,
        borderTopWidth: 1,
        borderTopColor: customColors.grey100,
    },
    // Order Card
    orderCard: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
        ...shadows.small,
        overflow: "hidden",
    },
    orderHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: spacing.md,
    },
    orderHeaderCompleted: {
        backgroundColor: customColors.successFaded,
    },
    orderInfo: {
        flex: 1,
        gap: spacing.xs,
    },
    retailerName: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    orderId: {
        ...typography.caption(),
        color: customColors.grey500,
    },
    statusRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.round,
    },
    badgeText: {
        ...typography.caption(),
        fontWeight: "600",
    },
    orderRight: {
        alignItems: "flex-end",
        justifyContent: "space-between",
    },
    orderAmount: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "700",
    },
    // Products List
    productsList: {
        padding: spacing.md,
        backgroundColor: customColors.grey50,
        borderTopWidth: 1,
        borderTopColor: customColors.grey100,
    },
    productsTitle: {
        ...typography.caption(),
        color: customColors.grey500,
        fontWeight: "700",
        letterSpacing: 0.8,
        marginBottom: spacing.sm,
    },
    productItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
    },
    productItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    productItemLeft: {
        flexDirection: "row",
        flex: 1,
        gap: spacing.sm,
        alignItems: "flex-start",
    },
    sNoCircle: {
        width: 24,
        height: 24,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.primaryFaded,
        justifyContent: "center",
        alignItems: "center",
    },
    sNoText: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "700",
    },
    productItemInfo: {
        flex: 1,
    },
    productName: {
        ...typography.body2(),
        color: customColors.grey800,
        fontWeight: "500",
    },
    productUnit: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: spacing.xxs,
    },
    productItemRight: {
        alignItems: "flex-end",
        gap: spacing.xxs,
    },
    productQty: {
        ...typography.caption(),
        color: customColors.grey500,
        fontWeight: "600",
    },
    productAmount: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "700",
    },
    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.xxl,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    emptyTitle: {
        ...typography.h6(),
        color: customColors.grey700,
        fontWeight: "600",
        marginBottom: spacing.xs,
    },
    emptyText: {
        ...typography.body2(),
        color: customColors.grey500,
    },
});
