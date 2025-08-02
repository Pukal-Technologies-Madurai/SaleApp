import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import {
    customColors,
    spacing,
    typography,
    shadows,
} from "../../Config/helper";
import {
    fetchDefaultAccountMaster,
    fetchAccountsMaster,
    createReceipt,
} from "../../Api/receipt";
import DatePickerButton from "../../Components/DatePickerButton";
import { API } from "../../Config/Endpoint";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CreateReceipts = () => {
    const navigation = useNavigation();

    const [filteredRetailers, setFilteredRetailers] = useState([]);
    const [selectedRetailer, setSelectedRetailer] = useState(0);
    const [selectedBills, setSelectedBills] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [selectedAmountType, setSelectedAmountType] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showReceiptView, setShowReceiptView] = useState(false);
    const [receiptAmounts, setReceiptAmounts] = useState({});

    const {
        data: retailersData = [],
        isLoading: isLoadingRetailers,
        isError: isErrorRetailers,
    } = useQuery({
        queryKey: ["retailersData"],
        queryFn: fetchAccountsMaster,
    });

    const {
        data: paymentOption = [],
        isLoading: isLoadingPaymentOption,
        isError: isErrorPaymentOption,
    } = useQuery({
        queryKey: ["paymentOption"],
        queryFn: fetchDefaultAccountMaster,
        select: data => {
            if (!data) return [];
            return data;
        },
    });

    useEffect(() => {
        if (retailersData && retailersData.length > 0) {
            setFilteredRetailers(retailersData);
        }
    }, [retailersData]);

    const [pendingBills, setPendingBills] = useState([]);
    const [isLoadingBills, setIsLoadingBills] = useState(false);
    const [isErrorBills, setIsErrorBills] = useState(false);

    useEffect(() => {
        const fetchPendingBills = async () => {
            if (!selectedRetailer) {
                setPendingBills([]);
                return;
            }

            setIsLoadingBills(true);
            setIsErrorBills(false);

            try {
                const url = `${API.pendingSalesInvoice()}${selectedRetailer}`;

                const res = await fetch(url);
                const data = await res.json();

                if (!data.success) {
                    throw new Error(data.message || "API Error");
                }

                const validBills = data.data.filter(
                    bill => bill.Total_Invoice_value > bill.Paid_Amount,
                );

                setPendingBills(validBills);
            } catch (error) {
                setIsErrorBills(true);
                setPendingBills([]);
            } finally {
                setIsLoadingBills(false);
            }
        };

        fetchPendingBills();
    }, [selectedRetailer]);

    const handleRetailerSelect = item => {
        if (item && item.Acc_Id) {
            setSelectedRetailer(item.Acc_Id);
            setSelectedBills([]);
            setSelectAll(false);
        } else {
            console.error("Invalid retailer selection");
        }
    };

    const handleAmountTypeSelect = item => {
        setSelectedAmountType(item);
    };

    const handleDateChange = date => {
        // Ensure we always have a valid Date object
        const validDate = date instanceof Date ? date : new Date();
        setSelectedDate(validDate);
    };

    const handleBillSelection = billId => {
        setSelectedBills(prev => {
            if (prev.includes(billId)) {
                const newSelection = prev.filter(id => id !== billId);
                setSelectAll(newSelection.length === pendingBills.length);
                return newSelection;
            } else {
                const newSelection = [...prev, billId];
                setSelectAll(newSelection.length === pendingBills.length);
                return newSelection;
            }
        });
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedBills([]);
            setSelectAll(false);
        } else {
            setSelectedBills(pendingBills.map(bill => bill.Do_Id));
            setSelectAll(true);
        }
    };

    const getTotalSelectedAmount = () => {
        return selectedBills.reduce((total, billId) => {
            const enteredAmount = receiptAmounts[billId];
            if (enteredAmount && !isNaN(enteredAmount)) {
                return total + parseFloat(enteredAmount);
            }
            const bill = pendingBills.find(b => b.Do_Id === billId);
            const pendingAmount = bill
                ? bill.Total_Invoice_value - bill.Paid_Amount
                : 0;
            return total + pendingAmount;
        }, 0);
    };

    const handleReceiptAmountChange = (billId, amount) => {
        setReceiptAmounts(prev => ({
            ...prev,
            [billId]: amount,
        }));
    };

    const handleCreateReceipt = () => {
        // Validation checks
        if (!selectedAmountType) {
            Alert.alert(
                "Please select a payment type before creating the receipt.",
            );
            return;
        }

        if (!selectedRetailer) {
            Alert.alert(
                "Please select a retailer before creating the receipt.",
            );
            return;
        }

        if (selectedBills.length === 0) {
            Alert.alert(
                "Please select at least one bill before creating the receipt.",
            );
            return;
        }

        setShowReceiptView(true);
        // Initialize receipt amounts with pending amounts
        const initialAmounts = {};
        selectedBills.forEach(billId => {
            const bill = pendingBills.find(b => b.Do_Id === billId);
            if (bill) {
                const pendingAmount =
                    bill.Total_Invoice_value - bill.Paid_Amount;
                initialAmounts[billId] = pendingAmount.toString();
            }
        });
        setReceiptAmounts(initialAmounts);
    };

    const handleViewClose = () => {
        setShowReceiptView(false);
    };

    const handleViewSubmit = async () => {
        // Validation checks
        if (!selectedAmountType) {
            Alert.alert(
                "Please select a payment type before creating the receipt.",
            );
            return;
        }

        if (!selectedRetailer) {
            Alert.alert(
                "Please select a retailer before creating the receipt.",
            );
            return;
        }

        if (selectedBills.length === 0) {
            Alert.alert(
                "Please select at least one bill before creating the receipt.",
            );
            return;
        }

        try {
            // Get user ID (you may need to import this from your auth context)
            const userId = await AsyncStorage.getItem("UserId"); // Replace this with actual user ID from auth context

            const resBody = {
                receipt_voucher_type_id: 10,
                receipt_bill_type: 1,
                remarks: "Receipt created from mobile app",
                status: 1,
                credit_ledger: selectedRetailer,
                credit_ledger_name: filteredRetailers.find(
                    r => r.Acc_Id === selectedRetailer,
                )?.Account_name,
                debit_ledger: selectedAmountType?.Acc_Id,
                debit_ledger_name: selectedAmountType?.Account_Name,
                credit_amount: getTotalSelectedAmount(),
                created_by: userId,
                receipt_date: selectedDate.toISOString(),
                BillsDetails: selectedBills.map(billId => {
                    const bill = pendingBills.find(b => b.Do_Id === billId);
                    const receiptAmount = receiptAmounts[billId]
                        ? parseFloat(receiptAmounts[billId])
                        : bill
                          ? bill.Total_Invoice_value - bill.Paid_Amount
                          : 0;

                    return {
                        bill_id: billId,
                        bill_name: bill?.Do_Inv_No || billId,
                        bill_amount: receiptAmount,
                        Credit_Amo: receiptAmount,
                    };
                }),
            };

            const result = await createReceipt(resBody);
            // console.log("Receipt created successfully:", result);

            // Show success message and navigate back
            Alert.alert(
                "Success",
                result.message || "Receipt created successfully!",
            );
            setShowReceiptView(false);
            navigation.navigate("HomeScreen");
            // Reset form
            setSelectedBills([]);
            setReceiptAmounts({});
            setSelectAll(false);
        } catch (error) {
            console.error("Error creating receipt:", error);
            Alert.alert("Failed to create receipt. Please try again.");
        }
    };

    const renderBillCard = bill => {
        const isSelected = selectedBills.includes(bill.Do_Id);

        return (
            <TouchableOpacity
                key={bill.Do_Id}
                style={[styles.billCard, isSelected && styles.selectedBillCard]}
                onPress={() => handleBillSelection(bill.Do_Id)}
                activeOpacity={0.7}>
                <View style={styles.billHeader}>
                    <View style={styles.billHeaderLeft}>
                        <MaterialIcons
                            name={
                                isSelected
                                    ? "check-box"
                                    : "check-box-outline-blank"
                            }
                            size={20}
                            color={
                                isSelected
                                    ? customColors.primary
                                    : customColors.grey600
                            }
                        />
                        <View style={styles.billHeaderInfo}>
                            <Text style={styles.billNumber}>
                                Invoice #{bill.Do_Inv_No}
                            </Text>
                            <Text style={styles.billDate}>
                                {new Date(bill.Do_Date).toLocaleDateString(
                                    "en-GB",
                                )}
                            </Text>
                            <Text style={styles.billTotalAmount}>
                                Total: ₹{bill.Total_Invoice_value.toFixed(2)}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.billHeaderRight}>
                        <View style={styles.pendingAmountContainer}>
                            <Text style={styles.pendingLabel}>PENDING</Text>
                            <Text style={styles.pendingAmount}>
                                ₹
                                {(
                                    bill.Total_Invoice_value - bill.Paid_Amount
                                ).toFixed(2)}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderBillSelectionView = () => (
        <View style={styles.content}>
            <EnhancedDropdown
                data={filteredRetailers}
                labelField="Account_name"
                valueField="Acc_Id"
                placeholder="Select Retailer"
                value={selectedRetailer}
                onChange={handleRetailerSelect}
                containerStyle={styles.dropdownContainer}
                searchPlaceholder="Search retailers..."
            />

            <View style={styles.rowContainer}>
                <EnhancedDropdown
                    data={paymentOption}
                    labelField="Account_Name"
                    valueField="Acc_Id"
                    placeholder="Select Payment Type"
                    value={selectedAmountType?.Acc_Id}
                    onChange={handleAmountTypeSelect}
                    containerStyle={styles.dropdownContainer}
                    searchPlaceholder="Search payment types..."
                />
            </View>

            {selectedRetailer > 0 && pendingBills.length > 0 && (
                <>
                    <View style={styles.billsHeader}>
                        <TouchableOpacity
                            style={styles.selectAllButton}
                            onPress={handleSelectAll}
                            activeOpacity={0.7}>
                            <MaterialIcons
                                name={
                                    selectAll
                                        ? "check-box"
                                        : "check-box-outline-blank"
                                }
                                size={24}
                                color={
                                    selectAll
                                        ? customColors.primary
                                        : customColors.grey600
                                }
                            />
                            <Text style={styles.selectAllText}>
                                {selectAll ? "Deselect All" : "Select All"} (
                                {pendingBills.length})
                            </Text>
                        </TouchableOpacity>

                        {selectedBills.length > 0 && (
                            <View style={styles.selectedSummary}>
                                <Text style={styles.selectedCount}>
                                    {selectedBills.length} selected
                                </Text>
                                <Text style={styles.selectedAmount}>
                                    ₹{getTotalSelectedAmount().toFixed(2)}
                                </Text>
                            </View>
                        )}
                    </View>

                    <ScrollView
                        style={styles.billsContainer}
                        showsVerticalScrollIndicator={false}>
                        {pendingBills.map(bill => renderBillCard(bill))}
                        <View style={styles.bottomSpacer} />
                    </ScrollView>

                    {selectedBills.length > 0 && (
                        <View style={styles.actionContainer}>
                            <TouchableOpacity
                                style={styles.createReceiptButton}
                                activeOpacity={0.8}
                                onPress={handleCreateReceipt}>
                                <Text style={styles.createReceiptButtonText}>
                                    Create Receipt
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            )}

            {selectedRetailer > 0 &&
                pendingBills.length === 0 &&
                !isLoadingBills && (
                    <View style={styles.emptyState}>
                        <MaterialIcons
                            name="receipt-long"
                            size={64}
                            color={customColors.grey400}
                        />
                        <Text style={styles.emptyStateText}>
                            No pending bills found
                        </Text>
                        <Text style={styles.emptyStateSubtext}>
                            This retailer has no outstanding bills
                        </Text>
                    </View>
                )}

            {isLoadingBills && (
                <View style={styles.loadingState}>
                    <Text style={styles.loadingText}>Loading bills...</Text>
                </View>
            )}
        </View>
    );

    const renderReceiptCreationView = () => (
        <View style={styles.content}>
            <View style={styles.receiptDateContainer}>
                <DatePickerButton
                    label="Receipt Date"
                    date={
                        selectedDate instanceof Date ? selectedDate : new Date()
                    }
                    onDateChange={handleDateChange}
                    containerStyle={styles.receiptDatePicker}
                />
            </View>

            <ScrollView
                style={styles.receiptContent}
                showsVerticalScrollIndicator={false}>
                {selectedBills.map(billId => {
                    const bill = pendingBills.find(b => b.Do_Id === billId);
                    if (!bill) return null;

                    return (
                        <View key={billId} style={styles.receiptBillCard}>
                            <View style={styles.receiptBillHeader}>
                                <View>
                                    <Text style={styles.receiptBillNumber}>
                                        Invoice #{bill.Do_Inv_No}
                                    </Text>
                                    <Text style={styles.receiptBillDate}>
                                        {new Date(
                                            bill.Do_Date,
                                        ).toLocaleDateString("en-GB")}
                                    </Text>
                                    <Text style={styles.receiptBillPending}>
                                        Pending: ₹
                                        {(
                                            bill.Total_Invoice_value -
                                            bill.Paid_Amount
                                        ).toFixed(2)}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.receiptAmountContainer}>
                                <Text style={styles.receiptAmountLabel}>
                                    Receipt Amount:
                                </Text>
                                <TextInput
                                    style={styles.receiptAmountInput}
                                    value={receiptAmounts[billId] || ""}
                                    onChangeText={amount =>
                                        handleReceiptAmountChange(
                                            billId,
                                            amount,
                                        )
                                    }
                                    placeholder="Enter amount"
                                    keyboardType="numeric"
                                    selectTextOnFocus={true}
                                />
                            </View>
                        </View>
                    );
                })}
                <View style={styles.bottomSpacer} />
            </ScrollView>

            <View style={styles.receiptFooter}>
                <TouchableOpacity
                    style={styles.receiptCancelButton}
                    onPress={handleViewClose}>
                    <Text style={styles.receiptCancelText}>Go Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.receiptSubmitButton}
                    onPress={handleViewSubmit}>
                    <Text style={styles.receiptSubmitText}>Create Receipt</Text>
                    <Text style={styles.receiptSubmitAmount}>
                        ₹{getTotalSelectedAmount().toFixed(2)}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <AppHeader title="Create Receipts" navigation={navigation} />
            <View style={styles.contentContainer}>
                {showReceiptView
                    ? renderReceiptCreationView()
                    : renderBillSelectionView()}
            </View>
        </View>
    );
};

export default CreateReceipts;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    contentContainer: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.white,
    },
    content: {
        flex: 1,
        backgroundColor: customColors.white,
        padding: spacing.md,
    },
    dropdownContainer: {
        marginBottom: spacing.md,
    },
    rowContainer: {
        flexDirection: "row",
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    rowItem: {
        flex: 1,
    },
    billsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
        marginBottom: spacing.sm,
    },
    selectAllButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    selectAllText: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    selectedSummary: {
        alignItems: "flex-end",
    },
    selectedCount: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    selectedAmount: {
        ...typography.subtitle2(),
        color: customColors.primary,
        fontWeight: "700",
    },
    billsContainer: {
        flex: 1,
        marginHorizontal: -spacing.xs,
    },
    billCard: {
        backgroundColor: customColors.white,
        marginHorizontal: spacing.xs,
        marginBottom: spacing.sm,
        borderRadius: 8,
        padding: spacing.sm,
        borderWidth: 1,
        borderColor: customColors.grey200,
        ...shadows.small,
    },
    selectedBillCard: {
        borderColor: customColors.primary,
        borderWidth: 2,
        backgroundColor: customColors.primaryLight,
    },
    billHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: spacing.sm,
    },
    billHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        flex: 1,
    },
    billHeaderInfo: {
        flex: 1,
    },
    billNumber: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: 2,
    },
    billDate: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    billTotalAmount: {
        ...typography.subtitle2(),
        color: customColors.grey700,
        fontWeight: "900",
        marginTop: 2,
    },
    billHeaderRight: {
        alignItems: "flex-end",
    },
    pendingAmountContainer: {
        backgroundColor: customColors.error,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 6,
        alignItems: "center",
        minWidth: 80,
        elevation: 2,
        shadowColor: customColors.error,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    pendingLabel: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    pendingAmount: {
        ...typography.subtitle2(),
        color: customColors.white,
        fontWeight: "700",
        marginTop: 1,
    },
    billAmount: {
        ...typography.h5(),
        color: customColors.primary,
        fontWeight: "700",
    },
    actionContainer: {
        padding: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
        backgroundColor: customColors.white,
    },
    createReceiptButton: {
        backgroundColor: customColors.primary,
        borderRadius: 8,
        padding: spacing.sm,
        alignItems: "center",
        ...shadows.small,
    },
    createReceiptButtonText: {
        ...typography.subtitle2(),
        color: customColors.white,
        fontWeight: "600",
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.xl,
    },
    emptyStateText: {
        ...typography.h3(),
        color: customColors.grey700,
        fontWeight: "600",
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    emptyStateSubtext: {
        ...typography.body2(),
        color: customColors.grey600,
        textAlign: "center",
        marginHorizontal: spacing.xl,
    },
    loadingState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.xl,
    },
    loadingText: {
        ...typography.body1(),
        color: customColors.grey700,
    },
    bottomSpacer: {
        height: spacing.xl,
    },
    // Receipt View Styles
    receiptDateContainer: {
        marginBottom: spacing.md,
    },
    receiptDatePicker: {
        marginBottom: 0,
    },
    receiptContent: {
        flex: 1,
    },
    receiptBillCard: {
        backgroundColor: customColors.grey50,
        borderRadius: 8,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    receiptBillHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: spacing.sm,
    },
    receiptBillNumber: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "600",
        marginBottom: 2,
    },
    receiptBillDate: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    receiptBillPending: {
        ...typography.subtitle2(),
        color: customColors.primary,
        fontWeight: "600",
    },
    receiptAmountContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    receiptAmountLabel: {
        ...typography.body2(),
        color: customColors.grey800,
        fontWeight: "500",
        flex: 1,
    },
    receiptAmountInput: {
        ...typography.body1(),
        backgroundColor: customColors.white,
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 6,
        padding: spacing.sm,
        textAlign: "right",
        minWidth: 100,
        color: customColors.grey900,
    },
    receiptFooter: {
        flexDirection: "row",
        padding: spacing.md,
        gap: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
        backgroundColor: customColors.white,
    },
    receiptCancelButton: {
        flex: 1,
        backgroundColor: customColors.grey100,
        borderRadius: 8,
        padding: spacing.sm,
        alignItems: "center",
    },
    receiptCancelText: {
        ...typography.subtitle2(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    receiptSubmitButton: {
        flex: 2,
        backgroundColor: customColors.primary,
        borderRadius: 8,
        padding: spacing.sm,
        alignItems: "center",
    },
    receiptSubmitText: {
        ...typography.subtitle2(),
        color: customColors.white,
        fontWeight: "600",
        marginBottom: 2,
    },
    receiptSubmitAmount: {
        ...typography.subtitle1(),
        color: customColors.white,
        fontWeight: "700",
    },
});
