import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AppHeader from "../Components/AppHeader";
import { customColors, typography } from "../Config/helper";

const { width } = Dimensions.get("window");

const StatisticsScreen = ({ route, navigation }) => {
    const {
        title,
        userCount,
        kilometersCount,
        visitData,
        deliveryData,
        routeData,
    } = route.params;
    const [expandedUser, setExpandedUser] = React.useState(null);

    const formatTime = dateString => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    const renderSalesDetails = () => {
        if (!userCount || Object.keys(userCount).length === 0) {
            return (
                <Text style={styles.noDataText}>No sales data available</Text>
            );
        }

        return Object.entries(userCount).map(([salesPerson, details]) => (
            <View key={salesPerson} style={styles.salesPersonContainer}>
                <Text style={styles.salesPersonName}>{salesPerson}</Text>
                <View style={styles.salesDetailsRow}>
                    <Text style={styles.detailLabel}>Number of Sales: </Text>
                    <Text style={[styles.detailValue, { color: "#34495E" }]}>
                        {details.count}
                    </Text>
                </View>
                <View style={styles.salesDetailsRow}>
                    <Text style={styles.detailLabel}>Total Sales Value: </Text>
                    <Text style={[styles.detailValue, { color: "#2ECC71" }]}>
                        ₹ {details.totalValue.toFixed(2)}
                    </Text>
                </View>
            </View>
        ));
    };

    const renderVisitDetails = name => {
        const userVisits = visitData
            .filter(visit => visit.EntryByGet === name)
            .sort((a, b) => new Date(a.EntryAt) - new Date(b.EntryAt));

        return userVisits.map((visit, index) => (
            <View key={index} style={styles.visitDetailItem}>
                <Icon
                    name={
                        visit.IsExistingRetailer === 1
                            ? "check-circle"
                            : "alert-circle"
                    }
                    size={20}
                    color={
                        visit.IsExistingRetailer === 1 ? "#2ECC71" : "#E74C3C"
                    }
                />
                <Text
                    style={[
                        visit.IsExistingRetailer === 1
                            ? styles.visitDetailText
                            : styles.visitDetailText,
                        {
                            color:
                                visit.IsExistingRetailer === 1
                                    ? "#2ECC71"
                                    : "#E74C3C",
                        },
                    ]}
                    numberOfLines={3}
                    ellipsizeMode="tail">
                    {visit.Reatailer_Name || "Unknown Customer"}
                </Text>
                <Text style={styles.visitTimeText}>
                    {formatTime(visit.EntryAt)}
                </Text>
            </View>
        ));
    };

    const renderCount = (name, count) => {
        if (title === "Delivery Status") {
            const pending = deliveryData.filter(
                d =>
                    d.Delivery_Person_Name === name &&
                    (d.DeliveryStatusName === "New" ||
                        d.DeliveryStatusName === "Pending"),
            ).length;

            return (
                <Text style={styles.userCountValue}>
                    {count} ({pending} pending)
                </Text>
            );
        }

        return <Text style={styles.userCountValue}>{count}</Text>;
    };

    const renderContent = () => {
        if (title === "Sales") {
            return renderSalesDetails();
        }

        if (!userCount || Object.keys(userCount).length === 0) {
            return (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>No data available</Text>
                </View>
            );
        }

        return Object.entries(userCount).map(([name, count]) => (
            <View key={name}>
                <TouchableOpacity
                    style={styles.userCountItem}
                    onPress={() => {
                        if (title === "Check-In's") {
                            setExpandedUser(
                                expandedUser === name ? null : name,
                            );
                        }
                    }}>
                    <View style={styles.userNameContainer}>
                        <Text
                            style={styles.userCountName}
                            numberOfLines={3}
                            ellipsizeMode="tail">
                            {name} {"\n"}
                            {title !== "Check-In's" && (
                                <Text
                                    style={[
                                        styles.routeText,
                                        {
                                            color:
                                                routeData &&
                                                    routeData[name]?.routeNames
                                                        ?.length > 0
                                                    ? "#2ECC71"
                                                    : "#E74C3C",
                                        },
                                    ]}>
                                    {routeData &&
                                        routeData[name]?.routeNames?.length > 0
                                        ? `(${routeData[name].routeNames.join(", ")})`
                                        : "No Route Set"}
                                </Text>
                            )}
                        </Text>
                        {title === "Check-In's" && (
                            <Icon
                                name={
                                    expandedUser === name
                                        ? "chevron-up"
                                        : "chevron-down"
                                }
                                size={16}
                                color="#95a5a6"
                            />
                        )}
                    </View>
                    {kilometersCount && kilometersCount[name] ? (
                        <Text
                            style={[
                                styles.kmText,
                                {
                                    color:
                                        kilometersCount[name].totalKm === 0 &&
                                        "green",
                                },
                            ]}>
                            {kilometersCount[name].totalKm === 0
                                ? `Present on ${new Date(kilometersCount[name].details[0].date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`
                                : `Distance: ${kilometersCount[name].totalKm} KM`}
                        </Text>
                    ) : (
                        <Text style={styles.userCountValue}>
                            {renderCount(name, count)}
                        </Text>
                    )}
                </TouchableOpacity>

                {title === "Check-In's" || title === "Sales"
                    ? expandedUser === name && (
                        <View style={styles.visitDetailsContainer}>
                            <View style={styles.newUserCountContainer}>
                                <Text
                                    style={[
                                        styles.userCountName,
                                        visitData.filter(
                                            visit =>
                                                visit.EntryByGet === name &&
                                                visit.IsExistingRetailer ===
                                                1,
                                        ).length > 0
                                            ? { color: "#2ECC71" }
                                            : {},
                                    ]}>
                                    isExisting:{" "}
                                    {
                                        visitData.filter(
                                            visit =>
                                                visit.EntryByGet === name &&
                                                visit.IsExistingRetailer ===
                                                1,
                                        ).length
                                    }
                                </Text>
                                <Text
                                    style={[
                                        styles.userCountName,
                                        visitData.filter(
                                            visit =>
                                                visit.EntryByGet === name &&
                                                visit.IsExistingRetailer ===
                                                0,
                                        ).length > 0
                                            ? { color: "#E74C3C" }
                                            : {},
                                        { marginLeft: -18 },
                                    ]}>
                                    isNew:{" "}
                                    {
                                        visitData.filter(
                                            visit =>
                                                visit.EntryByGet === name &&
                                                visit.IsExistingRetailer ===
                                                0,
                                        ).length
                                    }
                                </Text>
                            </View>

                            {renderVisitDetails(name)}
                        </View>
                    )
                    : null}
            </View>
        ));
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                navigation={navigation}
                showDrawer={false}
                title={`${title} Statistics`}
                showBackButton={true}
                showRightIcon={true}
                rightIconLibrary="FontAwesome"
                rightIconName={title !== "Check-In's" ? "users" : "map-o"}
                onRightPress={() => {
                    navigation.navigate(title !== "Check-In's" ? "AdminAttendance" : "VisitLogSummary");
                }}
            />

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollViewContent}
                showsVerticalScrollIndicator={true}>
                {renderContent()}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    content: {
        flex: 1,
        padding: 20,
        backgroundColor: customColors.background,
    },
    scrollViewContent: {
        paddingBottom: 20,
    },
    userCountItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
        backgroundColor: customColors.white,
        borderRadius: 8,
        marginBottom: 8,
        ...customColors.shadow,
    },
    userNameContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginRight: 16,
    },
    routeText: {
        ...typography.caption(),
        fontStyle: "italic",
    },
    userCountName: {
        flexWrap: "wrap",
        width: width * 0.6,
        ...typography.body1(),
        color: "#34495E",
        marginRight: 10,
    },
    userCountValue: {
        ...typography.h6(),
        fontWeight: "bold",
        color: "#2ECC71",
    },
    kmText: {
        ...typography.body1(),
        fontWeight: "600",
        color: customColors.grey,
    },
    visitDetailsContainer: {
        backgroundColor: "#f8f9fa",
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 12,
        borderRadius: 8,
        marginTop: 4,
    },
    visitDetailItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    visitDetailText: {
        width: "60%",
        ...typography.body1(),
        color: "#34495e",
    },
    visitTimeText: {
        ...typography.body2(),
        color: "#95a5a6",
    },
    noDataContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
    },
    noDataText: {
        ...typography.h5(),
        color: "#95a5a6",
        textAlign: "center",
    },
    // Sales specific styles
    salesPersonContainer: {
        marginBottom: 15,
        padding: 15,
        backgroundColor: customColors.white,
        borderRadius: 8,
        ...customColors.shadow,
    },
    salesPersonName: {
        ...typography.h6(),
        fontWeight: "bold",
        marginBottom: 10,
        color: customColors.primary,
    },
    salesDetailsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 5,
    },
    detailLabel: {
        ...typography.body1(),
        color: "#666",
    },
    detailValue: {
        ...typography.body1(),
        fontWeight: "bold",
    },

    newUserCountContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
        alignItems: "center",
    },
});

export default StatisticsScreen;
