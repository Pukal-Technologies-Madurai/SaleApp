import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ImageBackground,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { customColors, typography } from "../../Config/helper";
import assetImages from "../../Config/Image";

const TripDetails = ({ route, navigation }) => {
    const { tripNo, tripDate, retailers, deliveryPerson } = route.params;
    // console.log(retailers);

    // Add state for filtering
    const [filterType, setFilterType] = useState(null); // null means show all

    // Calculate payment summaries using useMemo to optimize performance
    const paymentSummary = useMemo(() => {
        const summary = {
            totalAmount: 0,
            cashPaidAmount: 0,
            creditAmount: 0,
            pendingAmount: 0,
            cashPaidCount: 0,
            creditCount: 0,
            pendingCount: 0,
        };

        retailers.forEach(retailer => {
            const amount = Number(retailer.orderValue) || 0;
            summary.totalAmount += amount;

            if (retailer.paymentStatus === 3) {
                summary.cashPaidAmount += amount;
                summary.cashPaidCount++;
            } else if (retailer.paymentStatus === 1) {
                summary.creditAmount += amount;
                summary.creditCount++;
            } else {
                summary.pendingAmount += amount;
                summary.pendingCount++;
            }
        });

        return summary;
    }, [retailers]);

    // Filter retailers based on selected type
    const filteredRetailers = useMemo(() => {
        if (!filterType) return retailers;

        return retailers.filter(retailer => {
            switch (filterType) {
                case "cash":
                    return retailer.paymentStatus === 3;
                case "credit":
                    return retailer.paymentStatus === 1;
                case "pending":
                    return retailer.paymentStatus === 0;
                default:
                    return true;
            }
        });
    }, [retailers, filterType]);

    // Handle summary card tap
    const handleSummaryCardTap = type => {
        setFilterType(filterType === type ? null : type); // Toggle filter
    };

    const renderRetailerItem = ({ item }) => (
        <View style={styles.retailerCard}>
            <View style={styles.retailerHeader}>
                <Text style={styles.retailerName}>{item.name}</Text>
                <Text style={styles.retailerId}>ID: {item.id}</Text>
            </View>

            <View style={styles.detailsRow}>
                <Icon
                    name="location-on"
                    size={16}
                    color={customColors.primary}
                />
                <Text style={styles.locationText}>
                    {item.location || "Location not available"}
                </Text>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Order Value:</Text>
                    <Text style={styles.statValue}>₹{item.orderValue}</Text>
                </View>

                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Status:</Text>
                    <Text
                        style={[
                            styles.statValue,
                            {
                                color:
                                    item.deliveryStatus === 7
                                        ? customColors.success
                                        : customColors.warning,
                            },
                        ]}>
                        {item.deliveryStatus === 7 ? "Delivered" : "Pending"}
                    </Text>
                </View>

                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Payment:</Text>
                    <Text
                        style={[
                            styles.statValue,
                            {
                                color:
                                    item.paymentStatus === 3
                                        ? customColors.success
                                        : item.paymentStatus === 1
                                          ? customColors.grey
                                          : customColors.warning,
                            },
                        ]}>
                        {item.paymentStatus === 3
                            ? "Paid"
                            : item.paymentStatus === 1
                              ? "Credit"
                              : "Pending"}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headerContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Icon
                                name="arrow-back"
                                size={25}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        <Text style={styles.headerText}>
                            Trip #{tripNo} Details
                        </Text>
                    </View>

                    <View style={styles.content}>
                        {/* Payment Summary Cards */}
                        <View style={styles.summaryContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.summaryCard,
                                    { backgroundColor: customColors.primary },
                                    filterType === null && styles.selectedCard,
                                ]}
                                onPress={() => handleSummaryCardTap(null)}>
                                <Text style={styles.summaryTitle}>
                                    Total Collection
                                </Text>
                                <Text style={styles.summaryAmount}>
                                    ₹{paymentSummary.totalAmount}
                                </Text>
                                <Text style={styles.summaryCount}>
                                    {retailers.length} Orders
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.summaryCard,
                                    { backgroundColor: customColors.success },
                                    filterType === "cash" &&
                                        styles.selectedCard,
                                ]}
                                onPress={() => handleSummaryCardTap("cash")}>
                                <Text style={styles.summaryTitle}>
                                    Cash Collected
                                </Text>
                                <Text style={styles.summaryAmount}>
                                    ₹{paymentSummary.cashPaidAmount}
                                </Text>
                                <Text style={styles.summaryCount}>
                                    {paymentSummary.cashPaidCount} Orders
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.summaryCard,
                                    { backgroundColor: customColors.warning },
                                    filterType === "credit" &&
                                        styles.selectedCard,
                                ]}
                                onPress={() => handleSummaryCardTap("credit")}>
                                <Text style={styles.summaryTitle}>
                                    Credit/Other
                                </Text>
                                <Text style={styles.summaryAmount}>
                                    ₹{paymentSummary.creditAmount}
                                </Text>
                                <Text style={styles.summaryCount}>
                                    {paymentSummary.creditCount} Orders
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Filter indicator */}
                        {filterType && (
                            <View style={styles.filterIndicator}>
                                <Text style={styles.filterText}>
                                    Showing{" "}
                                    {filterType === "cash"
                                        ? "Cash Collected"
                                        : filterType === "credit"
                                          ? "Credit/Other"
                                          : "All"}{" "}
                                    Orders
                                </Text>
                                <TouchableOpacity
                                    style={styles.clearFilter}
                                    onPress={() => setFilterType(null)}>
                                    <Text style={styles.clearFilterText}>
                                        Clear Filter
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.tripInfoContainer}>
                            <View style={styles.deliveryPersonInfo}>
                                <Icon
                                    name="person"
                                    size={20}
                                    color={customColors.primary}
                                />
                                <Text style={styles.deliveryPersonText}>
                                    {deliveryPerson.name} (ID:{" "}
                                    {deliveryPerson.id})
                                </Text>
                            </View>
                            <Text style={styles.tripDate}>
                                {new Date(tripDate).toLocaleDateString()}
                            </Text>
                        </View>

                        <FlatList
                            data={filteredRetailers}
                            renderItem={renderRetailerItem}
                            keyExtractor={item => `${item.id}-${item.name}`}
                            contentContainerStyle={styles.listContainer}
                        />
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.2)",
    },
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
    },
    headerText: {
        ...typography.h4(),
        color: customColors.white,
        marginLeft: 10,
    },
    content: {
        flex: 1,
        backgroundColor: customColors.white,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        overflow: "hidden",
    },
    tripInfoContainer: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    deliveryPersonInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    deliveryPersonText: {
        ...typography.body1(),
        color: customColors.primary,
        marginLeft: 8,
    },
    tripDate: {
        ...typography.body2(),
        color: customColors.grey,
    },
    listContainer: {
        padding: 15,
    },
    retailerCard: {
        backgroundColor: customColors.white,
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    retailerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    retailerName: {
        ...typography.h6(),
        color: customColors.primary,
        flex: 1,
    },
    retailerId: {
        ...typography.caption(),
        color: customColors.grey,
    },
    detailsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    locationText: {
        ...typography.body2(),
        color: customColors.grey,
        marginLeft: 5,
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: "#eee",
        paddingTop: 10,
    },
    stat: {
        alignItems: "center",
    },
    statLabel: {
        ...typography.caption(),
        color: customColors.grey,
    },
    statValue: {
        ...typography.body2(),
        color: customColors.grey,
        fontWeight: "600",
        marginTop: 2,
    },
    summaryContainer: {
        flexDirection: "row",
        padding: 15,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        gap: 10,
    },
    summaryCard: {
        flex: 1,
        borderRadius: 10,
        padding: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    summaryTitle: {
        ...typography.caption(),
        color: customColors.white,
        marginBottom: 4,
    },
    summaryAmount: {
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "bold",
    },
    summaryCount: {
        ...typography.caption(),
        color: customColors.white,
        marginTop: 4,
    },
    selectedCard: {
        borderWidth: 2,
        borderColor: customColors.white,
    },
    filterIndicator: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 15,
        paddingVertical: 8,
        backgroundColor: "rgba(0,0,0,0.05)",
    },
    filterText: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "500",
    },
    clearFilter: {
        padding: 5,
    },
    clearFilterText: {
        ...typography.caption(),
        color: customColors.error,
        fontWeight: "500",
    },
});

export default TripDetails;
