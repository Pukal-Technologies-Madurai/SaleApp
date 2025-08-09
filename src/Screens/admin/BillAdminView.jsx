import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    FlatList,
    Animated,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import AppHeader from "../../Components/AppHeader";
import DatePickerButton from "../../Components/DatePickerButton";
import { SafeAreaView } from "react-native-safe-area-context";

const BillAdminView = () => {
    const navigation = useNavigation();
    const [logData, setLogData] = useState([]);
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [selectedCollector, setSelectedCollector] = useState(null);
    const [drowDownValues, setDropDownValues] = useState({
        paymentStatus: [],
        collectedBy: [],
    });
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        fetchData();
    }, [selectedFromDate, selectedToDate, selectedCollector]);

    useEffect(() => {
        if (isFilterModalVisible) {
            Animated.timing(slideAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [isFilterModalVisible]);

    const fetchData = async () => {
        try {
            if (!selectedFromDate || !selectedToDate) return;

            const fromDate = selectedFromDate.toISOString().split("T")[0];
            const toDate = selectedToDate.toISOString().split("T")[0];
            const url = selectedCollector
                ? `${API.paymentCollection()}?Fromdate=${fromDate}&Todate=${toDate}&collected_by=${selectedCollector.value}`
                : `${API.paymentCollection()}?Fromdate=${fromDate}&Todate=${toDate}`;
            // console.log("URL", url);

            const [receiptsResponse, filterResponse] = await Promise.all([
                fetch(url),
                fetch(API.receiptFilter()),
            ]);

            const [receiptsData, filterData] = await Promise.all([
                receiptsResponse.json(),
                filterResponse.json(),
            ]);

            if (receiptsData.success) {
                setLogData(receiptsData.data);
            }
            if (filterData.success) {
                setDropDownValues({
                    paymentStatus: filterData.others.paymentStatus || [],
                    collectedBy: filterData.others.collectedBy || [],
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (selectedToDate < selectedFromDate) {
            setSelectedToDate(selectedFromDate); // auto-correct
        }
    }, [selectedFromDate]);

    useEffect(() => {
        if (selectedFromDate > selectedToDate) {
            setSelectedFromDate(selectedToDate); // auto-correct
        }
    }, [selectedToDate]);

    const formatDate = dateString => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const renderFilterScreen = () => {
        if (!isFilterModalVisible) return null;

        return (
            <Animated.View
                style={[
                    styles.filterScreen,
                    {
                        transform: [
                            {
                                translateY: slideAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [600, 0],
                                }),
                            },
                        ],
                    },
                ]}>
                <View style={styles.filterScreenContent}>
                    <View style={styles.filterScreenHeader}>
                        <Text style={styles.filterScreenTitle}>
                            Select Collector
                        </Text>
                        <TouchableOpacity
                            onPress={() => setIsFilterModalVisible(false)}
                            style={styles.closeButton}>
                            <Icon
                                name="close"
                                size={24}
                                color={customColors.black}
                            />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={drowDownValues.collectedBy}
                        keyExtractor={item => item.value.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.filterItem,
                                    selectedCollector?.value === item.value &&
                                        styles.selectedFilterItem,
                                ]}
                                onPress={() => {
                                    setSelectedCollector(item);
                                    setIsFilterModalVisible(false);
                                }}>
                                <Text
                                    style={[
                                        styles.filterItemText,
                                        selectedCollector?.value ===
                                            item.value &&
                                            styles.selectedFilterItemText,
                                    ]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Animated.View>
        );
    };

    const handleFromDateChange = date => {
        if (date) setSelectedFromDate(date);
    };

    const handleToDateChange = date => {
        if (date) setSelectedToDate(date);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader navigation={navigation} title="Collection Information" />
            <View style={styles.contentContainer}>
                <View style={styles.datePickerContainer}>
                    <DatePickerButton
                        title="From Date"
                        date={selectedFromDate}
                        onDateChange={handleFromDateChange}
                        containerStyle={styles.datePicker}
                    />
                    <DatePickerButton
                        title="To Date"
                        date={selectedToDate}
                        onDateChange={handleToDateChange}
                        containerStyle={styles.datePicker}
                    />
                </View>

                <View style={styles.summaryContainer}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Total Bills</Text>
                        <Text style={styles.summaryValue}>
                            {logData.length}
                        </Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Total Amount</Text>
                        <Text style={styles.summaryValue}>
                            ₹
                            {logData.reduce(
                                (acc, cur) => acc + cur.total_amount,
                                0,
                            )}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => setIsFilterModalVisible(true)}>
                        <Icon
                            name="filter"
                            size={24}
                            color={customColors.white}
                        />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollView}>
                    {logData?.map((collection, index) => (
                        <View key={index} style={styles.collectionCard}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.invoiceNo}>
                                    {collection.collection_inv_no}
                                </Text>
                                <Text style={styles.date}>
                                    {formatDate(collection.collection_date)}
                                </Text>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.retailerName}>
                                    {collection.RetailerGet}
                                </Text>
                                <View style={styles.amountContainer}>
                                    <Text style={styles.paymentType}>
                                        {collection.CollectedByGet}
                                    </Text>
                                    <Text style={styles.amount}>
                                        ₹{collection.total_amount}
                                    </Text>
                                    <Text style={styles.paymentType}>
                                        {collection.collection_type}
                                    </Text>
                                </View>
                                {collection.pending_amount > 0 && (
                                    <Text style={styles.pendingAmount}>
                                        Pending: ₹{collection.pending_amount}
                                    </Text>
                                )}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>
            {renderFilterScreen()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        padding: 16,
        backgroundColor: customColors.background,
    },
    datePickerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    datePicker: {
        flex: 1,
        width: "48%",
    },
    summaryContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: customColors.white,
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        ...customColors.shadow,
    },
    summaryItem: {
        flex: 1,
    },
    summaryLabel: {
        ...typography.body2(),
        color: customColors.grey,
        marginBottom: 4,
    },
    summaryValue: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "600",
    },
    filterButton: {
        backgroundColor: customColors.primary,
        padding: 8,
        borderRadius: 8,
        marginLeft: 16,
    },
    scrollView: {
        flex: 1,
    },
    collectionCard: {
        backgroundColor: customColors.white,
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        ...customColors.shadow,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey300,
    },
    invoiceNo: {
        ...typography.h6(),
        color: customColors.primary,
    },
    date: {
        ...typography.body2(),
        color: customColors.grey,
    },
    cardContent: {
        gap: 8,
    },
    retailerName: {
        ...typography.body1(),
        color: customColors.black,
    },
    amountContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    amount: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "600",
    },
    paymentType: {
        ...typography.body2(),
        color: customColors.grey,
    },
    pendingAmount: {
        ...typography.body2(),
        color: customColors.pending,
    },
    filterScreen: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "60%",
        backgroundColor: customColors.white,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        ...customColors.shadow,
    },
    filterScreenContent: {
        flex: 1,
        padding: 16,
    },
    filterScreenHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: customColors.lightGrey,
    },
    filterScreenTitle: {
        ...typography.h6(),
        color: customColors.black,
    },
    closeButton: {
        padding: 4,
    },
    filterItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: customColors.lightGrey,
    },
    selectedFilterItem: {
        backgroundColor: customColors.accent,
    },
    filterItemText: {
        ...typography.body1(),
        color: customColors.grey,
    },
    selectedFilterItemText: {
        color: customColors.primary,
        fontWeight: "600",
    },
});

export default BillAdminView;
