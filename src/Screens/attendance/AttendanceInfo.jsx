import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import FeatherIcon from "react-native-vector-icons/Feather";
import IconFont from "react-native-vector-icons/Fontisto";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";

const AttendanceInfo = () => {
    const navigation = useNavigation();
    const [userId, setUserId] = useState('')
    const [activeStatus, setActiveStatus] = useState(0)
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    useEffect(() => {
        const loadUserDetails = async () => {
            try {
                const UserId = await AsyncStorage.getItem("UserId");
                setUserId(UserId || '');
            } catch (err) {
                console.log(err);
            }
        };

        loadUserDetails();
    }, [activeStatus]);

    useEffect(() => {
        if (userId) {
            getAttendanceHistory(userId);
        }
    }, [userId]);

    // const getAttendanceInfo = async (userId) => {
    //     try {
    //         const url = `${API.myTodayAttendance}${userId}`;
    //         const response = await fetch(url, {
    //             method: 'GET',
    //             headers: { 'Content-Type': 'application/json' },
    //         });
    //         const attendanceStatus = await response.json();
    //         if (attendanceStatus.data.length > 0) {
    //             const lastAttendance = attendanceStatus.data[attendanceStatus.data.length - 1];
    //             const lastStartDate = lastAttendance.Start_Date;
    //             const [datePart, timePart] = lastStartDate.split('T');
    //             setActiveStatus(attendanceStatus.data[0].Active_Status)
    //             setDate(datePart);
    //             setTime(timePart.substring(0, 8));
    //         }
    //     } catch (error) {
    //         console.log("Error fetching attendance data:", error);
    //     }
    // };

    function formatTimeTo12Hour(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    }

    const getAttendanceHistory = async (userId) => {
        try {
            const url = `${API.MyLastAttendance}${userId}`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                }
            });

            const attendanceHistory = await response.json();

            if (attendanceHistory.data.length > 0) {
                const lastAttendance = attendanceHistory.data[attendanceHistory.data.length - 1];
                const lastStartDate = lastAttendance.Start_Date;

                setActiveStatus(attendanceHistory.data[0].Active_Status)

                setDate(formatDate(lastStartDate));
                setTime(formatTimeTo12Hour(lastStartDate));
            }
        } catch (error) {
            console.log("Error fetching attendance data:", error);
        }
    }

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} maxFontSizeMultiplier={1.2}>Today Attendance</Text>

                <TouchableOpacity onPress={() => navigation.navigate("AttendanceReport")}>
                    <FeatherIcon name="arrow-up-right" color={customColors.white} size={20} />
                </TouchableOpacity>
            </View>

            {!activeStatus && (
                <TouchableOpacity style={styles.startButton} onPress={() => { navigation.navigate("Attendance") }} >
                    <Text style={styles.buttonText} maxFontSizeMultiplier={1.2}>Start Day</Text>
                </TouchableOpacity>
            )}

            {activeStatus !== 0 && (
                <View style={styles.cardContent}>
                    <View style={styles.cardItem}>
                        <View style={styles.itemIcon}>
                            <IconFont name="date" color={customColors.white} size={20} />
                            <Text style={styles.text} maxFontSizeMultiplier={1.2}>Date</Text>
                        </View>
                        <Text style={styles.text} maxFontSizeMultiplier={1.2}>{date}</Text>
                    </View>

                    <View style={styles.cardItem}>
                        <View style={styles.itemIcon}>
                            <Icon name="time-outline" color={customColors.white} size={20} />
                            <Text style={styles.text} maxFontSizeMultiplier={1.2}>Time In</Text>
                        </View>
                        <Text style={styles.text} maxFontSizeMultiplier={1.2}>{time}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.endButton}
                        onPress={() => {
                            navigation.navigate("EndDay");
                            setActiveStatus(0);
                        }}>
                        <Text style={styles.buttonText} maxFontSizeMultiplier={1.2}>End Day</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    )
}

export default AttendanceInfo

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#0F2B70",
        borderRadius: 12,
        padding: 16,
        marginVertical: 10,
        marginHorizontal: 16,
        shadowColor: customColors.white,
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignContent: "center",
        marginBottom: 15,
    },
    cardTitle: {
        ...typography.h4(),
        color: customColors.white,
        fontWeight: "bold",
    },
    startButton: {
        backgroundColor: customColors.secondary,
        paddingVertical: 5,
        paddingHorizontal: 14,
        borderRadius: 25,
        alignSelf: "flex-end"
    },
    endButton: {
        backgroundColor: customColors.secondary,
        paddingVertical: 5,
        paddingHorizontal: 14,
        borderRadius: 25,
        alignSelf: "flex-end"
    },
    buttonText: {
        ...typography.button(),
        textAlign: "center",
        color: customColors.primary
    },
    cardContent: {
        paddingHorizontal: 10,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "#FFFFFF33",
    },
    cardItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    itemIcon: {
        flexDirection: "row",
        // alignItems: "center",
        marginRight: 10,
    },
    text: {
        ...typography.body1(),
        color: customColors.white,
        marginLeft: 8,
    },
})