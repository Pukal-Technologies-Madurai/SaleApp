import { StyleSheet, Text, Dimensions, TouchableOpacity, View } from "react-native";
import React from "react";
import { customColors, typography, spacing, shadows, componentStyles } from "../Config/helper";

const { width } = Dimensions.get("window");

const CustomRadioButton = ({ label, selected, onSelect, style }) => {
    return (
        <TouchableOpacity
            style={[
                styles.radioButtonContainer,
                selected && styles.selectedContainer,
                style,
            ]}
            onPress={onSelect}
            activeOpacity={0.7}
        >
            <View
                style={[
                    styles.radioButton,
                    selected && styles.selectedRadioButton,
                ]}
            />
            <Text
                style={[
                    styles.radioButtonText,
                    selected && styles.selectedText,
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
};

export default CustomRadioButton;

const styles = StyleSheet.create({
    radioButtonContainer: {
        width: width * 0.42,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.background,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: spacing.lg,
        margin: spacing.sm,
        ...shadows.small,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    selectedContainer: {
        backgroundColor: customColors.primaryLight,
        borderColor: customColors.primary,
        ...shadows.medium,
    },
    radioButton: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: customColors.primary,
        marginRight: spacing.sm,
        backgroundColor: customColors.background,
        alignItems: "center",
        justifyContent: "center",
    },
    selectedRadioButton: {
        backgroundColor: customColors.primary,
        borderColor: customColors.primary,
    },
    radioButtonText: {
        ...typography.body2(),
        color: customColors.text,
        fontWeight: "500",
    },
    selectedText: {
        ...typography.body1(),
        color: customColors.primary,
        fontWeight: "700",
    },
});