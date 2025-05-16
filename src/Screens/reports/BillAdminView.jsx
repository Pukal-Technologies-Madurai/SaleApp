import {
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    FlatList,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import DatePickerButton from "../../Components/DatePickerButton";
import assetImages from "../../Config/Image";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

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

    useEffect(() => {
        (async () => {
            try {
                const fromDate = selectedFromDate.toISOString().split("T")[0];
                const toDate = selectedToDate.toISOString().split("T")[0];
                if (selectedCollector) {
                    fetchCollectionReceipts(
                        fromDate,
                        toDate,
                        selectedCollector.value,
                    );
                } else {
                    fetchCollectionReceipts(fromDate, toDate);
                }
                filterData();
            } catch (err) {
                console.error(err);
            }
        })();
    }, [selectedFromDate, selectedToDate, selectedCollector]);

    const fetchCollectionReceipts = async (from, to, uid) => {
        try {
            let url = `${API.paymentCollection()}?Fromdate=${from}&Todate=${to}`;
            if (uid) {
                url += `&collected_by=${uid}`;
            }
            const response = await fetch(url);
            const data = await response.json();
            if (data.success) {
                setLogData(data.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filterData = async () => {
        try {
            const url = API.receiptFilter();
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setDropDownValues({
                    paymentStatus: data.others.paymentStatus || [],
                    collectedBy: data.others.collectedBy || [],
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleFromDateChange = (event, date) => {
        setSelectedFromDate(date);
    };

    const handleToDateChange = (event, date) => {
        setSelectedToDate(date);
    };

    const formatDate = dateString => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const renderFilterModal = () => (
        <Modal
            visible={isFilterModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setIsFilterModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Collector</Text>
                        <TouchableOpacity
                            onPress={() => setIsFilterModalVisible(false)}>
                            <Icon
                                name="close"
                                size={25}
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
            </View>
        </Modal>
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
                        <Text style={styles.headerText}>
                            Collection Information
                        </Text>
                    </View>

                    <View style={styles.datePickerContainer}>
                        <View style={styles.datePickerWrapper}>
                            <DatePickerButton
                                title="From Date"
                                date={selectedFromDate}
                                onDateChange={handleFromDateChange}
                            />
                        </View>
                        <View style={styles.datePickerWrapper}>
                            <DatePickerButton
                                title="To Date"
                                date={selectedToDate}
                                onDateChange={handleToDateChange}
                            />
                        </View>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.summaryContainer}>
                            <View style={styles.summaryBox}>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>
                                        Total Bills
                                    </Text>
                                    <Text style={styles.summaryValue}>
                                        {logData.length}
                                    </Text>
                                </View>
                                <View style={styles.summaryDivider} />
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>
                                        Total Amount
                                    </Text>
                                    <Text style={styles.summaryValue}>
                                        ₹
                                        {logData
                                            .map(total => total.total_amount)
                                            .reduce((acc, cur) => acc + cur, 0)}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.filterContainer}>
                                {selectedCollector && (
                                    <View style={styles.selectedFilterLabel}>
                                        <MaterialCommunityIcons
                                            name="account"
                                            size={20}
                                            color={customColors.primary}
                                        />
                                        <Text style={styles.selectedFilterText}>
                                            {selectedCollector.label}
                                        </Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={styles.filterButton}
                                    onPress={() =>
                                        setIsFilterModalVisible(true)
                                    }>
                                    <View style={styles.filterButtonContent}>
                                        <Icon
                                            name="filter"
                                            size={24}
                                            color={customColors.white}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView>
                            {logData?.map((collection, index) => (
                                <View key={index} style={styles.collectionCard}>
                                    <View style={styles.cardHeader}>
                                        <View style={styles.invoiceContainer}>
                                            <MaterialIcons
                                                name="receipt"
                                                size={20}
                                                color={customColors.primary}
                                            />
                                            <Text style={styles.invoiceNo}>
                                                {collection.collection_inv_no}
                                            </Text>
                                        </View>
                                        <View style={styles.dateContainer}>
                                            <MaterialIcons
                                                name="calendar-today"
                                                size={16}
                                                color={customColors.grey}
                                            />
                                            <Text style={styles.date}>
                                                {formatDate(
                                                    collection.collection_date,
                                                )}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.cardContent}>
                                        <View style={styles.infoRow}>
                                            <View style={styles.infoItem}>
                                                <MaterialCommunityIcons
                                                    name="store"
                                                    size={20}
                                                    color={customColors.primary}
                                                />
                                                <Text
                                                    style={styles.infoText}
                                                    numberOfLines={1}>
                                                    {collection.RetailerGet}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <View style={styles.infoItem}>
                                                <MaterialCommunityIcons
                                                    name="cash-multiple"
                                                    size={20}
                                                    color={customColors.primary}
                                                />
                                                <Text style={styles.amountText}>
                                                    ₹{collection.total_amount}
                                                </Text>
                                            </View>
                                            <View style={styles.infoItem}>
                                                <MaterialCommunityIcons
                                                    name="credit-card-outline"
                                                    size={20}
                                                    color={customColors.primary}
                                                />
                                                <Text style={styles.infoText}>
                                                    {collection.collection_type}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <View
                                                style={[
                                                    styles.infoItem,
                                                    styles.pendingItem,
                                                ]}>
                                                <MaterialCommunityIcons
                                                    name="clock-outline"
                                                    size={20}
                                                    color={customColors.pending}
                                                />
                                                <Text
                                                    style={styles.pendingText}>
                                                    Pending: ₹
                                                    {collection.pending_amount ||
                                                        0}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </ImageBackground>
            {renderFilterModal()}
        </View>
    );
};

export default BillAdminView;

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
        padding: 16,
    },
    headerText: {
        flex: 1,
        ...typography.h4(),
        color: customColors.white,
        marginHorizontal: 10,
    },
    datePickerContainer: {
        flexDirection: "row",
        marginHorizontal: 16,
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
    },
    datePickerWrapper: {
        flex: 1,
        marginHorizontal: 4,
    },
    content: {
        flex: 1,
        backgroundColor: customColors.white,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: "hidden",
    },
    summaryContainer: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        margin: 16,
        marginBottom: 8,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    summaryBox: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        padding: 12,
    },
    summaryItem: {
        alignItems: "center",
        flex: 1,
    },
    summaryLabel: {
        ...typography.body2(),
        color: customColors.gray,
        marginBottom: 4,
    },
    summaryValue: {
        ...typography.h5(),
        color: customColors.primary,
        fontWeight: "600",
    },
    summaryDivider: {
        width: 1,
        height: "100%",
        backgroundColor: customColors.lightGrey,
    },
    filterContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: customColors.lightGrey,
    },
    selectedFilterLabel: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#F8F9FA",
        padding: 8,
        borderRadius: 8,
    },
    selectedFilterText: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "500",
    },
    filterButton: {
        backgroundColor: customColors.primary,
        padding: 8,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        elevation: 2,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    filterButtonContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    collectionCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 8,
        elevation: 2,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: customColors.lightGrey,
    },
    invoiceContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    invoiceNo: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "600",
    },
    dateContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    date: {
        ...typography.body2(),
        color: customColors.grey,
    },
    cardContent: {
        gap: 12,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },
    infoItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#F8F9FA",
        padding: 12,
        borderRadius: 8,
    },
    infoText: {
        ...typography.body1(),
        fontWeight: "600",
        color: customColors.black,
        flex: 1,
    },
    amountText: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "600",
    },
    pendingItem: {
        backgroundColor: "#FFF3E0",
    },
    pendingText: {
        ...typography.body2(),
        color: customColors.pending,
        fontWeight: "500",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: customColors.white,
        borderRadius: 10,
        width: "80%",
        maxHeight: "60%",
        padding: 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: customColors.lightGrey,
        paddingBottom: 10,
    },
    modalTitle: {
        ...typography.h5(),
        color: customColors.grey,
    },
    filterItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: customColors.lightGrey,
    },
    selectedFilterItem: {
        backgroundColor: customColors.accent,
    },
    filterItemText: {
        ...typography.body2(),
        color: customColors.accent,
    },
    selectedFilterItemText: {
        color: customColors.primary,
        fontWeight: "bold",
    },
});
