import {
    ActivityIndicator,
    Animated,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useEffect, useState } from "react";
import Icon from "react-native-vector-icons/MaterialIcons";
import { customColors, typography } from "../Config/helper";

const AddDataModal = ({
    visible,
    onClose,
    onSubmit,
    title,
    placeholder,
    existingItems,
    selectedDistrict,
    modalType,
}) => {
    const [value, setValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const slideAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        if (visible) {
            setValue("");
            setError("");
            Animated.spring(slideAnim, {
                toValue: 1,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const validateInput = () => {
        if (!value.trim()) {
            setError("Please enter a value");
            return false;
        }

        if (!selectedDistrict) {
            setError("Please select a district first");
            return false;
        }

        // Check if name already exists in the selected district
        const exists = existingItems.some(item => {
            const itemName =
                modalType === "route"
                    ? item.Route_Name // Use Route_Name for routes
                    : item.Area_Name; // Use Area_Name for areas

            return (
                item.District_Id === selectedDistrict &&
                itemName?.toLowerCase() === value.trim().toLowerCase()
            );
        });

        if (exists) {
            setError(
                `This ${modalType} name already exists in the selected district`,
            );
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        setError("");

        if (!validateInput()) {
            return;
        }

        setLoading(true);
        try {
            await onSubmit(value.trim());
            onClose();
        } catch (err) {
            setError(err.message || "Failed to add. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            transform: [
                                {
                                    translateY: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [300, 0],
                                    }),
                                },
                            ],
                        },
                    ]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={[
                            styles.modalInput,
                            error ? styles.inputError : null,
                        ]}
                        placeholder={placeholder}
                        value={value}
                        onChangeText={text => {
                            setValue(text);
                            setError("");
                        }}
                        autoFocus
                    />

                    {error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : null}

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={onClose}>
                            <Text
                                style={[
                                    styles.buttonText,
                                    { color: customColors.black },
                                ]}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.submitButton]}
                            onPress={handleSubmit}
                            disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.buttonText}>Submit</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

export default AddDataModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: customColors.white,
        borderRadius: 16,
        padding: 24,
        width: "90%",
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    modalTitle: {
        ...typography.h4(),
        fontWeight: "bold",
        color: "#333",
    },
    modalInput: {
        borderWidth: 1,
        borderColor: customColors.lightGrey,
        borderRadius: 8,
        padding: 12,
        ...typography.body1(),
        marginBottom: 24,
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        minWidth: 100,
        alignItems: "center",
    },
    inputError: {
        borderColor: "#ff0000",
    },
    errorText: {
        color: "#ff0000",
        ...typography.caption(),
        marginTop: -16,
        marginBottom: 16,
    },
    cancelButton: {
        backgroundColor: "#f0f0f0",
    },
    submitButton: {
        backgroundColor: "#841584",
    },
    buttonText: {
        ...typography.h6(),
        fontWeight: "600",
        color: customColors.white,
    },
});
