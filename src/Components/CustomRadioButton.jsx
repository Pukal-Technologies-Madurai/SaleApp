import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Animated,
} from "react-native";
import React, { useEffect, useRef } from "react";
import FeatherIcon from "react-native-vector-icons/Feather";
import {
    customColors,
    typography,
    spacing,
    shadows,
    borderRadius,
    iconSizes,
} from "../Config/helper";

const CustomRadioButton = ({ label, selected, onSelect, style, icon }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: selected ? 1 : 0.98,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
        }).start();
    }, [selected]);

    return (
        <Animated.View
            style={[
                { transform: [{ scale: scaleAnim }] },
                { flex: 1 },
            ]}>
            <TouchableOpacity
                style={[
                    styles.radioButtonContainer,
                    selected && styles.selectedContainer,
                    style,
                ]}
                onPress={onSelect}
                activeOpacity={0.8}>
                <View
                    style={[
                        styles.radioOuter,
                        selected && styles.radioOuterSelected,
                    ]}>
                    {selected && (
                        <View style={styles.radioInner} />
                    )}
                </View>
                <View style={styles.labelContainer}>
                    {icon && (
                        <FeatherIcon
                            name={icon}
                            size={iconSizes.sm}
                            color={
                                selected
                                    ? customColors.primary
                                    : customColors.grey500
                            }
                            style={styles.icon}
                        />
                    )}
                    <Text
                        style={[
                            styles.radioButtonText,
                            selected && styles.selectedText,
                        ]}>
                        {label}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default CustomRadioButton;

const styles = StyleSheet.create({
    radioButtonContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.white,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1.5,
        borderColor: customColors.grey200,
        // ...shadows.small,
    },
    selectedContainer: {
        backgroundColor: customColors.primary + "08",
        borderColor: customColors.primary,
        // ...shadows.medium,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: customColors.grey400,
        marginRight: spacing.sm,
        alignItems: "center",
        justifyContent: "center",
    },
    radioOuterSelected: {
        borderColor: customColors.primary,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: customColors.primary,
    },
    labelContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },
    icon: {
        marginRight: spacing.xs,
    },
    radioButtonText: {
        ...typography.body2(),
        color: customColors.grey700,
        fontWeight: "500",
    },
    selectedText: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "600",
    },
});