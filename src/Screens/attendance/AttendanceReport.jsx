import { ScrollView, StyleSheet, Text, View } from "react-native";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FeatherIcon from "react-native-vector-icons/Feather";
import { attendanceHistory } from "../../Api/employee";
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

const SummaryCard = ({ icon, title, value, color }) => (
    <View style={styles.card}>
        <View style={[styles.cardIconContainer, { backgroundColor: color }]}>
            <FeatherIcon name={icon} size={iconSizes.lg} color={customColors.white} />
        </View>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
    </View>
);

const AttendanceReport = () => {
    const navigation = useNavigation();

    const currentDate = new Date();
    const firstDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
    );
    const lastDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        -1,
    );

    const [uID, setUID] = useState(null);
    const [userType, setUserType] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const [selectedFromDate, setSelectedFromDate] = useState(firstDayOfMonth);
    const [selectedToDate, setSelectedToDate] = useState(currentDate);

    useEffect(() => {
        (async () => {
            try {
                const userTypeId = await AsyncStorage.getItem("userTypeId");
                const userId = await AsyncStorage.getItem("UserId");
                setUID(userId);
                setUserType(userTypeId);
            } catch (err) {
                console.log(err);
            }
        })();
    }, [selectedFromDate, selectedToDate]);

    const { data: attendanceData = [] } = useQuery({
        queryKey: [
            "attendance",
            selectedFromDate.toISOString(),
            selectedToDate.toISOString(),
            userType,
            uID,
        ],
        queryFn: () =>
            attendanceHistory({
                fromDay: selectedFromDate.toISOString(),
                toDay: selectedToDate.toISOString(),
                id: userType,
                uid: uID,
            }),
        enabled: !!selectedFromDate && !!selectedToDate && !!userType && !!uID,
    });

    const calculateDistance = (startKM, endKM) => {
        if (endKM !== null) {
            return endKM - startKM;
        }
        return "N/A";
    };

    const calculateTotalKms = data => {
        return data.reduce((total, item) => {
            if (item.End_KM !== null) {
                return total + (item.End_KM - item.Start_KM);
            }
            return total;
        }, 0);
    };

    const countTotalAttendances = data => {
        return data.length;
    };

    const countUnclosedAttendances = data => {
        return data.filter(item => item.End_KM === null).length;
    };

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Attendance Summary"
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
                onFromDateChange={date => setSelectedFromDate(date)}
                onToDateChange={date => setSelectedToDate(date)}
                onApply={() => setModalVisible(false)}
                onClose={handleCloseModal}
                showToDate={true}
                title="Select Date Range"
                fromLabel="From Date"
                toLabel="To Date"
            />

            <View style={styles.contentContainer}>
                {/* Summary Cards */}
                <View style={styles.summarySection}>
                    <SummaryCard
                        icon="calendar"
                        title="Total Days"
                        value={
                            attendanceData
                                ? countTotalAttendances(attendanceData)
                                : "0"
                        }
                        color={customColors.primary}
                    />
                    <SummaryCard
                        icon="navigation"
                        title="Total KMs"
                        value={
                            attendanceData
                                ? calculateTotalKms(attendanceData)
                                : "0"
                        }
                        color={customColors.accent}
                    />
                    <SummaryCard
                        icon="alert-circle"
                        title="Unclosed"
                        value={
                            attendanceData
                                ? countUnclosedAttendances(attendanceData)
                                : "0"
                        }
                        color={customColors.accent2}
                    />
                </View>

                <View style={styles.tableSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Attendance Details</Text>
                        <View style={styles.recordCount}>
                            <Text style={styles.recordCountText}>
                                {attendanceData?.length || 0} records
                            </Text>
                        </View>
                    </View>
                    <View style={styles.tableContainer}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.headerCell, styles.dateCell]}>Date</Text>
                            <Text style={styles.headerCell}>Start</Text>
                            <Text style={styles.headerCell}>End</Text>
                            <Text style={styles.headerCell}>KMs</Text>
                        </View>
                        <ScrollView
                            style={styles.tableBody}
                            showsVerticalScrollIndicator={false}>
                            {attendanceData && attendanceData.length > 0 ? (
                                attendanceData.map((item, index) => (
                                    <View
                                        style={[
                                            styles.tableRow,
                                            index % 2 === 0 &&
                                                styles.alternateRow,
                                        ]}
                                        key={item.Id}>
                                        <View style={[styles.cellContainer, styles.dateCell]}>
                                            <Text style={styles.dateText}>
                                                {new Date(
                                                    item.Start_Date,
                                                ).toLocaleDateString("en-GB", {
                                                    day: "2-digit",
                                                    month: "short",
                                                })}
                                            </Text>
                                        </View>
                                        <Text style={styles.cell}>
                                            {item.Start_KM}
                                        </Text>
                                        <Text style={[
                                            styles.cell,
                                            item.End_KM === null && styles.naCell
                                        ]}>
                                            {item.End_KM !== null
                                                ? item.End_KM
                                                : "--"}
                                        </Text>
                                        <View style={styles.distanceCellContainer}>
                                            <Text style={[
                                                styles.distanceCell,
                                                item.End_KM === null && styles.naDistanceCell
                                            ]}>
                                                {calculateDistance(
                                                    item.Start_KM,
                                                    item.End_KM,
                                                )}
                                            </Text>
                                            {item.End_KM !== null && (
                                                <Text style={styles.kmLabel}>km</Text>
                                            )}
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.noDataContainer}>
                                    <View style={styles.noDataIconContainer}>
                                        <FeatherIcon
                                            name="calendar"
                                            size={iconSizes.xxl}
                                            color={customColors.grey300}
                                        />
                                    </View>
                                    <Text style={styles.noDataTitle}>
                                        No Records Found
                                    </Text>
                                    <Text style={styles.noDataText}>
                                        Attendance data will appear here
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default AttendanceReport;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.grey50,
        paddingTop: spacing.md,
    },
    // Summary Cards
    summarySection: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: spacing.md,
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    card: {
        flex: 1,
        alignItems: "center",
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        ...shadows.medium,
    },
    cardIconContainer: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    cardValue: {
        ...typography.h5(),
        color: customColors.grey900,
        fontWeight: "800",
    },
    cardTitle: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: spacing.xxs,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    // Table Section
    tableSection: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    sectionTitle: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    recordCount: {
        backgroundColor: customColors.primaryLight,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.round,
    },
    recordCountText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "600",
    },
    tableContainer: {
        flex: 1,
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        overflow: "hidden",
        ...shadows.small,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: customColors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
    },
    headerCell: {
        flex: 1,
        textAlign: "center",
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    dateCell: {
        flex: 1.2,
    },
    tableBody: {
        flex: 1,
    },
    tableRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    alternateRow: {
        backgroundColor: customColors.grey50,
    },
    cellContainer: {
        flex: 1,
        alignItems: "center",
    },
    dateText: {
        ...typography.body2(),
        color: customColors.grey800,
        fontWeight: "600",
    },
    cell: {
        flex: 1,
        ...typography.body2(),
        color: customColors.grey700,
        textAlign: "center",
    },
    naCell: {
        color: customColors.grey400,
    },
    distanceCellContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    distanceCell: {
        ...typography.body1(),
        color: customColors.primary,
        fontWeight: "700",
    },
    naDistanceCell: {
        color: customColors.grey400,
        fontWeight: "400",
    },
    kmLabel: {
        ...typography.caption(),
        color: customColors.grey500,
    },
    // No Data
    noDataContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.xxl,
    },
    noDataIconContainer: {
        width: 80,
        height: 80,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    noDataTitle: {
        ...typography.h6(),
        color: customColors.grey700,
        fontWeight: "600",
        marginBottom: spacing.xs,
    },
    noDataText: {
        ...typography.body2(),
        color: customColors.grey500,
    },
});
