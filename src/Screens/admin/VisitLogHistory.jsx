import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import React from "react";
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueries } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import FeatherIcon from "react-native-vector-icons/Feather";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { fetchRoutes, visitEntryLog } from "../../Api/retailers";
import { customColors, shadows, typography } from "../../Config/helper";
import { attendanceHistory, fetchSalespersonRoute } from "../../Api/employee";

const VisitLogHistory = ({ route }) => {
    const { selectedDate, selectedBranch } = route.params || {};
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

    const { data: attendanceData = [], isAttendanceLoading, isAttendanceError } = useQuery({
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

    const { data: visitLogData = [], isVisitLogLoading, isVisitLogError } = useQuery({
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

    const statExistRetailers = visitLogData.filter(item => item.IsExistingRetailer === 1).length;
    const statNewRetailers = visitLogData.filter(item => item.IsExistingRetailer === 0).length;

    // Create salesperson summary with visit counts
    // Get all unique person IDs from both attendance and visit data
    const allPersonIds = new Set([
        ...attendanceData.map(person => person.UserId),
        ...visitLogData.map(visit => visit.EntryBy)
    ]);

    const totalSalesPersons = allPersonIds.size;
    const uniqueSalesPersonIds = [...new Set(visitLogData.map(v => v.EntryBy))];

    // Make separate API calls for each salesperson
    const salesPersonRouteQueries = useQueries({
        queries: uniqueSalesPersonIds.map(personId => ({
            queryKey: ["salesPersonRoute", selectedFromDate, personId],
            queryFn: () => fetchSalespersonRoute(selectedFromDate, [personId]),
            enabled: !!selectedFromDate && !!personId,
            select: data => {
                return {
                    personId,
                    routes: Array.isArray(data) ? data.map(item => item.Route_Id) : []
                };
            }
        }))
    });

    // Combine all route data
    const salesPersonRoute = salesPersonRouteQueries
        .filter(query => query.data)
        .reduce((acc, query) => {
            acc[query.data.personId] = query.data.routes;
            return acc;
        }, {});

    const { data: masterRouteData = [] } = useQuery({
        queryKey: ["masterRouteData"],
        queryFn: fetchRoutes,
    });

    // Function to get route name from route ID
    const getRouteNameById = (routeId) => {
        const route = masterRouteData.find(r => r.Route_Id === routeId);
        return route?.Route_Name || "Unknown Route";
    };

    // Function to get route names for a person
    const getPersonRouteNames = (personId) => {
        const personRoutes = salesPersonRoute[personId] || [];
        return personRoutes.map(routeId => getRouteNameById(routeId)).filter(Boolean);
    };

    const salespersonSummary = Array.from(allPersonIds).map(personId => {
        // Find person in attendance data first
        const attendancePerson = attendanceData.find(person => person.UserId === personId);

        // If not in attendance, create person object from visit data
        let person;
        if (attendancePerson) {
            person = attendancePerson;
        } else {
            // Get person info from visit log data
            const sampleVisit = visitLogData.find(visit => visit.EntryBy === personId);
            if (!sampleVisit) return null; // Skip if no visit found

            person = {
                UserId: personId,
                User_Name: sampleVisit.EntryByGet,
                Start_Date: null,
                End_Date: null,
                // Add other fields as needed
            };
        }

        const personVisits = visitLogData.filter(visit => visit.EntryBy === personId);
        const existingVisits = personVisits.filter(visit => visit.IsExistingRetailer === 1).length;
        const newVisits = personVisits.filter(visit => visit.IsExistingRetailer === 0).length;
        const totalVisits = existingVisits + newVisits;

        // Get route names for this person
        const personRouteNames = getPersonRouteNames(personId);
        const routeDisplay = personRouteNames.length > 0 ? personRouteNames.join(", ") : "No Route Set";

        // Determine status based on attendance data
        let status = routeDisplay;
        let statusColor = personRouteNames.length > 0 ? "#4CAF50" : "#FF6B35"; // Green if has route, Orange if not

        if (attendancePerson) {
            const currentTime = new Date();
            const startTime = new Date(attendancePerson.Start_Date);
            const endTime = attendancePerson.End_Date ? new Date(attendancePerson.End_Date) : null;

            if (startTime && !endTime) {
                status = `${startTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                })}`;
                statusColor = "#4CAF50"; // Green
            } else if (startTime && endTime) {
                status = `${startTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                })}`;
                statusColor = "#2196F3"; // Blue
            }
        } else {
            // For delivery persons without attendance data
            status = "No Attendance";
            statusColor = "#9C27B0"; // Purple
        }

        return {
            ...person,
            totalVisits,
            existingVisits,
            newVisits,
            status,
            statusColor,
            routeNames: personRouteNames,
            routeDisplay
        };
    }).filter(Boolean); // Remove null entries

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
            <Icon name={icon} size={24} color={iconColor} style={styles.statIcon} />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
        </View>
    );

    const renderSalespersonCard = ({ item }) => {
        const isExpanded = expandedCards.has(item.UserId);
        const initials = item.User_Name ? item.User_Name.substring(0, 1).toUpperCase() : "U";
        const personVisits = visitLogData.filter(visit => visit.EntryBy === item.UserId);

        return (
            <View style={styles.salespersonCardContainer}>
                <TouchableOpacity
                    style={styles.salespersonCard}
                    onPress={() => toggleCardExpansion(item.UserId)}
                >
                    <View style={styles.cardLeft}>
                        <View style={styles.salespersonInfo}>
                            <Text style={styles.salespersonName}>{item.User_Name}</Text>
                            <Text style={[styles.salespersonStatus, { color: item.statusColor }]}>
                                {item.status}
                            </Text>
                        </View>

                        {item.routeNames.map((routeName, index) => (
                            <View key={index} style={styles.routeTag}>
                                <Text style={styles.routeTagText}>{routeName}</Text>
                            </View>
                        ))}

                    </View>
                    <View style={styles.cardRight}>
                        <Text style={styles.visitCount}>{item.totalVisits}</Text>
                        <Icon
                            name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                            size={20}
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
        const attendancePerson = attendanceData.find(att => att.UserId === person.UserId);
        
        // Calculate times and distance
        const startTime = attendancePerson?.Start_Date ? 
            new Date(attendancePerson.Start_Date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) : "Not Started";
            
        const endTime = attendancePerson?.End_Date ? 
            new Date(attendancePerson.End_Date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) : "Present";
            
        const distance = attendancePerson?.Start_KM && attendancePerson?.End_KM ?
            (attendancePerson.End_KM - attendancePerson.Start_KM) : 0;

        return (
            <View style={styles.summaryCard}>
                {/* Header with person info */}
                <View style={styles.summaryHeader}>
                    <View style={styles.summaryPersonInfo}>
                        <View style={styles.summaryStatusRow}>
                            <Icon name="access-time" size={12} color={customColors.grey600} />
                            <Text style={styles.summaryStatusText}>
                                {startTime} - {endTime}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.summaryDistance}>
                        <Icon name="directions-car" size={16} color={customColors.warning} />
                        <Text style={styles.distanceText}>{distance} KM</Text>
                    </View>
                </View>

                {/* Visit Statistics */}
                <View style={styles.summaryStats}>
                    <View style={styles.summaryStatItem}>
                        <Icon name="store" size={20} color={customColors.primaryDark} />
                        <Text style={styles.statNumber}>{person.existingVisits}</Text>
                        <Text style={styles.statLabel}>Existing</Text>
                    </View>
                    
                    <View style={styles.summaryStatDivider} />
                    
                    <View style={styles.summaryStatItem}>
                        <Icon name="add-business" size={20} color={customColors.success} />
                        <Text style={styles.statNumber}>{person.newVisits}</Text>
                        <Text style={styles.statLabel}>New Shops</Text>
                    </View>
                    
                    <View style={styles.summaryStatDivider} />
                    
                    <View style={styles.summaryStatItem}>
                        <Icon name="place" size={20} color={customColors.accent} />
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
                        visitData: visitLogData.filter(visit => visit.EntryBy === person.UserId),
                        attendanceData: attendanceData.find(att => att.UserId === person.UserId)
                    })}
                    activeOpacity={0.8}
                >
                    <View style={styles.statusContent}>
                        <Text style={styles.statusText}>Further details</Text>
                        <FeatherIcon name="chevron-right" size={16} color={customColors.primaryDark} />
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
                    {renderStatCard("Sales Persons", totalSalesPersons, "people", customColors.warning)}
                    {renderStatCard("Existing Shops", statExistRetailers, "store", customColors.primaryDark)}
                    {renderStatCard("New Shops", statNewRetailers, "add-business", customColors.success)}
                </View>

                {/* Section Header */}
                <Text style={styles.sectionTitle}>Sales Team Activity - {visitLogData.length}</Text>

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
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginHorizontal: 10,
        marginVertical: 6,
    },
    statCard: {
        backgroundColor: customColors.grey100,
        borderRadius: 12,
        padding: 10,
        alignItems: "center",
        flex: 1,
        marginHorizontal: 8,
        marginVertical: 6,
        ...shadows.medium,
    },
    statIcon: {
        marginBottom: 4,
    },
    statValue: {
        ...typography.h4(),
        fontWeight: "bold",
        color: customColors.grey900,
    },
    statTitle: {
        ...typography.body2(),
        color: customColors.grey600,
        textAlign: "center",
        fontWeight: "500",
    },
    sectionTitle: {
        ...typography.h5(),
        fontWeight: "bold",
        color: customColors.grey900,
        marginHorizontal: 10,
        marginBottom: 8,
    },
    salespersonSection: {
        paddingHorizontal: 14,
    },
    salespersonCardContainer: {
        marginBottom: 10,
        marginHorizontal: 6
    },
    salespersonCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        ...shadows.small,
        borderLeftWidth: 4,
        borderLeftColor: customColors.primaryLight,
    },
    cardLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    salespersonInfo: {
        flex: 1,
    },
    salespersonName: {
        ...typography.h5(),
        fontWeight: "600",
        color: customColors.grey900,
        marginBottom: 2,
    },
    salespersonStatus: {
        ...typography.body2(),
        fontWeight: "500",
    },
    routeTag: {
        backgroundColor: customColors.warning,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 12,
    },
    routeTagText: {
        color: customColors.black,
        ...typography.caption(),
        fontWeight: "600",
        // textTransform: 'uppercase',
    },
    cardRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    visitCount: {
        ...typography.h4(),
        fontWeight: "700",
        color: customColors.primaryDark,
        marginRight: 4,
        minWidth: 20,
        textAlign: "center",
    },
    expandedContent: {
        backgroundColor: customColors.white + "F0",
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        ...shadows.small,
    },
    // Summary Card Styles
    summaryCard: {
        backgroundColor: customColors.white,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        padding: 16,
    },
    summaryHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        // marginBottom: 16,
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
        marginLeft: 4,
        fontWeight: "500",
    },
    summaryDistance: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.warning + "33",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    distanceText: {
        ...typography.body2(),
        fontWeight: "700",
        color: customColors.warning,
        marginLeft: 2.5,
    },
    summaryStats: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: customColors.grey100,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginVertical: 12,
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
        marginHorizontal: 8,
    },
    statusIndicator: {
        alignSelf: "flex-end",
        backgroundColor: customColors.white,
        borderWidth: 1,
        borderColor: customColors.primaryLight + "33",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        elevation: 2,
    },
    statusContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    statusText: {
        color: '#2196F3',
        ...typography.body2(),
        fontWeight: '600',
        marginHorizontal: 6,
    },
})