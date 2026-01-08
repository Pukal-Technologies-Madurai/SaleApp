import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FeatherIcon from "react-native-vector-icons/Feather";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../../Components/AppHeader";
import { fetchRetailers } from "../../Api/retailers";
import { customColors, shadows, typography, spacing } from "../../Config/helper";

const VisitLogDetail = ({ route }) => {
    const navigation = useNavigation();
    const { person, selectedDate, visitData = [], attendanceData } = route.params || {};
    const [companyId, setCompanyId] = React.useState(null);

    const existRetailers = visitData.filter(item => item.IsExistingRetailer === 1).length;
    const newRetailers = visitData.filter(item => item.IsExistingRetailer === 0).length;

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

    const formatTime = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const distance = attendanceData?.Start_KM && attendanceData?.End_KM ?
        (attendanceData.End_KM - attendanceData.Start_KM) : 0;

    const { data: retailersMaster = [], isretailersLoading, isretailersError } = useQuery({
        queryKey: ["retailersMaster", companyId],
        queryFn: () => fetchRetailers({ companyId }),
        enabled: !!companyId,
    });

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

    const comparingTwoDataSet = () => {
        if (isretailersError) {
            return <Text style={styles.errorText}>Error loading data. Please try again.</Text>;
        }

        if (!isretailersLoading) {
            // Process all visit data (both existing and new retailers)
            const processedVisits = visitData.map(visit => {
                // For existing retailers, calculate distance if possible
                if (visit.IsExistingRetailer === 1) {
                    const masterRetailer = retailersMaster.find(
                        retailer => retailer.Retailer_Id.toString() === visit.Retailer_Id.toString()
                    );

                    if (masterRetailer) {
                        const verifiedLocation = masterRetailer.VERIFIED_LOCATION;
                        
                        // Use verified location if available, otherwise fall back to master retailer coordinates
                        let masterLat, masterLon;
                        
                        if (verifiedLocation?.latitude && verifiedLocation?.longitude) {
                            masterLat = parseFloat(verifiedLocation.latitude);
                            masterLon = parseFloat(verifiedLocation.longitude);
                        } else if (masterRetailer.Latitude && masterRetailer.Longitude) {
                            masterLat = parseFloat(masterRetailer.Latitude);
                            masterLon = parseFloat(masterRetailer.Longitude);
                        }

                        // Only proceed if we have valid coordinates
                        if (masterLat && masterLon && !isNaN(masterLat) && !isNaN(masterLon)) {
                            // Calculate distance between visit location and master/verified location
                            const distance = calculateDistance(
                                parseFloat(visit.Latitude),
                                parseFloat(visit.Longitude),
                                masterLat,
                                masterLon
                            );

                            return {
                                ...visit,
                                locationDifference: distance,
                                masterLatitude: masterLat,
                                masterLongitude: masterLon,
                                hasLocationData: true,
                                isVerifiedLocation: !!verifiedLocation?.latitude
                            };
                        }
                    }
                    return { ...visit, hasLocationData: false };
                } else {
                    // For new retailers, just return as-is
                    return { ...visit, hasLocationData: false };
                }
            });

            return processedVisits;
        }
        return [];
    };

    const renderAttendanceCard = () => (
        <View style={styles.attendanceCard}>
            <View style={styles.cardHeader}>
                <MaterialIcon name="schedule" size={24} color={customColors.primary} />
                <Text style={styles.cardTitle}>Attendance Summary</Text>
            </View>
            
            <View style={styles.attendanceGrid}>
                <View style={styles.attendanceItem}>
                    <Text style={styles.attendanceLabel}>Start Time</Text>
                    <Text style={styles.attendanceValue}>
                        {formatTime(attendanceData?.Start_Date)}
                    </Text>
                </View>
                
                <View style={styles.attendanceItem}>
                    <Text style={styles.attendanceLabel}>End Time</Text>
                    <Text style={styles.attendanceValue}>
                        {attendanceData?.End_Date ? formatTime(attendanceData.End_Date) : "Present"}
                    </Text>
                </View>

                <View style={styles.attendanceItem}>
                    <Text style={styles.attendanceLabel}>Shops</Text>
                    <Text style={[styles.attendanceValue, { color: person?.statusColor || "#666" }]}>
                        {visitData.length || 0}
                    </Text>
                </View>
                
                <View style={styles.attendanceItem}>
                    <Text style={styles.attendanceLabel}>Distance</Text>
                    <Text style={styles.attendanceValue}>{distance} KM</Text>
                </View>
            </View>
        </View>
    );

    const renderVisitCard = (visit, index) => {
        const isExisting = visit.IsExistingRetailer === 1;
        const latitude = parseFloat(visit.Latitude);
        const longitude = parseFloat(visit.Longitude);
        const hasValidCoordinates = latitude !== 0 && longitude !== 0;
        
        // Create Google Maps URL - only when master location is available for directions
        let googleMapsUrl;
        if (visit.masterLatitude && visit.masterLongitude) {
            googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${visit.Latitude},${visit.Longitude}&destination=${visit.masterLatitude},${visit.masterLongitude}`;
        }

        // Get location difference data if available
        const hasLocationDifference = visit.locationDifference && visit.hasLocationData;
        const totalDistance = hasLocationDifference ? parseFloat(visit.locationDifference.totalDistance) : 0;
        
        // Determine location accuracy status
        let locationStatus = "Unknown";
        let locationColor = customColors.grey600;
        
        if (hasLocationDifference) {
            if (totalDistance <= 0.1) {
                locationStatus = "Accurate";
                locationColor = customColors.success;
            } else if (totalDistance <= 0.5) {
                locationStatus = "Close";
                locationColor = customColors.warning;
            } else {
                locationStatus = "Far";
                locationColor = customColors.error;
            }
        }

        return (
            <View key={visit.Id} style={styles.visitCard}>
                <View style={styles.visitHeader}>
                    <View style={styles.visitTypeIndicator}>
                        <MaterialIcon 
                            name={isExisting ? "store" : "add-business"} 
                            size={20} 
                            color={isExisting ? customColors.primary : customColors.success} 
                        />
                        <Text 
                            numberOfLines={2} 
                            ellipsizeMode="tail" 
                            style={[styles.visitType, { color: isExisting ? customColors.primary : customColors.success }]}
                        >
                            {visit.Reatailer_Name?.trim()}
                        </Text>
                    </View>
                    <Text style={styles.visitTime}>{formatTime(visit.EntryAt)}</Text>
                </View>

                {/* Location Accuracy Section */}
                {hasLocationDifference && (
                    <View style={styles.locationSection}>
                        <View style={styles.locationHeader}>
                            <MaterialIcon name="my-location" size={16} color={locationColor} />
                            <Text style={[styles.locationStatus, { color: locationColor }]}>
                                {locationStatus} ({totalDistance} km)
                            </Text>
                            {(visit.masterLatitude && visit.masterLongitude) && (
                                <View style={{ justifyContent: "flex-end", alignItems: "flex-end", flex: 1 }}>
                                    <TouchableOpacity
                                        style={styles.mapButton}
                                        onPress={() => Linking.openURL(googleMapsUrl)}
                                        activeOpacity={0.8}
                                    >
                                        <FeatherIcon name="external-link" size={14} color="rgba(255,255,255,0.8)" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                        <View style={styles.locationDetails}>
                            <Text style={styles.locationDetailText}>
                                Distance from expected location: {visit.locationDifference.totalDistance} km
                            </Text>
                            <Text style={styles.locationDetailText}>
                                Lat diff: {visit.locationDifference.latDiff} km • Lon diff: {visit.locationDifference.lonDiff} km
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader 
                title={`${person?.User_Name || "Salesperson"}'s Info`} 
                navigation={navigation} 
                showRightIcon={true}
                rightIconLibrary="FeatherIcon"
                rightIconName="arrow-up-right"
                onRightPress={() => navigation.navigate("AdminAttendance", {
                    person: person
                })}
            />
            
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.contentContainer}>
                    {/* Date Header */}
                    <View style={styles.dateHeader}>
                        <MaterialIcon name="event" size={20} color={customColors.primary} />
                        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
                    </View>

                    {/* Attendance Card */}
                    {renderAttendanceCard()}

                    {/* Visits Section */}
                    <View style={styles.visitsSection}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcon name="location-city" size={20} color="#2196F3" />
                            <Text style={styles.sectionTitle}>Visit Log ({`${existRetailers} + ${newRetailers}`})</Text>
                        </View>

                        {visitData.length > 0 ? (
                            comparingTwoDataSet()
                                .sort((a, b) => new Date(b.EntryAt) - new Date(a.EntryAt))
                                .map((visit, index) => renderVisitCard(visit, index))
                        ) : (
                            <View style={styles.noVisitsContainer}>
                                <MaterialIcon name="store" size={48} color="#ccc" />
                                <Text style={styles.noVisitsText}>No visits recorded</Text>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 20 }} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default VisitLogDetail;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    contentContainer: {
        padding: spacing.md,
    },
    dateHeader: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.primaryLight + "30",
        padding: spacing.sm,
        borderRadius: 6,
        marginBottom: spacing.md,
    },
    dateText: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "700",
        marginLeft: spacing.sm,
    },
    // Attendance Card Styles
    attendanceCard: {
        backgroundColor: customColors.white,
        borderRadius: 16,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.medium,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    cardTitle: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "700",
        marginLeft: spacing.sm,
    },
    attendanceGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    attendanceItem: {
        width: "48%",
        alignItems: "center",
        backgroundColor: customColors.grey100,
        padding: spacing.md,
        borderRadius: 12,
        marginBottom: spacing.sm,
    },
    attendanceLabel: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: spacing.xs,
    },
    attendanceValue: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    // Visits Section Styles
    visitsSection: {
        marginTop: spacing.sm,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "700",
        marginLeft: spacing.xs,
    },
    visitCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.medium,
    },
    visitHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: spacing.sm,
        gap: spacing.xs,
    },
    visitTypeIndicator: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: spacing.xs,
    },
    visitType: {
        flex: 1,
        ...typography.caption(),
        fontWeight: "700",
        letterSpacing: 0.25,
        marginLeft: spacing.xs,
    },
    visitTime: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "500",
        minWidth: 65,
        textAlign: "right",
    },
    mapButton: {
        backgroundColor: customColors.error,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: 8,
    },
    mapButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
        marginHorizontal: spacing.xs,
    },
    noVisitsContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.xxl,
        backgroundColor: customColors.grey100,
        borderRadius: 12,
    },
    noVisitsText: {
        ...typography.body1(),
        color: customColors.grey500,
        fontWeight: "500",
        marginTop: spacing.sm,
    },
    // Location Accuracy Styles
    locationSection: {
        backgroundColor: "#F8F9FA",
        borderRadius: 8,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    locationHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.xs,
    },
    locationStatus: {
        ...typography.body2(),
        fontWeight: "600",
        marginLeft: spacing.xs,
    },
    locationDetails: {
        marginLeft: 20,
    },
    locationDetailText: {
        ...typography.caption(),
        color: customColors.grey600,
        lineHeight: 16,
    },
});
