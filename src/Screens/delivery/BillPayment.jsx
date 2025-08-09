import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    TextInput,
    Alert,
    ScrollView,
    ToastAndroid,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import moment from "moment";
import Icon from "react-native-vector-icons/Ionicons";
import CheckBox from "@react-native-community/checkbox";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../../Config/Endpoint";
import {
    customColors,
    spacing,
    typography,
    shadows,
} from "../../Config/helper";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import { SafeAreaView } from "react-native-safe-area-context";

const BillPayment = () => {
    const navigation = useNavigation();
    const [retailersData, setRetailersData] = useState([]);
    const [userId, setUserId] = useState(null);
    const [pendingBills, setPending] = useState([]);
    const [selectedRetailer, setSelectedRetailer] = useState(0);
    const [selectedBills, setSelectedBills] = useState([]);
    const [showPaymentScreen, setShowPaymentScreen] = useState(false);
    const [paymentMode, setPaymentMode] = useState(null);
    const [collectionDate, setCollectionDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [billAmounts, setBillAmounts] = useState({});
    const [narration, setNarration] = useState("");
    const [location, setLocation] = useState(null);
    const [filteredRetailers, setFilteredRetailers] = useState([]);

    const paymentModes = [
        { label: "Cash", value: "CREATED-CASH" },
        { label: "UPI", value: "CREATED-UPI" },
        { label: "CHECK", value: "CREATED-CHECK" },
        { label: "Bank Transfer", value: "CREATED-BANK-TRANSFER" },
    ];

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                setUserId(userId);
                fetchRetailersInfo();
            } catch (err) {
                console.error(err);
            }
        })();
    }, []);

    useEffect(() => {
        if (retailersData && retailersData.length > 0) {
            setFilteredRetailers(retailersData);
        }
    }, [retailersData]);

    const fetchRetailersInfo = async () => {
        try {
            const response = await fetch(`${API.getRetailersWhoHasBills()}`);
            const data = await response.json();
            if (data.success) {
                setRetailersData(data.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchRetailersBillInfo = async rId => {
        try {
            const response = await fetch(`${API.retailerPendingBills()}${rId}`);
            const data = await response.json();
            if (data.success) {
                // Filter out bills with negative pendingAmount
                const validBills = data.data.filter(
                    bill => bill.pendingAmount >= 0,
                );
                setPending(validBills);
            } else {
                console.log("API returned unsuccessful response");
            }
        } catch (err) {
            console.error("Error fetching bills:", err);
        }
    };

    const handleRetailerSelect = item => {
        // console.log("Selected retailer:", item);
        if (item && item.Retailer_Id) {
            setSelectedRetailer(item.Retailer_Id);
            fetchRetailersBillInfo(item.Retailer_Id);
        } else {
            console.error("Invalid retailer selection");
        }
    };

    const handleCheckboxChange = bill => {
        const isSelected = selectedBills.includes(bill.Do_Id);
        if (isSelected) {
            setSelectedBills(selectedBills.filter(id => id !== bill.Do_Id));
        } else {
            setSelectedBills([...selectedBills, bill.Do_Id]);
        }
    };

    const handlePaymentClick = () => {
        if (selectedBills.length === 0) {
            Alert.alert("Error", "Please select at least one bill");
            return;
        }

        setShowPaymentScreen(true);
        // Initialize bill amounts with pending amounts
        const initialAmounts = {};
        selectedBills.forEach(billId => {
            const bill = pendingBills.find(b => b.Do_Id === billId);
            if (bill) {
                // If pendingAmount is positive, use it as the initial amount
                // Otherwise use the total invoice value
                const initialAmount =
                    bill.pendingAmount > 0
                        ? bill.pendingAmount
                        : bill.Total_Invoice_value;
                initialAmounts[billId] = initialAmount.toString();
            }
        });
        setBillAmounts(initialAmounts);
    };

    const handleAmountChange = (billId, amount) => {
        const bill = pendingBills.find(b => b.Do_Id === billId);
        if (bill) {
            const maxAmount = parseFloat(bill.Total_Invoice_value);
            const enteredAmount = parseFloat(amount) || 0;

            if (enteredAmount > maxAmount) {
                Alert.alert("Error", `Amount cannot exceed ₹${maxAmount}`);
                return;
            }

            setBillAmounts(prev => ({
                ...prev,
                [billId]: amount,
            }));
        }
    };

    const handleSubmitforVisitLog = async () => {
        const formData = new FormData();

        formData.append("Mode", 1);
        formData.append("Retailer_Id", selectedRetailer);
        formData.append("Latitude", 0);
        formData.append("Longitude", 0);
        formData.append("Narration", "The payment receipt has been created.");
        formData.append("EntryBy", userId);

        try {
            const response = await fetch(API.visitedLog(), {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Network response was not ok`);
            }

            const data = await response.json();
            if (data.success) {
                // ToastAndroid.show(data.message, ToastAndroid.LONG);
                // navigation.navigate("HomeScreen");
                console.log("Visit log submitted successfully:", data);
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            ToastAndroid.show("Error submitting form", ToastAndroid.LONG);
            console.error("Error submitting form:", err);
        }
    };

    const handlePaymentSubmit = async () => {
        if (!paymentMode) {
            Alert.alert("Error", "Please select payment mode");
            return;
        }

        // Validate all amounts
        const invalidAmounts = Object.entries(billAmounts).filter(
            ([_, amount]) =>
                !amount || isNaN(amount) || parseFloat(amount) <= 0,
        );

        if (invalidAmounts.length > 0) {
            Alert.alert(
                "Error",
                "Please enter valid amounts for all selected bills",
            );
            return;
        }

        try {
            // Map payment mode to backend format
            const paymentModeMap = {
                cash: "CREATED-CASH",
                upi: "CREATED-UPI",
                check: "CREATED-CHECK",
                bank_transfer: "CREATED-BANK-TRANSFER",
            };

            const paymentData = {
                retailer_id: parseInt(selectedRetailer),
                payed_by: "Owner",
                collection_date: moment(collectionDate).format("YYYY-MM-DD"),
                collection_type: "CASH",
                latitude: 0,
                longitude: 0,
                collected_by: userId,
                created_by: userId,
                voucher_id: 0,
                narration: narration || "",
                Collections: selectedBills.map(billId => {
                    const bill = pendingBills.find(b => b.Do_Id === billId);
                    return {
                        bill_id: parseInt(billId),
                        bill_amount: parseFloat(bill.Total_Invoice_value),
                        collected_amount: parseFloat(billAmounts[billId]),
                        payment_status:
                            paymentModeMap[paymentMode] || "CREATED-CASH",
                    };
                }),
            };

            // Make API call to submit payment
            const response = await fetch(API.paymentCollection(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(paymentData),
            });

            // console.log(API.paymentCollection());
            // console.log(JSON.stringify(paymentData));
            handleSubmitforVisitLog();

            const data = await response.json();
            // console.log("Server response:", data);

            if (data.success) {
                Alert.alert(
                    "Success",
                    data.message || "Payment submitted successfully",
                );
                navigation.goBack();
                setShowPaymentScreen(false);
                // Reset states
                setSelectedBills([]);
                setBillAmounts({});
                setPaymentMode(null);
                setNarration("");
                // Refresh bills list
                fetchRetailersBillInfo(selectedRetailer);
            } else {
                throw new Error(data.message || "Failed to submit payment");
            }
        } catch (error) {
            console.error("Error submitting payment:", error);
            Alert.alert(
                "Error",
                error.message || "Failed to submit payment. Please try again.",
            );
        }
    };

    const renderBillItem = React.useCallback(
        ({ item }) => {
            const isSelected = selectedBills.includes(item.Do_Id);
            const isDisabled = !item.pendingAmount || item.pendingAmount <= 0;

            return (
                <View style={styles.billItem}>
                    <View style={styles.billHeader}>
                        <View style={styles.checkboxContainer}>
                            <CheckBox
                                value={isSelected}
                                onValueChange={() => {
                                    try {
                                        if (!isDisabled) {
                                            handleCheckboxChange(item);
                                        }
                                    } catch (error) {
                                        console.error("Checkbox error:", error);
                                    }
                                }}
                                disabled={isDisabled}
                                tintColors={{
                                    true: customColors.primary,
                                    false: isDisabled
                                        ? customColors.grey300
                                        : customColors.grey700,
                                }}
                                style={styles.checkbox}
                                boxType="square"
                                animationDuration={0.2}
                            />
                        </View>
                        <View style={styles.billHeaderLeft}>
                            <Text style={styles.billNumber}>
                                Inv No: {item.Do_Inv_No || "N/A"}
                            </Text>
                            <Text style={styles.billDate}>
                                {item.Do_Date
                                    ? moment(item.Do_Date).format("DD/MM/YYYY")
                                    : "N/A"}
                            </Text>
                        </View>
                        <View style={styles.billHeaderRight}>
                            <Text style={styles.billAmount}>
                                ₹{item.Total_Invoice_value || "0.00"}
                            </Text>
                            <Text
                                style={[
                                    styles.pendingAmount,
                                    isDisabled && styles.pendingAmountDisabled,
                                ]}>
                                Pending: ₹{item.pendingAmount || "0.00"}
                            </Text>
                        </View>
                    </View>
                </View>
            );
        },
        [selectedBills],
    );

    const keyExtractor = React.useCallback(
        item => item.Do_Id?.toString() || Math.random().toString(),
        [],
    );

    const getItemLayout = React.useCallback(
        (data, index) => ({
            length: 100, // Approximate height of each item
            offset: 100 * index,
            index,
        }),
        [],
    );

    const renderPaymentScreen = () => (
        <SafeAreaView style={styles.paymentScreen} edges={["top", "bottom"]}>
            <View style={styles.paymentHeader}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setShowPaymentScreen(false)}>
                    <Icon
                        name="arrow-back"
                        size={25}
                        color={customColors.white}
                    />
                </TouchableOpacity>
                <Text style={styles.paymentHeaderText}>Payment Details</Text>
            </View>

            <ScrollView
                style={styles.paymentContent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.paymentContentContainer}>
                <View style={styles.paymentCard}>
                    <View style={styles.paymentSection}>
                        <Text style={styles.sectionTitle}>Payment Mode</Text>
                        <EnhancedDropdown
                            data={paymentModes}
                            labelField="label"
                            valueField="value"
                            placeholder="Select Payment Mode"
                            value={paymentMode}
                            onChange={item => setPaymentMode(item.value)}
                        />
                    </View>

                    <View style={styles.paymentSection}>
                        <Text style={styles.sectionTitle}>Collection Date</Text>
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => setShowDatePicker(true)}>
                            <Text style={styles.dateText}>
                                {moment(collectionDate).format("DD/MM/YYYY")}
                            </Text>
                            <Icon
                                name="calendar-outline"
                                size={20}
                                color={customColors.primary}
                            />
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={collectionDate}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) {
                                        setCollectionDate(selectedDate);
                                    }
                                    console.log("selectedDate");
                                }}
                            />
                        )}
                    </View>

                    <View style={styles.paymentSection}>
                        <Text style={styles.sectionTitle}>Selected Bills</Text>
                        {selectedBills.map(billId => {
                            const bill = pendingBills.find(
                                b => b.Do_Id === billId,
                            );
                            return (
                                <View key={billId} style={styles.billAmountRow}>
                                    <View style={styles.billInfo}>
                                        <Text style={styles.billNumber}>
                                            DO No: {bill.Do_No}
                                        </Text>
                                        <Text style={styles.billTotal}>
                                            Total: ₹{bill.Total_Invoice_value}
                                        </Text>
                                    </View>
                                    <TextInput
                                        style={styles.amountInput}
                                        placeholder="Enter Amount"
                                        keyboardType="numeric"
                                        value={billAmounts[billId]}
                                        onChangeText={amount =>
                                            handleAmountChange(billId, amount)
                                        }
                                    />
                                </View>
                            );
                        })}
                    </View>

                    <View style={styles.paymentSection}>
                        <Text style={styles.sectionTitle}>Narration</Text>
                        <TextInput
                            style={styles.narrationInput}
                            placeholder="Enter Narration"
                            value={narration}
                            onChangeText={setNarration}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handlePaymentSubmit}>
                        <Text style={styles.submitButtonText}>
                            Submit Payment
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader title="Retailer Receipts" navigation={navigation} />

            <View style={styles.contentContainer}>
                <View style={styles.content}>
                    {/* Summary Card */}
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <View style={styles.summaryItemContent}>
                                    <Icon
                                        name="receipt-outline"
                                        size={16}
                                        color={customColors.primary}
                                    />
                                    <Text style={styles.summaryLabel}>
                                        Total Bills
                                    </Text>
                                    <Text style={styles.summaryValue}>
                                        {pendingBills.length}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <View style={styles.summaryItemContent}>
                                    <Icon
                                        name="cash-outline"
                                        size={16}
                                        color={customColors.primary}
                                    />
                                    <Text style={styles.summaryLabel}>
                                        Total Amount
                                    </Text>
                                    <Text style={styles.summaryValue}>
                                        ₹
                                        {pendingBills
                                            .reduce(
                                                (sum, bill) =>
                                                    sum +
                                                    parseFloat(
                                                        bill.Total_Invoice_value,
                                                    ),
                                                0,
                                            )
                                            .toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <View style={styles.summaryItemContent}>
                                    <Icon
                                        name="checkmark-circle-outline"
                                        size={16}
                                        color={customColors.primary}
                                    />
                                    <Text style={styles.summaryLabel}>
                                        Paid Bills
                                    </Text>
                                    <Text style={styles.summaryValue}>
                                        {
                                            pendingBills.filter(
                                                bill => bill.pendingAmount <= 0,
                                            ).length
                                        }
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <View style={styles.summaryItemContent}>
                                    <Icon
                                        name="time-outline"
                                        size={16}
                                        color={customColors.primary}
                                    />
                                    <Text style={styles.summaryLabel}>
                                        Pending Bills
                                    </Text>
                                    <Text style={styles.summaryValue}>
                                        {
                                            pendingBills.filter(
                                                bill => bill.pendingAmount > 0,
                                            ).length
                                        }
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <EnhancedDropdown
                        data={filteredRetailers}
                        labelField="Retailer_Name"
                        valueField="Retailer_Id"
                        placeholder="Select Retailer"
                        value={selectedRetailer}
                        onChange={handleRetailerSelect}
                        containerStyle={styles.dropdownContainer}
                        searchPlaceholder="Search retailers..."
                    />

                    {pendingBills.length > 0 ? (
                        <>
                            <FlatList
                                data={pendingBills}
                                renderItem={renderBillItem}
                                keyExtractor={keyExtractor}
                                getItemLayout={getItemLayout}
                                initialNumToRender={10}
                                maxToRenderPerBatch={10}
                                windowSize={5}
                                removeClippedSubviews={true}
                                contentContainerStyle={styles.billList}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.paymentButton,
                                    selectedBills.length === 0 &&
                                        styles.paymentButtonDisabled,
                                ]}
                                onPress={handlePaymentClick}
                                disabled={selectedBills.length === 0}>
                                <Text style={styles.paymentButtonText}>
                                    Proceed to Payment
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>
                                No pending bills found
                            </Text>
                        </View>
                    )}
                </View>
            </View>
            {showPaymentScreen && renderPaymentScreen()}
        </SafeAreaView>
    );
};

export default BillPayment;

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
        marginVertical: spacing.xs,
        paddingHorizontal: spacing.md,
    },
    billList: {
        padding: spacing.sm,
    },
    billItem: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        marginHorizontal: spacing.xs,
        ...shadows.small,
    },
    billHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    billHeaderLeft: {
        flex: 1,
    },
    billHeaderRight: {
        alignItems: "flex-end",
    },
    billNumber: {
        ...typography.body2(),
        fontWeight: "600",
        color: customColors.primary,
    },
    billTotal: {
        ...typography.caption(),
        color: customColors.pending,
    },
    billDate: {
        ...typography.caption(),
        color: customColors.grey700,
        marginTop: spacing.xs,
    },
    billAmount: {
        ...typography.body1(),
        color: customColors.primary,
        fontWeight: "600",
    },
    paymentButton: {
        marginVertical: spacing.md,
        marginHorizontal: spacing.xl,
        backgroundColor: customColors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 25,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        ...shadows.small,
    },
    paymentButtonText: {
        textAlign: "center",
        ...typography.body2(),
        color: customColors.white,
        fontWeight: "600",
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.md,
    },
    emptyStateText: {
        ...typography.body2(),
        color: customColors.grey700,
    },
    checkboxContainer: {
        marginRight: spacing.sm,
        minWidth: 24,
        minHeight: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    checkbox: {
        width: 20,
        height: 20,
        margin: 0,
        padding: 0,
    },
    pendingAmount: {
        ...typography.caption(),
        color: customColors.pending,
        marginTop: spacing.xs,
    },
    paymentButtonDisabled: {
        opacity: 0.5,
    },
    paymentScreen: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: customColors.primary,
    },
    paymentHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.md,
        backgroundColor: customColors.primary,
        elevation: 4,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    backButton: {
        padding: spacing.xs,
    },
    paymentHeaderText: {
        ...typography.subtitle1(),
        color: customColors.white,
        marginLeft: spacing.md,
        fontWeight: "600",
    },
    paymentContent: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    paymentContentContainer: {
        padding: spacing.md,
    },
    paymentCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        ...shadows.medium,
    },
    paymentSection: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        ...typography.body2(),
        fontWeight: "600",
        marginBottom: spacing.sm,
        color: customColors.primary,
    },
    paymentDropdown: {
        borderWidth: 1,
        borderColor: customColors.grey200,
        borderRadius: 8,
        padding: spacing.sm,
        backgroundColor: customColors.white,
    },
    selectedText: {
        color: customColors.primary,
        fontWeight: "500",
    },
    placeholderText: {
        color: customColors.grey500,
    },
    dateInput: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: customColors.grey200,
        borderRadius: 8,
        padding: spacing.sm,
        backgroundColor: customColors.white,
    },
    dateText: {
        ...typography.body2(),
        color: customColors.grey900,
    },
    billAmountRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    billInfo: {
        flex: 1,
    },
    amountInput: {
        borderWidth: 1,
        borderColor: customColors.grey200,
        borderRadius: 8,
        padding: spacing.sm,
        width: 120,
        textAlign: "right",
        backgroundColor: customColors.white,
    },
    narrationInput: {
        borderWidth: 1,
        borderColor: customColors.grey200,
        borderRadius: 8,
        padding: spacing.sm,
        textAlignVertical: "top",
        backgroundColor: customColors.white,
        minHeight: 100,
    },
    submitButton: {
        backgroundColor: customColors.primary,
        padding: spacing.md,
        borderRadius: 8,
        alignItems: "center",
        marginTop: spacing.md,
        ...shadows.small,
    },
    submitButtonText: {
        ...typography.body2(),
        color: customColors.white,
        fontWeight: "600",
    },
    summaryCard: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: spacing.sm,
        margin: spacing.sm,
        marginBottom: 0,
        ...shadows.small,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.xs,
    },
    summaryItem: {
        flex: 1,
        alignItems: "center",
    },
    summaryItemContent: {
        alignItems: "center",
        gap: spacing.xs,
    },
    summaryDivider: {
        width: 1,
        height: 30,
        backgroundColor: customColors.grey200,
        marginHorizontal: spacing.xs,
    },
    summaryLabel: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    summaryValue: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "600",
    },
    pendingAmountDisabled: {
        color: customColors.grey300,
        textDecorationLine: "line-through",
    },
});
