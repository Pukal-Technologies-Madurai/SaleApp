import { StyleSheet, Text, View, Pressable } from "react-native";
import React from "react";
import { customColors, typography } from "../Config/helper";

const CustomButton = ({ children, onPress }) => {
    return (
        <View style={styles.container}>
            <Pressable
                onPress={onPress}
                style={({ pressed }) =>
                    pressed
                        ? [styles.buttonInterContainer, styles.pressed]
                        : styles.buttonInterContainer
                }
                android_ripple={{ color: customColors.accent }}>
                <Text maxFontSizeMultiplier={1.2} style={styles.buttonText}>
                    {children}
                </Text>
            </Pressable>
        </View>
    );
};

export default CustomButton;

const styles = StyleSheet.create({
    container: {
        borderRadius: 5,
        margin: 4,
        overflow: "hidden",
    },
    buttonInterContainer: {
        backgroundColor: customColors.primary,
        color: customColors.white,
        paddingVertical: 8,
        paddingHorizontal: 20,
        elevation: 2,
    },
    buttonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "500",
        textAlign: "center",
    },
    pressed: {
        opacity: 0.75,
    },
});
