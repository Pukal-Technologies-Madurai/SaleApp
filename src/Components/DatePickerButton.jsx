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
        if (selectedDate && selectedDate instanceof Date) {
            onDateChange(selectedDate);
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
                                        : customColors.primary
                                }
                                size={16}
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
                    value={
                        date instanceof Date && !isNaN(date.getTime())
                            ? date
                            : new Date()
                    }
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
        marginBottom: spacing.xs,
    },
    buttonWrapper: {},
    contentContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "transparent",
    },
    dateContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        backgroundColor: "transparent",
    },
    title: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "600",
        marginBottom: 4,
    },
    button: {
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: customColors.grey200,
        backgroundColor: customColors.white,
    },
    buttonDisabled: {
        backgroundColor: customColors.grey100,
        borderColor: customColors.grey200,
    },
    dateText: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "500",
        backgroundColor: "transparent",
    },
    calendarIcon: {
        marginRight: 6,
        backgroundColor: "transparent",
    },
    disabledButton: {
        opacity: 0.5,
    },
    disabledText: {
        color: customColors.grey500,
    },
});
