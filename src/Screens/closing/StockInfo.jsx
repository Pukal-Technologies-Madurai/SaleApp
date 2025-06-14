import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    ScrollView,
    Animated,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Feather";

import { customColors, typography } from "../../Config/helper";
import { fetchClosingStock } from "../../Api/product";
import AppHeader from "../../Components/AppHeader";
import DatePickerButton from "../../Components/DatePickerButton";

const StockInfo = () => {
    const navigation = useNavigation();

    const [userId, setUserId] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [expandedRetailerId, setExpandedRetailerId] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [summaryDetails, setSummaryDetails] = useState([]);
    const rotationAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                setUserId(userId);
            } catch (err) {
                console.log(err);
            }
        })();
    }, [selectedDate]);

    // fetchClosingStock
    const { data: logData = [] } = useQuery({
        queryKey: ["closingStock", selectedDate],
        queryFn: () =>
            fetchClosingStock({ id: userId, day: selectedDate.toISOString() }),
        enabled: !!userId,
    });

    const handleDateChange = (event, date) => {
        setSelectedDate(date);
    };

    const calculateSummary = () => {
        const productSummary = {};

        logData.forEach(entry => {
            entry.ProductCount.forEach(product => {
                const productName = product.Product_Name.trim();
                if (!productSummary[productName]) {
                    productSummary[productName] = { count: 0, totalQty: 0 };
                }
                productSummary[productName].count += 1;
                productSummary[productName].totalQty += product.ST_Qty;
            });
        });

        return Object.entries(productSummary)
            .map(([name, data]) => ({
                Product_Name: name,
                ProductCount: data.count,
                ST_Qty: data.totalQty,
            }))
            .sort((a, b) => b.ST_Qty - a.ST_Qty); // Sort by quantity descending
    };

    const handleModalPreview = () => {
        const summary = calculateSummary();
        setSummaryDetails(summary);
        setModalVisible(true);
    };

    const summary = calculateSummary();

    const renderSummaryCard = (
        icon,
        title,
        value,
        onPress,
        isDisabled = false,
    ) => (
        <TouchableOpacity
            style={[
                styles.summaryCard,
                isDisabled && styles.disabledCard, // Apply a different style if disabled
            ]}
            onPress={!isDisabled ? onPress : null} // Disable the click if isDisabled is true
            activeOpacity={isDisabled ? 1 : 0.7} // Prevent visual feedback when disabled
        >
            <View style={styles.summaryCardIconContainer}>
                <Icon name={icon} color={styles.iconColors[icon]} size={24} />
            </View>
            <Text style={styles.summaryCardTitle}>{title}</Text>
            <Text style={styles.summaryCardValue}>{value}</Text>
        </TouchableOpacity>
    );

    const toggleRetailerExpand = retailerId => {
        Animated.timing(rotationAnimation, {
            toValue: expandedRetailerId === retailerId ? 0 : 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
        setExpandedRetailerId(
            expandedRetailerId === retailerId ? null : retailerId,
        );
    };

    const rotate = rotationAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "180deg"],
    });

    const editOption = item => {
        navigation.navigate("ClosingStock", { item, isEdit: true });
    };

    return (
        <View style={styles.container}>
            <AppHeader
                title="Closing Stock Summary"
                navigation={navigation}
                showRightIcon={true}
            />

            <View style={styles.contentContainer}>
                <View style={styles.datePickerContainer}>
                    <DatePickerButton
                        title="Select Stock Date"
                        date={selectedDate}
                        onDateChange={handleDateChange}
                    />
                </View>

                <View style={styles.summaryCardsContainer}>
                    {renderSummaryCard(
                        "users",
                        "Retailers",
                        logData.length,
                        null,
                        true,
                    )}
                    {renderSummaryCard(
                        "list",
                        "Product Types",
                        summary.length,
                        null,
                        true,
                    )}
                    {renderSummaryCard(
                        "arrow-up-right",
                        "Total Qty",
                        summary.reduce(
                            (total, product) => total + product.ST_Qty,
                            0,
                        ),
                        handleModalPreview,
                    )}
                </View>

                <ScrollView
                    style={styles.retailerListContainer}
                    showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionTitle}>
                        Retailer Stock Details
                    </Text>
                    {logData.map(entry => (
                        <TouchableOpacity
                            key={entry.ST_Id}
                            style={[
                                styles.retailerCard,
                                expandedRetailerId === entry.ST_Id &&
                                    styles.retailerCardExpanded,
                            ]}
                            onPress={() => toggleRetailerExpand(entry.ST_Id)}
                            activeOpacity={0.7}>
                            <View style={styles.retailerHeader}>
                                <View style={styles.retailerInfo}>
                                    <Text
                                        style={styles.retailerName}
                                        numberOfLines={1}>
                                        {entry.Retailer_Name}
                                    </Text>
                                    <Text style={styles.productCount}>
                                        {entry.ProductCount.length} Products
                                    </Text>
                                </View>

                                <View style={styles.headerActions}>
                                    <TouchableOpacity
                                        onPress={e => {
                                            e.stopPropagation();
                                            editOption(entry);
                                        }}
                                        style={styles.editButton}>
                                        <Icon
                                            name="edit-2"
                                            size={16}
                                            color={customColors.primary}
                                        />
                                    </TouchableOpacity>
                                    <Animated.View
                                        style={{
                                            transform: [
                                                {
                                                    rotate:
                                                        expandedRetailerId ===
                                                        entry.ST_Id
                                                            ? rotate
                                                            : "0deg",
                                                },
                                            ],
                                        }}>
                                        <Icon
                                            name="chevron-down"
                                            size={20}
                                            color={customColors.grey500}
                                        />
                                    </Animated.View>
                                </View>
                            </View>

                            {expandedRetailerId === entry.ST_Id && (
                                <View style={styles.productDetailsContainer}>
                                    {entry.ProductCount.map(
                                        (product, productIndex) => (
                                            <View
                                                key={productIndex}
                                                style={[
                                                    styles.productRow,
                                                    productIndex ===
                                                        entry.ProductCount
                                                            .length -
                                                            1 &&
                                                        styles.lastProductRow,
                                                ]}>
                                                <Text
                                                    style={styles.productName}
                                                    numberOfLines={2}>
                                                    {product.Product_Name.trim()}
                                                </Text>
                                                <View
                                                    style={
                                                        styles.quantityBadge
                                                    }>
                                                    <Text
                                                        style={
                                                            styles.quantityText
                                                        }>
                                                        {product.ST_Qty}
                                                    </Text>
                                                </View>
                                            </View>
                                        ),
                                    )}
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Stock Summary</Text>
                            <TouchableOpacity
                                style={styles.modalCloseIcon}
                                onPress={() => setModalVisible(false)}>
                                <Icon
                                    name="x"
                                    size={20}
                                    color={customColors.grey500}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContent}>
                            <View style={styles.modalTableHeader}>
                                <Text style={styles.modalHeaderText}>
                                    Product
                                </Text>
                                <Text
                                    style={[
                                        styles.modalHeaderText,
                                        styles.rightAlign,
                                    ]}>
                                    Quantity
                                </Text>
                            </View>

                            <View style={styles.modalView}>
                                {summaryDetails.map((product, index) => (
                                    <View
                                        key={index}
                                        style={styles.modalTableRow}>
                                        <Text
                                            style={styles.modalProductName}
                                            numberOfLines={2}>
                                            {product.Product_Name}
                                        </Text>
                                        <View
                                            style={
                                                styles.modalQuantityContainer
                                            }>
                                            <Text
                                                style={styles.modalProductQty}>
                                                {product.ST_Qty}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalCloseButtonText}>
                                    Close Summary
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default StockInfo;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    datePickerContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
    },
    summaryCardsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    summaryCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: 16,
        width: "28%",
        alignItems: "center",
        ...typography.elevation3,
    },
    summaryCardIconContainer: {
        borderRadius: 25,
        padding: 10,
        marginBottom: 8,
    },
    summaryCardTitle: {
        ...typography.caption(),
        color: customColors.grey500,
        marginBottom: 4,
        textAlign: "center",
    },
    summaryCardValue: {
        ...typography.h6(),
        color: customColors.text,
        fontWeight: "600",
    },
    retailerListContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        ...typography.subtitle1(),
        color: customColors.text,
        fontWeight: "600",
        marginBottom: 12,
    },
    retailerCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        marginBottom: 12,
        ...typography.elevation2,
        borderWidth: 1,
        borderColor: customColors.grey200,
        overflow: "hidden",
    },
    retailerCardExpanded: {
        borderColor: customColors.primary,
        borderWidth: 1,
    },
    retailerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: customColors.white,
    },
    retailerInfo: {
        flex: 1,
        marginRight: 16,
    },
    retailerName: {
        ...typography.subtitle1(),
        color: customColors.text,
        marginBottom: 4,
    },
    productCount: {
        ...typography.caption(),
        color: customColors.grey500,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    editButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: customColors.primary + "15",
    },
    productDetailsContainer: {
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
        backgroundColor: customColors.grey50,
    },
    productRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    lastProductRow: {
        borderBottomWidth: 0,
    },
    productName: {
        ...typography.body2(),
        color: customColors.text,
        flex: 1,
        marginRight: 12,
    },
    quantityBadge: {
        backgroundColor: customColors.primary + "15",
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        minWidth: 60,
        alignItems: "center",
    },
    quantityText: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "600",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        // alignItems: "center",
        // padding: 20,
    },
    modalContainer: {
        width: "90%",
        height: "80%",
        backgroundColor: customColors.white,
        borderRadius: 16,
        elevation: 5,
        shadowColor: customColors.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        // overflow: "hidden",
        // position: "relative",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
        backgroundColor: customColors.white,
    },
    modalTitle: {
        ...typography.h6(),
        color: customColors.text,
    },
    modalCloseIcon: {
        padding: 8,
    },
    modalContent: {
        minHeight: 0,
        backgroundColor: customColors.white,
    },
    modalTableHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: customColors.grey50,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
        // zIndex: 1,
    },
    modalHeaderText: {
        ...typography.subtitle2(),
        color: customColors.grey700,
        fontWeight: "600",
        flex: 1,
    },
    rightAlign: {
        textAlign: "right",
        flex: 0.4,
    },
    modalView: {
        backgroundColor: customColors.white,
        height: "60%",
    },
    modalTableRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
        backgroundColor: customColors.white,
    },
    modalProductName: {
        ...typography.body2(),
        color: customColors.text,
        flex: 1,
        marginRight: 16,
    },
    modalQuantityContainer: {
        backgroundColor: customColors.primary + "15",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        minWidth: 60,
    },
    modalProductQty: {
        ...typography.subtitle2(),
        color: customColors.primary,
        fontWeight: "600",
        textAlign: "center",
    },
    modalFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
        backgroundColor: customColors.white,
    },
    modalCloseButton: {
        backgroundColor: customColors.primary,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
    },
    modalCloseButtonText: {
        ...typography.button(),
        color: customColors.white,
    },
    iconColors: {
        users: customColors.info,
        list: customColors.success,
        "arrow-up-right": customColors.primary,
    },
});
