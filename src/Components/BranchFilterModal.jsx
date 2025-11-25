import React, { useState, useEffect } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    ScrollView,
    Dimensions,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { customColors, typography, spacing, shadows } from "../Config/helper";

const { width } = Dimensions.get("window");

const BranchFilterModal = ({
    visible,
    onClose,
    branchData = [],
    selectedBranches = [],
    onApplyFilter,
    title = "Select Branches",
}) => {
    const [tempSelectedBranches, setTempSelectedBranches] = useState([]);

    useEffect(() => {
        if (visible) {
            setTempSelectedBranches(selectedBranches);
        }
    }, [visible, selectedBranches]);

    const toggleBranchSelection = (branchValue) => {
        setTempSelectedBranches(prev => {
            if (prev.includes(branchValue)) {
                return prev.filter(id => id !== branchValue);
            } else {
                return [...prev, branchValue];
            }
        });
    };

    const selectAll = () => {
        setTempSelectedBranches(branchData.map(branch => branch.value));
    };

    const clearAll = () => {
        setTempSelectedBranches([]);
    };

    const handleApply = () => {
        onApplyFilter(tempSelectedBranches);
        onClose();
    };

    const handleCancel = () => {
        setTempSelectedBranches(selectedBranches);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                    </View>

                    {/* Branch Selection Controls */}
                    <View style={styles.controlsContainer}>
                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={selectAll}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.controlButtonText}>Select All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.controlButton, styles.clearButton]}
                            onPress={clearAll}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.controlButtonText, styles.clearButtonText]}>
                                Clear All
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Branch List */}
                    <ScrollView style={styles.branchList} showsVerticalScrollIndicator={false}>
                        {branchData.map((branch) => (
                            <TouchableOpacity
                                key={branch.value}
                                style={[
                                    styles.branchItem,
                                    tempSelectedBranches.includes(branch.value) && styles.selectedBranchItem
                                ]}
                                onPress={() => toggleBranchSelection(branch.value)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.branchContent}>
                                    <View
                                        style={[
                                            styles.checkbox,
                                            tempSelectedBranches.includes(branch.value) && styles.checkedBox
                                        ]}
                                    >
                                        {tempSelectedBranches.includes(branch.value) && (
                                            <MaterialIcons
                                                name="check"
                                                size={16}
                                                color={customColors.white}
                                            />
                                        )}
                                    </View>
                                    <Text
                                        style={[
                                            styles.branchLabel,
                                            tempSelectedBranches.includes(branch.value) && styles.selectedBranchLabel
                                        ]}
                                    >
                                        {branch.label}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Selected Count */}
                    <View style={styles.selectedCountContainer}>
                        <Text style={styles.selectedCountText}>
                            {tempSelectedBranches.length} of {branchData.length} selected
                        </Text>
                    </View>

                    {/* Modal Footer */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancel}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={handleApply}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.applyButtonText}>Apply Filter</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default BranchFilterModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: width * 0.9,
        maxHeight: "80%",
        backgroundColor: customColors.white,
        borderRadius: 20,
        overflow: "hidden",
        ...shadows.large,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: customColors.primary,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    modalTitle: {
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "600",
        flex: 1,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    controlsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: customColors.grey50,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    controlButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 8,
        backgroundColor: customColors.primary,
        minWidth: 80,
        alignItems: "center",
    },
    clearButton: {
        backgroundColor: customColors.grey300,
    },
    controlButtonText: {
        ...typography.body2(),
        color: customColors.white,
        fontWeight: "600",
    },
    clearButtonText: {
        color: customColors.grey700,
    },
    branchList: {
        maxHeight: 300,
        paddingHorizontal: spacing.lg,
    },
    branchItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        marginVertical: spacing.xs,
        borderRadius: 12,
        backgroundColor: customColors.grey50,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    selectedBranchItem: {
        backgroundColor: customColors.primaryLight || "#E3F2FD",
        borderColor: customColors.primary,
    },
    branchContent: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: customColors.grey400,
        backgroundColor: customColors.white,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
    },
    checkedBox: {
        backgroundColor: customColors.primary,
        borderColor: customColors.primary,
    },
    branchLabel: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: "500",
        flex: 1,
    },
    selectedBranchLabel: {
        color: customColors.primary,
        fontWeight: "600",
    },
    selectedCountContainer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: customColors.grey50,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    selectedCountText: {
        ...typography.body2(),
        color: customColors.grey600,
        textAlign: "center",
        fontWeight: "500",
    },
    modalFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: customColors.white,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        marginRight: spacing.sm,
        borderRadius: 12,
        backgroundColor: customColors.grey300,
        alignItems: "center",
    },
    cancelButtonText: {
        ...typography.button(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    applyButton: {
        flex: 1,
        paddingVertical: spacing.md,
        marginLeft: spacing.sm,
        borderRadius: 12,
        backgroundColor: customColors.primary,
        alignItems: "center",
    },
    applyButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
});