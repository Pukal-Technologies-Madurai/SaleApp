import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import FeatherIcon from "react-native-vector-icons/Feather";
import IconFont from "react-native-vector-icons/Fontisto";
import { API } from "../../Config/Endpoint";
import {
    customColors,
    typography,
    spacing,
    shadows,
} from "../../Config/helper";

const AttendanceInfo = () => {
    const navigation = useNavigation();
    const [userId, setUserId] = useState("");
    const [activeStatus, setActiveStatus] = useState(0);
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");

    useEffect(() => {
        const loadUserDetails = async () => {
            try {
                const UserId = await AsyncStorage.getItem("UserId");
                setUserId(UserId || "");
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

    function formatTimeTo12Hour(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        });
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toISOString().split("T")[0];
    }

    const getAttendanceHistory = async userId => {
        try {
            const url = `${API.MyLastAttendance()}${userId}`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const attendanceHistory = await response.json();

            if (attendanceHistory.data.length > 0) {
                const lastAttendance =
                    attendanceHistory.data[attendanceHistory.data.length - 1];
                const lastStartDate = lastAttendance.Start_Date;

                setActiveStatus(attendanceHistory.data[0].Active_Status);
                setDate(formatDate(lastStartDate));
                setTime(formatTimeTo12Hour(lastStartDate));
            }
        } catch (error) {
            console.log("Error fetching attendance data:", error);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.headerContent}>
                        <Text
                            style={styles.cardTitle}
                            maxFontSizeMultiplier={1.2}>
                            Today's Attendance
                        </Text>
                        <Text style={styles.statusText}>
                            {activeStatus ? "Active" : "Not Started"}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.reportButton}
                        onPress={() => navigation.navigate("AttendanceReport")}>
                        <FeatherIcon
                            name="arrow-up-right"
                            color={customColors.white}
                            size={20}
                        />
                    </TouchableOpacity>
                </View>

                {!activeStatus ? (
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={() => navigation.navigate("Attendance")}>
                        <Text
                            style={styles.buttonText}
                            maxFontSizeMultiplier={1.2}>
                            Start Day
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.cardContent}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <IconFont
                                    name="date"
                                    color={customColors.white}
                                    size={20}
                                />
                                <View style={styles.infoTextContainer}>
                                    <Text
                                        style={styles.infoLabel}
                                        maxFontSizeMultiplier={1.2}>
                                        Date
                                    </Text>
                                    <Text
                                        style={styles.infoValue}
                                        maxFontSizeMultiplier={1.2}>
                                        {date}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.infoItem}>
                                <Icon
                                    name="time-outline"
                                    color={customColors.white}
                                    size={20}
                                />
                                <View style={styles.infoTextContainer}>
                                    <Text
                                        style={styles.infoLabel}
                                        maxFontSizeMultiplier={1.2}>
                                        Time In
                                    </Text>
                                    <Text
                                        style={styles.infoValue}
                                        maxFontSizeMultiplier={1.2}>
                                        {time}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.endButton}
                            onPress={() => {
                                navigation.navigate("EndDay");
                                setActiveStatus(0);
                            }}>
                            <Text
                                style={styles.buttonText}
                                maxFontSizeMultiplier={1.2}>
                                End Day
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

export default AttendanceInfo;

const styles = StyleSheet.create({
    container: {
        padding: spacing.md,
    },
    card: {
        backgroundColor: customColors.primary,
        borderRadius: 12,
        ...shadows.medium,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.1)",
    },
    headerContent: {
        flex: 1,
    },
    cardTitle: {
        ...typography.h5(),
        color: customColors.white,
        marginBottom: spacing.xs,
    },
    statusText: {
        ...typography.caption(),
        color: customColors.white,
        opacity: 0.8,
    },
    reportButton: {
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        padding: spacing.sm,
        borderRadius: 8,
    },
    cardContent: {
        padding: spacing.md,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: spacing.md,
    },
    infoItem: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    infoTextContainer: {
        marginLeft: spacing.sm,
    },
    infoLabel: {
        ...typography.caption(),
        color: customColors.white,
        opacity: 0.8,
    },
    infoValue: {
        ...typography.subtitle1(),
        color: customColors.white,
    },
    startButton: {
        backgroundColor: customColors.primaryDark,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: 25,
        alignSelf: "center",
        marginVertical: spacing.md,
        ...shadows.small,
    },
    endButton: {
        backgroundColor: customColors.error,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: 25,
        alignSelf: "center",
        ...shadows.small,
    },
    buttonText: {
        ...typography.button(),
        color: customColors.white,
        textAlign: "center",
    },
});
