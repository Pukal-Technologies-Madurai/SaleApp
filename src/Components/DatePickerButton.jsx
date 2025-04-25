import { StyleSheet, Text, TouchableOpacity, View, Platform } from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { customColors, typography } from "../Config/helper";

const DatePickerButton = ({
    title = "Select Date",
    date,
    onDateChange,
    style,
    minDate,
    maxDate,
    containerStyle,
    disabled = false,
    mode = "date",
}) => {

    const [show, setShow] = React.useState(false);
    const animatedScale = useSharedValue(1);

    const handleDateChange = (event, selectedDate) => {
        setShow(false);
        if (selectedDate) {
            onDateChange(event, selectedDate);
        }
    };

    const showDatepicker = () => {
        if (!disabled) {
            setShow(true);
            animatedScale.value = withSpring(0.95, { damping: 10 });
            setTimeout(() => {
                animatedScale.value = withSpring(1, { damping: 10 });
            }, 100);
        }
    };

    const formatDate = (inputDate) => {
        if (!inputDate) return "Select Date";

        return new Intl.DateTimeFormat("en-GB").format(inputDate);
    };

    const animatedButtonStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: animatedScale.value }]
        };
    });

    return (
        <View style={[styles.container, containerStyle]}>
            {title && <Text style={styles.title}>{title}</Text>}
            <Animated.View
                style={[
                    styles.buttonWrapper,
                    style,
                    animatedButtonStyle,
                    disabled && styles.disabledButton
                ]}
            >
                <TouchableOpacity
                    onPress={showDatepicker}
                    disabled={disabled}
                    activeOpacity={0.9}
                    style={[styles.button, disabled && styles.buttonDisabled]}
                >
                    <View style={styles.contentContainer}>
                        <View style={styles.dateContainer}>
                            <Icon
                                name="calendar-outline"
                                color={disabled ? customColors.grey : customColors.white}
                                size={18}
                                style={styles.calendarIcon}
                            />
                            <Text
                                style={[
                                    styles.dateText,
                                    disabled && styles.disabledText
                                ]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {formatDate(date)}
                            </Text>
                        </View>
                        <Icon
                            name="chevron-down-outline"
                            color={disabled ? customColors.grey : customColors.white}
                            size={16}
                            style={styles.chevronIcon}
                        />
                    </View>
                </TouchableOpacity>
            </Animated.View>

            {show && (
                <DateTimePicker
                    value={date || new Date()}
                    mode={mode}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleDateChange}
                    maximumDate={maxDate || new Date()}
                    minimumDate={minDate}
                />
            )}
        </View>
    )
};

export default DatePickerButton

const styles = StyleSheet.create({
    container: {
        width: "100%",
        marginBottom: 12,
    },
    buttonWrapper: {
        width: "100%",
    },
    contentContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        backgroundColor: "transparent",
    },
    dateContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        backgroundColor: "transparent",
    },
    title: {
        color: customColors.white,
        ...typography.body2(),
        fontWeight: "600",
        marginBottom: 8,
        opacity: 0.9,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    button: {
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
        backgroundColor: "rgba(255, 255, 255, 0.12)",
    },
    buttonDisabled: {
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderColor: "rgba(255, 255, 255, 0.1)",
    },
    dateText: {
        color: customColors.white,
        ...typography.body1(),
        fontWeight: "500",
        backgroundColor: "transparent",
    },
    calendarIcon: {
        marginRight: 8,
        opacity: 0.9,
        backgroundColor: "transparent",
    },
    chevronIcon: {
        opacity: 0.8,
        backgroundColor: "transparent",
    },
    disabledButton: {
        opacity: 0.5,
    },
    disabledText: {
        color: customColors.grey,
    },
})