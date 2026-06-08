import React, { useEffect, useMemo, useState } from "react";
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ToastAndroid,
    Alert,
} from "react-native";
import AppHeader from "../../Components/AppHeader";
import DatePickerButton from "../../Components/DatePickerButton";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import {
    customColors,
    typography,
    spacing,
    shadows,
    borderRadius,
    iconSizes,
} from "../../Config/helper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import FeatherIcon from "react-native-vector-icons/Feather";
import { API } from "../../Config/Endpoint";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { fetchDefaultSalesPersonExpenses } from "../../Api/receipt";

const paymentModes = [
    { label: "Cash", value: "Cash", icon: "payments" },
    { label: "Bank", value: "Bank", icon: "account-balance" },
    { label: "UPI", value: "UPI", icon: "qr-code-2" },
];

const Expense = () => {
    const navigation = useNavigation();
    const [selectedExpenseType, setSelectedExpenseType] = useState(null);
    const [selectedPaymentMode, setSelectedPaymentMode] = useState(paymentModes[0]);
    const [amount, setAmount] = useState("");
    const [remarks, setRemarks] = useState("");
    const [expenseDate, setExpenseDate] = useState(new Date());
    const [isSaving, setIsSaving] = useState(false);
    const [staffDetails, setStaffDetails] = useState([]);
    const [accId, setAccId] = useState(null);
    const [accountName, setAccountName] = useState("");
    const [isAccountMappingLoading, setIsAccountMappingLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const Acc_Id = await AsyncStorage.getItem("Acc_Id");
                const Account_name = await AsyncStorage.getItem("Account_name");
                const costCenterId = await AsyncStorage.getItem("costCenterId");
                const costCenterName = await AsyncStorage.getItem("costCenterName");
                const costCategoryId = await AsyncStorage.getItem("costCategoryId");
                const costCategoryName = await AsyncStorage.getItem("costCategoryName");

                const normalizedAccId =
                    Acc_Id && String(Acc_Id).toLowerCase() !== "null"
                        ? Acc_Id
                        : null;
                const normalizedAccountName =
                    Account_name && String(Account_name).toLowerCase() !== "not found"
                        ? Account_name
                        : "";

                setAccId(normalizedAccId);
                setAccountName(normalizedAccountName);

                setStaffDetails([
                    {
                        Involved_Emp_Id: costCenterId,
                        EmpName: costCenterName,
                        Cost_Center_Type_Id: costCategoryId,
                        EmpType: costCategoryName,
                    }
                ]);
            } catch (error) {
                console.error("Error fetching default salesperson expenses:", error);
            } finally {
                setIsAccountMappingLoading(false);
            }
        })();
    }, []);

    const hasAccountMapping = !!(accId && String(accId).trim() && accountName && String(accountName).trim());

    const {
        data: salespersonExpenses = [],
        isError: isErrorSalespersonExpenses,
        isLoading: isLoadingSalespersonExpenses,
    } = useQuery({
        queryKey: ["salespersonExpenses"],
        queryFn: fetchDefaultSalesPersonExpenses,
    });

    const expenseTypeOptions = useMemo(() => {
        return (salespersonExpenses || [])
            .filter(item => item?.Acc_Id && item?.Account_Name && item?.AC_Reason)
            .map(item => ({
                Acc_Id: Number(item.Acc_Id),
                Account_Name: item.Account_Name,
                AC_Reason: item.AC_Reason,
            }));
    }, [salespersonExpenses]);

    useEffect(() => {
        const hasSelected = selectedExpenseType && expenseTypeOptions.some(
            option => option.Acc_Id === selectedExpenseType.Acc_Id,
        );

        if (!hasSelected && expenseTypeOptions.length > 0) {
            setSelectedExpenseType(expenseTypeOptions[0]);
        }
    }, [expenseTypeOptions, selectedExpenseType]);

    const formattedAmount = useMemo(() => {
        const value = Number(amount || 0);
        return value.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }, [amount]);

    const handleAmountChange = text => {
        const numeric = text.replace(/[^0-9.]/g, "");
        const parts = numeric.split(".");
        const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : numeric;
        setAmount(sanitized);
    };

    const handleSaveExpense = async () => {
        if (isSaving) return;

        if (!hasAccountMapping) {
            ToastAndroid.show("Account mapping missing", ToastAndroid.SHORT);
            return;
        }

        if (!selectedExpenseType) {
            ToastAndroid.show("Select expense type", ToastAndroid.SHORT);
            return;
        }

        const parsedAmount = Number(amount);

        if (!parsedAmount || parsedAmount <= 0) {
            ToastAndroid.show("Enter a valid amount", ToastAndroid.SHORT);
            return;
        }

        const userId = await AsyncStorage.getItem("UserId");
        const parsedUserId = Number(userId) || 1;

        const payload = {
            pay_id: "",
            Alter_Reason: "",
            year_id: "",
            payment_voucher_type_id: "42",
            payment_sno: "",
            payment_invoice_no: "",
            payment_date: expenseDate.toISOString().split("T")[0],
            pay_bill_type: 2,
            is_new_ref: 0,
            credit_ledger: accId,
            credit_ledger_name: accountName,
            credit_amount: 0,
            debit_ledger: String(selectedExpenseType.Acc_Id),
            debit_ledger_name: selectedExpenseType.Account_Name,
            debit_amount: parsedAmount.toString(),
            remarks: remarks.trim(),
            status: 1,
            transaction_type: selectedPaymentMode.value,
            check_no: "",
            check_date: "",
            bank_name: "",
            bank_date: "",
            approved_by: null,
            approved_by_get: "",
            cost_center_mapping: 0,
            created_by: parsedUserId,
            altered_by: parsedUserId,
            created_on: "",
            alterd_on: "",
            BillsDetails: [],
            staffDetails: staffDetails,
        };

        try {
            setIsSaving(true);
            const url = API.makePayment();

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            let data = null;
            try {
                data = await response.json();
            } catch {
                data = null;
            }

            if (!response.ok) {
                throw new Error(data?.message || "Failed to save expense");
            }

            ToastAndroid.show(
                data?.message || "Expense saved successfully",
                ToastAndroid.SHORT,
            );
            navigation.reset({
                index: 0,
                routes: [{
                    name: "HomeScreen",
                    state: {
                        index: 0,
                        routes: [{ name: "HomeScreen" }]
                    }
                }],
            });
        } catch (error) {
            console.error("Expense save error:", error);
            Alert.alert("Save Failed", error.message || "Unable to save expense");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isAccountMappingLoading && !hasAccountMapping) {
        return (
            <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
                <AppHeader title="Add Expense" navigation={navigation} />

                <View style={styles.missingMapWrap}>
                    <View style={styles.missingMapCard}>
                        <MaterialIcon
                            name="warning-amber"
                            size={iconSizes.xxl}
                            color={customColors.warning}
                        />
                        <Text style={styles.missingMapTitle}>Account Mapping Missing</Text>
                        <Text style={styles.missingMapText}>
                            Please contact your sales team and ask them to map your account.
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader title="Add Expense" navigation={navigation} />

            <View style={styles.backgroundGlowOne} />
            <View style={styles.backgroundGlowTwo} />

            <ScrollView
                style={styles.contentContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}>

                <View style={styles.formCard}>
                    <View style={styles.fieldBlock}>
                        <Text style={styles.fieldLabel}>Expense Date</Text>
                        <DatePickerButton
                            title=""
                            date={expenseDate}
                            onDateChange={setExpenseDate}
                            containerStyle={styles.expenseDatePickerContainer}
                            // style={styles.expenseDatePickerButton}
                            maxDate={new Date()}
                        />
                    </View>

                    <View style={styles.fieldBlock}>
                        <Text style={styles.fieldLabel}>Expense Type</Text>
                        {isLoadingSalespersonExpenses && (
                            <Text style={styles.infoText}>Loading expense accounts...</Text>
                        )}
                        {isErrorSalespersonExpenses && (
                            <Text style={styles.infoText}>Unable to load expense accounts.</Text>
                        )}
                        <EnhancedDropdown
                            data={expenseTypeOptions}
                            labelField="Account_Name"
                            valueField="Acc_Id"
                            placeholder="Select Expense Type"
                            value={selectedExpenseType?.Acc_Id}
                            onChange={item => setSelectedExpenseType(item)}
                            showCount={false}
                            searchPlaceholder="Search expense type"
                            containerStyle={styles.expenseTypeDropdown}
                            disabled={isLoadingSalespersonExpenses || isErrorSalespersonExpenses || expenseTypeOptions.length === 0}
                        />
                        {!!selectedExpenseType?.AC_Reason && (
                            <Text style={styles.reasonText}>Reason: {selectedExpenseType.AC_Reason}</Text>
                        )}
                    </View>

                    <View style={styles.fieldBlock}>
                        <Text style={styles.fieldLabel}>Amount (₹)</Text>
                        <View style={styles.amountRow}>
                            <View style={styles.amountPrefix}>
                                <Text style={styles.amountPrefixText}>₹</Text>
                            </View>
                            <TextInput
                                value={amount}
                                onChangeText={handleAmountChange}
                                placeholder="0.00"
                                keyboardType="decimal-pad"
                                style={styles.amountInput}
                                placeholderTextColor={customColors.grey400}
                            />
                        </View>
                    </View>

                    <View style={styles.fieldBlock}>
                        <Text style={styles.fieldLabel}>Payment Mode</Text>
                        <View style={styles.paymentModeRow}>
                            {paymentModes.map(mode => {
                                const active = selectedPaymentMode.value === mode.value;
                                return (
                                    <TouchableOpacity
                                        key={mode.value}
                                        activeOpacity={0.8}
                                        onPress={() => setSelectedPaymentMode(mode)}
                                        style={[styles.paymentModeCard, active && styles.paymentModeCardActive]}>
                                        <MaterialIcon
                                            name={mode.icon}
                                            size={iconSizes.md}
                                            color={active ? customColors.primary : customColors.grey600}
                                        />
                                        <Text style={[styles.paymentModeText, active && styles.paymentModeTextActive]}>
                                            {mode.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.fieldBlock}>
                        <Text style={styles.fieldLabel}>Remarks (Optional)</Text>
                        <View style={styles.remarksCard}>
                            <TextInput
                                value={remarks}
                                onChangeText={setRemarks}
                                placeholder="Add a short note..."
                                multiline
                                numberOfLines={4}
                                style={styles.remarksInput}
                                placeholderTextColor={customColors.grey400}
                                textAlignVertical="top"
                                maxLength={200}
                            />
                            <Text style={styles.charCount}>{remarks.length}/200</Text>
                        </View>
                    </View>

                    <View style={styles.summaryCard}>
                        <View style={styles.summaryHeaderRow}>
                            <View style={styles.summaryDot} />
                            <Text style={styles.summaryTitle}>Preview</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Expense Type</Text>
                            <Text style={styles.summaryValue}>{selectedExpenseType?.Account_Name || "-"}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Payment Mode</Text>
                            <Text style={styles.summaryValue}>{selectedPaymentMode.value}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Amount</Text>
                            <Text style={styles.summaryAmount}>₹{formattedAmount}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.cancelBtn}
                        onPress={() => navigation.goBack()}>
                        <MaterialIcon name="arrow-back" size={iconSizes.md} color={customColors.grey700} />
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.saveBtn}
                        onPress={handleSaveExpense}
                        disabled={isSaving}>
                        <View style={styles.saveIconWrap}>
                            <FeatherIcon name="check-circle" size={iconSizes.md} color={customColors.white} />
                        </View>
                        <View style={styles.saveTextWrap}>
                            <Text style={styles.saveText}>{isSaving ? "Saving..." : "Save Expense"}</Text>
                            <Text style={styles.saveAmount}>₹{formattedAmount}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Expense;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.grey50,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xl * 2,
    },
    backgroundGlowOne: {
        position: "absolute",
        top: 84,
        right: -40,
        width: 140,
        height: 140,
        borderRadius: 140,
        backgroundColor: "rgba(255,255,255,0.12)",
    },
    backgroundGlowTwo: {
        position: "absolute",
        top: 200,
        left: -50,
        width: 120,
        height: 120,
        borderRadius: 120,
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    heroIconWrap: {
        width: 52,
        height: 52,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.primary + "14",
        alignItems: "center",
        justifyContent: "center",
    },
    formCard: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        ...shadows.medium,
    },
    fieldBlock: {
        marginBottom: spacing.lg,
    },
    fieldLabel: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        marginBottom: spacing.sm,
        fontWeight: "600",
    },
    expenseDatePickerContainer: {
        marginBottom: 0,
    },
    expenseDatePickerButton: {
        minHeight: 58,
        borderRadius: borderRadius.lg,
        borderColor: customColors.grey200,
        backgroundColor: customColors.white,
        ...shadows.small,
    },
    expenseTypeDropdown: {
        marginTop: spacing.xs,
    },
    amountRow: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: customColors.grey200,
        backgroundColor: customColors.white,
        overflow: "hidden",
        ...shadows.small,
    },
    amountPrefix: {
        width: 52,
        alignItems: "center",
        justifyContent: "center",
        borderRightWidth: 1,
        borderRightColor: customColors.grey200,
        backgroundColor: customColors.grey50,
        paddingVertical: spacing.md,
    },
    amountPrefixText: {
        ...typography.subtitle1(),
        color: customColors.grey700,
        fontWeight: "700",
    },
    amountInput: {
        flex: 1,
        minHeight: 58,
        paddingHorizontal: spacing.md,
        ...typography.h5(),
        color: customColors.grey900,
        fontWeight: "700",
        textAlign: "right",
    },
    paymentModeRow: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    paymentModeCard: {
        flex: 1,
        minHeight: 62,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: customColors.grey200,
        backgroundColor: customColors.grey50,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
    },
    paymentModeCardActive: {
        backgroundColor: customColors.primary + "10",
        borderColor: customColors.primary,
    },
    paymentModeText: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    paymentModeTextActive: {
        color: customColors.primary,
    },
    remarksCard: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: customColors.grey200,
        backgroundColor: customColors.grey50,
        padding: spacing.md,
        minHeight: 140,
        ...shadows.small,
    },
    remarksInput: {
        ...typography.body1(),
        color: customColors.grey900,
        minHeight: 100,
        textAlignVertical: "top",
    },
    charCount: {
        ...typography.caption(),
        color: customColors.grey500,
        textAlign: "right",
        marginTop: spacing.sm,
    },
    summaryCard: {
        borderRadius: borderRadius.xl,
        backgroundColor: customColors.primaryDark + "08",
        borderWidth: 1,
        borderColor: customColors.primary + "18",
        padding: spacing.md,
    },
    summaryHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    summaryDot: {
        width: 10,
        height: 10,
        borderRadius: 10,
        backgroundColor: customColors.primary,
    },
    summaryTitle: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    infoText: {
        ...typography.caption(),
        color: customColors.warning,
        marginBottom: spacing.xs,
        fontWeight: "600",
    },
    reasonText: {
        ...typography.caption(),
        color: customColors.grey700,
        marginTop: spacing.xs,
        fontWeight: "600",
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: spacing.md,
        marginTop: spacing.xs,
    },
    summaryLabel: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "600",
    },
    summaryValue: {
        ...typography.body2(),
        color: customColors.grey800,
        fontWeight: "600",
        flexShrink: 1,
        textAlign: "right",
    },
    summaryAmount: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "700",
    },
    actionRow: {
        flexDirection: "row",
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    cancelBtn: {
        flex: 0.95,
        minHeight: 64,
        borderRadius: borderRadius.xl,
        backgroundColor: customColors.white,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: customColors.grey200,
        ...shadows.small,
    },
    cancelText: {
        ...typography.body1(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    saveBtn: {
        flex: 1.25,
        minHeight: 64,
        borderRadius: borderRadius.xl,
        backgroundColor: customColors.primary,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
        ...shadows.medium,
    },
    saveIconWrap: {
        width: 42,
        height: 42,
        borderRadius: borderRadius.round,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.14)",
    },
    saveTextWrap: {
        flex: 1,
        alignItems: "flex-start",
    },
    saveText: {
        ...typography.body1(),
        color: customColors.white,
        fontWeight: "700",
    },
    saveAmount: {
        ...typography.subtitle2(),
        color: customColors.white,
        fontWeight: "700",
        marginTop: 2,
    },
    missingMapWrap: {
        flex: 1,
        backgroundColor: customColors.grey50,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.lg,
    },
    missingMapCard: {
        width: "100%",
        borderRadius: borderRadius.xl,
        backgroundColor: customColors.white,
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        alignItems: "center",
        ...shadows.medium,
    },
    missingMapTitle: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "700",
        marginTop: spacing.sm,
        textAlign: "center",
    },
    missingMapText: {
        ...typography.body1(),
        color: customColors.grey700,
        marginTop: spacing.sm,
        textAlign: "center",
        lineHeight: 22,
    },
});