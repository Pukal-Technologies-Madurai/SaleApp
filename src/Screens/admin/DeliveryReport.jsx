import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { API } from "../../Config/Endpoint";
import { customColors, typography, spacing, shadows, borderRadius } from "../../Config/helper";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";

const DeliveryTable = ({ deliveryData }) => {
    const [selectedFilter, setSelectedFilter] = useState("all");

    // Filter data based on selected status
    const filteredData = useMemo(() => {
        const filtered = deliveryData.filter(item => {
            if (selectedFilter === "all") return true;
            if (selectedFilter === "delivered") {
                return item.Delivery_Status === 7;
            }
            if (selectedFilter === "pending") {
                // Pending includes status 0 (NILL) and 1 (New)
                return item.Delivery_Status === 0 || item.Delivery_Status === 1;
            }
            if (selectedFilter === "return") {
                return item.Delivery_Status === 6;
            }
            if (selectedFilter === "cancel") {
                return item.Cancel_status === "0" && item.Cancel_status !== 0;
            }
            return true;
        });

        // Sort by Delivery_Time ascending; null times go to the bottom
        return filtered.sort((a, b) => {
            const timeA = a.Delivery_Time ? new Date(a.Delivery_Time).getTime() : null;
            const timeB = b.Delivery_Time ? new Date(b.Delivery_Time).getTime() : null;

            if (timeA === null && timeB === null) return 0;
            if (timeA === null) return 1;
            if (timeB === null) return -1;
            return timeA - timeB;
        });
    }, [deliveryData, selectedFilter]);

    const formatDate = dateString => {
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
    };

    const formatTime = dateString => {
        if (!dateString) return null;
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        return `${hours}:${minutes} ${ampm}`;
    };

    const { totalDelivery, pendingDelivery, returnDelivery } = useMemo(
        () =>
            deliveryData.reduce(
                (acc, item) => {
                    if (item.Delivery_Status === 7) acc.totalDelivery += 1;
                    if (item.Delivery_Status === 0 || item.Delivery_Status === 1) {
                        acc.pendingDelivery += 1;
                    }
                    if (item.Delivery_Status === 6) acc.returnDelivery += 1;
                    return acc;
                },
                { totalDelivery: 0, pendingDelivery: 0, returnDelivery: 0 },
            ),
        [deliveryData],
    );

    const getDeliveryBadgeStyle = status => {
        if (status === 6) return styles.returnBadge;
        if (status === 7) return styles.deliveredBadge;
        return styles.pendingBadge;
    };

    const getDeliveryStatus = status => {
        if (status === 0) return "Nil";
        if (status === 1) return "New";
        if (status === 6) return "Return";
        if (status === 7) return "Done";
        return "Pending";
    };

    const getStatusDisplay = item => {
        if (item.Delivery_Status === 7 || item.Delivery_Status === 6) {
            return formatTime(item.Delivery_Time) || "Done";
        }
        return getDeliveryStatus(item.Delivery_Status);
    };

    return (
        <View style={styles.tableContainer}>
            {/* Statistics Cards - Pressable for filtering */}
            <View style={styles.statsContainer}>
                <TouchableOpacity
                    style={[
                        styles.statsCard,
                        selectedFilter === "all" && styles.statsCardActive
                    ]}
                    onPress={() => setSelectedFilter("all")}
                    activeOpacity={0.7}
                >
                    <Text style={[
                        styles.statsNumber,
                        selectedFilter === "all" && styles.statsNumberActive
                    ]}>
                        {deliveryData.length}
                    </Text>
                    <Text style={[
                        styles.statsLabel,
                        selectedFilter === "all" && styles.statsLabelActive
                    ]}>Total</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.statsCard,
                        selectedFilter === "delivered" && styles.statsCardActive
                    ]}
                    onPress={() => setSelectedFilter("delivered")}
                    activeOpacity={0.7}
                >
                    <Text style={[
                        styles.statsNumber,
                        selectedFilter === "delivered" && styles.statsNumberActive
                    ]}>{totalDelivery}</Text>
                    <Text style={[
                        styles.statsLabel,
                        selectedFilter === "delivered" && styles.statsLabelActive
                    ]}>Done</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.statsCard,
                        selectedFilter === "pending" && styles.statsCardActive
                    ]}
                    onPress={() => setSelectedFilter("pending")}
                    activeOpacity={0.7}
                >
                    <Text style={[
                        styles.statsNumber,
                        selectedFilter === "pending" && styles.statsNumberActive
                    ]}>{pendingDelivery}</Text>
                    <Text style={[
                        styles.statsLabel,
                        selectedFilter === "pending" && styles.statsLabelActive
                    ]}>Pending</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.statsCard,
                        selectedFilter === "return" && styles.statsCardActive
                    ]}
                    onPress={() => setSelectedFilter("return")}
                    activeOpacity={0.7}
                >
                    <Text style={[
                        styles.statsNumber,
                        selectedFilter === "return" && styles.statsNumberActive
                    ]}>{returnDelivery}</Text>
                    <Text style={[
                        styles.statsLabel,
                        selectedFilter === "return" && styles.statsLabelActive
                    ]}>Return</Text>
                </TouchableOpacity>
            </View>

            {/* Table Header */}
            <View style={styles.headerRow}>
                <Text style={[styles.headerCell, { flex: 1.2 }]}>Date</Text>
                <Text style={[styles.headerCell, { flex: 2.5 }]}>Retailer</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>Delivery By</Text>
                <Text style={[styles.headerCell, { flex: 1.3, textAlign: "center" }]}>Status</Text>
            </View>

            {/* Table Body */}
            <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
                {filteredData.map(item => {
                    let displayName = "N/A";
                    if (item.Delivery_Person_Name === "not available" && item.Delivery_Status === 7) {
                        displayName = item.Created_BY_Name;
                    } else if (item.Delivery_Person_Name !== "not available") {
                        displayName = item.Delivery_Person_Name;
                    }

                    return (
                        <View key={item.Do_Id} style={styles.row}>
                            {/* Main Row */}
                            <Text style={[styles.cell, { flex: 1.2 }]}>
                                {formatDate(
                                    item.SalesDate === null
                                        ? item.Do_Date
                                        : item.SalesDate,
                                )}
                            </Text>
                            <Text
                                style={[styles.cell, { flex: 2.5 }]}
                                numberOfLines={3}
                            >
                                {item.Retailer_Name}
                            </Text>
                            <View style={{ flex: 2, paddingHorizontal: spacing.xs }}>
                                <Text
                                    style={styles.cell}
                                    numberOfLines={2}
                                >
                                    {displayName}
                                </Text>
                            </View>
                            <View style={[styles.statusContainer, { flex: 1.3 }]}>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        getDeliveryBadgeStyle(
                                            item.Delivery_Status,
                                        ),
                                    ]}
                                >
                                    <Text style={[
                                        styles.statusText,
                                        item.Delivery_Status === 6 && { color: customColors.error },
                                        (item.Delivery_Status === 0 || item.Delivery_Status === 1) && { color: customColors.warning },
                                        item.Delivery_Status === 7 &&  styles.statusDoneTimeText,
                                        item.Delivery_Status === 6 && { color: customColors.error }
                                    ]}>
                                        {getStatusDisplay(item)}
                                    </Text>
                                </View>
                            </View>
                            {/* Return Reason */}
                            {getDeliveryStatus(item.Delivery_Status) ===
                                "Return" && (
                                    <View style={styles.returnReasonContainer}>
                                        <Text style={styles.returnReasonLabel}>
                                            Return Reason:
                                        </Text>
                                        <Text
                                            style={styles.returnReasonText}
                                            numberOfLines={3}
                                        >
                                            {item.Narration ||
                                                item.Payment_Ref_No ||
                                                "No reason provided"}
                                        </Text>
                                        {item.Sales_Person_Name && item.Sales_Person_Name !== "unknown" && (
                                            <Text style={styles.salesPersonText}>
                                                Sales Person: {item.Sales_Person_Name}
                                            </Text>
                                        )}
                                    </View>
                                )}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const DeliveryReport = ({ route }) => {
    const { selectedDate: passedDate, selectedBranch } = route.params || {};
    const navigation = useNavigation();
    const [modalVisible, setModalVisible] = useState(false);

    const [selectedDate, setSelectedDate] = useState(
        passedDate || new Date().toISOString().split("T")[0],
    );

    const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState({
        label: "All",
        value: "all",
    });

    const {
        data: rawDeliveryData = [],
        isLoading,
        isFetching,
    } = useQuery({
        queryKey: ["today-delivery", selectedDate, selectedBranch],
        enabled: Boolean(selectedBranch && selectedDate),
        staleTime: 30000,
        queryFn: async () => {
            const url = `${API.todayDelivery()}Fromdate=${selectedDate}&Todate=${selectedDate}&Branch_Id=${selectedBranch}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();
            return data?.success ? data.data || [] : [];
        },
    });

    const deliveryData = useMemo(() => {
        if (selectedDeliveryPerson.value === "all") return rawDeliveryData;
        return rawDeliveryData.filter(
            item => String(item.Delivery_Person_Id) === String(selectedDeliveryPerson.value),
        );
    }, [rawDeliveryData, selectedDeliveryPerson.value]);

    const deliveryPersonData = useMemo(() => {
        const personMap = new Map();
        rawDeliveryData.forEach(item => {
            if (
                item.Delivery_Person_Id &&
                item.Delivery_Person_Name &&
                item.Delivery_Person_Name !== "not available"
            ) {
                personMap.set(item.Delivery_Person_Id, item.Delivery_Person_Name);
            }
        });

        return [
            { label: "All", value: "all" },
            ...Array.from(personMap, ([id, name]) => ({
                label: name,
                value: id,
            })),
        ];
    }, [rawDeliveryData]);

    const handleDateChange = async date => {
        if (date) {
            const formattedDate = date.toISOString().split("T")[0];
            setSelectedDate(formattedDate);
            setSelectedDeliveryPerson({ label: "All", value: "all" });
        }
    };

    const handleDeliveryPersonChange = item => {
        setSelectedDeliveryPerson(item);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Day-Wise Delivery"
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
                showDeliveryPerson={true}
                deliveryPersonLabel="Delivery Person"
                deliveryPersonData={deliveryPersonData}
                selectedDeliveryPerson={selectedDeliveryPerson}
                onDeliveryPersonChange={handleDeliveryPersonChange}
            />

            <View style={styles.contentContainer}>
                {isLoading || (isFetching && deliveryData.length === 0) ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={customColors.primary} />
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
        marginTop: spacing.sm,
        ...typography.h6(),
        color: customColors.grey600,
    },
    tableContainer: {
        flex: 1,
        backgroundColor: customColors.white,
        borderTopLeftRadius: borderRadius.lg,
        borderTopRightRadius: borderRadius.lg,
        overflow: "hidden",
        ...shadows.small,
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: spacing.md,
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        margin: spacing.md,
        ...shadows.small,
    },
    statsCard: {
        alignItems: "center",
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        borderRadius: borderRadius.md,
        backgroundColor: customColors.white,
    },
    statsCardActive: {
        backgroundColor: customColors.primary,
    },
    statsNumber: {
        ...typography.h4(),
        color: customColors.primary,
        fontWeight: "bold",
    },
    statsNumberActive: {
        color: customColors.white,
    },
    statsLabel: {
        ...typography.body2(),
        color: customColors.grey600,
        marginTop: spacing.xxs,
    },
    statsLabelActive: {
        color: customColors.white,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey100,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    headerCell: {
        ...typography.caption(),
        fontWeight: "600",
        color: customColors.grey700,
        paddingHorizontal: spacing.xs,
    },
    tableBody: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
        backgroundColor: customColors.white,
        flexWrap: "wrap",
    },
    cell: {
        ...typography.caption(),
        color: customColors.grey700,
        paddingHorizontal: spacing.xs,
    },
    statusContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.lg,
        backgroundColor: customColors.grey200,
    },
    deliveredBadge: {
        backgroundColor: customColors.successFaded,
    },
    pendingBadge: {
        backgroundColor: customColors.warningFaded,
    },
    returnBadge: {
        backgroundColor: customColors.errorFaded,
    },
    statusText: {
        textAlign: "center",
        ...typography.caption(),
        fontWeight: "800",
        color: customColors.success,
    },
    statusDoneTimeText: {
        textAlign: "center",
        fontWeight: "800",
        color: customColors.success,
        textTransform: "none",
        letterSpacing: 0.3,
    },
    returnReasonContainer: {
        width: "100%",
        marginTop: spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        backgroundColor: customColors.errorFaded,
        borderLeftWidth: 3,
        borderLeftColor: customColors.error,
        borderRadius: borderRadius.xs,
    },
    returnReasonLabel: {
        ...typography.caption(),
        fontWeight: "700",
        color: customColors.error,
        marginBottom: spacing.xxs,
    },
    returnReasonText: {
        ...typography.caption(),
        color: customColors.grey600,
        fontStyle: "italic",
        lineHeight: 16,
    },
    salesPersonText: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "600",
        marginTop: spacing.xs,
    },
});
