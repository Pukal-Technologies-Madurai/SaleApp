import { StyleSheet, Text, View, TextInput } from "react-native";
import React from "react";
import { customColors, typography, spacing } from "../Config/helper";

const FormField = ({
    label,
    required,
    error,
    children,
    style,
    inputProps,
    multiline,
    keyboardType,
    maxLength,
    placeholder,
    value,
    onChangeText,
    editable = true,
    secureTextEntry,
    numbersOnly = false,
}) => {
    const handleNumberInput = (text) => {
        // Remove any non-numeric characters
        const numericValue = text.replace(/[^0-9]/g, '');
        onChangeText(numericValue);
    };

    return (
        <View style={[styles.fieldContainer, style]}>
            <Text style={styles.label}>
                {label} {required && <Text style={styles.requiredStar}>*</Text>}
            </Text>
            {children || (
                <TextInput
                    style={[
                        styles.input,
                        error && styles.inputError,
                        multiline && styles.multilineInput,
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={customColors.grey500}
                    value={value}
                    onChangeText={numbersOnly ? handleNumberInput : onChangeText}
                    multiline={multiline}
                    keyboardType={numbersOnly ? "numeric" : keyboardType}
                    maxLength={maxLength}
                    editable={editable}
                    secureTextEntry={secureTextEntry}
                    {...inputProps}
                />
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

export default FormField;

const styles = StyleSheet.create({
    fieldContainer: {
        marginVertical: spacing.sm,
    },
    label: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        marginBottom: spacing.xs,
        fontWeight: "500",
    },
    requiredStar: {
        color: customColors.accent2,
    },
    input: {
        backgroundColor: customColors.white,
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 8,
        padding: spacing.sm,
        ...typography.body1(),
        color: customColors.grey900,
    },
    inputError: {
        borderColor: customColors.accent2,
    },
    multilineInput: {
        minHeight: 100,
        textAlignVertical: "top",
    },
    errorText: {
        ...typography.caption(),
        color: customColors.accent2,
        marginTop: spacing.xs,
    },
});