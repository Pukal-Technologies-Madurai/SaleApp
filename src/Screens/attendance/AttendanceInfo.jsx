import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Ionicons";
import FeatherIcon from "react-native-vector-icons/Feather";
import IconFont from "react-native-vector-icons/Fontisto";
import { API } from "../../Config/Endpoint";
import {
    customColors,
    typography,
    spacing,
    shadows,
    borderRadius,
    iconSizes,
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
                    <View style={styles.headerLeft}>
                        <Text style={styles.cardTitle} maxFontSizeMultiplier={1.2}>
                            Today's Attendance
                        </Text>
                        <View style={[styles.statusBadge, activeStatus && styles.statusBadgeActive]}>
                            <View style={[styles.statusDot, activeStatus && styles.statusDotActive]} />
                            <Text style={styles.statusText}>
                                {activeStatus ? "Active" : "Not Started"}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.reportButton}
                        onPress={() => navigation.navigate("AttendanceReport")}>
                        <FeatherIcon
                            name="arrow-up-right"
                            color={customColors.primary}
                            size={iconSizes.sm}
                        />
                    </TouchableOpacity>
                </View>

                {!activeStatus ? (
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={() => navigation.navigate("Attendance")}>
                        <Text style={styles.buttonText} maxFontSizeMultiplier={1.2}>
                            Start Day
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.cardContent}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <IconFont name="date" color={customColors.primary} size={iconSizes.sm} />
                                <Text style={styles.infoValue} maxFontSizeMultiplier={1.2}>{date}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.infoItem}>
                                <Icon name="time-outline" color={customColors.primary} size={iconSizes.sm} />
                                <Text style={styles.infoValue} maxFontSizeMultiplier={1.2}>{time}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.endButton}
                            onPress={() => {
                                navigation.navigate("EndDay");
                                setActiveStatus(0);
                            }}>
                            <Text style={styles.endButtonText} maxFontSizeMultiplier={1.2}>
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
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
    },
    card: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        ...shadows.small,
        overflow: "hidden",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    headerLeft: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    cardTitle: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey100,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.round,
        gap: spacing.xs,
    },
    statusBadgeActive: {
        backgroundColor: "#DCFCE7",
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: customColors.grey400,
    },
    statusDotActive: {
        backgroundColor: "#22C55E",
    },
    statusText: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "500",
    },
    reportButton: {
        width: 32,
        height: 32,
        backgroundColor: customColors.grey50,
        borderRadius: borderRadius.md,
        justifyContent: "center",
        alignItems: "center",
    },
    cardContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey50,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.sm,
    },
    infoItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
    },
    divider: {
        width: 1,
        height: 20,
        backgroundColor: customColors.grey200,
    },
    infoValue: {
        ...typography.body2(),
        color: customColors.grey800,
        fontWeight: "500",
    },
    startButton: {
        backgroundColor: customColors.primary,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: "center",
    },
    endButton: {
        backgroundColor: "#FEE2E2",
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        alignSelf: "center",
    },
    buttonText: {
        ...typography.body2(),
        color: customColors.white,
        fontWeight: "600",
    },
    endButtonText: {
        ...typography.body2(),
        color: customColors.error,
        fontWeight: "600",
    },
});
