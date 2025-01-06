import {
    Image,
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { customColors, typography } from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import assetImages from "../../Config/Image";

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

    const [attendanceData, setAttendanceData] = useState(null);
    const [show, setShow] = useState(false);
    const [selectedFromDate, setSelectedFromDate] = useState(firstDayOfMonth);
    const [selectedToDate, setSelectedToDate] = useState(lastDayOfMonth);
    const [isSelectingFromDate, setIsSelectingFromDate] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const userTypeId = await AsyncStorage.getItem("userTypeId");
                const UserId = await AsyncStorage.getItem("UserId");
                fetchAttendance(
                    selectedFromDate.toISOString(),
                    selectedToDate.toISOString(),
                    userTypeId,
                    UserId,
                );
            } catch (err) {
                console.log(err);
            }
        })();
    }, [selectedFromDate, selectedToDate]);

    const selectDateFn = (event, selectedDate) => {
        setShow(Platform.OS === "ios");
        if (selectedDate) {
            if (isSelectingFromDate) {
                setSelectedFromDate(selectedDate);
                if (selectedDate > selectedToDate) {
                    setSelectedToDate(selectedDate);
                }
            } else {
                setSelectedToDate(selectedDate);
                if (selectedDate < selectedFromDate) {
                    setSelectedFromDate(selectedDate);
                }
            }
        }
    };

    const showDatePicker = isFrom => {
        setShow(true);
        setIsSelectingFromDate(isFrom);
    };

    const fetchAttendance = async (fromDay, toDay, id, uid) => {
        try {
            const response = await fetch(
                `${API.attendanceHistory}From=${fromDay}&To=${toDay}&UserTypeID=${id}&UserId=${uid}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );
            const data = await response.json();
            if (data.success === true) {
                setAttendanceData(data.data);
            } else {
                console.log("Failed to fetch logs: ", data.message);
            }
        } catch (error) {
            console.log("Error fetching logs:", error);
        }
    };

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

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headersContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <MaterialIcon
                                name="arrow-back"
                                size={25}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        <Text
                            style={styles.headersText}
                            maxFontSizeMultiplier={1.2}>
                            Attendance Report
                        </Text>
                    </View>

                    <View style={styles.datePickerContainer}>
                        <DatePickerButton
                            title="From"
                            date={selectedFromDate}
                            onPress={() => showDatePicker(true)}
                        />
                        <DatePickerButton
                            title="To"
                            date={selectedToDate}
                            onPress={() => showDatePicker(false)}
                        />
                    </View>

                    {show && (
                        <DateTimePicker
                            value={
                                isSelectingFromDate
                                    ? selectedFromDate
                                    : selectedToDate
                            }
                            onChange={selectDateFn}
                            mode="date"
                            display="default"
                        />
                    )}

                    <View style={styles.cardContainer}>
                        <SummaryCard
                            icon="person-add"
                            title="Day Count"
                            value={
                                attendanceData
                                    ? countTotalAttendances(attendanceData)
                                    : "N/A"
                            }
                        />
                        <SummaryCard
                            icon="speedometer"
                            title="Total KMs"
                            value={
                                attendanceData
                                    ? calculateTotalKms(attendanceData)
                                    : "N/A"
                            }
                        />
                        <SummaryCard
                            icon="alert-circle"
                            title="Unclosed"
                            value={
                                attendanceData
                                    ? countUnclosedAttendances(attendanceData)
                                    : "N/A"
                            }
                        />
                    </View>

                    <View style={styles.tableContainer}>
                        <View style={styles.tableHeader}>
                            <Text style={styles.headerCell}>Date</Text>
                            <Text style={styles.headerCell}>Start KM</Text>
                            <Text style={styles.headerCell}>End KM</Text>
                            <Text style={styles.headerCell}>Distance</Text>
                        </View>
                        <ScrollView style={styles.tableBody}>
                            {attendanceData && attendanceData.length > 0 ? (
                                attendanceData.map(item => (
                                    <View style={styles.tableRow} key={item.Id}>
                                        <Text style={styles.cell}>
                                            {new Date(
                                                item.Start_Date,
                                            ).toLocaleDateString("en-GB", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
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
                                        <Text style={styles.cell}>
                                            {calculateDistance(
                                                item.Start_KM,
                                                item.End_KM,
                                            )}
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noDataText}>
                                    No attendance data available.
                                </Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
};

const DatePickerButton = ({ title, date, onPress }) => (
    <View style={styles.datePickerWrapper}>
        <Text style={styles.dateTitle}>{title}</Text>
        <TouchableOpacity style={styles.datePicker} onPress={onPress}>
            <Text style={styles.dateText}>
                {date
                    ? new Intl.DateTimeFormat("en-GB").format(date)
                    : "Select Date"}
            </Text>
            <Icon name="calendar" color={customColors.white} size={20} />
        </TouchableOpacity>
    </View>
);

const SummaryCard = ({ icon, title, value }) => (
    <View style={styles.card}>
        <Icon name={icon} size={30} color={customColors.white} />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
    </View>
);

export default AttendanceReport;

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
    headersContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
    },
    headersText: {
        ...typography.h4(),
        color: customColors.white,
        marginHorizontal: 10,
    },
    datePickerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginHorizontal: 20,
    },
    datePickerWrapper: {
        flex: 1,
        marginRight: 10,
    },
    dateTitle: {
        ...typography.body2(),
        color: customColors.white,
        marginBottom: 5,
    },
    datePicker: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: 8,
        padding: 10,
    },
    dateText: {
        ...typography.body1(),
        color: customColors.white,
    },
    cardContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    card: {
        flex: 1,
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: 8,
        padding: 15,
        margin: 15,
    },
    cardTitle: {
        ...typography.body1(),
        color: customColors.white,
    },
    cardValue: {
        ...typography.h6(),
        color: customColors.white,
        marginTop: 5,
    },
    tableContainer: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: 8,
        overflow: "hidden",
        margin: 10,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: customColors.secondary,
        padding: 10,
    },
    headerCell: {
        flex: 1,
        textAlign: "center",
        ...typography.body1(),
        fontWeight: "bold",
        color: customColors.black,
    },
    tableBody: {
        flex: 1,
        paddingBottom: 20,
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.1)",
        padding: 10,
        backgroundColor: customColors.white,
    },
    cell: {
        flex: 1,
        ...typography.body1(),
        color: customColors.black,
        textAlign: "center",
    },
    noDataText: {
        ...typography.body1(),
        color: customColors.white,
        textAlign: "center",
        marginTop: 20,
    },
});
