import { ScrollView, StyleSheet, Text, View } from "react-native";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { attendanceHistory } from "../../Api/employee";
import { customColors, typography, shadows } from "../../Config/helper";
import AppHeader from "../../Components/AppHeader";
import FilterModal from "../../Components/FilterModal";

const SummaryCard = ({ icon, title, value, color }) => (
    <View style={[styles.card, { backgroundColor: color }]}>
        <Icon name={icon} size={28} color={customColors.white} />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
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
                rightIconLibrary="MaterialIcon"
                rightIconName="filter-list"
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
                <View style={styles.summarySection}>
                    <SummaryCard
                        icon="calendar"
                        title="Total Days"
                        value={
                            attendanceData
                                ? countTotalAttendances(attendanceData)
                                : "N/A"
                        }
                        color={customColors.primary}
                    />
                    <SummaryCard
                        icon="speedometer"
                        title="Total KMs"
                        value={
                            attendanceData
                                ? calculateTotalKms(attendanceData)
                                : "N/A"
                        }
                        color={customColors.accent}
                    />
                    <SummaryCard
                        icon="alert-circle"
                        title="Unclosed"
                        value={
                            attendanceData
                                ? countUnclosedAttendances(attendanceData)
                                : "N/A"
                        }
                        color={customColors.accent2}
                    />
                </View>

                <View style={styles.tableSection}>
                    <Text style={styles.sectionTitle}>Attendance Details</Text>
                    <View style={styles.tableContainer}>
                        <View style={styles.tableHeader}>
                            <Text style={styles.headerCell}>Date</Text>
                            <Text style={styles.headerCell}>Start KM</Text>
                            <Text style={styles.headerCell}>End KM</Text>
                            <Text style={styles.headerCell}>Distance</Text>
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
                                        <Text style={styles.cell}>
                                            {new Date(
                                                item.Start_Date,
                                            ).toLocaleDateString("en-GB", {
                                                day: "2-digit",
                                                month: "2-digit",
                                            })}
                                        </Text>
                                        <Text style={styles.cell}>
                                            {item.Start_KM}
                                        </Text>
                                        <Text style={styles.cell}>
                                            {item.End_KM !== null
                                                ? item.End_KM
                                                : "N/A"}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.cell,
                                                styles.distanceCell,
                                            ]}>
                                            {calculateDistance(
                                                item.Start_KM,
                                                item.End_KM,
                                            )}
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.noDataContainer}>
                                    <MaterialIcon
                                        name="event-busy"
                                        size={48}
                                        color={customColors.grey500}
                                    />
                                    <Text style={styles.noDataText}>
                                        No attendance data available
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
        backgroundColor: customColors.white,
        paddingTop: 20,
        ...shadows.medium,
    },
    summarySection: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 15,
        marginBottom: 25,
    },
    card: {
        flex: 1,
        alignItems: "center",
        borderRadius: 12,
        padding: 15,
        marginHorizontal: 5,
        ...shadows.medium,
    },
    cardTitle: {
        ...typography.subtitle2(),
        color: customColors.white,
        marginTop: 8,
    },
    cardValue: {
        ...typography.h5(),
        color: customColors.white,
        marginTop: 4,
    },
    tableSection: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        ...typography.h6(),
        color: customColors.grey900,
        marginBottom: 15,
    },
    tableContainer: {
        flex: 1,
        backgroundColor: customColors.white,
        borderRadius: 12,
        overflow: "hidden",
        ...shadows.small,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: customColors.grey100,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    headerCell: {
        flex: 1,
        textAlign: "center",
        ...typography.subtitle2(),
        color: customColors.grey900,
    },
    tableBody: {
        flex: 1,
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    alternateRow: {
        backgroundColor: customColors.grey50,
    },
    cell: {
        flex: 1,
        ...typography.body2(),
        color: customColors.grey900,
        textAlign: "center",
    },
    distanceCell: {
        ...typography.subtitle2(),
        color: customColors.primary,
    },
    noDataContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    noDataText: {
        ...typography.body1(),
        color: customColors.grey500,
        marginTop: 10,
    },
});
