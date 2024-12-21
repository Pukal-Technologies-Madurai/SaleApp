import { StyleSheet, Text, TouchableOpacity, View, Platform } from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
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
            animatedScale.value = withTiming(0.95, { duration: 100 });
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
                    style={styles.button}
                    onPress={showDatepicker}
                    disabled={disabled}
                >
                    <View style={styles.contentContainer}>
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
                        <Icon
                            name="calendar"
                            color={disabled ? customColors.gray : customColors.white}
                            size={20}
                            strokeWidth={2}
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
    },
    title: {
        color: customColors.white,
        ...typography.body1(),
        fontWeight: "600",
        marginBottom: 8,
        opacity: 0.8,
    },
    button: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
    },
    dateText: {
        flex: 1,
        marginRight: 10,
        color: customColors.white,
        ...typography.body1(),
        fontWeight: "500",
    },
    disabledButton: {
        opacity: 0.5,
    },
    disabledText: {
        color: customColors.grey,
    },
})