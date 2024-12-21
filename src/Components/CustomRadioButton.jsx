import { StyleSheet, Text, Dimensions, TouchableOpacity, View } from "react-native";
import React from "react";
import { customColors, typography } from "../Config/helper";

const { width } = Dimensions.get("window");

const CustomRadioButton = ({ label, selected, onSelect, style }) => {

    return (
        <TouchableOpacity style={[styles.radioButtonContainer, style]}
            onPress={onSelect}
            activeOpacity={0.7}
        >
            <View style={[
                styles.radioButton,
                selected && styles.selectedRadioButton
            ]}
            />
            <Text style={[styles.radioButtonText, selected && styles.selectedText]}>
                {label}
            </Text>
        </TouchableOpacity>
    )
}

export default CustomRadioButton

const styles = StyleSheet.create({
    radioButtonContainer: {
        width: width * 0.42,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.background,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        margin: 8,
        shadowColor: customColors.black,
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    radioButton: {
        width: 15,
        height: 15,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: customColors.accent,
        marginRight: 10,
    },
    selectedRadioButton: {
        backgroundColor: customColors.secondary,
        borderColor: customColors.grey,
    },
    radioButtonText: {
        ...typography.body2(),
        color: customColors.white,
        fontWeight: "bold",
    },
    selectedText: {
        ...typography.body1(),
        color: customColors.white,
        fontWeight: "700",
    },
})