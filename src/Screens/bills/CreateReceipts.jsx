import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ToastAndroid,
    Modal,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import FeatherIcon from "react-native-vector-icons/Feather";
import FontAwesomeIcon from "react-native-vector-icons/FontAwesome";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import {
    customColors,
    spacing,
    typography,
    shadows,
    borderRadius,
    iconSizes,
} from "../../Config/helper";
import {
    fetchDefaultAccountMaster,
    createReceipt,
    editReceipt,
    fetchCustomerWhoHasBills,
    fetchRetailerAccountPendingReference,
    fetchAgainstRef,
    updateAgainstRef,
} from "../../Api/receipt";
import DatePickerButton from "../../Components/DatePickerButton";
import { API } from "../../Config/Endpoint";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LocationIndicator from "../../Components/LocationIndicator";
import { SafeAreaView } from "react-native-safe-area-context";

// Sanitizes free-typed decimal input instead of rejecting keystrokes outright.
// Silently no-op'ing on an invalid keystroke leaves the controlled value out of
// sync with what the native TextInput already displays, which forces Android to
// snap the text back mid-keystroke and can dismiss the keyboard.
const sanitizeDecimalInput = value => {
    const digitsAndDots = value.replace(/[^0-9.]/g, "");
    const [whole, ...rest] = digitsAndDots.split(".");
    return rest.length > 0 ? `${whole}.${rest.join("")}` : whole;
};

const CreateReceipts = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { editMode = false, receiptData = null } = route.params || {};

    const [filteredRetailers, setFilteredRetailers] = useState([]);
    const [selectedRetailer, setSelectedRetailer] = useState(null);
    const [selectedBills, setSelectedBills] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [selectedAmountType, setSelectedAmountType] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showReceiptView, setShowReceiptView] = useState(false);
    const [receiptAmounts, setReceiptAmounts] = useState({});
    const [showCollectPaymentModal, setShowCollectPaymentModal] = useState(false);
    const [collectPaymentAmount, setCollectPaymentAmount] = useState("");
    const [editAmount, setEditAmount] = useState("");
    const [hasPrefilledEdit, setHasPrefilledEdit] = useState(false);
    const [isUpdatingReceipt, setIsUpdatingReceipt] = useState(false);
    const [referenceAmounts, setReferenceAmounts] = useState({});
    const [removedReferences, setRemovedReferences] = useState([]);
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

    const {
        data: editReferenceAgainstBill = [],
        isLoading: isLoadingAgainstBill,
    } = useQuery({
        queryKey: ["AgainstBill", receiptData?.receipt_id],
        queryFn: () => fetchAgainstRef(receiptData.receipt_id),
        // Only fetch bill references when this receipt actually has some referenced amount
        enabled:
            editMode &&
            !!receiptData?.receipt_id &&
            !!receiptData?.TotalReferencedAmount,
        select: data => {
            if (!data || !Array.isArray(data)) return [];

            return data.map((item, index) => ({
                ...item,
                key: `against_bill_${item.auto_id}_${index}`,
            }));
        },
    });

    useEffect(() => {
        if (retailersData && retailersData.length > 0) {
            setFilteredRetailers(retailersData);
        }
    }, [retailersData]);

    // Prefill retailer, payment type and amount when opened in edit mode
    useEffect(() => {
        if (
            !editMode ||
            !receiptData ||
            hasPrefilledEdit ||
            paymentOption.length === 0
        ) {
            return;
        }

        const matchedRetailer = retailersData.find(
            item => String(item.value) === String(receiptData.credit_ledger),
        );

        const retailerToSet = matchedRetailer || {
            Retailer_id: `edit_${receiptData.receipt_id}`,
            value: receiptData.credit_ledger,
            label: receiptData.credit_ledger_name,
            key: `retailer_edit_${receiptData.receipt_id}`,
        };

        setSelectedRetailer(retailerToSet);
        setFilteredRetailers(prev => {
            const exists = prev.some(
                item => item.Retailer_id === retailerToSet.Retailer_id,
            );
            return exists ? prev : [retailerToSet, ...prev];
        });

        const matchedPaymentType = paymentOption.find(
            item => item.Acc_Id === receiptData.debit_ledger,
        );
        if (matchedPaymentType) {
            setSelectedAmountType(matchedPaymentType);
        }

        setEditAmount(String(receiptData.credit_amount));
        setSelectedDate(new Date(receiptData.receipt_date));
        setHasPrefilledEdit(true);
    }, [editMode, receiptData, retailersData, paymentOption, hasPrefilledEdit]);

    // Prefill editable payment amount for each referenced bill
    useEffect(() => {
        if (
            editReferenceAgainstBill.length > 0 &&
            Object.keys(referenceAmounts).length === 0
        ) {
            const initialAmounts = {};
            editReferenceAgainstBill.forEach(bill => {
                initialAmounts[bill.auto_id] = String(
                    bill.Credit_Amo ?? bill.bill_amount ?? 0,
                );
            });
            setReferenceAmounts(initialAmounts);
        }
    }, [editReferenceAgainstBill]);

    // Remove the old manual fetch logic and use the useQuery instead
    const {
        data: pendingBills = [],
        isLoading: isLoadingBills,
        isError: isErrorBills,
    } = useQuery({
        queryKey: [
            "retailerAccountPendingReference",
            selectedRetailer?.value,
        ],
        queryFn: () =>
            fetchRetailerAccountPendingReference({
                accountID: selectedRetailer?.value,
            }),
        enabled: !!selectedRetailer?.value, // Only run when we have a valid accountID
        select: data => {
            if (!data || !Array.isArray(data)) return [];
            // Filter bills that have pending amounts
            return data
                .filter(bill => bill.totalValue > bill.againstAmount)
                .map((bill, index) => ({
                    ...bill,
                    // Create a unique identifier using voucher number and index
                    uniqueId: `${bill.voucherNumber}_${index}`,
                    // Keep original voucherId but add a backup identifier
                    originalVoucherId: bill.voucherId,
                }));
        },
    });

    // console.log("Pending Bills:", pendingBills);

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
            let newSelection;
            if (prev.includes(billId)) {
                newSelection = prev.filter(id => id !== billId);
            } else {
                newSelection = [...prev, billId];
            }

            setSelectAll(
                newSelection.length === pendingBills.length &&
                pendingBills.length > 0,
            );

            return newSelection;
        });
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedBills([]);
            setSelectAll(false);
        } else {
            // Use uniqueId instead of Do_Id
            const allBillIds = pendingBills.map(bill => bill.uniqueId);
            setSelectedBills(allBillIds);
            setSelectAll(true);
        }
    };

    const getTotalSelectedAmount = () => {
        return selectedBills.reduce((total, billId) => {
            const enteredAmount = receiptAmounts[billId];
            if (enteredAmount && !isNaN(enteredAmount)) {
                return total + parseFloat(enteredAmount);
            }
            const bill = pendingBills.find(b => b.uniqueId === billId);
            const pendingAmount = bill
                ? bill.totalValue - bill.againstAmount
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
        let finalLatitude = location.latitude;
        let finalLongitude = location.longitude;

        if (!location.latitude || !location.longitude) {
            finalLatitude = 9.9475;
            finalLongitude = 78.1454;
            ToastAndroid.show("Using default location", ToastAndroid.SHORT);
        }

        try {
            const userId = await AsyncStorage.getItem("UserId");
            const formData = new FormData();
            formData.append("Mode", 1);
            formData.append("Retailer_Id", selectedRetailer.Retailer_id);
            formData.append("Latitude", finalLatitude.toString());
            formData.append("Longitude", finalLongitude.toString());
            formData.append("Narration", "The receipt has been created.");
            formData.append("EntryBy", userId);

            const response = await fetch(API.visitedLog(), {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            if (data.success) {
                ToastAndroid.show(data.message, ToastAndroid.LONG);
                return true;
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            ToastAndroid.show(
                `Visit log error: ${err.message}`,
                ToastAndroid.LONG,
            );
            return false;
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
        const initialAmounts = {};
        selectedBills.forEach(billId => {
            const bill = pendingBills.find(b => b.uniqueId === billId);
            if (bill) {
                const pendingAmount =
                    bill.totalValue - bill.againstAmount;
                initialAmounts[billId] = pendingAmount.toString();
            }
        });
        setReceiptAmounts(initialAmounts);
    };

    const handleViewClose = () => {
        setShowReceiptView(false);
    };

    const getLedgerDetails = () => {
        let transaction_type = "";

        if (selectedAmountType?.Account_Name === "Cash Note Off") {
            transaction_type = "Cash";
        } else if (
            selectedAmountType?.Account_Name === "Canara Bank (795956)"
        ) {
            transaction_type = "UPI";
        }

        let credit_ledger_Id = selectedRetailer.value;
        let credit_ledger_name = selectedRetailer.label;

        if (selectedRetailer.value === "0" || selectedRetailer.value === 0) {
            credit_ledger_Id = 14;
            credit_ledger_name = `${selectedRetailer.label} - (Sundry Creditors)`;
        }

        return { transaction_type, credit_ledger_Id, credit_ledger_name };
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

        const { transaction_type, credit_ledger_Id, credit_ledger_name } =
            getLedgerDetails();

        try {
            const userId = await AsyncStorage.getItem("UserId");
            const costCenterId = await AsyncStorage.getItem("costCenterId");
            const costCenterName = await AsyncStorage.getItem("costCenterName");
            const costCategoryId = await AsyncStorage.getItem("costCategoryId");
            const costCategoryName = await AsyncStorage.getItem("costCategoryName");
            const visitEntrySuccess = await handleSubmitforVisitLog();
            if (!visitEntrySuccess) return;

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
                transaction_type: transaction_type,
                receipt_date: selectedDate.toISOString(),
                BillsDetails: selectedBills.map(billId => {
                    const bill = pendingBills.find(b => b.uniqueId === billId);
                    const receiptAmount = receiptAmounts[billId]
                        ? parseFloat(receiptAmounts[billId])
                        : bill
                            ? bill.totalValue - bill.againstAmount
                            : 0;

                    return {
                        bill_id: bill?.originalVoucherId || bill?.voucherId || billId, // Use original voucherId for API
                        bill_name: bill?.voucherNumber || billId,
                        bill_amount: receiptAmount,
                        Credit_Amo: receiptAmount,
                    };
                }),
                staffDetails: [{
                    Emp_Id: parseInt(costCenterId, 10),
                    Emp_Name: costCenterName,
                    Emp_Type_Id: parseInt(costCategoryId, 10),
                    Emp_Type_Name: costCategoryName,
                }]
            };

            // console.log("Receipt created successfully:", resBody);
            const result = await createReceipt(resBody);

            // Show success message and navigate back
            Alert.alert(
                "Success",
                result.message || "Receipt created successfully!",
            );
            setShowReceiptView(false);
            navigation.reset({
                index: 0,
                routes: [{
                    name: "HomeScreen",
                    state: {
                        index: 0,
                        routes: [{ name: "HomeScreen"}] 
                    }
                }],
            });
            // Reset form
            setSelectedBills([]);
            setReceiptAmounts({});
            setSelectAll(false);
        } catch (error) {
            console.error("Error creating receipt:", error);
            Alert.alert("Failed to create receipt. Please try again.");
        }
    };

    const handleOpenCollectPaymentModal = () => {
        if (!selectedAmountType) {
            Alert.alert(
                "Please select a payment type before collecting payment.",
            );
            return;
        }

        if (!selectedRetailer) {
            Alert.alert(
                "Please select a retailer before collecting payment.",
            );
            return;
        }

        setCollectPaymentAmount("");
        setShowCollectPaymentModal(true);
    };

    const handleCloseCollectPaymentModal = () => {
        setShowCollectPaymentModal(false);
        setCollectPaymentAmount("");
    };

    const handleCollectAmountChange = amount => {
        setCollectPaymentAmount(sanitizeDecimalInput(amount));
    };

    const handleSubmitCollectPayment = async () => {
        const amount = parseFloat(collectPaymentAmount);

        if (!collectPaymentAmount || isNaN(amount) || amount <= 0) {
            Alert.alert("Please enter a valid payment amount.");
            return;
        }

        const { transaction_type, credit_ledger_Id, credit_ledger_name } =
            getLedgerDetails();

        try {
            const userId = await AsyncStorage.getItem("UserId");
            const costCenterId = await AsyncStorage.getItem("costCenterId");
            const costCenterName = await AsyncStorage.getItem("costCenterName");
            const costCategoryId = await AsyncStorage.getItem("costCategoryId");
            const costCategoryName = await AsyncStorage.getItem("costCategoryName");
            const visitEntrySuccess = await handleSubmitforVisitLog();
            if (!visitEntrySuccess) return;

            const resBody = {
                receipt_voucher_type_id: 10,
                receipt_bill_type: 1,
                remarks: "Receipt created from mobile app",
                status: 1,
                credit_ledger: credit_ledger_Id,
                credit_ledger_name: credit_ledger_name,
                debit_ledger: selectedAmountType?.Acc_Id,
                debit_ledger_name: selectedAmountType?.Account_Name,
                credit_amount: amount,
                created_by: userId,
                transaction_type: transaction_type,
                receipt_date: selectedDate.toISOString(),
                staffDetails: [{
                    receipt_id: "",
                    Emp_Id: parseInt(costCenterId, 10),
                    Emp_Name: costCenterName,
                    Emp_Type_Id: parseInt(costCategoryId, 10),
                    Emp_Type_Name: costCategoryName,
                }]
            };


            const result = await createReceipt(resBody);

            Alert.alert(
                "Success",
                result.message || "Payment collected successfully!",
            );
            setShowCollectPaymentModal(false);
            setCollectPaymentAmount("");
            navigation.reset({
                index: 0,
                routes: [{
                    name: "HomeScreen",
                    state: {
                        index: 0,
                        routes: [{ name: "HomeScreen"}]
                    }
                }],
            });
        } catch (error) {
            console.error("Error collecting payment:", error);
            Alert.alert("Failed to collect payment. Please try again.");
        }
    };

    const handleEditAmountChange = amount => {
        setEditAmount(sanitizeDecimalInput(amount));
    };

    const handleReferenceAmountChange = (autoId, amount) => {
        setReferenceAmounts(prev => ({
            ...prev,
            [autoId]: sanitizeDecimalInput(amount),
        }));
    };

    const handleRemoveReference = autoId => {
        setRemovedReferences(prev => [...prev, autoId]);
    };

    const handleRestoreReferences = () => {
        setRemovedReferences([]);
    };

    const getActiveReferences = () =>
        editReferenceAgainstBill.filter(
            bill => !removedReferences.includes(bill.auto_id),
        );

    const getTotalReferenceAmount = () =>
        getActiveReferences().reduce((total, bill) => {
            const amount = parseFloat(referenceAmounts[bill.auto_id]);
            return total + (isNaN(amount) ? 0 : amount);
        }, 0);

    const handleUpdateReceipt = async () => {
        if (isUpdatingReceipt) return;

        if (!selectedAmountType) {
            Alert.alert("Please select a payment type.");
            return;
        }

        if (!selectedRetailer) {
            Alert.alert("Please select a retailer.");
            return;
        }

        const amount = parseFloat(editAmount);
        if (!editAmount || isNaN(amount) || amount <= 0) {
            Alert.alert("Please enter a valid amount.");
            return;
        }

        const activeReferences = getActiveReferences();
        const invalidReference = activeReferences.find(bill => {
            const refAmount = parseFloat(referenceAmounts[bill.auto_id]);
            return isNaN(refAmount) || refAmount <= 0;
        });
        if (invalidReference) {
            Alert.alert(
                `Please enter a valid payment amount for invoice #${invalidReference.bill_name}.`,
            );
            return;
        }

        const { transaction_type, credit_ledger_Id, credit_ledger_name } =
            getLedgerDetails();

        const buildBillsDetails = () =>
            activeReferences.map(bill => ({
                bill_id: bill.bill_id,
                bill_name: bill.bill_name,
                bill_amount: bill.bill_amount,
                JournalBillType: bill.JournalBillType,
                Credit_Amo: parseFloat(referenceAmounts[bill.auto_id]),
            }));

        const buildAlterReason = () => {
            const changes = [];

            const originalAmount = Number(receiptData.credit_amount);
            if (!isNaN(originalAmount) && originalAmount !== amount) {
                changes.push(
                    `amount changed from ₹${originalAmount.toFixed(2)} to ₹${amount.toFixed(2)}`,
                );
            }

            const originalPaymentType = receiptData.debit_ledger_name;
            const newPaymentType = selectedAmountType?.Account_Name;
            if (
                originalPaymentType &&
                newPaymentType &&
                originalPaymentType !== newPaymentType
            ) {
                changes.push(
                    `payment type changed from "${originalPaymentType}" to "${newPaymentType}"`,
                );
            }

            const originalRetailerName = receiptData.credit_ledger_name;
            if (
                originalRetailerName &&
                credit_ledger_name &&
                originalRetailerName !== credit_ledger_name
            ) {
                changes.push(
                    `retailer changed from "${originalRetailerName}" to "${credit_ledger_name}"`,
                );
            }

            const originalDate = receiptData.receipt_date
                ? new Date(receiptData.receipt_date).toLocaleDateString("en-GB")
                : null;
            const newDate = selectedDate.toLocaleDateString("en-GB");
            if (originalDate && originalDate !== newDate) {
                changes.push(
                    `receipt date changed from ${originalDate} to ${newDate}`,
                );
            }

            const changedReferences = activeReferences.filter(bill => {
                const original = Number(
                    bill.Credit_Amo ?? bill.bill_amount ?? 0,
                );
                const updated = parseFloat(referenceAmounts[bill.auto_id]);
                return !isNaN(updated) && original !== updated;
            });
            if (changedReferences.length > 0) {
                changes.push(
                    `bill reference amount updated for ${changedReferences
                        .map(bill => bill.bill_name)
                        .join(", ")}`,
                );
            }

            if (removedReferences.length > 0) {
                const removedNames = editReferenceAgainstBill
                    .filter(bill => removedReferences.includes(bill.auto_id))
                    .map(bill => bill.bill_name);
                changes.push(
                    `bill reference removed: ${removedNames.join(", ")}`,
                );
            }

            return changes.length > 0
                ? `Receipt updated from app: ${changes.join(", ")}`
                : "Receipt updated from app (no field changes)";
        };

        setIsUpdatingReceipt(true);

        try {
            const userId = await AsyncStorage.getItem("UserId");
            const costCenterId = await AsyncStorage.getItem("costCenterId");
            const costCategoryId = await AsyncStorage.getItem("costCategoryId");

            const resBody = {
                receipt_id: receiptData.receipt_id,
                remarks: buildAlterReason(),
                status: 1,
                credit_ledger: credit_ledger_Id,
                credit_ledger_name: credit_ledger_name,
                debit_ledger: selectedAmountType?.Acc_Id,
                debit_ledger_name: selectedAmountType?.Account_Name,
                credit_amount: amount,
                debit_amount: amount,
                altered_by: userId,
                Alter_Reason: buildAlterReason(),
                is_new_ref: 0,
                transaction_type: transaction_type,
                receipt_date: selectedDate.toISOString(),
                staffDetails: [
                    {
                        Emp_Id: parseInt(costCenterId, 10),
                        Emp_Type_Id: parseInt(costCategoryId, 10),
                    },
                ],
            };

            // console.log("Updating receipt with data:", resBody)

            const result = await editReceipt(resBody);

            // Bill reference amounts live in a separate table and are only
            // updated via this endpoint, which fully replaces the receipt's
            // bill reference rows from the given BillsDetails.
            if (editReferenceAgainstBill.length > 0) {
                await updateAgainstRef({
                    receipt_id: receiptData.receipt_id,
                    receipt_no: receiptData.receipt_invoice_no,
                    receipt_date: selectedDate.toISOString(),
                    receipt_bill_type: receiptData.receipt_bill_type,
                    DR_CR_Acc_Id: credit_ledger_Id,
                    BillsDetails: buildBillsDetails(),
                });
            }

            Alert.alert(
                "Success",
                result.message || "Receipt updated successfully!",
            );
            navigation.reset({
                index: 0,
                routes: [{
                    name: "HomeScreen",
                    state: {
                        index: 0,
                        routes: [{ name: "HomeScreen"}] 
                    }
                }],
            });
        } catch (error) {
            console.error("Error updating receipt:", error);
            Alert.alert(
                "Failed to update receipt",
                error.message || "Please try again.",
            );
        } finally {
            setIsUpdatingReceipt(false);
        }
    };

    const renderBillCard = bill => {
        const isSelected = selectedBills.includes(bill.uniqueId);
        const pendingAmount = bill.totalValue - bill.againstAmount;

        return (
            <TouchableOpacity
                key={bill.uniqueId}
                style={[styles.billCard, isSelected && styles.selectedBillCard]}
                onPress={() => handleBillSelection(bill.uniqueId)}
                activeOpacity={0.7}
            >
                <View style={styles.billHeader}>
                    <View style={styles.billCheckbox}>
                        <View style={[
                            styles.checkboxContainer,
                            isSelected && styles.checkboxSelected
                        ]}>
                            {isSelected && (
                                <FeatherIcon name="check" size={iconSizes.sm} color={customColors.white} />
                            )}
                        </View>
                    </View>
                    <View style={styles.billHeaderInfo}>
                        <Text style={styles.billNumber}>
                            Invoice #{bill.voucherNumber}
                        </Text>
                        <View style={styles.billMetaRow}>
                            <FeatherIcon name="calendar" size={iconSizes.xs} color={customColors.grey500} />
                            <Text style={styles.billDate}>
                                {new Date(bill.eventDate).toLocaleDateString("en-GB")}
                            </Text>
                        </View>
                        <View style={styles.billTotalRow}>
                            <FontAwesomeIcon name="inr" size={iconSizes.xs} color={customColors.grey600} />
                            <Text style={styles.billTotalAmount}>
                                {bill.totalValue.toFixed(2)}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.pendingBadge}>
                        <Text style={styles.pendingLabel}>PENDING</Text>
                        <Text style={styles.pendingAmount}>
                            ₹{pendingAmount.toFixed(2)}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEditReceiptView = () => (
        <View style={styles.content}>
            <View style={styles.receiptDateContainer}>
                <DatePickerButton
                    label="Receipt Date"
                    date={selectedDate instanceof Date ? selectedDate : new Date()}
                    onDateChange={handleDateChange}
                    containerStyle={styles.receiptDatePicker}
                />
            </View>

            <ScrollView
                style={styles.receiptContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <EnhancedDropdown
                    data={filteredRetailers}
                    labelField="label"
                    valueField="Retailer_id"
                    placeholder="Select Retailer"
                    value={selectedRetailer?.Retailer_id}
                    onChange={handleRetailerSelect}
                    containerStyle={styles.dropdownContainer}
                    searchPlaceholder="Search retailers..."
                    itemContainerStyle={styles.dropdownItem}
                    renderItem={(item, index) => (
                        <View
                            key={`retailer_edit_item_${item.Retailer_id}_${index}`}
                            style={styles.dropdownItemContent}>
                            <Text style={styles.dropdownItemText} numberOfLines={2}>
                                {item.label}
                            </Text>
                        </View>
                    )}
                />

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
                            key={`payment_edit_item_${item.Acc_Id}_${index}`}
                            style={styles.dropdownItemContent}>
                            <Text style={styles.dropdownItemText} numberOfLines={2}>
                                {item.Account_Name}
                            </Text>
                        </View>
                    )}
                />

                {isLoadingAgainstBill && (
                    <View style={styles.loadingState}>
                        <Text style={styles.loadingText}>
                            Loading referenced bills...
                        </Text>
                    </View>
                )}

                {editReferenceAgainstBill.length > 0 && (
                    <View style={styles.againstBillSection}>
                        <Text style={styles.receiptAmountLabel}>
                            Against Reference
                        </Text>
                        {getActiveReferences().map(bill => (
                            <View key={bill.key} style={styles.receiptBillCard}>
                                <View style={styles.receiptBillHeader}>
                                    <View style={styles.receiptBillIconWrap}>
                                        <FeatherIcon
                                            name="file-text"
                                            size={iconSizes.md}
                                            color={customColors.primary}
                                        />
                                    </View>
                                    <View style={styles.receiptBillInfo}>
                                        <Text style={styles.receiptBillNumber}>
                                            Invoice #{bill.bill_name}
                                        </Text>
                                        <View style={styles.receiptBillMeta}>
                                            <FeatherIcon
                                                name="calendar"
                                                size={iconSizes.xs}
                                                color={customColors.grey500}
                                            />
                                            <Text style={styles.receiptBillDate}>
                                                {new Date(
                                                    bill.referenceBillDate,
                                                ).toLocaleDateString("en-GB")}
                                            </Text>
                                        </View>
                                        <View style={styles.billTotalRow}>
                                            <FontAwesomeIcon
                                                name="inr"
                                                size={iconSizes.xs}
                                                color={customColors.grey600}
                                            />
                                            <Text style={styles.billTotalAmount}>
                                                Invoice Value:{" "}
                                                {Number(
                                                    bill.bill_amount ?? 0,
                                                ).toFixed(2)}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.removeReferenceButton}
                                        onPress={() =>
                                            handleRemoveReference(bill.auto_id)
                                        }
                                        activeOpacity={0.7}
                                    >
                                        <FeatherIcon
                                            name="trash-2"
                                            size={iconSizes.sm}
                                            color={customColors.error}
                                        />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.receiptAmountContainer}>
                                    <Text style={styles.receiptAmountLabel}>
                                        Payment Amount
                                    </Text>
                                    <View style={styles.receiptInputWrapper}>
                                        <FontAwesomeIcon
                                            name="inr"
                                            size={iconSizes.sm}
                                            color={customColors.grey500}
                                        />
                                        <TextInput
                                            style={styles.receiptAmountInput}
                                            value={
                                                referenceAmounts[
                                                    bill.auto_id
                                                ] ?? ""
                                            }
                                            onChangeText={amount =>
                                                handleReferenceAmountChange(
                                                    bill.auto_id,
                                                    amount,
                                                )
                                            }
                                            placeholder="0.00"
                                            placeholderTextColor={
                                                customColors.grey400
                                            }
                                            keyboardType="decimal-pad"
                                        />
                                    </View>
                                </View>
                            </View>
                        ))}

                        {getActiveReferences().length > 0 && (
                            <View style={styles.referenceSummaryContainer}>
                                <Text style={styles.referenceSummaryLabel}>
                                    Total Payment Amount
                                </Text>
                                <Text style={styles.referenceSummaryValue}>
                                    ₹{getTotalReferenceAmount().toFixed(2)}
                                </Text>
                            </View>
                        )}

                        {removedReferences.length > 0 && (
                            <TouchableOpacity
                                style={styles.undoRemoveButton}
                                onPress={handleRestoreReferences}
                                activeOpacity={0.7}
                            >
                                <FeatherIcon
                                    name="rotate-ccw"
                                    size={iconSizes.sm}
                                    color={customColors.primary}
                                />
                                <Text style={styles.undoRemoveText}>
                                    Restore removed reference(s) (
                                    {removedReferences.length})
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <View style={styles.receiptAmountContainer}>
                    <Text style={styles.receiptAmountLabel}>Amount</Text>
                    <View style={styles.receiptInputWrapper}>
                        <FontAwesomeIcon name="inr" size={iconSizes.sm} color={customColors.grey500} />
                        <TextInput
                            style={styles.receiptAmountInput}
                            value={editAmount}
                            onChangeText={handleEditAmountChange}
                            placeholder="0.00"
                            placeholderTextColor={customColors.grey400}
                            keyboardType="decimal-pad"
                        />
                    </View>
                </View>
                <View style={styles.bottomSpacer} />
            </ScrollView>

            <View style={styles.receiptFooter}>
                <TouchableOpacity
                    style={[
                        styles.receiptCancelButton,
                        isUpdatingReceipt && styles.disabledButton,
                    ]}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                    disabled={isUpdatingReceipt}
                >
                    <FeatherIcon name="arrow-left" size={iconSizes.md} color={customColors.grey700} />
                    <Text style={styles.receiptCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.receiptSubmitButton,
                        isUpdatingReceipt && styles.disabledButton,
                    ]}
                    onPress={handleUpdateReceipt}
                    activeOpacity={0.7}
                    disabled={isUpdatingReceipt}
                >
                    {isUpdatingReceipt ? (
                        <ActivityIndicator
                            size="small"
                            color={customColors.white}
                        />
                    ) : (
                        <View style={styles.receiptSubmitContent}>
                            <FeatherIcon name="check-circle" size={iconSizes.md} color={customColors.white} />
                            <Text style={styles.receiptSubmitText}>Update Receipt</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

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

            {selectedRetailer?.Retailer_id && (
                <TouchableOpacity
                    style={styles.addPaymentButton}
                    onPress={handleOpenCollectPaymentModal}
                    activeOpacity={0.7}
                >
                    <FeatherIcon
                        name="plus-circle"
                        size={iconSizes.md}
                        color={customColors.primary}
                    />
                    <Text style={styles.addPaymentButtonText}>
                        Collect Payment (No Bill Reference)
                    </Text>
                </TouchableOpacity>
            )}

            {selectedRetailer?.Retailer_id && pendingBills.length > 0 && (
                <>
                    <View style={styles.billsHeader}>
                        <TouchableOpacity
                            style={styles.selectAllButton}
                            onPress={handleSelectAll}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.selectAllCheckbox,
                                selectAll && styles.selectAllCheckboxActive
                            ]}>
                                {selectAll && (
                                    <FeatherIcon name="check" size={iconSizes.sm} color={customColors.white} />
                                )}
                            </View>
                            <Text style={styles.selectAllText}>
                                {selectAll ? "Deselect All" : "Select All"} ({pendingBills.length})
                            </Text>
                        </TouchableOpacity>

                        {selectedBills.length > 0 && (
                            <View style={styles.selectedSummary}>
                                <View style={styles.selectedCountBadge}>
                                    <Text style={styles.selectedCount}>
                                        {selectedBills.length} selected
                                    </Text>
                                </View>
                                <Text style={styles.selectedAmount}>
                                    ₹{getTotalSelectedAmount().toFixed(2)}
                                </Text>
                            </View>
                        )}
                    </View>

                    <ScrollView
                        style={styles.billsContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        {pendingBills.map(bill => renderBillCard(bill))}
                        <View style={styles.bottomSpacer} />
                    </ScrollView>

                    {selectedBills.length > 0 && (
                        <View style={styles.actionContainer}>
                            <TouchableOpacity
                                style={styles.createReceiptButton}
                                activeOpacity={0.7}
                                onPress={handleCreateReceipt}
                            >
                                <FeatherIcon name="file-plus" size={iconSizes.md} color={customColors.white} />
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
                        <View style={styles.emptyIconContainer}>
                            <FeatherIcon name="file-text" size={iconSizes.xxl} color={customColors.grey300} />
                        </View>
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
                    date={selectedDate instanceof Date ? selectedDate : new Date()}
                    onDateChange={handleDateChange}
                    containerStyle={styles.receiptDatePicker}
                />
            </View>

            <ScrollView
                style={styles.receiptContent}
                showsVerticalScrollIndicator={false}
            >
                {selectedBills.map(billId => {
                    const bill = pendingBills.find(b => b.uniqueId === billId);
                    if (!bill) return null;

                    const pendingAmount = bill.totalValue - bill.againstAmount;

                    return (
                        <View key={billId} style={styles.receiptBillCard}>
                            <View style={styles.receiptBillHeader}>
                                <View style={styles.receiptBillIconWrap}>
                                    <FeatherIcon name="file-text" size={iconSizes.md} color={customColors.primary} />
                                </View>
                                <View style={styles.receiptBillInfo}>
                                    <Text style={styles.receiptBillNumber}>
                                        Invoice #{bill.voucherNumber}
                                    </Text>
                                    <View style={styles.receiptBillMeta}>
                                        <FeatherIcon name="calendar" size={iconSizes.xs} color={customColors.grey500} />
                                        <Text style={styles.receiptBillDate}>
                                            {new Date(bill.eventDate).toLocaleDateString("en-GB")}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.receiptPendingBadge}>
                                    <Text style={styles.receiptPendingLabel}>Pending</Text>
                                    <Text style={styles.receiptPendingAmount}>
                                        ₹{pendingAmount.toFixed(2)}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.receiptAmountContainer}>
                                <Text style={styles.receiptAmountLabel}>
                                    Receipt Amount
                                </Text>
                                <View style={styles.receiptInputWrapper}>
                                    <FontAwesomeIcon name="inr" size={iconSizes.sm} color={customColors.grey500} />
                                    <TextInput
                                        style={styles.receiptAmountInput}
                                        value={receiptAmounts[billId] || ""}
                                        onChangeText={amount => handleReceiptAmountChange(billId, amount)}
                                        placeholder="0.00"
                                        placeholderTextColor={customColors.grey400}
                                        keyboardType="numeric"
                                        selectTextOnFocus={true}
                                    />
                                </View>
                            </View>
                        </View>
                    );
                })}
                <View style={styles.bottomSpacer} />
            </ScrollView>

            <View style={styles.receiptFooter}>
                <TouchableOpacity
                    style={styles.receiptCancelButton}
                    onPress={handleViewClose}
                    activeOpacity={0.7}
                >
                    <FeatherIcon name="arrow-left" size={iconSizes.md} color={customColors.grey700} />
                    <Text style={styles.receiptCancelText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.receiptSubmitButton}
                    onPress={handleViewSubmit}
                    activeOpacity={0.7}
                >
                    <View style={styles.receiptSubmitContent}>
                        <FeatherIcon name="check-circle" size={iconSizes.md} color={customColors.white} />
                        <Text style={styles.receiptSubmitText}>Create Receipt</Text>
                    </View>
                    <Text style={styles.receiptSubmitAmount}>
                        ₹{getTotalSelectedAmount().toFixed(2)}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title={editMode ? "Edit Receipt" : "Create Receipts"}
                navigation={navigation}
            />
            <LocationIndicator
                onLocationUpdate={locationData => setLocation(locationData)}
                autoFetch={true}
                autoFetchOnMount={true}
                showComponent={false}
            />

            <KeyboardAvoidingView
                style={styles.contentContainer}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                {editMode
                    ? renderEditReceiptView()
                    : showReceiptView
                        ? renderReceiptCreationView()
                        : renderBillSelectionView()}
            </KeyboardAvoidingView>

            <Modal
                visible={showCollectPaymentModal}
                transparent
                animationType="fade"
                onRequestClose={handleCloseCollectPaymentModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Collect Payment
                            </Text>
                            <TouchableOpacity
                                onPress={handleCloseCollectPaymentModal}
                                activeOpacity={0.7}
                            >
                                <FeatherIcon
                                    name="x"
                                    size={iconSizes.md}
                                    color={customColors.grey600}
                                />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Record an amount collected without a bill
                            reference.
                        </Text>

                        <View style={styles.receiptInputWrapper}>
                            <FontAwesomeIcon
                                name="inr"
                                size={iconSizes.sm}
                                color={customColors.grey500}
                            />
                            <TextInput
                                style={[
                                    styles.receiptAmountInput,
                                    styles.collectPaymentAmountInput,
                                ]}
                                value={collectPaymentAmount}
                                onChangeText={handleCollectAmountChange}
                                placeholder="0.00"
                                placeholderTextColor={customColors.grey400}
                                keyboardType="decimal-pad"
                                autoFocus
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.receiptCancelButton}
                                onPress={handleCloseCollectPaymentModal}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.receiptCancelText}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.receiptSubmitButton}
                                onPress={handleSubmitCollectPayment}
                                activeOpacity={0.7}
                            >
                                <View style={styles.receiptSubmitContent}>
                                    <FeatherIcon
                                        name="check-circle"
                                        size={iconSizes.md}
                                        color={customColors.white}
                                    />
                                    <Text style={styles.receiptSubmitText}>
                                        Submit
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        backgroundColor: customColors.grey50,
    },
    content: {
        flex: 1,
        backgroundColor: customColors.grey50,
        padding: spacing.md,
    },
    // Dropdown Styles
    dropdownContainer: {
        marginBottom: spacing.sm,
        minHeight: 56,
    },
    rowContainer: {
        flexDirection: "row",
        alignItems: "stretch",
        marginBottom: spacing.md,
        gap: spacing.md,
    },
    rowItem: {
        flex: 1,
    },
    dropdownItem: {
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    dropdownItemContent: {
        padding: spacing.md,
        backgroundColor: customColors.white,
    },
    dropdownItemText: {
        ...typography.body2(),
        color: customColors.grey900,
    },
    // Add Payment Button
    addPaymentButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: customColors.primary,
        borderStyle: "dashed",
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.sm,
        marginBottom: spacing.md,
    },
    addPaymentButtonText: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "600",
    },
    // Collect Payment Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: customColors.overlay,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.lg,
    },
    modalCard: {
        width: "100%",
        maxWidth: 400,
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        ...shadows.small,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.xs,
    },
    modalTitle: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    modalSubtitle: {
        ...typography.body2(),
        color: customColors.grey500,
        marginBottom: spacing.md,
    },
    modalActions: {
        flexDirection: "row",
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    // Against Bill References (edit view)
    againstBillSection: {
        marginBottom: spacing.md,
    },
    removeReferenceButton: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.md,
        backgroundColor: customColors.errorFaded,
        justifyContent: "center",
        alignItems: "center",
    },
    referenceSummaryContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: customColors.primaryFaded,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginTop: spacing.xxs,
    },
    referenceSummaryLabel: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "600",
    },
    referenceSummaryValue: {
        ...typography.body1(),
        color: customColors.primary,
        fontWeight: "700",
    },
    undoRemoveButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        marginTop: spacing.xs,
    },
    undoRemoveText: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "600",
    },
    // Bills Header
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
    selectAllCheckbox: {
        width: 24,
        height: 24,
        borderRadius: borderRadius.sm,
        borderWidth: 2,
        borderColor: customColors.grey400,
        justifyContent: "center",
        alignItems: "center",
    },
    selectAllCheckboxActive: {
        backgroundColor: customColors.primary,
        borderColor: customColors.primary,
    },
    selectAllText: {
        ...typography.body2(),
        color: customColors.grey800,
        fontWeight: "600",
    },
    selectedSummary: {
        alignItems: "flex-end",
        gap: spacing.xxs,
    },
    selectedCountBadge: {
        backgroundColor: customColors.primaryFaded,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.round,
    },
    selectedCount: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "600",
    },
    selectedAmount: {
        ...typography.body1(),
        color: customColors.primary,
        fontWeight: "700",
    },
    // Bills Container
    billsContainer: {
        flex: 1,
    },
    // Bill Card
    billCard: {
        backgroundColor: customColors.white,
        marginBottom: spacing.sm,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        // ...shadows.small,
    },
    selectedBillCard: {
        borderWidth: 2,
        borderColor: customColors.primary,
        backgroundColor: customColors.primaryFaded,
    },
    billHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    billCheckbox: {
        marginRight: spacing.sm,
        paddingTop: spacing.xxs,
    },
    checkboxContainer: {
        width: 22,
        height: 22,
        borderRadius: borderRadius.sm,
        borderWidth: 2,
        borderColor: customColors.grey400,
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxSelected: {
        backgroundColor: customColors.primary,
        borderColor: customColors.primary,
    },
    billHeaderInfo: {
        flex: 1,
    },
    billNumber: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    billMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xxs,
        marginTop: spacing.xxs,
    },
    billDate: {
        ...typography.subtitle1(),
        color: customColors.grey500,
    },
    billTotalRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xxs,
        marginTop: spacing.xs,
    },
    billTotalAmount: {
        ...typography.body2(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    // Pending Badge
    pendingBadge: {
        backgroundColor: customColors.error,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.lg,
        alignItems: "center",
        minWidth: 85,
    },
    pendingLabel: {
        ...typography.overline(),
        color: customColors.white,
        fontWeight: "700",
        fontSize: 9,
        letterSpacing: 0.5,
    },
    pendingAmount: {
        ...typography.body2(),
        color: customColors.white,
        fontWeight: "700",
    },
    // Action Container
    actionContainer: {
        paddingVertical: spacing.sm,
        backgroundColor: customColors.grey50,
    },
    createReceiptButton: {
        flexDirection: "row",
        backgroundColor: customColors.primary,
        borderRadius: borderRadius.round,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        ...shadows.small,
    },
    createReceiptButtonText: {
        ...typography.body1(),
        color: customColors.white,
        fontWeight: "600",
    },
    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.xxl,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    emptyStateText: {
        ...typography.h6(),
        color: customColors.grey700,
        fontWeight: "600",
        marginBottom: spacing.xs,
    },
    emptyStateSubtext: {
        ...typography.body2(),
        color: customColors.grey500,
        textAlign: "center",
    },
    // Loading State
    loadingState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.xl,
    },
    loadingText: {
        ...typography.body1(),
        color: customColors.grey600,
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
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        marginHorizontal: spacing.xxs,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.small,
    },
    receiptBillHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: spacing.md,
    },
    receiptBillIconWrap: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.lg,
        backgroundColor: customColors.primaryFaded,
        justifyContent: "center",
        alignItems: "center",
    },
    receiptBillInfo: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    receiptBillNumber: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    receiptBillMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xxs,
        marginTop: spacing.xxs,
    },
    receiptBillDate: {
        ...typography.subtitle1(),
        color: customColors.grey500,
    },
    receiptPendingBadge: {
        alignItems: "flex-end",
    },
    receiptPendingLabel: {
        ...typography.caption(),
        color: customColors.grey500,
    },
    receiptPendingAmount: {
        ...typography.body1(),
        color: customColors.warning,
        fontWeight: "700",
    },
    // Receipt Amount Input
    receiptAmountContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: customColors.grey100,
    },
    receiptAmountLabel: {
        ...typography.body2(),
        color: customColors.grey700,
        fontWeight: "500",
    },
    receiptInputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey50,
        borderWidth: 1,
        borderColor: customColors.grey200,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.sm,
        gap: spacing.xs,
    },
    receiptAmountInput: {
        ...typography.body1(),
        color: customColors.grey900,
        textAlign: "right",
        minWidth: 100,
        paddingVertical: spacing.sm,
        fontWeight: "600",
    },
    // Collect Payment modal's amount input fills its wrapper so the whole
    // box is tappable to open the keyboard, not just the text's own width.
    collectPaymentAmountInput: {
        flex: 1,
    },
    // Receipt Footer
    receiptFooter: {
        flexDirection: "row",
        paddingVertical: spacing.md,
        gap: spacing.sm,
        backgroundColor: customColors.grey50,
    },
    disabledButton: {
        opacity: 0.5,
    },
    receiptCancelButton: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: customColors.white,
        borderRadius: borderRadius.round,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        ...shadows.small,
    },
    receiptCancelText: {
        ...typography.body2(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    receiptSubmitButton: {
        flex: 2,
        backgroundColor: customColors.primary,
        borderRadius: borderRadius.round,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        alignItems: "center",
        ...shadows.small,
    },
    receiptSubmitContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    receiptSubmitText: {
        ...typography.body2(),
        color: customColors.white,
        fontWeight: "600",
    },
    receiptSubmitAmount: {
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "700",
        marginTop: spacing.xxs,
    },
});
