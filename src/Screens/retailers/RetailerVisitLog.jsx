import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import {
    customColors,
    typography,
    spacing,
    shadows,
} from "../../Config/helper";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";
import { formatTime } from "../../Config/functions";
import { visitEntryLog } from "../../Api/retailers";

const RetailerVisitLog = () => {
    const navigation = useNavigation();
    const [userId, setUserId] = useState();
    const [modalVisible, setModalVisible] = React.useState(false);

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [expandedId, setExpandedId] = useState(null);
    const [activeTab, setActiveTab] = useState('existing'); // 'all', 'existing', 'new'

    useEffect(() => {
        AsyncStorage.getItem("UserId")
            .then(uId => {
                setUserId(uId);
            })
            .catch(err => {
                console.error("Error reading UserId", err);
            });
    }, []);

    const formattedDate = selectedDate.toISOString().split("T")[0];

    const { data: allLogData = [] } = useQuery({
        queryKey: ["logData", formattedDate, userId],
        queryFn: () => visitEntryLog({ toDate: formattedDate, uId: userId }),
        enabled: !!userId && !!formattedDate,
        select: data => {
            // First, sort all data by EntryAt to ensure we process earliest entries first
            const sortedData = data.sort((a, b) => new Date(a.EntryAt) - new Date(b.EntryAt));
            
            const existingRetailersMap = {};
            const newRetailersMap = {};
            
            for (const curr of sortedData) {
                if (curr.IsExistingRetailer === 1 && curr.Retailer_Id !== null) {
                    // For existing retailers, only keep the first occurrence
                    if (!existingRetailersMap[curr.Retailer_Id]) {
                        existingRetailersMap[curr.Retailer_Id] = curr;
                    }
                } else {
                    // For new retailers, only keep the first occurrence
                    const name = (curr.Reatailer_Name || "").trim();
                    const mobile = (curr.Contact_Mobile || "").trim();
                    const key = `${name}_${mobile}`;

                    if (!newRetailersMap[key]) {
                        newRetailersMap[key] = curr;
                    }
                }
            }

            return [...Object.values(existingRetailersMap), ...Object.values(newRetailersMap)]
        }
    });

    const getFilteredData = () => {
        if (activeTab === 'existing') {
            return allLogData.filter(item => item.IsExistingRetailer === 1);
        } else if (activeTab === 'new') {
            return allLogData.filter(item => item.IsExistingRetailer === 0);
        }
        return allLogData;
    };

    const logData = getFilteredData().sort((a, b) => new Date(b.EntryAt) - new Date(a.EntryAt));
    const existingCount = allLogData.filter(item => item.IsExistingRetailer === 1).length;
    const newCount = allLogData.filter(item => item.IsExistingRetailer === 0).length;

    // Check if selected date is today
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const summaryTitle = isToday ? "Today's Visits" : selectedDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric' 
    });

    const handleDateChange = selectedDate => {
        if (selectedDate) {
            setSelectedDate(selectedDate);
        }
    };

    const renderTabButton = (tabKey, title, count) => (
        <TouchableOpacity
            style={[
                styles.tabButton,
                activeTab === tabKey && styles.activeTabButton
            ]}
            onPress={() => setActiveTab(tabKey)}>
            <Text style={[
                styles.tabButtonText,
                activeTab === tabKey && styles.activeTabButtonText
            ]}>
                {title}
            </Text>
            <View style={[
                styles.tabCountBadge,
                activeTab === tabKey && styles.activeTabCountBadge
            ]}>
                <Text style={[
                    styles.tabCountText,
                    activeTab === tabKey && styles.activeTabCountText
                ]}>
                    {count}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderRetailerCard = (item, index) => {
        const latitude = item.Latitude;
        const longitude = item.Longitude;
        const isValidCoordinates = latitude !== 0 && longitude !== 0;
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        const isExpanded = expandedId === index;
        const isExisting = item.IsExistingRetailer === 1;

        return (
            <View style={[styles.modernCard, isExpanded && styles.expandedCard]}>
                {/* Card Header */}
                <TouchableOpacity
                    style={[
                        styles.modernCardHeader,
                        isExisting ? styles.existingHeader : styles.newHeader
                    ]}
                    onPress={() => setExpandedId(isExpanded ? null : index)}
                    activeOpacity={0.8}>
                    
                    <View style={styles.headerLeft}>
                        <View style={styles.retailerInfo}>
                            <View style={styles.nameRow}>
                                <Text style={styles.modernRetailerName} numberOfLines={1}>
                                    {item.Reatailer_Name}
                                </Text>
                            </View>
                            <View style={styles.metaRow}>
                                <MaterialIcon 
                                    name="access-time" 
                                    size={14} 
                                    color="rgba(255,255,255,0.8)" 
                                />
                                <Text style={styles.modernTimestamp}>
                                    {formatTime(item.EntryAt)}
                                </Text>
                                {item.Contact_Person && (
                                    <>
                                        <View style={styles.separator} />
                                        <MaterialIcon 
                                            name="person" 
                                            size={14} 
                                            color="rgba(255,255,255,0.8)" 
                                        />
                                        <Text style={styles.contactPerson} numberOfLines={1}>
                                            {item.Contact_Person}
                                        </Text>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>

                    <View style={styles.headerRight}>
                        <MaterialIcon
                            name={isExpanded ? "expand-less" : "expand-more"}
                            size={28}
                            color="rgba(255,255,255,0.9)"
                        />
                    </View>
                </TouchableOpacity>

                {/* Expandable Content */}
                {isExpanded && (
                    <View style={styles.modernCardContent}>
                        {/* Contact Information */}
                        <View style={styles.modernInfoSection}>
                            {/* Phone */}
                            <TouchableOpacity
                                style={[styles.modernInfoItem, styles.firstInfoItem]}
                                onPress={() => Linking.openURL(`tel:${item.Contact_Mobile}`)}
                                activeOpacity={0.7}>
                                <View style={styles.iconContainer}>
                                    <MaterialIcon name="phone" size={20} color="#4CAF50" />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Phone</Text>
                                    <Text style={styles.infoValue}>{item.Contact_Mobile}</Text>
                                </View>
                                <MaterialIcon name="call" size={18} color="#4CAF50" />
                            </TouchableOpacity>

                            {/* Location */}
                            {item.Location_Address && (
                                <>
                                    <View style={styles.infoDivider} />
                                    <View style={styles.modernInfoItem}>
                                        <View style={styles.iconContainer}>
                                            <MaterialIcon name="location-on" size={20} color="#FF5722" />
                                        </View>
                                        <View style={styles.infoContent}>
                                            <Text style={styles.infoLabel}>Address</Text>
                                            <Text style={styles.infoValue} numberOfLines={3}>
                                                {item.Location_Address}
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            {/* Notes */}
                            {item.Narration && (
                                <>
                                    <View style={styles.infoDivider} />
                                    <View style={[styles.modernInfoItem, styles.lastInfoItem]}>
                                        <View style={styles.iconContainer}>
                                            <MaterialIcon name="sticky-note-2" size={20} color="#9C27B0" />
                                        </View>
                                        <View style={styles.infoContent}>
                                            <Text style={styles.infoLabel}>Notes</Text>
                                            <Text style={styles.infoValue}>
                                                {item.Narration}
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Action Button */}
                        {isValidCoordinates && (
                            <TouchableOpacity
                                style={styles.modernMapButton}
                                onPress={() => Linking.openURL(googleMapsUrl)}
                                activeOpacity={0.8}>
                                <MaterialIcon name="map" size={20} color="#ffffff" />
                                <Text style={styles.modernMapButtonText}>View Location</Text>
                                <MaterialIcon name="open-in-new" size={16} color="rgba(255,255,255,0.8)" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        );
    };

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="Daily Entries"
                navigation={navigation}
                showRightIcon={true}
                // rightIconLibrary="MaterialIcon"
                // rightIconName="add"
                // onRightPress={() => navigation.navigate("RetailerVisit")}

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
            />


            <View style={styles.contentContainer}>
                {/* Enhanced Summary Container */}
                <View style={styles.SummaryContainer}>
                    <View style={styles.summaryLeft}>
                        <View style={styles.summaryStats}>
                            <Text style={styles.summaryTitle}>{summaryTitle}</Text>
                            <View style={styles.statsRow}>
                                <Text style={styles.statNumber}>
                                    {allLogData.length}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity 
                        style={styles.addButton}
                        onPress={() => navigation.navigate("RetailerVisit")}
                        activeOpacity={0.8}
                    >
                        <MaterialIcon name="add" size={20} color={customColors.white} />
                        <Text style={styles.addButtonText}>Add Visit</Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Navigation */}
                <View style={styles.tabContainer}>
                    {/* {renderTabButton('all', 'All', allLogData.length)} */}
                    {renderTabButton('existing', 'Existing', existingCount)}
                    {renderTabButton('new', 'New', newCount)}
                </View>

                {logData && logData.length > 0 ? (
                    <ScrollView
                        style={styles.scrollContainer}
                        showsVerticalScrollIndicator={false}>
                        {logData.map((item, index) => (
                            <View key={index} style={styles.cardWrapper}>
                                {renderRetailerCard(item, index)}
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.noDataContainer}>
                        <View style={styles.noDataContent}>
                            <MaterialIcon 
                                name="store" 
                                size={64} 
                                color={customColors.grey400} 
                            />
                            <Text style={styles.noDataTitle}>No Visits Today</Text>
                            <Text style={styles.noDataMessage}>
                                Start your day by visiting retailers and building relationships
                            </Text>
                            <TouchableOpacity
                                style={styles.noDataButton}
                                onPress={() => navigation.navigate("RetailerVisit")}
                                activeOpacity={0.8}
                            >
                                <MaterialIcon name="add" size={20} color={customColors.white} />
                                <Text style={styles.noDataButtonText}>Start First Visit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
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
        padding: spacing.md,
        backgroundColor: customColors.white,
    },
    SummaryContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.md,
        backgroundColor: customColors.white,
        padding: spacing.lg,
        borderRadius: 16,
        ...shadows.medium,
        elevation: 4,
        borderLeftWidth: 4,
        borderLeftColor: customColors.primary,
    },
    summaryLeft: {
        flex: 1,
    },
    summaryStats: {
        flex: 1,
    },
    summaryTitle: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "700",
        marginBottom: spacing.sm,
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
    },
    statNumber: {
        ...typography.h5(),
        textAlign: "center",
        color: customColors.primary,
        fontWeight: "800",
        lineHeight: 28,
    },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 12,
        ...shadows.small,
        elevation: 3,
    },
    addButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
        marginLeft: spacing.xs,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: customColors.white,
        borderRadius: 12,
        marginBottom: spacing.sm,
        marginHorizontal: spacing.xs,
        padding: spacing.xs,
        ...shadows.small,
    },
    tabButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        borderRadius: 8,
    },
    activeTabButton: {
        backgroundColor: customColors.primary,
    },
    tabButtonText: {
        ...typography.body2(),
        color: customColors.grey700,
        fontWeight: "500",
        marginRight: spacing.xs,
    },
    activeTabButtonText: {
        color: customColors.white,
        fontWeight: "600",
    },
    tabCountBadge: {
        backgroundColor: customColors.grey200,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xs,
    },
    activeTabCountBadge: {
        backgroundColor: customColors.white,
    },
    tabCountText: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    activeTabCountText: {
        color: customColors.primary,
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    cardWrapper: {
        marginBottom: spacing.xs,
    },
    // Modern card styles
    modernCard: {
        backgroundColor: customColors.white,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: spacing.xs,
        marginHorizontal: 5,
        // ...shadows.medium,
        // elevation: 8,
        // shadowColor: customColors.primary,
        // shadowOpacity: 0.08,
    },
    expandedCard: {
        elevation: 3,
        shadowOpacity: 0.12,
    },
    modernCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.md,
        minHeight: 80,
    },
    existingHeader: {
        backgroundColor: customColors.primary,
    },
    newHeader: {
        backgroundColor: "#2E7D32", // Green for new retailers
    },
    headerLeft: {
        flex: 1,
        marginRight: spacing.md,
    },
    headerRight: {
        justifyContent: "center",
        alignItems: "center",
    },
    retailerInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.xs,
    },
    modernRetailerName: {
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "700",
        flex: 1,
        marginRight: spacing.sm,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
    },
    modernTimestamp: {
        ...typography.caption(),
        color: "rgba(255,255,255,0.8)",
        fontWeight: "500",
        marginLeft: spacing.xs,
        marginRight: spacing.sm,
    },
    separator: {
        width: 1,
        height: 12,
        backgroundColor: "rgba(255,255,255,0.3)",
        marginHorizontal: spacing.xs,
    },
    contactPerson: {
        ...typography.caption(),
        color: "rgba(255,255,255,0.7)",
        marginLeft: spacing.xs,
        flex: 1,
    },
    modernCardContent: {
        padding: spacing.md,
        backgroundColor: customColors.white,
    },
    modernInfoSection: {
        backgroundColor: customColors.white,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: spacing.xxs,
        // ...shadows.small,
        // elevation: 3,
    },
    modernInfoItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.sm,
        minHeight: 70,
    },
    firstInfoItem: {
        paddingTop: spacing.sm,
    },
    lastInfoItem: {
        paddingBottom: spacing.xs,
    },
    infoDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginHorizontal: spacing.lg,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#F8F9FA",
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
        marginTop: spacing.xs,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: spacing.xs,
    },
    infoValue: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "500",
        lineHeight: 20,
    },
    modernMapButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FF5722",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        ...shadows.medium,
        elevation: 4,
    },
    modernMapButtonText: {
        ...typography.button(),
        color: "#ffffff",
        fontWeight: "600",
        marginHorizontal: spacing.sm,
    },
    // No Data Container Styles
    noDataContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xxl,
    },
    noDataContent: {
        alignItems: "center",
        maxWidth: 280,
    },
    noDataTitle: {
        ...typography.h5(),
        color: customColors.grey700,
        fontWeight: "700",
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        textAlign: "center",
    },
    noDataMessage: {
        ...typography.body2(),
        color: customColors.grey600,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    noDataButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 25,
        ...shadows.medium,
        elevation: 4,
    },
    noDataButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "700",
        marginLeft: spacing.sm,
    },
});
export default RetailerVisitLog;
