import { StyleSheet, Text, TouchableOpacity, View, Modal } from "react-native";
import React from "react";
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
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                    </View>

                    <View style={styles.modalBody}>
                        {/* Date Pickers */}
                        <View style={styles.datePickerContainer}>
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
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={onApply}
                            activeOpacity={0.7}>
                            <Text style={styles.applyButtonText}>
                                Apply Filter
                            </Text>
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
        padding: spacing.lg,
    },
    modalContainer: {
        backgroundColor: customColors.white,
        borderRadius: 16,
        width: "100%",
        maxWidth: 400,
        ...shadows.large,
    },
    modalHeader: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    modalTitle: {
        ...typography.h3(),
        color: customColors.grey900,
        fontWeight: "600",
        // textAlign: "center",
    },
    modalBody: {
        padding: spacing.lg,
        gap: spacing.lg,
    },
    datePickerContainer: {
        gap: spacing.sm,
    },
    dropdownContainer: {
        gap: spacing.sm,
    },
    dateLabel: {
        ...typography.subtitle2(),
        color: customColors.grey700,
        fontWeight: "500",
    },
    modalFooter: {
        flexDirection: "row",
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        paddingTop: spacing.md,
        gap: spacing.md,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: customColors.grey100,
        paddingVertical: spacing.md,
        borderRadius: 8,
        alignItems: "center",
        ...shadows.small,
    },
    cancelButtonText: {
        ...typography.button(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    applyButton: {
        flex: 1,
        backgroundColor: customColors.primary,
        paddingVertical: spacing.md,
        borderRadius: 8,
        alignItems: "center",
        ...shadows.small,
    },
    applyButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
});
