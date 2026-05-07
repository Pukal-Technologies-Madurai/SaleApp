import { StyleSheet, Text, TouchableOpacity, View, Modal } from "react-native";
import React from "react";
import LinearGradient from "react-native-linear-gradient";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import DatePickerButton from "./DatePickerButton";
import EnhancedDropdown from "./EnhancedDropdown";
import { customColors, typography, spacing, shadows } from "../Config/helper";

const FilterModal = ({
    visible,
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    onApply,
    onClose,
    showToDate = false,
    title = "Filter by Date",
    fromLabel = "From Date",
    toLabel = "To Date",
    // Sales Person dropdown props
    showSalesPerson = false,
    salesPersonData = [],
    selectedSalesPerson = null,
    onSalesPersonChange,
    salesPersonLabel = "Select Sales Person",
    // Payment Option dropdown props
    showPaymentOption = false,
    paymentOptionData = [],
    selectedPaymentOption = null,
    onPaymentOptionChange,
    paymentOptionLabel = "Select Payment Option",
}) => {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header with gradient */}
                    <LinearGradient
                        colors={[customColors.primary, customColors.primaryDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.modalHeader}>
                        <View style={styles.headerContent}>
                            <MaterialIcon name="filter-list" size={22} color={customColors.white} />
                            <Text style={styles.modalTitle}>{title}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.closeIconButton}
                            onPress={onClose}
                            activeOpacity={0.7}>
                            <MaterialIcon name="close" size={20} color={customColors.white} />
                        </TouchableOpacity>
                    </LinearGradient>

                    <View style={styles.modalBody}>
                        {/* Date Pickers */}
                        <View style={styles.dateRow}>
                            <View style={[styles.datePickerContainer, !showToDate && { flex: 1 }]}>
                                <Text style={styles.dateLabel}>{fromLabel}</Text>
                                <DatePickerButton
                                    title=""
                                    date={fromDate}
                                    onDateChange={onFromDateChange}
                                />
                            </View>

                            {showToDate && (
                                <View style={styles.datePickerContainer}>
                                    <Text style={styles.dateLabel}>{toLabel}</Text>
                                    <DatePickerButton
                                        title=""
                                        date={toDate}
                                        onDateChange={onToDateChange}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Sales Person Dropdown */}
                        {showSalesPerson && (
                            <View style={styles.dropdownContainer}>
                                <Text style={styles.dateLabel}>
                                    {salesPersonLabel}
                                </Text>
                                <EnhancedDropdown
                                    data={salesPersonData}
                                    labelField="label"
                                    valueField="value"
                                    placeholder="Select Sales Person"
                                    value={selectedSalesPerson?.value}
                                    onChange={onSalesPersonChange}
                                />
                            </View>
                        )}

                        {/* Payment Option Dropdown */}
                        {showPaymentOption && (
                            <View style={styles.dropdownContainer}>
                                <Text style={styles.dateLabel}>
                                    {paymentOptionLabel}
                                </Text>
                                <EnhancedDropdown
                                    data={paymentOptionData}
                                    labelField="label"
                                    valueField="value"
                                    placeholder="Select Payment Option"
                                    value={selectedPaymentOption}
                                    onChange={onPaymentOptionChange}
                                />
                            </View>
                        )}
                    </View>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                            activeOpacity={0.7}>
                            <MaterialIcon name="close" size={16} color={customColors.grey600} />
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={onApply}
                            activeOpacity={0.8}>
                            <LinearGradient
                                colors={[customColors.primary, customColors.primaryDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.applyGradient}>
                                <MaterialIcon name="check" size={16} color={customColors.white} />
                                <Text style={styles.applyButtonText}>Apply</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default FilterModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.md,
    },
    modalContainer: {
        backgroundColor: customColors.white,
        borderRadius: 16,
        width: "100%",
        maxWidth: 380,
        overflow: "hidden",
        ...shadows.large,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    modalTitle: {
        ...typography.h5(),
        color: customColors.white,
        fontWeight: "600",
    },
    closeIconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.15)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalBody: {
        padding: spacing.lg,
        gap: spacing.md,
    },
    dateRow: {
        flexDirection: "row",
        gap: spacing.md,
    },
    datePickerContainer: {
        flex: 1,
        gap: 6,
    },
    dropdownContainer: {
        gap: 6,
    },
    dateLabel: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    modalFooter: {
        flexDirection: "row",
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        paddingTop: spacing.sm,
        gap: spacing.md,
    },
    cancelButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: customColors.grey100,
        paddingVertical: 12,
        borderRadius: 10,
        gap: spacing.xs,
    },
    cancelButtonText: {
        ...typography.button(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    applyButton: {
        flex: 1,
        borderRadius: 10,
        overflow: "hidden",
    },
    applyGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        gap: spacing.xs,
    },
    applyButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
});
