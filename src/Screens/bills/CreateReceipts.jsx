import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ToastAndroid,
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
    createReceipt,
    fetchCustomerWhoHasBills,
    fetchRetailerBasedPendingSalesInvoiceReceipt,
} from "../../Api/receipt";
import DatePickerButton from "../../Components/DatePickerButton";
import { API } from "../../Config/Endpoint";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LocationIndicator from "../../Components/LocationIndicator";
import { SafeAreaView } from "react-native-safe-area-context";

const CreateReceipts = () => {
    const navigation = useNavigation();

    const [filteredRetailers, setFilteredRetailers] = useState([]);
    const [selectedRetailer, setSelectedRetailer] = useState(null);
    const [selectedBills, setSelectedBills] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [selectedAmountType, setSelectedAmountType] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showReceiptView, setShowReceiptView] = useState(false);
    const [receiptAmounts, setReceiptAmounts] = useState({});
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
    });

    const {
        data: retailersData = [],
        isLoading: isLoadingRetailers,
        isError: isErrorRetailers,
    } = useQuery({
        queryKey: ["retailersData"],
        queryFn: fetchCustomerWhoHasBills,
        select: data => {
            if (!data || !Array.isArray(data)) return [];

            // Remove duplicates based on Retailer_id instead of value, since multiple retailers can have value "0"
            const uniqueRetailers = data.reduce((acc, current) => {
                const existingItem = acc.find(
                    item => item.Retailer_id === current.Retailer_id,
                );
                if (!existingItem) {
                    acc.push({
                        ...current,
                        // Ensure unique key using Retailer_id
                        key: `retailer_${current.Retailer_id}_${acc.length}`,
                    });
                }
                return acc;
            }, []);

            return uniqueRetailers;
        },
    });

    const {
        data: paymentOption = [],
        isLoading: isLoadingPaymentOption,
        isError: isErrorPaymentOption,
    } = useQuery({
        queryKey: ["paymentOption"],
        queryFn: fetchDefaultAccountMaster,
        select: data => {
            if (!data || !Array.isArray(data)) return [];

            // Ensure unique keys for payment options too
            return data.map((item, index) => ({
                ...item,
                key: `payment_${item.Acc_Id}_${index}`,
            }));
        },
    });

    useEffect(() => {
        if (retailersData && retailersData.length > 0) {
            setFilteredRetailers(retailersData);
        }
    }, [retailersData]);

    // Remove the old manual fetch logic and use the useQuery instead
    const {
        data: pendingBills = [],
        isLoading: isLoadingBills,
        isError: isErrorBills,
    } = useQuery({
        queryKey: [
            "retailerBasedPendingSalesInvoiceReceipt",
            selectedRetailer?.Retailer_id,
        ],
        queryFn: () =>
            fetchRetailerBasedPendingSalesInvoiceReceipt({
                retailerId: selectedRetailer?.Retailer_id,
            }),
        enabled: !!selectedRetailer?.Retailer_id, // Only run when we have a Retailer_id
        select: data => {
            if (!data || !Array.isArray(data)) return [];
            // Filter bills that have pending amounts
            return data.filter(
                bill => bill.Total_Invoice_value > bill.Paid_Amount,
            );
        },
    });

    const handleRetailerSelect = item => {
        if (item && item.Retailer_id) {
            // Store the entire retailer object instead of just the ID
            setSelectedRetailer(item);
            setSelectedBills([]);
            setSelectAll(false);
        } else {
            console.error("Invalid retailer selection:", item);
            setSelectedRetailer(null);
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

    const handleSubmitforVisitLog = async () => {
        if (!location.latitude || !location.longitude) {
            ToastAndroid.show(
                "Location not available for visit log",
                ToastAndroid.SHORT,
            );
            return false;
        }

        try {
            const userId = await AsyncStorage.getItem("UserId");
            const formData = new FormData();
            formData.append("Mode", 1);
            formData.append("Retailer_Id", selectedRetailer.Retailer_id);
            formData.append("Latitude", location.latitude.toString());
            formData.append("Longitude", location.longitude.toString());
            formData.append("Narration", "The receipt has been created.");
            formData.append("EntryBy", userId);

            const response = await fetch(API.visitedLog(), {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            if (data.success) {
                ToastAndroid.show(data.message, ToastAndroid.LONG);
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            console.error("Error submitting form:", err);
        }
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

        let credit_ledger_Id = selectedRetailer.value;
        let credit_ledger_name = selectedRetailer.label;

        if (selectedRetailer.value === "0" || selectedRetailer.value === 0) {
            credit_ledger_Id = 14;
            credit_ledger_name = `${selectedRetailer.label} - (Sundry Creditors)`;
        }

        try {
            const userId = await AsyncStorage.getItem("UserId");
            await handleSubmitforVisitLog();

            const resBody = {
                receipt_voucher_type_id: 10,
                receipt_bill_type: 1,
                remarks: "Receipt created from mobile app",
                status: 1,
                credit_ledger: credit_ledger_Id,
                credit_ledger_name: credit_ledger_name,
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

            // console.log("Receipt created successfully:", resBody);
            const result = await createReceipt(resBody);

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
                labelField="label"
                valueField="Retailer_id" // Changed to use Retailer_id as the valueField
                placeholder="Select Retailer"
                value={selectedRetailer?.Retailer_id}
                onChange={handleRetailerSelect}
                containerStyle={styles.dropdownContainer}
                searchPlaceholder="Search retailers..."
                itemContainerStyle={styles.dropdownItem}
                renderItem={(item, index) => (
                    <View
                        key={`retailer_item_${item.Retailer_id}_${index}`}
                        style={styles.dropdownItemContent}>
                        <Text style={styles.dropdownItemText} numberOfLines={2}>
                            {item.label}
                        </Text>
                    </View>
                )}
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
                    renderItem={(item, index) => (
                        <View
                            key={`payment_item_${item.Acc_Id}_${index}`}
                            style={styles.dropdownItemContent}>
                            <Text
                                style={styles.dropdownItemText}
                                numberOfLines={2}>
                                {item.Account_Name}
                            </Text>
                        </View>
                    )}
                />
            </View>

            {selectedRetailer?.Retailer_id && pendingBills.length > 0 && (
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

            {selectedRetailer?.Retailer_id &&
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
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader title="Create Receipts" navigation={navigation} />
            <LocationIndicator
                onLocationUpdate={locationData => setLocation(locationData)}
                autoFetch={true}
                autoFetchOnMount={true}
                showComponent={false}
            />

            <View style={styles.contentContainer}>
                {showReceiptView
                    ? renderReceiptCreationView()
                    : renderBillSelectionView()}
            </View>
        </SafeAreaView>
    );
};

export default CreateReceipts;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
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
        marginBottom: 0, // Remove bottom margin since it's in rowContainer
        minHeight: 56, // Ensure consistent height
    },
    rowContainer: {
        flexDirection: "row",
        alignItems: "stretch", // Changed from "center" to "stretch" for equal height
        marginBottom: spacing.md,
        gap: spacing.md,
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

    dropdownItem: {
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    dropdownItemContent: {
        padding: spacing.sm,
        backgroundColor: customColors.white,
    },
    dropdownItemText: {
        ...typography.body2(),
        color: customColors.grey900,
        lineHeight: 20,
    },
});
