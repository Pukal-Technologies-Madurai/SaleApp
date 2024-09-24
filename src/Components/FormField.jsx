import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { typography } from "../Config/helper";

const FormField = ({ label, required, children }) => {
    return (
        <View style={styles.fieldContainer}>
            <Text style={styles.label}>
                {label} {required && <Text style={styles.requiredStar}>*</Text>}
            </Text>
            {children}
        </View>
    )
}

export default FormField

const styles = StyleSheet.create({
    fieldContainer: {
        marginVertical: 10,
    },
    label: {
        ...typography.h6(),
        fontWeight: "600",
        color: "#333",
    },
    requiredStar: {
        color: "#ff0000",
    },
})