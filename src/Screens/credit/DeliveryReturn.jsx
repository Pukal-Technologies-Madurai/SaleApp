import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useEffect, useState, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import FeatherIcon from "react-native-vector-icons/Feather";
import AppHeader from "../../Components/AppHeader";
import Accordion from "../../Components/Accordion";
import FilterModal from "../../Components/FilterModal";
import { fetchCreditNoteList } from "../../Api/delivery";
import { API } from "../../Config/Endpoint";
import {
    customColors,
    shadows,
    spacing,
    typography,
    borderRadius,
    iconSizes,
} from "../../Config/helper";

const DeliveryReturn = ({ route }) => {
    const { selectedDate: passedDate, selectedBranch } = route.params || {};

    const navigation = useNavigation();

    // ── Initialize dates directly from passedDate so the first render is correct ──
    const resolvedInitialDate = passedDate ? new Date(passedDate) : new Date();

    const [creditNoteData, setCreditNoteData] = useState([]);
    const [selectedFromDate, setSelectedFromDate] = useState(resolvedInitialDate);
    const [selectedToDate, setSelectedToDate] = useState(resolvedInitialDate);
    const [modalVisible, setModalVisible] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBrand, setSelectedBrand] = useState("All");
    const [brandList, setBrandList] = useState([]);
    const [productSummary, setProductSummary] = useState([]);
    const [selectedSalesPerson, setSelectedSalesPerson] = useState("");
    const [salesPersonList, setSalesPersonList] = useState([]);

    // ── Single effect: fires on mount (with the correct initial date)
    //    and again whenever the user changes dates via the filter modal ────────
    useEffect(() => {
        const from = selectedFromDate.toISOString().split("T")[0];
        const to = selectedToDate.toISOString().split("T")[0];
        loadCreditNotes(from, to);
    }, [selectedFromDate, selectedToDate]);

    const loadCreditNotes = async (from, to) => {
        try {
            const data = await fetchCreditNoteList(from, to);
            setCreditNoteData(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("loadCreditNotes error:", err);
            setCreditNoteData([]);
        }
    };

    // ── Build brand list + sales person list + product summary whenever data changes ──────────
    useEffect(() => {
        if (creditNoteData.length === 0) {
            setBrandList([]);
            setSalesPersonList([]);
            setProductSummary([]);
            return;
        }

        // Sales person list — derived from Created_by and Created_BY_Name
        const salesPersonMap = new Map();
        creditNoteData.forEach(note => {
            if (note.Created_by && note.Created_BY_Name) {
                salesPersonMap.set(note.Created_by, {
                    label: note.Created_BY_Name,
                    value: note.Created_by,
                });
            }
        });
        setSalesPersonList([
            { label: "All", value: "" },
            ...Array.from(salesPersonMap.values()),
        ]);

        // Brand list — derived from BrandGet field
        const brands = new Set();
        creditNoteData.forEach(note => {
            (note.Products_List || []).forEach(p => {
                if (p.BrandGet) brands.add(p.BrandGet);
            });
        });
        setBrandList(["All", ...Array.from(brands)]);

        // Product summary (mirrors SalesAdmin's calculateProductSummaryAndTotals)
        const summary = {};
        creditNoteData.forEach(note => {
            (note.Products_List || []).forEach(p => {
                const key = p.Item_Name || p.Product_Name;
                if (!summary[key]) {
                    summary[key] = {
                        productName: key,
                        totalQty: 0,
                        totalAmount: 0,
                        timesSold: 0,
                    };
                }
                summary[key].totalQty += parseFloat(p.Bill_Qty || p.Total_Qty || 0);
                summary[key].totalAmount += parseFloat(p.Final_Amo || p.Amount || 0);
                summary[key].timesSold += 1;
            });
        });
        setProductSummary(Object.values(summary));
    }, [creditNoteData]);

    const handleFromDateChange = date => {
        if (date) {
            const d = date > selectedToDate ? selectedToDate : date;
            setSelectedFromDate(d);
        }
    };

    const handleToDateChange = date => {
        if (date) {
            const d = date < selectedFromDate ? selectedFromDate : date;
            setSelectedToDate(d);
        }
    };

    // ── Stats ──────────────────────────────────────────────────────────────
    const totalNotes = creditNoteData.length;
    const totalAmount = useMemo(
        () => creditNoteData.reduce((s, n) => s + parseFloat(n.Total_Invoice_value || 0), 0),
        [creditNoteData],
    );

    // ── Sales person filter ───────────────────────────────────────────────
    const salesPersonFilteredData = useMemo(() => {
        if (!selectedSalesPerson) return creditNoteData;
        return creditNoteData.filter(note => note.Created_by === selectedSalesPerson);
    }, [creditNoteData, selectedSalesPerson]);

    // ── Brand filter + search filter ───────────────────────────────────────
    const brandFilteredData = useMemo(() => {
        if (selectedBrand === "All") return salesPersonFilteredData;
        return salesPersonFilteredData
            .map(note => {
                const filtered = (note.Products_List || []).filter(p => {
                    return p.BrandGet === selectedBrand;
                });
                if (filtered.length === 0) return null;
                const brandTotal = filtered.reduce(
                    (s, p) => s + parseFloat(p.Final_Amo || p.Amount || 0),
                    0,
                );
                return { ...note, Products_List: filtered, Total_Invoice_value: brandTotal };
            })
            .filter(Boolean);
    }, [salesPersonFilteredData, selectedBrand]);

    const filteredData = useMemo(() => {
        const q = searchQuery.toLowerCase();
        if (!q) return brandFilteredData;
        return brandFilteredData.filter(
            n =>
                n.Retailer_Name?.toLowerCase().includes(q) ||
                n.CR_Inv_No?.toLowerCase().includes(q) ||
                n.Ref_Inv_Number?.toLowerCase().includes(q),
        );
    }, [brandFilteredData, searchQuery]);

    const filteredTotalNotes = filteredData.length;
    const filteredTotalAmount = useMemo(
        () => filteredData.reduce((s, n) => s + parseFloat(n.Total_Invoice_value || 0), 0),
        [filteredData],
    );

    // ── Navigate to product summary report ────────────────────────────────
    const handleProductSummaryPress = () => {
        navigation.navigate("SalesReport", {
            logData: creditNoteData,
            productSummary,
            selectedDate: selectedFromDate,
            isNotAdmin: false,
        });
    };

    // ── Delete credit note ────────────────────────────────────────────────
    const handleDeleteCreditNote = (creditNote) => {
        Alert.alert(
            "Delete Credit Note",
            `Are you sure you want to delete ${creditNote.CR_Inv_No}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await fetch(API.creditNote(), {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ CR_Id: creditNote.CR_Id }),
                            });

                            const result = await response.json();

                            if (response.ok && result.success) {
                                Alert.alert("Success", "Credit note deleted successfully!");
                                // Refresh the list
                                const from = selectedFromDate.toISOString().split("T")[0];
                                const to = selectedToDate.toISOString().split("T")[0];
                                loadCreditNotes(from, to);
                            } else {
                                Alert.alert("Error", result.message || "Failed to delete credit note");
                            }
                        } catch (error) {
                            console.error("Delete Credit Note Error:", error);
                            Alert.alert("Error", "Failed to delete. Please try again.");
                        }
                    },
                },
            ]
        );
    };

    // ── Accordion header ───────────────────────────────────────────────────
    const renderHeader = item => (
        <View style={styles.accordionHeader}>
            <View style={styles.headerLeft}>
                <Text style={styles.retailerName} numberOfLines={1}>
                    {item.Retailer_Name}
                </Text>
                <Text style={styles.orderDate}>
                    {item.CR_Date
                        ? new Date(item.CR_Date).toLocaleDateString("en-GB")
                        : "N/A"}{" "}
                    • {item.CR_Inv_No}
                </Text>
            </View>
            <View style={styles.headerRight}>
                <Text style={styles.orderAmount}>
                    ₹{parseFloat(item.Total_Invoice_value || 0).toFixed(2)}
                </Text>
                <Text style={styles.orderCount}>
                    {(item.Products_List || []).length} items
                </Text>
            </View>
        </View>
    );

    // ── Accordion content ──────────────────────────────────────────────────
    const renderContent = item => (
        <View style={styles.content}>
            {/* Meta row */}
            <View style={styles.orderInfo}>
                <Text style={styles.orderNumber}>CR #{item.CR_Id}</Text>
                {item.Created_BY_Name ? (
                    <Text style={styles.createdBy}>
                        by {item.Created_BY_Name}
                    </Text>
                ) : null}
            </View>

            {/* Products */}
            <View style={styles.productsContainer}>
                {(item.Products_List || []).map((p, idx) => (
                    <View key={idx} style={styles.productItem}>
                        <View style={styles.productInfo}>
                            <Text style={styles.productName} numberOfLines={3}>
                                {p.Item_Name || p.Product_Name}
                            </Text>
                            <Text style={styles.productDetails}>
                                Qty: {p.Bill_Qty} {p.UOM || p.Unit_Name} • ₹{parseFloat(p.Item_Rate).toFixed(2)} each
                            </Text>
                        </View>
                        <Text style={styles.productAmount}>
                            ₹{parseFloat(p.Final_Amo || 0).toFixed(2)}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Footer total */}
            <View style={styles.footer}>
                <View style={styles.totalSection}>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.totalValue}>
                        ₹{parseFloat(item.Total_Invoice_value || 0).toFixed(2)}
                    </Text>
                </View>
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => navigation.navigate("SalesReturn", {
                            item: item,
                            isEditMode: true,
                        })}
                        activeOpacity={0.7}
                    >
                        <FeatherIcon name="edit-2" size={iconSizes.sm} color={customColors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteCreditNote(item)}
                        activeOpacity={0.7}
                    >
                        <FeatherIcon name="trash-2" size={iconSizes.sm} color={customColors.white} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Credit Notes"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="FeatherIcon"
                rightIconName="filter"
                onRightPress={() => setModalVisible(true)}
            />

            <FilterModal
                visible={modalVisible}
                fromDate={selectedFromDate}
                toDate={selectedToDate}
                onFromDateChange={handleFromDateChange}
                onToDateChange={handleToDateChange}
                onApply={() => setModalVisible(false)}
                onClose={() => setModalVisible(false)}
                showToDate={true}
                title="Filter options"
                fromLabel="From Date"
                toLabel="To Date"
                // Sales Person dropdown
                showSalesPerson={true}
                salesPersonData={salesPersonList}
                selectedSalesPerson={selectedSalesPerson}
                onSalesPersonChange={(item) => setSelectedSalesPerson(item.value)}
                salesPersonLabel="Created By"
            />

            <View style={styles.contentContainer}>
                {/* ── Stats + Brand filter + Search (mirrors SalesAdmin) ── */}
                <View style={styles.countContainer}>
                    {/* Brand pills + search icon row */}
                    <View style={styles.searchHeader}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.brandScroll}>
                            {brandList.map((brand, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.brandPill,
                                        selectedBrand === brand && styles.brandPillActive,
                                    ]}
                                    onPress={() => setSelectedBrand(brand)}>
                                    <Text
                                        style={[
                                            styles.brandPillText,
                                            selectedBrand === brand && styles.brandPillTextActive,
                                        ]}>
                                        {brand}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.searchIcon}
                            onPress={() => {
                                setSearchQuery("");
                                setShowSearch(!showSearch);
                            }}>
                            <FeatherIcon
                                name={showSearch ? "x" : "search"}
                                size={iconSizes.lg}
                                color={customColors.grey900}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Stats card */}
                    <View style={styles.statsContainer}>
                        {/* Report navigate button */}
                        <TouchableOpacity
                            style={styles.reportButton}
                            onPress={handleProductSummaryPress}
                            activeOpacity={0.7}>
                            <FeatherIcon
                                name="arrow-up-right"
                                size={iconSizes.sm}
                                color={customColors.grey600}
                            />
                        </TouchableOpacity>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>
                                    {selectedBrand === "All" ? "Total Notes" : `${selectedBrand} Notes`}
                                </Text>
                                <Text style={styles.statValue}>{filteredTotalNotes}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>
                                    {selectedBrand === "All" ? "Total Amount" : `${selectedBrand} Amount`}
                                </Text>
                                <Text style={styles.statValue}>
                                    {filteredTotalAmount ? `₹${filteredTotalAmount.toFixed(2)}` : "₹0.00"}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Search input */}
                    {showSearch && (
                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search retailer / invoice..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                        </View>
                    )}
                </View>

                {/* ── Accordion list ── */}
                <ScrollView
                    style={styles.retailersScrollContainer}
                    contentContainerStyle={styles.retailersScrollContent}
                    showsVerticalScrollIndicator={false}>
                    <Accordion
                        data={filteredData}
                        renderHeader={renderHeader}
                        renderContent={renderContent}
                    />
                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

export default DeliveryReturn;

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

    // ── Stats area ─────────────────────────────────────────────────────────
    countContainer: {
        marginHorizontal: spacing.md,
        marginVertical: spacing.xxs,
    },
    searchHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    brandScroll: {
        flex: 1,
        marginVertical: spacing.sm,
    },
    brandPill: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        marginRight: spacing.sm,
        borderRadius: borderRadius.xl,
        backgroundColor: customColors.grey200,
    },
    brandPillActive: {
        backgroundColor: customColors.primary,
    },
    brandPillText: {
        ...typography.caption(),
        color: customColors.grey900,
    },
    brandPillTextActive: {
        color: customColors.white,
    },
    searchIcon: {
        padding: spacing.xs,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey100,
        marginLeft: spacing.sm,
        ...shadows.small,
    },
    statsContainer: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginHorizontal: spacing.xs,
        position: "relative",
        ...shadows.small,
    },
    reportButton: {
        position: "absolute",
        top: spacing.sm,
        right: spacing.sm,
        width: 24,
        height: 24,
        borderRadius: borderRadius.lg,
        backgroundColor: customColors.grey50,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statLabel: {
        ...typography.caption(),
        color: customColors.grey600,
        marginBottom: spacing.xs,
        textAlign: "center",
    },
    statValue: {
        ...typography.h3(),
        color: customColors.grey900,
        fontWeight: "600",
        textAlign: "center",
    },
    searchContainer: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        borderRadius: borderRadius.md,
        overflow: "hidden",
        backgroundColor: customColors.white,
        ...shadows.medium,
    },
    searchInput: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        color: customColors.grey900,
    },

    // ── Accordion header ───────────────────────────────────────────────────
    accordionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: customColors.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: 2,
    },
    headerLeft: {
        flex: 1,
        marginRight: spacing.sm,
    },
    retailerName: {
        ...typography.subtitle2(),
        color: customColors.white,
        fontWeight: "600",
        marginBottom: 2,
    },
    orderDate: {
        ...typography.caption(),
        color: customColors.white,
        opacity: 0.9,
    },
    headerRight: {
        alignItems: "flex-end",
    },
    orderAmount: {
        ...typography.subtitle1(),
        color: customColors.white,
        fontWeight: "700",
    },
    orderCount: {
        ...typography.caption(),
        color: customColors.white,
        opacity: 0.8,
        marginTop: 1,
    },

    // ── Accordion content ──────────────────────────────────────────────────
    content: {
        margin: spacing.xs,
        borderWidth: 1,
        borderColor: customColors.grey200,
        borderRadius: borderRadius.md,
        backgroundColor: customColors.white,
    },
    orderInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: customColors.grey50,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
        flexWrap: "wrap",
        gap: 4,
    },
    orderNumber: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    createdBy: {
        ...typography.caption(),
        color: customColors.grey700,
    },
    productsContainer: {
        paddingVertical: spacing.xs,
    },
    productItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey50,
    },
    productInfo: {
        flex: 1,
        marginRight: spacing.sm,
    },
    productName: {
        width: "88%",
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "500",
        marginBottom: 2,
    },
    productDetails: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    productAmount: {
        ...typography.body2(),
        color: customColors.error,
        fontWeight: "600",
    },
    footer: {
        backgroundColor: customColors.grey25,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    totalSection: {
        flex: 1,
    },
    totalLabel: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    totalValue: {
        ...typography.subtitle1(),
        color: customColors.error,
        fontWeight: "700",
    },
    actionButtons: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.primary,
        justifyContent: "center",
        alignItems: "center",
        ...shadows.small,
    },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.error,
        justifyContent: "center",
        alignItems: "center",
        ...shadows.small,
    },

    // ── Scroll ─────────────────────────────────────────────────────────────
    retailersScrollContainer: {
        flex: 1,
    },
    retailersScrollContent: {
        padding: spacing.md,
    },
    bottomSpacer: {
        height: spacing.xxl * 2,
    },
});
