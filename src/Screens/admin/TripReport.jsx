import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { API } from "../../Config/Endpoint";
import { customColors, typography, spacing, shadows, borderRadius, iconSizes } from "../../Config/helper";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";

const TripReport = ({ route }) => {
    const navigation = useNavigation();
    const { selectedDate: passedDate, selectedBranch } = route.params || {};

    const [logData, setLogData] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());

    useEffect(() => {
        if (passedDate) {
            const initialDate = new Date(passedDate);
            setSelectedFromDate(initialDate);
            setSelectedToDate(initialDate);

            const fromDate = initialDate.toISOString().split("T")[0];
            const toDate = initialDate.toISOString().split("T")[0];
            fetchTripSheet(fromDate, toDate);
        }
    }, [passedDate]);

    const fetchTripSheet = async (from, to) => {
        try {
            const url = `${API.deliveryTripSheet()}${from}&Todate=${to}&Branch_Id=${selectedBranch || ""}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setLogData(data.data);
            } else {
                Alert.alert("Error", "Failed to fetch updated data");
            }
        } catch (err) {
            console.error("Error fetching trip sheet:", err);
            Alert.alert("Error", "Failed to refresh data");
        }
    };

    const handleDateChange = date => {
        setSelectedFromDate(date);
        setSelectedToDate(date);
        fetchTripSheet(
            date.toISOString().split("T")[0],
            date.toISOString().split("T")[0],
        );
    };

    const renderItem = useCallback(({ item }) => {
        return <TripSummaryCard trip={item} />;
    }, []);

    const TripSummaryCard = useCallback(
        ({ trip }) => {
            const tripDetailsMap = useMemo(() => {
                const map = new Map();
                trip.Trip_Details?.forEach(detail => {
                    map.set(detail.Do_Id, detail);
                });
                return map;
            }, [trip.Trip_Details]);

            const totalInvoiceValue = useMemo(
                () =>
                    trip.Trip_Details?.reduce(
                        (sum, detail) =>
                            sum + parseFloat(detail.Total_Invoice_Value || 0),
                        0,
                    ) || 0,
                [trip.Trip_Details],
            );

            const deliveryStats = useMemo(() => {
                let delivered = 0;
                let pending = 0;
                let returns = 0;
                let totalOrders = trip.Product_Array?.length || 0;

                trip.Product_Array?.forEach(product => {
                    const tripDetail = tripDetailsMap.get(product.Do_Id);
                    if (tripDetail && Number(tripDetail.Delivery_Status) === 7) {
                        delivered++;
                    } else if (tripDetail && Number(tripDetail.Delivery_Status) === 6) {
                        returns++;
                    } else {
                        pending++;
                    }
                });

                return { delivered, pending, returns, totalOrders };
            }, [trip.Product_Array, tripDetailsMap]);

            const paymentStats = useMemo(() => {
                let cash = 0;
                let online = 0;
                let credit = 0;
                let partial = 0;
                let pending = 0;

                trip.Product_Array?.forEach(product => {
                    const tripDetail = tripDetailsMap.get(product.Do_Id);
                    if (tripDetail) {
                        const refNo = (tripDetail.Payment_Ref_No || "").toUpperCase();
                        const mode = Number(tripDetail.Payment_Mode);

                        if (refNo.includes("PARTIAL")) {
                            partial++;
                        } else if (mode === 3 || refNo === "CREDIT") {
                            credit++;
                        } else if (mode === 1 && refNo === "CASH") {
                            cash++;
                        } else if (refNo === "GPAY" || refNo.startsWith("GPAY")) {
                            online++;
                        } else if (Number(tripDetail.Payment_Status) === 3) {
                            cash++;
                        } else {
                            pending++;
                        }
                    }
                });

                return { cash, online, credit, partial, pending };
            }, [trip.Product_Array, tripDetailsMap]);

            const deliveryPerson = useMemo(() => {
                const employee = trip.Employees_Involved?.[0];
                if (employee) {
                    return {
                        name: employee.Emp_Name || "N/A",
                        id: employee.Involved_Emp_Id || "N/A",
                    };
                }
                const firstDetail = trip.Trip_Details?.[0];
                return {
                    name: firstDetail?.Cost_Center_Name || "N/A",
                    id: firstDetail?.Delivery_Person_Id || "N/A",
                };
            }, [trip.Employees_Involved, trip.Trip_Details]);

            // Get the first non-empty Route value
            const routeValue = useMemo(() => {
                for (const product of trip.Product_Array || []) {
                    if (product.Route && product.Route.trim() !== "") {
                        return product.Route;
                    }
                }
                return null;
            }, [trip.Product_Array]);

            const handleCardPress = () => {
                const retailers = trip.Product_Array?.map(product => {
                    const tripDetail = tripDetailsMap.get(product.Do_Id);
                    
                    const firstLine = product.Products_List?.[0];
                    const lat = Number(firstLine?.Latitude);
                    const lng = Number(firstLine?.Longitude);
                    const hasLocation =
                        Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;

                    return {
                        name: product.Retailer_Name,
                        retailerName: product.Products_List?.[0]?.Retailer_Name || product.Retailer_Name,
                        id: product.So_No,
                        doId: product.Do_Id,
                        location: tripDetail?.Delivery_Location || "",
                        orderValue: product.Products_List?.reduce(
                            (acc, current) => acc + current.Final_Amo,
                            0,
                        ),
                        deliveryTime: tripDetail?.Delivery_Time || 0,
                        deliveryStatus: tripDetail?.Delivery_Status || 0,
                        paymentStatus: tripDetail?.Payment_Status || 0,
                        paymentMode: tripDetail?.Payment_Mode || 0,
                        paymentRefNo: tripDetail?.Payment_Ref_No || "",
                        products: product.Products_List,
                        firstLine,
                        lat,
                        lng,
                        hasLocation,
                    };
                });

                navigation.navigate("TripDetails", {
                    tripNo: trip.Trip_No || trip.Challan_No,
                    tripDate: trip.Trip_Date,
                    invoiceNo: trip.TR_INV_ID || "",
                    branchName: trip.BranchName || "",
                    routeValue: routeValue,
                    retailers,
                    deliveryPerson,
                    productArray: trip.Product_Array,
                    employeesInvolved: trip.Employees_Involved,
                });
            };

            return (
                <TouchableOpacity onPress={handleCardPress} activeOpacity={0.7}>
                    <View style={styles.tripCard}>
                        {/* Header: Trip # + Date + Invoice */}
                        <View style={styles.tripHeader}>
                            <View style={styles.tripHeaderLeft}>
                                <View style={styles.tripBadge}>
                                    <Icon name="local-shipping" size={iconSizes.xs} color={customColors.white} />
                                    <Text style={styles.tripBadgeText}>
                                        Trip #{trip.Trip_No || trip.Challan_No}
                                    </Text>
                                </View>
                                {trip.BranchName ? (
                                    <View style={styles.branchBadge}>
                                        <Text style={styles.branchBadgeText}>{trip.BranchName}</Text>
                                    </View>
                                ) : null}
                            </View>
                            <Text style={styles.tripDate}>
                                {new Date(trip.Trip_Date).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </Text>
                        </View>

                        {/* Invoice & Route Row */}
                        <View style={styles.metaRow}>
                            {trip.TR_INV_ID ? (
                                <View style={styles.metaItem}>
                                    <Icon name="receipt" size={iconSizes.xs} color={customColors.grey500} />
                                    <Text style={styles.metaText}>{trip.TR_INV_ID}</Text>
                                </View>
                            ) : null}
                            {routeValue ? (
                                <View style={styles.metaItem}>
                                    <Icon name="route" size={iconSizes.xs} color={customColors.grey500} />
                                    <Text style={styles.metaText}>Route {routeValue}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Delivery Person Row */}
                        <View style={styles.deliveryPersonContainer}>
                            <Icon
                                name="person"
                                size={iconSizes.sm}
                                color={customColors.primary}
                            />
                            <Text style={styles.deliveryPersonText}>
                                {deliveryPerson.name}
                            </Text>
                            <Text style={styles.deliveryPersonId}>
                                ID: {deliveryPerson.id}
                            </Text>
                        </View>

                        {/* Consolidated Stats Grid */}
                        <View style={styles.statsGrid}>
                            {/* Delivery Stats */}
                            <View style={styles.statsSection}>
                                <Text style={styles.statsSectionTitle}>Delivery</Text>
                                <View style={styles.statsChips}>
                                    <View style={[styles.statChip, { backgroundColor: customColors.successFaded }]}>
                                        <Text style={[styles.statChipValue, { color: customColors.successDark }]}>
                                            {deliveryStats.delivered}
                                        </Text>
                                        <Text style={[styles.statChipLabel, { color: customColors.successDark }]}>
                                            Done
                                        </Text>
                                    </View>
                                    <View style={[styles.statChip, { backgroundColor: customColors.warningFaded }]}>
                                        <Text style={[styles.statChipValue, { color: customColors.warningDark }]}>
                                            {deliveryStats.pending}
                                        </Text>
                                        <Text style={[styles.statChipLabel, { color: customColors.warningDark }]}>
                                            Pending
                                        </Text>
                                    </View>
                                    {deliveryStats.returns > 0 && (
                                        <View style={[styles.statChip, { backgroundColor: customColors.errorFaded }]}>
                                            <Text style={[styles.statChipValue, { color: customColors.errorDark }]}>
                                                {deliveryStats.returns}
                                            </Text>
                                            <Text style={[styles.statChipLabel, { color: customColors.errorDark }]}>
                                                Return
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Payment Stats */}
                            <View style={styles.statsSection}>
                                <Text style={styles.statsSectionTitle}>Payment</Text>
                                <View style={styles.statsChips}>
                                    {paymentStats.cash > 0 && (
                                        <View style={[styles.statChip, { backgroundColor: customColors.successFaded }]}>
                                            <Text style={[styles.statChipValue, { color: customColors.successDark }]}>
                                                {paymentStats.cash}
                                            </Text>
                                            <Text style={[styles.statChipLabel, { color: customColors.successDark }]}>
                                                Cash
                                            </Text>
                                        </View>
                                    )}
                                    {paymentStats.online > 0 && (
                                        <View style={[styles.statChip, { backgroundColor: customColors.infoFaded }]}>
                                            <Text style={[styles.statChipValue, { color: customColors.infoDark }]}>
                                                {paymentStats.online}
                                            </Text>
                                            <Text style={[styles.statChipLabel, { color: customColors.infoDark }]}>
                                                Online
                                            </Text>
                                        </View>
                                    )}
                                    {paymentStats.credit > 0 && (
                                        <View style={[styles.statChip, { backgroundColor: customColors.warningFaded }]}>
                                            <Text style={[styles.statChipValue, { color: customColors.warningDark }]}>
                                                {paymentStats.credit}
                                            </Text>
                                            <Text style={[styles.statChipLabel, { color: customColors.warningDark }]}>
                                                Credit
                                            </Text>
                                        </View>
                                    )}
                                    {paymentStats.partial > 0 && (
                                        <View style={[styles.statChip, { backgroundColor: customColors.secondaryFaded }]}>
                                            <Text style={[styles.statChipValue, { color: customColors.secondaryDark }]}>
                                                {paymentStats.partial}
                                            </Text>
                                            <Text style={[styles.statChipLabel, { color: customColors.secondaryDark }]}>
                                                Partial
                                            </Text>
                                        </View>
                                    )}
                                    {paymentStats.pending > 0 && (
                                        <View style={[styles.statChip, { backgroundColor: customColors.grey100 }]}>
                                            <Text style={[styles.statChipValue, { color: customColors.grey600 }]}>
                                                {paymentStats.pending}
                                            </Text>
                                            <Text style={[styles.statChipLabel, { color: customColors.grey600 }]}>
                                                Pending
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* Footer: Total Value + Orders Count */}
                        <View style={styles.totalSection}>
                            <View style={styles.totalLeft}>
                                <Icon
                                    name="shopping-bag"
                                    size={iconSizes.sm}
                                    color={customColors.grey500}
                                />
                                <Text style={styles.ordersCount}>
                                    {deliveryStats.totalOrders} Orders
                                </Text>
                            </View>
                            <View style={styles.totalRight}>
                                <Icon
                                    name="account-balance-wallet"
                                    size={iconSizes.sm}
                                    color={customColors.success}
                                />
                                <Text style={styles.totalAmount}>
                                    ₹{totalInvoiceValue.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        },
        [navigation],
    );

    const keyExtractor = useCallback(
        item => `trip-${item.Trip_Id}-${item.Trip_Date}`,
        [],
    );

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="TripSheet Summary"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialIcon"
                rightIconName="filter-list"
                onRightPress={() => setModalVisible(true)}
            />

            <FilterModal
                visible={modalVisible}
                fromDate={selectedFromDate}
                onFromDateChange={handleDateChange}
                onApply={() => setModalVisible(false)}
                onClose={handleCloseModal}
                showToDate={false}
                title="Filter options"
                fromLabel="From Date"
            />

            <View style={styles.contentContainer}>
                <View style={styles.content}>
                    <FlatList
                        data={logData}
                        renderItem={renderItem}
                        keyExtractor={keyExtractor}
                        contentContainerStyle={styles.listContainer}
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    content: {
        flex: 1,
    },
    listContainer: {
        padding: spacing.md,
    },
    tripCard: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    tripHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    tripHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    tripBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.md,
        gap: spacing.xxs,
    },
    tripBadgeText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "700",
    },
    branchBadge: {
        backgroundColor: customColors.primaryFaded,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.md,
    },
    branchBadgeText: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "600",
    },
    tripDate: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        marginBottom: spacing.sm,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xxs,
    },
    metaText: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    deliveryPersonContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    deliveryPersonText: {
        ...typography.body2(),
        color: customColors.primary,
        marginLeft: spacing.sm,
        fontWeight: "600",
        flex: 1,
    },
    deliveryPersonId: {
        ...typography.caption(),
        color: customColors.grey500,
    },
    statsGrid: {
        flexDirection: "row",
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    statsSection: {
        flex: 1,
    },
    statsSectionTitle: {
        ...typography.caption(),
        color: customColors.grey600,
        marginBottom: spacing.xxs,
        fontWeight: "600",
    },
    statsChips: {
        flexDirection: "row",
        gap: spacing.xxs,
    },
    statChip: {
        flex: 1,
        alignItems: "center",
        paddingVertical: spacing.xxs,
        paddingHorizontal: spacing.xxs,
        borderRadius: borderRadius.sm,
    },
    statChipValue: {
        ...typography.subtitle2(),
        fontWeight: "700",
    },
    statChipLabel: {
        ...typography.caption(),
        fontSize: 10,
    },
    totalSection: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: customColors.grey100,
        paddingTop: spacing.sm,
    },
    totalLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xxs,
    },
    totalRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xxs,
    },
    ordersCount: {
        ...typography.body2(),
        color: customColors.grey600,
        fontWeight: "500",
    },
    totalAmount: {
        ...typography.h6(),
        color: customColors.success,
        fontWeight: "700",
    },
});

export default TripReport;
