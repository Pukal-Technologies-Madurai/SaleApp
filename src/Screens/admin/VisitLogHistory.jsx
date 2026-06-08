import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import React from "react";
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import FeatherIcon from "react-native-vector-icons/Feather";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { fetchRoutes, visitEntryLog } from "../../Api/retailers";
import { customColors, shadows, typography, spacing, borderRadius, iconSizes } from "../../Config/helper";
import { attendanceHistory, fetchSalespersonRoute } from "../../Api/employee";

const VisitLogHistory = ({ route }) => {
    const { selectedDate } = route.params || {};
    const navigation = useNavigation();

    const [userType, setUserType] = React.useState(null);
    const [modalVisible, setModalVisible] = React.useState(false);
    const [selectedFromDate, setSelectedFromDate] = React.useState(selectedDate || null);
    const [expandedCards, setExpandedCards] = React.useState(new Set());

    React.useEffect(() => {
        (async () => {
            try {
                const userTypeId = await AsyncStorage.getItem("userTypeId");
                setUserType(userTypeId);
            } catch (err) {
                console.error(err);
            }
        })();
    }, [selectedFromDate]);

    const finalUid = "";

    const { data: attendanceData = [] } = useQuery({
        queryKey: [
            "attendance",
            selectedFromDate,
            selectedFromDate,
            userType,
            finalUid,
        ],
        queryFn: () =>
            attendanceHistory({
                fromDay: selectedFromDate,
                toDay: selectedFromDate,
                id: userType,
                uid: finalUid,
            }),
        enabled:
            !!selectedFromDate && !!selectedFromDate && !!userType,
    });

    const { data: visitLogData = [] } = useQuery({
        queryKey: ["visitLogData", selectedFromDate, finalUid],
        queryFn: () => visitEntryLog({
            toDate: selectedFromDate,
            uId: finalUid,
        }),
        enabled: !!selectedFromDate,
        select: data => {
            const existingRetailersMap = {};
            const newRetailersMap = {};

            for (const curr of data) {
                if (curr.IsExistingRetailer === 1 && curr.Retailer_Id !== null) {
                    // For existing retailers, deduplicate by Retailer_Id
                    // Keep the FIRST entry (earliest EntryAt)
                    if (!existingRetailersMap[curr.Retailer_Id] ||
                        new Date(curr.EntryAt) < new Date(existingRetailersMap[curr.Retailer_Id].EntryAt)) {
                        existingRetailersMap[curr.Retailer_Id] = curr;
                    }
                } else {
                    // For new retailers, deduplicate by name + mobile combination
                    const key = `${curr.Reatailer_Name}_${curr.Contact_Mobile}`;

                    // Keep the FIRST entry (earliest EntryAt)
                    if (!newRetailersMap[key] ||
                        new Date(curr.EntryAt) < new Date(newRetailersMap[key].EntryAt)) {
                        newRetailersMap[key] = curr;
                    }
                }
            }

            return [...Object.values(existingRetailersMap), ...Object.values(newRetailersMap)]
        }
    });

    const statExistRetailers = React.useMemo(
        () => visitLogData.filter(item => item.IsExistingRetailer === 1).length,
        [visitLogData],
    );
    const statNewRetailers = React.useMemo(
        () => visitLogData.filter(item => item.IsExistingRetailer === 0).length,
        [visitLogData],
    );

    const attendanceByPerson = React.useMemo(() => {
        const result = {};
        attendanceData.forEach(person => {
            result[person.UserId] = person;
        });
        return result;
    }, [attendanceData]);

    const visitStatsByPerson = React.useMemo(() => {
        const result = {};

        visitLogData.forEach(visit => {
            if (!result[visit.EntryBy]) {
                result[visit.EntryBy] = {
                    visits: [],
                    existingVisits: 0,
                    newVisits: 0,
                    totalVisits: 0,
                };
            }

            result[visit.EntryBy].visits.push(visit);
            result[visit.EntryBy].totalVisits += 1;

            if (visit.IsExistingRetailer === 1) {
                result[visit.EntryBy].existingVisits += 1;
            } else {
                result[visit.EntryBy].newVisits += 1;
            }
        });

        return result;
    }, [visitLogData]);

    const allPersonIds = React.useMemo(() => {
        const uniqueIds = new Set([
            ...attendanceData.map(person => person.UserId),
            ...visitLogData.map(visit => visit.EntryBy),
        ]);
        return Array.from(uniqueIds);
    }, [attendanceData, visitLogData]);

    const totalSalesPersons = allPersonIds.length;

    const { data: routeAssignmentData = [] } = useQuery({
        queryKey: ["salesPersonRouteBatch", selectedFromDate, allPersonIds.join(",")],
        queryFn: async () => {
            if (!selectedFromDate || allPersonIds.length === 0) return [];

            const routesByPerson = await Promise.all(
                allPersonIds.map(async personId => {
                    try {
                        const personRoutes = await fetchSalespersonRoute(selectedFromDate, personId);
                        return Array.isArray(personRoutes) ? personRoutes : [];
                    } catch {
                        return [];
                    }
                }),
            );

            return routesByPerson.flat();
        },
        enabled: !!selectedFromDate && allPersonIds.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    const { data: masterRouteData = [] } = useQuery({
        queryKey: ["masterRouteData"],
        queryFn: fetchRoutes,
        staleTime: 30 * 60 * 1000,
    });

    const routeNameById = React.useMemo(() => {
        const result = {};
        masterRouteData.forEach(routeItem => {
            result[routeItem.Route_Id] = routeItem.Route_Name;
        });
        return result;
    }, [masterRouteData]);

    const routeSummaryByPerson = React.useMemo(() => {
        const result = {};

        routeAssignmentData.forEach(item => {
            const personId = item.User_Id;

            if (!result[personId]) {
                result[personId] = {
                    activeRoutes: {},
                    inactiveRoutes: {},
                };
            }

            const routeName = routeNameById[item.Route_Id] || "Unknown Route";
            const retailerCount = Number(item.total_retailer_count) || 0;
            const routeBucket = item.IsActive === 1
                ? result[personId].activeRoutes
                : result[personId].inactiveRoutes;

            routeBucket[item.Route_Id] = {
                routeId: item.Route_Id,
                routeName,
                shopCount: retailerCount,
            };
        });

        const normalizedResult = {};
        Object.keys(result).forEach(personId => {
            normalizedResult[personId] = {
                activeRoutes: Object.values(result[personId].activeRoutes),
                inactiveRoutes: Object.values(result[personId].inactiveRoutes),
            };
        });

        return normalizedResult;
    }, [routeAssignmentData, routeNameById]);

    const formatTime = dateString => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    const salespersonSummary = React.useMemo(() => allPersonIds.map(personId => {
        const attendancePerson = attendanceByPerson[personId];
        const personVisitStats = visitStatsByPerson[personId] || {
            visits: [],
            existingVisits: 0,
            newVisits: 0,
            totalVisits: 0,
        };
        const personRoute = routeSummaryByPerson[personId] || {
            activeRoutes: [],
            inactiveRoutes: [],
        };

        const activeRoutes = personRoute.activeRoutes;
        const inactiveRoutes = personRoute.inactiveRoutes;
        const hasAnyRoute = activeRoutes.length > 0 || inactiveRoutes.length > 0;

        let person;
        if (attendancePerson) {
            person = attendancePerson;
        } else {
            const sampleVisit = personVisitStats.visits[0];
            if (!sampleVisit) return null;

            person = {
                UserId: personId,
                User_Name: sampleVisit.EntryByGet,
                Start_Date: null,
                End_Date: null,
            };
        }

        let status = hasAnyRoute ? "Route Assigned" : "No Route";
        let statusColor = hasAnyRoute ? "#4CAF50" : "#FF6B35";

        if (attendancePerson) {
            const startTime = formatTime(attendancePerson.Start_Date);
            const endTime = formatTime(attendancePerson.End_Date);

            if (startTime && endTime) {
                status = `${startTime} - ${endTime}`;
                statusColor = "#2196F3";
            } else if (startTime) {
                status = startTime;
                statusColor = "#4CAF50";
            }
        } else {
            status = "No Attendance";
            statusColor = "#9C27B0";
        }

        return {
            ...person,
            totalVisits: personVisitStats.totalVisits,
            existingVisits: personVisitStats.existingVisits,
            newVisits: personVisitStats.newVisits,
            status,
            statusColor,
            activeRoutes,
            inactiveRoutes,
            personVisits: personVisitStats.visits,
        };
    }).filter(Boolean), [allPersonIds, attendanceByPerson, routeSummaryByPerson, visitStatsByPerson]);

    const handleFromDateChange = date => {
        if (date) {
            const formattedDate = date.toISOString().split("T")[0];
            setSelectedFromDate(formattedDate);
        }
    };

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    const toggleCardExpansion = (userId) => {
        const newExpandedCards = new Set();
        if (expandedCards.has(userId)) {
            // If the clicked card is already expanded, close it
            // newExpandedCards remains empty, so all cards are closed
        } else {
            // If the clicked card is not expanded, expand only this one
            newExpandedCards.add(userId);
        }
        setExpandedCards(newExpandedCards);
    };

    const renderStatCard = (title, value, icon, iconColor) => (
        <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
                <Icon name={icon} size={iconSizes.md} color={iconColor} style={styles.statIcon} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle} numberOfLines={2}>{title}</Text>
        </View>
    );

    const renderSalespersonCard = ({ item }) => {
        const isExpanded = expandedCards.has(item.UserId);
        const hasActiveRoute = item.activeRoutes.length > 0;
        const activeRouteInfo = item.activeRoutes
            .map(route => `${route.routeName} - ${route.shopCount} shops`)
            .join(", ");
        const hasSecondaryRoute = item.inactiveRoutes.length > 0;
        const secondaryRouteInfo = item.inactiveRoutes
            .map(route => `${route.routeName} - ${route.shopCount} shops`)
            .join(", ");

        return (
            <View style={styles.salespersonCardContainer}>
                <TouchableOpacity
                    style={styles.salespersonCard}
                    onPress={() => toggleCardExpansion(item.UserId)}
                >
                    <View style={styles.cardLeft}>
                        <Text style={styles.salespersonName} numberOfLines={1}>{item.User_Name}</Text>
                        <Text style={[styles.salespersonStatus, { color: item.statusColor }]} numberOfLines={1}>
                            {item.status}
                        </Text>

                        {hasActiveRoute && (
                            <View style={styles.routeStatusRow}>
                                <Text style={[styles.routeMetaText, { color: customColors.success }]} numberOfLines={1}>
                                    {activeRouteInfo}
                                </Text>
                            </View>
                        )}

                        {hasSecondaryRoute && (
                            <View style={styles.routeStatusRow}>
                                <Text style={[styles.routeMetaText, { color: customColors.warning }]} numberOfLines={1}>
                                    {secondaryRouteInfo}
                                </Text>
                            </View>
                        )}

                    </View>
                    <View style={styles.cardRight}>
                        <Text style={styles.visitCount}>{item.totalVisits}</Text>
                        <Icon
                            name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                            size={iconSizes.md}
                            color={customColors.grey600}
                        />
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.expandedContent}>
                        {renderSummaryCard(item)}
                    </View>
                )}
            </View>
        );
    };

    const renderSummaryCard = (person) => {
        const attendancePerson = attendanceByPerson[person.UserId] || null;
        const personVisits = person.personVisits || [];
        
        // Calculate times and distance
        const startTime = formatTime(attendancePerson?.Start_Date) || "Not Started";
            
        const endTime = formatTime(attendancePerson?.End_Date) || "Present";
            
        const distance = attendancePerson?.Start_KM && attendancePerson?.End_KM ?
            (Number(attendancePerson.End_KM) - Number(attendancePerson.Start_KM)) : 0;

        return (
            <View style={styles.summaryCard}>
                {/* Header with person info */}
                <View style={styles.summaryHeader}>
                    <View style={styles.summaryPersonInfo}>
                        <View style={styles.summaryStatusRow}>
                            <Icon name="access-time" size={iconSizes.xs} color={customColors.grey600} />
                            <Text style={styles.summaryStatusText}>
                                {startTime} - {endTime}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.summaryDistance}>
                        <Icon name="directions-car" size={iconSizes.sm} color={customColors.warning} />
                        <Text style={styles.distanceText}>{distance} KM</Text>
                    </View>
                </View>

                {/* Visit Statistics */}
                <View style={styles.summaryStats}>
                    <View style={styles.summaryStatItem}>
                        <Icon name="store" size={iconSizes.md} color={customColors.primaryDark} />
                        <Text style={styles.statNumber}>{person.existingVisits}</Text>
                        <Text style={styles.statLabel}>Existing</Text>
                    </View>
                    
                    <View style={styles.summaryStatDivider} />
                    
                    <View style={styles.summaryStatItem}>
                        <Icon name="add-business" size={iconSizes.md} color={customColors.success} />
                        <Text style={styles.statNumber}>{person.newVisits}</Text>
                        <Text style={styles.statLabel}>New Shops</Text>
                    </View>
                    
                    <View style={styles.summaryStatDivider} />
                    
                    <View style={styles.summaryStatItem}>
                        <Icon name="place" size={iconSizes.md} color={customColors.accent} />
                        <Text style={styles.statNumber}>{person.totalVisits}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                </View>

                {/* Status Indicator */}
                <TouchableOpacity 
                    style={styles.statusIndicator} 
                    onPress={() => navigation.navigate("VisitLogDetail", { 
                        person: person,
                        selectedDate: selectedFromDate,
                        visitData: personVisits,
                        attendanceData: attendancePerson,
                        routeData: {
                            activeRoutes: person.activeRoutes,
                            inactiveRoutes: person.inactiveRoutes,
                        },
                    })}
                    activeOpacity={0.8}
                >
                    <View style={styles.statusContent}>
                        <Text style={styles.statusText}>Further details</Text>
                        <FeatherIcon name="chevron-right" size={iconSizes.sm} color={customColors.primaryDark} />
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Salesperson Tracking"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialIcon"
                rightIconName="filter-list"
                onRightPress={() => setModalVisible(true)}
            />

            <FilterModal
                visible={modalVisible}
                fromDate={selectedFromDate}
                onFromDateChange={handleFromDateChange}
                onApply={() => setModalVisible(false)}
                onClose={handleCloseModal}
                showToDate={false}
                title="Filter options"
                fromLabel="From Date"
            />

            <View style={styles.contentContainer}>
                {/* Statistics Cards */}
                <View style={styles.statsContainer}>
                    {renderStatCard("Staffs", totalSalesPersons, "people", customColors.warning)}
                    {renderStatCard("Existing Shops", statExistRetailers, "store", customColors.primaryDark)}
                    {renderStatCard("New Shops", statNewRetailers, "add-business", customColors.success)}
                </View>

                {/* Section Header */}
                <Text style={styles.sectionTitle}>Team Activity - {visitLogData.length}</Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Salesperson List */}
                    <View style={styles.salespersonSection}>
                        <FlashList
                            data={salespersonSummary}
                            renderItem={renderSalespersonCard}
                            keyExtractor={(item) => item.UserId.toString()}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        />
                    </View>

                    {/* Add some bottom padding */}
                    <View style={{ height: 20 }} />
                </ScrollView>
            </View>
        </SafeAreaView>
    )
}

export default VisitLogHistory

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
        overflow: "hidden",
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal: spacing.md,
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    statCard: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.xxs,
        paddingVertical: spacing.xs,
        alignItems: "center",
        flex: 1,
        marginHorizontal: spacing.xxs,
        minHeight: 108,
        borderWidth: 1,
        borderColor: customColors.grey300,
        ...shadows.small,
    },
    statIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        // backgroundColor: customColors.grey100,
    },
    statIcon: {
        marginBottom: 0,
    },
    statValue: {
        ...typography.h4(),
        fontWeight: "bold",
        color: customColors.grey900,
        marginTop: spacing.xxs,
    },
    statTitle: {
        ...typography.caption(),
        color: customColors.grey600,
        textAlign: "center",
        fontWeight: "600",
        lineHeight: 18,
        marginTop: 2,
    },
    sectionTitle: {
        ...typography.h5(),
        fontWeight: "bold",
        color: customColors.grey900,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        marginTop: spacing.xs,
    },
    salespersonSection: {
        paddingHorizontal: spacing.md,
    },
    salespersonCardContainer: {
        marginBottom: spacing.sm,
        marginHorizontal: spacing.xs,
    },
    salespersonCard: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        ...shadows.small,
        borderLeftWidth: 4,
        borderLeftColor: customColors.primaryLight,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    cardLeft: {
        flex: 1,
        marginRight: spacing.md,
    },
    salespersonInfo: {
        flex: 1,
    },
    salespersonName: {
        ...typography.h5(),
        fontWeight: "600",
        color: customColors.grey900,
        marginBottom: spacing.xxs,
    },
    salespersonStatus: {
        ...typography.body2(),
        fontWeight: "500",
        marginTop: spacing.xxs,
    },
    routeMetaText: {
        ...typography.caption(),
        color: customColors.primaryDark,
        marginTop: spacing.xxs,
        fontWeight: "600",
        flex: 1,
    },
    routeMetaEmptyText: {
        ...typography.caption(),
        color: customColors.grey600,
        marginTop: spacing.xxs,
        fontWeight: "500",
        flex: 1,
    },
    routeStatusRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: spacing.xxs,
    },
    cardRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    visitCount: {
        ...typography.h4(),
        fontWeight: "700",
        color: customColors.primaryDark,
        marginRight: spacing.xxs,
        minWidth: 20,
        textAlign: "center",
    },
    expandedContent: {
        backgroundColor: customColors.white + "F0",
        borderBottomLeftRadius: borderRadius.lg,
        borderBottomRightRadius: borderRadius.lg,
        ...shadows.small,
    },
    // Summary Card Styles
    summaryCard: {
        backgroundColor: customColors.white,
        borderBottomLeftRadius: borderRadius.lg,
        borderBottomRightRadius: borderRadius.lg,
        padding: spacing.md,
    },
    summaryHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    summaryPersonInfo: {
        flex: 1,
    },
    summaryStatusRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    summaryStatusText: {
        ...typography.body2(),
        color: customColors.grey600,
        marginLeft: spacing.xxs,
        fontWeight: "500",
    },
    summaryDistance: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.warningFaded,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.lg,
    },
    distanceText: {
        ...typography.body2(),
        fontWeight: "700",
        color: customColors.warning,
        marginLeft: spacing.xxs,
    },
    summaryStats: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: customColors.grey100,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginVertical: spacing.sm,
    },
    summaryStatItem: {
        alignItems: "center",
        flex: 1,
    },
    statNumber: {
        ...typography.h5(),
        textAlign: "center",
        color: customColors.grey900,
        fontWeight: "800",
    },
    statLabel: {
        textAlign: "center",
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    summaryStatDivider: {
        width: 1,
        height: 40,
        backgroundColor: customColors.grey300,
        marginHorizontal: spacing.sm,
    },
    statusIndicator: {
        alignSelf: "flex-end",
        backgroundColor: customColors.white,
        borderWidth: 1,
        borderColor: customColors.primaryFaded,
        borderRadius: borderRadius.round,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        ...shadows.small,
    },
    statusContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    statusText: {
        color: customColors.primary,
        ...typography.body2(),
        fontWeight: "600",
        marginHorizontal: spacing.xs,
    },
})