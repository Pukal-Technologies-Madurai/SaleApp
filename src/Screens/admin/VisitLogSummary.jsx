import { StyleSheet, Text, View, ActivityIndicator, ScrollView, TouchableOpacity, Linking } from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { formatTime } from "../../Config/functions";
import { customColors, shadows, typography } from "../../Config/helper";
import { fetchRetailers, visitEntryLog } from "../../Api/retailers";

const VisitLogSummary = () => {
    const navigation = useNavigation();
    const [companyId, setCompanyId] = React.useState(null);
    const [modalVisible, setModalVisible] = React.useState(false);
    const [activeSectionId, setActiveSectionId] = React.useState(null);
    const [selectedFromDate, setSelectedFromDate] = React.useState(new Date());

    React.useEffect(() => {
        const loadUserData = async () => {
            try {
                const storedCompanyId = await AsyncStorage.getItem("Company_Id");
                setCompanyId(storedCompanyId);
            } catch (err) {
                console.error("Error in VisitLogSummary useEffect", err);
            }
        };
        loadUserData();
    }, []);

    const { data: retailersMaster = [], isretailersLoading, isretailersError } = useQuery({
        queryKey: ["retailersMaster", companyId],
        queryFn: () => fetchRetailers({ companyId }),
        enabled: !!companyId,
    })

    const handleFromDateChange = selectedDate => {
        if (selectedDate) {
            setSelectedFromDate(selectedDate);
        }
    };

    const formattedDate = selectedFromDate.toISOString().split("T")[0];

    const { data: visitLogData = [], isVisitLogLoading, isVisitLogError } = useQuery({
        queryKey: ["visitLogData", formattedDate, ""],
        queryFn: () => visitEntryLog({
            toDate: formattedDate,
            uId: ""
        }),
        enabled: !!formattedDate,
    });

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    const comparingTwoDataSet = () => {
        if (isretailersError || isVisitLogError) {
            return <Text style={styles.errorText}>Error loading data. Please try again.</Text>;
        }

        if (!isretailersLoading && !isVisitLogLoading) {
            // Filter existing retailers from visit log
            const existingRetailers = visitLogData.filter(visit => visit.IsExistingRetailer === 1);

            // Calculate distances for each existing retailer
            const retailersWithDistance = existingRetailers.map(visit => {
                // Find matching retailer in master data
                const masterRetailer = retailersMaster.find(
                    retailer => retailer.Retailer_Id.toString() === visit.Retailer_Id.toString()
                );

                if (masterRetailer && masterRetailer.Latitude && masterRetailer.Longitude) {
                    // Calculate distance between visit location and master location
                    const distance = calculateDistance(
                        parseFloat(visit.Latitude),
                        parseFloat(visit.Longitude),
                        parseFloat(masterRetailer.Latitude),
                        parseFloat(masterRetailer.Longitude)
                    );

                    return {
                        ...visit,
                        locationDifference: distance,
                        masterLatitude: masterRetailer.Latitude,
                        masterLongitude: masterRetailer.Longitude,
                        hasLocationData: true
                    };
                }
                return { ...visit, hasLocationData: false }
            });

            return retailersWithDistance;
        }
        return [];
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const latDiff = Math.abs(lat1 - lat2) * 111000; // 1 degree ≈ 111km
        const lonDiff = Math.abs(lon1 - lon2) * 111000;

        // Calculate total distance using Pythagorean theorem
        const totalDistance = Math.sqrt(Math.pow(latDiff, 2) + Math.pow(lonDiff, 2));

        return {
            totalDistance: (totalDistance / 1000).toFixed(2), // Convert meters to kilometers
            latDiff: (latDiff / 1000).toFixed(2), // Convert to kilometers
            lonDiff: (lonDiff / 1000).toFixed(2)  // Convert to kilometers
        };
    };

    const renderLocationSummary = () => {
        const comparedData = comparingTwoDataSet();
        if (!comparedData?.length) return null;

        const groupedVisits = comparedData.reduce((acc, visit) => {
            if (!acc[visit.EntryByGet]) {
                acc[visit.EntryByGet] = {
                    entryBy: visit.EntryBy,
                    visits: []
                };
            }
            acc[visit.EntryByGet].visits.push(visit);
            return acc;
        }, {});

        const toggleSection = (sectionId) => {
            setActiveSectionId(prevId => prevId === sectionId ? null : sectionId);
        };

        return (
            <View style={styles.summaryContainer}>
                <View style={styles.headerContainer}>
                    <View style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <MaterialCommunityIcons
                                name="store-check"
                                size={24}
                                color={customColors.primary}
                            />
                        </View>
                        <View style={styles.statContent}>
                            <Text style={styles.statValue}>{comparedData.length}</Text>
                            <Text style={styles.statLabel}>Existing Visits</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <MaterialCommunityIcons
                                name="account-group"
                                size={24}
                                color={customColors.primary}
                            />
                        </View>
                        <View style={styles.statContent}>
                            <Text style={styles.statValue}>{Object.keys(groupedVisits).length}</Text>
                            <Text style={styles.statLabel}>Sales Persons</Text>
                        </View>
                    </View>
                </View>
                <ScrollView style={styles.summaryContent}>
                    {Object.entries(groupedVisits).map(([entryByGet, data]) => (
                        <View key={entryByGet} style={styles.accordionContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.accordionHeader,
                                    activeSectionId === entryByGet && styles.accordionHeaderActive
                                ]}
                                onPress={() => toggleSection(entryByGet)}
                            >
                                <View style={styles.headerLeft}>
                                    <Icon
                                        name={activeSectionId === entryByGet ? "chevron-down" : "chevron-right"}
                                        size={16}
                                        color={customColors.white}
                                    />
                                    <Text style={styles.salesPersonName}>
                                        {entryByGet}
                                    </Text>
                                </View>
                                <View style={styles.visitCountContainer}>
                                    <Text style={styles.visitCount}>{data.visits.length}</Text>
                                </View>
                            </TouchableOpacity>
                            {activeSectionId === entryByGet && (
                                <View style={styles.accordionContent}>
                                    {data.visits.map((visit, index) => (
                                        <View key={index} style={styles.visitCard}>
                                            <View style={styles.visitHeader}>
                                                <Text style={styles.retailerName} numberOfLines={2}>
                                                    {visit.Reatailer_Name}
                                                </Text>
                                                {visit.hasLocationData ? (
                                                    <Text style={[
                                                        styles.distanceText,
                                                        { color: visit.locationDifference?.totalDistance > 0.1 ? customColors.error : customColors.success }
                                                    ]}>
                                                        {visit.locationDifference?.totalDistance} km
                                                    </Text>
                                                ) : (
                                                    <Text style={styles.noLocationText} numberOfLines={2}>
                                                        No map data
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={styles.visitActions}>
                                                <Text style={styles.visitTime}>
                                                    {formatTime(new Date(visit.EntryAt))}
                                                </Text>
                                                {visit.hasLocationData && (
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${visit.Latitude},${visit.Longitude}+to+${visit.masterLatitude},${visit.masterLongitude}`);
                                                        }}
                                                        style={styles.mapButton}
                                                    >
                                                        <Icon name="map-marker-alt" size={14} color={customColors.white} />
                                                        <Text style={styles.mapButtonText}>View Map</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Check-In Summary"
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
                {isVisitLogLoading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={customColors.primary} />
                        <Text style={styles.loadingText}>Loading visit data...</Text>
                    </View>
                ) : (
                    <>
                        {renderLocationSummary()}
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

export default VisitLogSummary

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
        ...shadows.medium,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        ...typography.body2(),
        color: customColors.grey600,
        marginTop: 10,
    },
    summaryContainer: {
        margin: 10,
        flex: 1,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        ...shadows.medium,
    },
    statCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: customColors.primary + '15', // 15% opacity
        justifyContent: 'center',
        alignItems: 'center',
    },
    statContent: {
        flex: 1,
    },
    statValue: {
        textAlign: "center",
        ...typography.h4(),
        color: customColors.primary,
        fontWeight: "bold",
    },
    statLabel: {
        textAlign: "center",
        ...typography.caption(),
        color: customColors.grey600,
        marginTop: 2,
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: customColors.grey200,
        marginHorizontal: 16,
    },
    accordionContainer: {
        marginBottom: 8,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: customColors.white,
        ...shadows.small,
    },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: customColors.primary,
    },
    accordionHeaderActive: {
        backgroundColor: customColors.primaryDark,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    salesPersonName: {
        ...typography.subtitle1(),
        color: customColors.white,
        fontWeight: '600',
    },
    visitCountContainer: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    visitCount: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "600",
    },
    accordionContent: {
        padding: 8,
    },
    visitCard: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: customColors.primary,
        ...shadows.small,
    },
    visitHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    visitActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: customColors.grey100,
    },
    visitTime: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customColors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    mapButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontSize: 12,
    },
    retailerName: {
        flex: 1,
        ...typography.subtitle2(),
        color: customColors.grey900,
    },
    distanceText: {
        ...typography.subtitle2(),
        fontWeight: '600',
        marginLeft: 8,
    },
    summaryContent: {
        gap: 5,
    },
    errorText: {
        ...typography.body1(),
        color: customColors.error,
        textAlign: 'center',
        marginTop: 20,
    },
    noLocationText: {
        width: 60,
        textAlign: "center",
        ...typography.caption(),
        color: customColors.grey500,
        fontStyle: "italic",
    },
})