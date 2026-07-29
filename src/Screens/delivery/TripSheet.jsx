import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
    LayoutAnimation,
    TextInput,
    Modal,
    ScrollView,
    Linking,
    ToastAndroid,
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

// Payment category helper using Payment_Mode + Payment_Ref_No
const getPaymentInfo = (tripDetail) => {
    if (!tripDetail) return { label: "N/A", color: customColors.grey500, icon: "help-circle", iconLibrary: "Feather" };

    const refNo = (tripDetail.Payment_Ref_No || "").toUpperCase();
    const mode = Number(tripDetail.Payment_Mode);
    const status = Number(tripDetail.Payment_Status);

    if (refNo.includes("PARTIAL")) {
        const match = refNo.match(/PARTIAL[- ]?(\d+)/);
        const amt = match ? `₹${match[1]}` : "";
        return {
            label: `Partial ${amt}`.trim(),
            color: customColors.secondaryDark,
            icon: "minus-circle",
            iconLibrary: "Feather",
        };
    }
    if (mode === 3 || refNo === "CREDIT") {
        return { label: "Credit", color: customColors.warningDark, icon: "credit-card", iconLibrary: "Feather" };
    }
    if (mode === 1 && refNo === "CASH") {
        return { label: "Cash", color: customColors.success, icon: "inr", iconLibrary: "FontAwesome" };
    }
    if (refNo === "GPAY" || refNo.startsWith("GPAY")) {
        return { label: "Online", color: customColors.infoDark, icon: "smartphone", iconLibrary: "Feather" };
    }
    if (status === 3) {
        return { label: "Cash", color: customColors.success, icon: "inr", iconLibrary: "FontAwesome" };
    }
    return { label: "Pending", color: customColors.warning, icon: "clock", iconLibrary: "Feather" };
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

    // Route ordering state
    const [routeEditMode, setRouteEditMode] = useState(null); // Trip_Id when in edit mode
    const [routeValues, setRouteValues] = useState({}); // { "retailerId": routeNumber }
    const [routeSaving, setRouteSaving] = useState(false);

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

    // ─── Route Ordering Functions ──────────────────────────────────────

    const enterRouteEditMode = (tripItem) => {
        const initialRoutes = {};
        tripItem.Product_Array?.forEach(product => {
            initialRoutes[product.Retailer_Id] = product.Route || "";
        });
        setRouteValues(initialRoutes);
        setRouteEditMode(tripItem.Trip_Id);
    };

    const exitRouteEditMode = () => {
        setRouteEditMode(null);
        setRouteValues({});
    };

    const updateRouteValue = (retailerId, value) => {
        // Only allow numbers
        const numericValue = value.replace(/[^0-9]/g, "");
        setRouteValues(prev => ({
            ...prev,
            [retailerId]: numericValue,
        }));
    };

    const autoAssignRoutes = (tripItem) => {
        const newRoutes = {};
        tripItem.Product_Array?.forEach((product, index) => {
            newRoutes[product.Retailer_Id] = String(index + 1);
        });
        setRouteValues(newRoutes);
    };

    const saveAllRoutes = async (tripId) => {
        // Validate: check if any route numbers are duplicated
        const values = Object.values(routeValues).filter(v => v !== "");
        const uniqueValues = new Set(values);
        if (values.length !== uniqueValues.size) {
            Alert.alert("Duplicate Routes", "Each shop must have a unique route number. Please fix duplicates.");
            return;
        }

        // Validate: check for empty routes
        const hasEmpty = Object.values(routeValues).some(v => v === "");
        if (hasEmpty) {
            Alert.alert(
                "Missing Routes",
                "Some shops don't have a route number. Continue anyway?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Continue", onPress: () => submitAllRoutes(tripId) },
                ],
            );
            return;
        }

        await submitAllRoutes(tripId);
    };

    const submitAllRoutes = async (tripId) => {
        setRouteSaving(true);
        try {
            const routes = Object.entries(routeValues)
                .filter(([_, route]) => route !== "")
                .map(([retailerId, route]) => ({
                    Trip_Id: tripId,
                    Retailer_Id: Number(retailerId),
                    Route: route,
                }));

            if (routes.length === 0) {
                Alert.alert("Info", "No routes to save.");
                return;
            }

            const response = await fetch(API.tripSheetRetailerRouteUpdate(), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ routes }),
            });

            const data = await response.json();

            if (data.success) {
                Alert.alert("Success", "Routes saved successfully");
                refreshData();
                exitRouteEditMode();
            } else {
                Alert.alert("Error", data.message || "Failed to update routes");
            }
        } catch (error) {
            console.error("Error saving routes:", error);
            Alert.alert("Error", "Failed to save routes");
        } finally {
            setRouteSaving(false);
        }
    };

    // ─── Payment Summary Calculation ──────────────────────────────────

    const getPaymentCategory = (tripDetail) => {
        if (!tripDetail) return "pending";
        const refNo = (tripDetail.Payment_Ref_No || "").toUpperCase();
        const mode = Number(tripDetail.Payment_Mode);
        const status = Number(tripDetail.Payment_Status);

        if (refNo.includes("PARTIAL")) return "partial";
        if (mode === 3 || refNo === "CREDIT") return "credit";
        if (mode === 1 && refNo === "CASH") return "cash";
        if (refNo === "GPAY" || refNo.startsWith("GPAY")) return "online";
        if (status === 3) return "cash";
        return "pending";
    };

    // ─── Render Trip Item ─────────────────────────────────────────────

    const renderTripItem = ({ item }) => {
        const isExpanded = expandedTrip === item.Trip_Id;
        const tripTime = formatTime(item.Trip_Date);
        const retailerCount = item.Trip_Details ? item.Trip_Details.length : 0;
        const isRouteEditing = routeEditMode === item.Trip_Id;

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
                acc.totalOrders += 1;
                acc.returnedCount += tripDetail && Number(tripDetail.Delivery_Status) === 6 ? 1 : 0;

                // Payment categorization
                const category = getPaymentCategory(tripDetail);
                if (category === "cash") acc.cashCount++;
                else if (category === "online") acc.onlineCount++;
                else if (category === "credit") acc.creditCount++;
                else if (category === "partial") acc.partialCount++;
                else acc.pendingPayCount++;

                return acc;
            },
            {
                totalAmount: 0, deliveredCount: 0, totalOrders: 0, returnedCount: 0,
                cashCount: 0, onlineCount: 0, creditCount: 0, partialCount: 0, pendingPayCount: 0,
            }
        );

        const costCenters = [...new Set(item.Trip_Details?.map(detail => detail.Cost_Center_Name))].join(", ");

        // Sort products by Route for display
        const sortedProducts = [...(item.Product_Array || [])].sort((a, b) => {
            const routeA = parseInt(a.Route) || 999;
            const routeB = parseInt(b.Route) || 999;
            return routeA - routeB;
        });

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
                            label="Delivery"
                        />
                        <MetricCard
                            icon="inr"
                            iconLibrary="FontAwesome"
                            value={`${tripSummary.cashCount + tripSummary.onlineCount}/${tripSummary.totalOrders}`}
                            color={tripSummary.cashCount + tripSummary.onlineCount === tripSummary.totalOrders ? customColors.success : customColors.warning}
                            label="Collected"
                        />
                        <MetricCard
                            icon="rotate-ccw"
                            value={tripSummary.returnedCount}
                            color={customColors.error}
                            label="Returns"
                        />
                    </View>

                    {/* Payment Breakdown Chips */}
                    <View style={styles.paymentBreakdownRow}>
                        {tripSummary.cashCount > 0 && (
                            <View style={[styles.paymentChip, { backgroundColor: customColors.successFaded }]}>
                                <Text style={[styles.paymentChipText, { color: customColors.success }]}>
                                    Cash {tripSummary.cashCount}
                                </Text>
                            </View>
                        )}
                        {tripSummary.onlineCount > 0 && (
                            <View style={[styles.paymentChip, { backgroundColor: customColors.infoFaded }]}>
                                <Text style={[styles.paymentChipText, { color: customColors.infoDark }]}>
                                    Online {tripSummary.onlineCount}
                                </Text>
                            </View>
                        )}
                        {tripSummary.creditCount > 0 && (
                            <View style={[styles.paymentChip, { backgroundColor: customColors.warningFaded }]}>
                                <Text style={[styles.paymentChipText, { color: customColors.warningDark }]}>
                                    Credit {tripSummary.creditCount}
                                </Text>
                            </View>
                        )}
                        {tripSummary.partialCount > 0 && (
                            <View style={[styles.paymentChip, { backgroundColor: customColors.secondaryFaded }]}>
                                <Text style={[styles.paymentChipText, { color: customColors.secondaryDark }]}>
                                    Partial {tripSummary.partialCount}
                                </Text>
                            </View>
                        )}
                        {tripSummary.pendingPayCount > 0 && (
                            <View style={[styles.paymentChip, { backgroundColor: customColors.grey100 }]}>
                                <Text style={[styles.paymentChipText, { color: customColors.grey600 }]}>
                                    Pending {tripSummary.pendingPayCount}
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>

                {/* Expanded Trip Details */}
                {isExpanded && (
                    <View style={styles.tripDetails}>
                        {/* Route Edit Toggle */}
                        <View style={styles.routeEditBar}>
                            {!isRouteEditing ? (
                                <TouchableOpacity
                                    style={styles.routeEditButton}
                                    onPress={() => enterRouteEditMode(item)}
                                    activeOpacity={0.7}
                                >
                                    <FeatherIcon name="map" size={iconSizes.sm} color={customColors.primary} />
                                    <Text style={styles.routeEditButtonText}>Set Route Order</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.routeEditActions}>
                                    <TouchableOpacity
                                        style={styles.routeAutoButton}
                                        onPress={() => autoAssignRoutes(item)}
                                        activeOpacity={0.7}
                                    >
                                        <FeatherIcon name="zap" size={iconSizes.xs} color={customColors.primary} />
                                        <Text style={styles.routeAutoText}>Auto</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.routeSaveButton}
                                        onPress={() => saveAllRoutes(item.Trip_Id)}
                                        disabled={routeSaving}
                                        activeOpacity={0.7}
                                    >
                                        <FeatherIcon name="check" size={iconSizes.sm} color={customColors.white} />
                                        <Text style={styles.routeSaveText}>
                                            {routeSaving ? "Saving..." : "Save Routes"}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.routeCancelButton}
                                        onPress={exitRouteEditMode}
                                        activeOpacity={0.7}
                                    >
                                        <FeatherIcon name="x" size={iconSizes.sm} color={customColors.error} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {sortedProducts.map((product, productIndex) => {
                            const tripDetail = tripDetailsMap.get(product.Do_Id);
                            const orderValue = product.Products_List?.reduce(
                                (sum, item) => sum + item.Final_Amo, 0
                            ) || 0;

                            const deliveryStatus = DELIVERY_STATUS[tripDetail?.Delivery_Status] || DELIVERY_STATUS[5];
                            const paymentInfo = getPaymentInfo(tripDetail);

                            const isCompleted = tripDetail &&
                                Number(tripDetail.Payment_Status) === 3 &&
                                Number(tripDetail.Delivery_Status) === 7;
                            
                            const isPaymentPending = tripDetail && Number(tripDetail.Delivery_Status) === 7 && Number(tripDetail.Payment_Status) === 1;
                            const isCancelled = tripDetail && Number(tripDetail.Cancel_status) === 0;

                            const currentRoute = isRouteEditing
                                ? routeValues[product.Retailer_Id] || ""
                                : product.Route || "";

                            const firstLine = product.Products_List?.[0];
                            const lat = Number(firstLine?.Latitude);
                            const lng = Number(firstLine?.Longitude);
                            const hasLocation =
                                Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;

                            return (
                                <View key={product.Do_Id} style={styles.orderCard}>
                                    <TouchableOpacity
                                        style={[
                                            styles.orderHeader,
                                            isCompleted && styles.orderHeaderCompleted,
                                            isPaymentPending && { backgroundColor: customColors.warningFaded },
                                            isCancelled && { backgroundColor: customColors.errorFaded },
                                        ]}
                                        onPress={() => toggleProductExpand(product.Do_Id)}
                                        activeOpacity={0.7}
                                    >
                                        {/* Route Number Badge */}
                                        {(isRouteEditing || currentRoute) && (
                                            <View style={styles.routeBadgeContainer}>
                                                {isRouteEditing ? (
                                                    <TextInput
                                                        style={styles.routeInput}
                                                        value={routeValues[product.Retailer_Id] || ""}
                                                        onChangeText={(val) => updateRouteValue(product.Retailer_Id, val)}
                                                        keyboardType="number-pad"
                                                        maxLength={2}
                                                        placeholder="#"
                                                        placeholderTextColor={customColors.grey400}
                                                        selectTextOnFocus
                                                    />
                                                ) : (
                                                    <View style={styles.routeNumberBadge}>
                                                        <Text style={styles.routeNumberText}>{currentRoute}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}

                                        <View style={[styles.orderInfo, (isRouteEditing || currentRoute) && { marginLeft: spacing.sm }]}>
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
                                                    label={paymentInfo.label}
                                                    color={paymentInfo.color}
                                                    icon={paymentInfo.icon}
                                                    iconLibrary={paymentInfo.iconLibrary}
                                                />
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        if (hasLocation) {
                                                            Linking.openURL(`${API.google_map}${lat},${lng}`).catch(() =>
                                                                ToastAndroid.show("Unable to open maps", ToastAndroid.SHORT),
                                                            );
                                                        } else {
                                                            ToastAndroid.show("Location not available", ToastAndroid.SHORT);
                                                        }
                                                    }}
                                                    activeOpacity={0.7}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                >
                                                    <FeatherIcon
                                                        name="navigation"
                                                        size={iconSizes.md}
                                                        color={hasLocation ? customColors.primary : customColors.grey400}
                                                    />
                                                </TouchableOpacity>
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
    // Payment Breakdown Row
    paymentBreakdownRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.xxs,
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey50,
    },
    paymentChip: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    paymentChipText: {
        ...typography.caption(),
        fontWeight: "700",
        fontSize: 10,
    },
    // Trip Details
    tripDetails: {
        padding: spacing.sm,
        backgroundColor: customColors.grey50,
        borderTopWidth: 1,
        borderTopColor: customColors.grey100,
    },
    // Route Edit Bar
    routeEditBar: {
        marginBottom: spacing.sm,
    },
    routeEditButton: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: customColors.primaryFaded,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: customColors.primary + "30",
    },
    routeEditButtonText: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "700",
    },
    routeEditActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    routeAutoButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xxs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: customColors.primaryFaded,
        borderRadius: borderRadius.lg,
    },
    routeAutoText: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "600",
    },
    routeSaveButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xxs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: customColors.success,
        borderRadius: borderRadius.lg,
        flex: 1,
        justifyContent: "center",
    },
    routeSaveText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "700",
    },
    routeCancelButton: {
        padding: spacing.sm,
        backgroundColor: customColors.errorFaded,
        borderRadius: borderRadius.lg,
    },
    // Route Badge on Order Card
    routeBadgeContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    routeInput: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: customColors.primary,
        backgroundColor: customColors.white,
        textAlign: "center",
        ...typography.body2(),
        fontWeight: "700",
        color: customColors.primary,
        padding: 0,
    },
    routeNumberBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: customColors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    routeNumberText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "700",
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
        backgroundColor: customColors.white,
        flexDirection: "row",
        justifyContent: "space-between",
        padding: spacing.md,
        alignItems: "center",
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
