import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
} from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from "react-native-reanimated";
import { customColors, typography, spacing } from "../Config/helper";
import { formatDate } from "../Config/functions";

const DatePickerButton = ({
    title = "Select Date",
    date,
    onDateChange,
    style,
    minDate,
    maxDate,
    containerStyle,
    titleStyle,
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

    const animatedButtonStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: animatedScale.value }],
        };
    });

    return (
        <View style={[styles.container, containerStyle]}>
            {title && <Text style={[styles.title, titleStyle]}>{title}</Text>}
            <Animated.View
                style={[
                    styles.buttonWrapper,
                    style,
                    animatedButtonStyle,
                    disabled && styles.disabledButton,
                ]}>
                <TouchableOpacity
                    onPress={showDatepicker}
                    disabled={disabled}
                    activeOpacity={0.9}
                    style={[styles.button, disabled && styles.buttonDisabled]}>
                    <View style={styles.contentContainer}>
                        <View style={styles.dateContainer}>
                            <Icon
                                name="calendar-outline"
                                color={
                                    disabled
                                        ? customColors.grey500
                                        : customColors.black
                                }
                                size={20}
                                style={styles.calendarIcon}
                            />
                            <Text
                                style={[
                                    styles.dateText,
                                    disabled && styles.disabledText,
                                ]}
                                numberOfLines={1}
                                ellipsizeMode="tail">
                                {formatDate(date)}
                            </Text>
                        </View>
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
    );
};

export default DatePickerButton;

const styles = StyleSheet.create({
    container: {
        width: "100%",
        marginBottom: spacing.md,
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
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: spacing.sm,
        opacity: 0.9,
        letterSpacing: 0.5,
    },
    button: {
        borderRadius: 12,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderWidth: 0.5,
        borderColor: customColors.grey300,
        backgroundColor: customColors.white,
    },
    buttonDisabled: {
        backgroundColor: customColors.grey100,
        borderColor: customColors.grey300,
    },
    dateText: {
        ...typography.body1(),
        color: customColors.black,
        fontWeight: "500",
        backgroundColor: "transparent",
    },
    calendarIcon: {
        marginRight: spacing.sm,
        opacity: 0.9,
        backgroundColor: "transparent",
    },
    disabledButton: {
        opacity: 0.5,
    },
    disabledText: {
        color: customColors.grey500,
    },
});
