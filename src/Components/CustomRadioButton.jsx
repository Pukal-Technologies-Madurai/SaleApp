import { StyleSheet, Text, Dimensions, TouchableOpacity } from "react-native";
import React from "react";
import { customColors, typography } from "../Config/helper";

const { width } = Dimensions.get("window")

const CustomRadioButton = ({ label, selected, onSelect }) => {

    return (
        <TouchableOpacity
            style={[styles.radioButton,
            { backgroundColor: selected ? customColors.primary : "#0534CE" }]}
            onPress={onSelect}
        >
            <Text style={styles.radioButtonText}>
                {label}
            </Text>
        </TouchableOpacity>
    )
}

export default CustomRadioButton

const styles = StyleSheet.create({
    radioButton: {
        padding: 12,
        borderRadius: 10,
        marginHorizontal: 15,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: "#007BFF",
        alignItems: "center",
        justifyContent: "center",
        width: width * 0.4,
    },
    radioButtonText: {
        ...typography.body1(),
        fontWeight: "bold",
        color: customColors.white,
    },
})