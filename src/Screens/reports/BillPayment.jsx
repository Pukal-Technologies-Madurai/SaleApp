import {
    View,
    Text,
    ImageBackground,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    TextInput,
    Alert,
    ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Dropdown } from "react-native-element-dropdown";
import Icon from "react-native-vector-icons/Ionicons";
import moment from "moment";
import Geolocation from "@react-native-community/geolocation";
import CheckBox from "@react-native-community/checkbox";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import assetImages from "../../Config/Image";

const BillPayment = () => {
    const navigation = useNavigation();
    const [retailersData, setRetailersData] = useState([]);
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

    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            Geolocation.getCurrentPosition(
                position => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                    resolve(position);
                },
                error => {
                    console.error("Error getting location:", error);
                    reject(error);
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
            );
        });
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
            const userId = await AsyncStorage.getItem("UserId");

            // Map payment mode to backend format
            const paymentModeMap = {
                cash: "CREATED-CASH",
                upi: "CREATED-UPI",
                check: "CREATED-CHECK",
                bank_transfer: "CREATED-BANK-TRANSFER",
            };

            const paymentData = {
                retailer_id: parseInt(selectedRetailer),
                payed_by: "Owner", // Using placeholder as requested
                collection_date: moment().format("YYYY-MM-DD"), // Today's date
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

            const data = await response.json();
            // console.log("Server response:", data);

            if (data.success) {
                Alert.alert(
                    "Success",
                    data.message || "Payment submitted successfully",
                );
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
                                onValueChange={() =>
                                    !isDisabled && handleCheckboxChange(item)
                                }
                                disabled={isDisabled}
                                tintColors={{
                                    true: customColors.primary,
                                    false: isDisabled
                                        ? customColors.lightGrey
                                        : customColors.black,
                                }}
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
        <View style={styles.paymentScreen}>
            <View style={styles.paymentHeader}>
                <TouchableOpacity onPress={() => setShowPaymentScreen(false)}>
                    <Icon
                        name="arrow-back"
                        size={25}
                        color={customColors.white}
                    />
                </TouchableOpacity>
                <Text style={styles.paymentHeaderText}>Payment Details</Text>
            </View>

            <ScrollView style={styles.paymentContent}>
                <View style={styles.paymentSection}>
                    <Text style={styles.sectionTitle}>Payment Mode</Text>
                    <Dropdown
                        data={paymentModes}
                        labelField="label"
                        valueField="value"
                        placeholder="Select Payment Mode"
                        value={paymentMode}
                        onChange={item => setPaymentMode(item.value)}
                        style={styles.paymentDropdown}
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
                            }}
                        />
                    )}
                </View>

                <View style={styles.paymentSection}>
                    <Text style={styles.sectionTitle}>Selected Bills</Text>
                    {selectedBills.map(billId => {
                        const bill = pendingBills.find(b => b.Do_Id === billId);
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
                    <Text style={styles.submitButtonText}>Submit Payment</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headerContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Icon
                                name="arrow-back"
                                size={25}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        <Text style={styles.headerText}>Bill Collection</Text>
                    </View>
                    <View style={styles.Content}>
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
                                                    bill =>
                                                        bill.pendingAmount <= 0,
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
                                                    bill =>
                                                        bill.pendingAmount > 0,
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
            </ImageBackground>
            {showPaymentScreen && renderPaymentScreen()}
        </View>
    );
};

export default BillPayment;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.2)",
    },
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
    },
    headerText: {
        flex: 1,
        ...typography.h4(),
        color: customColors.white,
        marginHorizontal: 10,
    },
    Content: {
        flex: 1,
        backgroundColor: customColors.white,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        overflow: "hidden",
    },
    dropdownContainer: {
        marginVertical: 10,
        paddingHorizontal: 15,
    },
    billList: {
        padding: 10,
    },
    billItem: {
        backgroundColor: customColors.white,
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        marginHorizontal: 10,
        elevation: 3,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    billHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: customColors.lightGrey,
    },
    billHeaderLeft: {
        flex: 1,
    },
    billHeaderRight: {
        alignItems: "flex-end",
    },
    billNumber: {
        ...typography.body1(),
        fontWeight: "bold",
        color: customColors.black,
    },
    billTotal: {
        ...typography.body2(),
        color: customColors.warning,
    },
    billDate: {
        ...typography.body2(),
        color: customColors.grey,
        marginTop: 2,
    },
    billAmount: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "bold",
    },
    paymentButton: {
        marginVertical: 20,
        marginHorizontal: 75,
        backgroundColor: customColors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        elevation: 2,
    },
    paymentButtonText: {
        textAlign: "center",
        ...typography.body1(),
        color: customColors.white,
        fontWeight: "500",
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    emptyStateText: {
        ...typography.body1(),
        color: customColors.grey,
    },
    checkboxContainer: {
        marginRight: 10,
    },
    pendingAmount: {
        ...typography.body2(),
        color: customColors.warning,
        marginTop: 4,
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
        backgroundColor: customColors.white,
    },
    paymentHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 15,
        backgroundColor: customColors.primary,
    },
    paymentHeaderText: {
        ...typography.h6(),
        color: customColors.white,
        marginLeft: 15,
    },
    paymentContent: {
        flex: 1,
        padding: 15,
    },
    paymentSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        ...typography.body1(),
        fontWeight: "bold",
        marginBottom: 10,
        color: customColors.primary,
    },
    paymentDropdown: {
        borderWidth: 1,
        borderColor: customColors.black,
        borderRadius: 8,
        padding: 10,
    },
    dateInput: {
        borderWidth: 1,
        borderColor: customColors.black,
        borderRadius: 8,
        padding: 10,
    },
    dateText: {
        ...typography.body1(),
        color: customColors.black,
    },
    billAmountRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: customColors.border,
    },
    billInfo: {
        flex: 1,
    },
    amountInput: {
        borderWidth: 1,
        borderColor: customColors.black,
        borderRadius: 8,
        padding: 10,
        width: 120,
        textAlign: "right",
    },
    narrationInput: {
        borderWidth: 1,
        borderColor: customColors.grey,
        borderRadius: 8,
        padding: 10,
        textAlignVertical: "top",
    },
    submitButton: {
        backgroundColor: customColors.primary,
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },
    submitButtonText: {
        ...typography.body1(),
        color: customColors.white,
        fontWeight: "500",
    },
    summaryCard: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: 8,
        margin: 10,
        marginBottom: 0,
        elevation: 2,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 4,
    },
    summaryItem: {
        flex: 1,
        alignItems: "center",
    },
    summaryItemContent: {
        alignItems: "center",
        gap: 2,
    },
    summaryDivider: {
        width: 1,
        height: 30,
        backgroundColor: customColors.lightGrey,
        marginHorizontal: 4,
    },
    summaryLabel: {
        ...typography.caption(),
        color: customColors.black,
    },
    summaryValue: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "600",
    },
    pendingAmountDisabled: {
        color: customColors.lightGrey,
        textDecorationLine: "line-through",
    },
});
