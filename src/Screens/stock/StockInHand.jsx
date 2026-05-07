import {
    StyleSheet,
    Text,
    View,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Animated,
    Modal,
    ScrollView,
    Pressable,
} from "react-native";
import React, {
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    customColors,
    customFonts,
    typography,
    spacing,
    borderRadius,
    shadows,
    iconSizes,
    moderateScale,
    verticalScale,
    responsiveFontSize,
    wp,
    hp,
} from "../../Config/helper";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../Components/AppHeader";
import { useNavigation } from "@react-navigation/native";
import FilterModal from "../../Components/FilterModal";
import { useQuery } from "@tanstack/react-query";
import {
    fetchGoDownExpenseReport,
    fetchGoDownStackInHand,
} from "../../Api/product";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import FeatherIcon from "react-native-vector-icons/Feather";

// ─── Voucher color map ────────────────────────────────────────────────────────
const VOUCHER_COLORS = {
    Opening_Balance: customColors.primaryDark,
    STOCK_TRANSFER: customColors.info,
    Online_Sales: customColors.warning,
    Sales: customColors.success,
    Purchase: customColors.accent,
    DEFAULT: customColors.grey500,
};

const getVoucherColor = voucherName => {
    if (!voucherName) return VOUCHER_COLORS.DEFAULT;
    const key = Object.keys(VOUCHER_COLORS).find(k =>
        voucherName.toUpperCase().includes(k.toUpperCase()),
    );
    return key ? VOUCHER_COLORS[key] : VOUCHER_COLORS.DEFAULT;
};

// ─── Expense Ledger Row ───────────────────────────────────────────────────────
const ExpenseRow = ({ item, isLast }) => {
    const color = getVoucherColor(item.voucher_name || item.Particulars);
    const hasRetailer = !!item.Retailer_Name;
    const formattedDate = new Date(item.Ledger_Date).toLocaleDateString(
        "en-IN",
        { day: "2-digit", month: "short", year: "numeric" },
    );

    return (
        <View
            style={[
                expenseStyles.card,
                isLast && { marginBottom: 0 },
                { borderLeftColor: color },
            ]}
        >
            {/* Top row: Particulars tag + qty badges */}
            <View style={expenseStyles.cardTop}>
                <View
                    style={[
                        expenseStyles.particularsBadge,
                        { backgroundColor: color + "18", borderColor: color + "40" },
                    ]}
                >
                    <View
                        style={[
                            expenseStyles.dot,
                            { backgroundColor: color },
                        ]}
                    />
                    <Text
                        style={[
                            expenseStyles.particularsText,
                            { color },
                        ]}
                        numberOfLines={1}
                    >
                        {item.Particulars || item.voucher_name || "—"}
                    </Text>
                </View>

                {/* Qty badges */}
                <View style={expenseStyles.qtyRow}>
                    {item.In_Qty > 0 && (
                        <View
                            style={[
                                expenseStyles.qtyBadge,
                                expenseStyles.qtyIn,
                            ]}
                        >
                            <FeatherIcon
                                name="arrow-down-left"
                                size={10}
                                color={customColors.success}
                            />
                            <Text
                                style={[
                                    expenseStyles.qtyText,
                                    { color: customColors.success },
                                ]}
                            >
                                {item.In_Qty}
                            </Text>
                        </View>
                    )}
                    {item.Out_Qty > 0 && (
                        <View
                            style={[
                                expenseStyles.qtyBadge,
                                expenseStyles.qtyOut,
                            ]}
                        >
                            <FeatherIcon
                                name="arrow-up-right"
                                size={10}
                                color={customColors.error}
                            />
                            <Text
                                style={[
                                    expenseStyles.qtyText,
                                    { color: customColors.error },
                                ]}
                            >
                                {item.Out_Qty}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Retailer row */}
            {hasRetailer && (
                <View style={expenseStyles.retailerRow}>
                    <FeatherIcon
                        name="shopping-bag"
                        size={11}
                        color={customColors.primary}
                    />
                    <Text
                        style={expenseStyles.retailerName}
                        numberOfLines={1}
                    >
                        {item.Retailer_Name}
                    </Text>
                </View>
            )}

            {/* Bottom row: Invoice + Date + Amount */}
            <View style={expenseStyles.cardBottom}>
                <View style={expenseStyles.invoiceBlock}>
                    <FeatherIcon
                        name="file-text"
                        size={10}
                        color={customColors.grey400}
                    />
                    <Text style={expenseStyles.invoiceNo} numberOfLines={1}>
                        {"  "}{item.invoice_no}
                    </Text>
                </View>
                <View style={expenseStyles.bottomRight}>
                    <FeatherIcon
                        name="calendar"
                        size={10}
                        color={customColors.grey400}
                    />
                    <Text style={expenseStyles.dateText}>
                        {"  "}{formattedDate}
                    </Text>
                    {item.Amount > 0 && (
                        <Text style={expenseStyles.amountText}>
                            {"  "}·{"  "}₹{item.Amount.toLocaleString("en-IN")}
                        </Text>
                    )}
                </View>
            </View>
        </View>
    );
};

const expenseStyles = StyleSheet.create({
    // Card
    card: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        borderLeftWidth: 3,
        marginBottom: spacing.sm,
        paddingHorizontal: moderateScale(12),
        paddingVertical: verticalScale(10),
        ...shadows.small,
    },

    // Top row
    cardTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: verticalScale(6),
    },
    particularsBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: moderateScale(8),
        paddingVertical: verticalScale(3),
        borderRadius: borderRadius.round,
        borderWidth: 1,
        maxWidth: "60%",
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: moderateScale(5),
    },
    particularsText: {
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(11),
    },
    qtyRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    qtyBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: moderateScale(7),
        paddingVertical: verticalScale(3),
        borderRadius: borderRadius.round,
        gap: 3,
    },
    qtyIn: {
        backgroundColor: customColors.successFaded,
    },
    qtyOut: {
        backgroundColor: customColors.errorFaded,
    },
    qtyText: {
        fontFamily: customFonts.poppinsBold,
        fontSize: responsiveFontSize(12),
    },

    // Retailer row
    retailerRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.primaryFaded,
        borderRadius: borderRadius.md,
        paddingHorizontal: moderateScale(8),
        paddingVertical: verticalScale(5),
        marginBottom: verticalScale(6),
    },
    retailerName: {
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(12),
        color: customColors.primaryDark,
        marginLeft: moderateScale(6),
        flex: 1,
    },

    // Bottom row
    cardBottom: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    invoiceBlock: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    invoiceNo: {
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(10),
        color: customColors.grey500,
    },
    bottomRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    dateText: {
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(10),
        color: customColors.grey400,
    },
    amountText: {
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(11),
        color: customColors.grey700,
    },
});

// ─── Expense Detail Modal ─────────────────────────────────────────────────────
const ExpenseModal = ({ visible, product, data, isLoading, onClose }) => {
    const slideAnim = useRef(new Animated.Value(hp(100))).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 4,
                speed: 14,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: hp(100),
                duration: 220,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const totalIn = useMemo(
        () => data.reduce((s, r) => s + (r.In_Qty ?? 0), 0),
        [data],
    );
    const totalOut = useMemo(
        () => data.reduce((s, r) => s + (r.Out_Qty ?? 0), 0),
        [data],
    );
    const totalAmount = useMemo(
        () => data.reduce((s, r) => s + (r.Amount ?? 0), 0),
        [data],
    );

    if (!visible && !product) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <Pressable style={modalStyles.backdrop} onPress={onClose}>
                <Animated.View
                    style={[
                        modalStyles.sheet,
                        { transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    {/* Stop press propagation so tapping inside doesn't close */}
                    <Pressable
                        onPress={e => e.stopPropagation()}
                        style={{ flex: 1 }}
                    >
                        {/* Handle bar */}
                        <View style={modalStyles.handleBar} />

                        {/* Header */}
                        <View style={modalStyles.sheetHeader}>
                            <View style={modalStyles.sheetTitleBlock}>
                                <View style={modalStyles.sheetIconWrap}>
                                    <FeatherIcon
                                        name="bar-chart-2"
                                        size={iconSizes.md}
                                        color={customColors.primary}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text
                                        style={modalStyles.sheetTitle}
                                        numberOfLines={2}
                                    >
                                        {product?.stock_item_name}
                                    </Text>
                                    <Text style={modalStyles.sheetSubtitle}>
                                        {product?.Godown_Name}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={modalStyles.closeBtn}
                                onPress={onClose}
                                activeOpacity={0.7}
                            >
                                <FeatherIcon
                                    name="x"
                                    size={iconSizes.md}
                                    color={customColors.grey500}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Summary strip */}
                        <View style={modalStyles.summaryStrip}>
                            <View style={modalStyles.summaryItem}>
                                <Text style={[modalStyles.summaryValue, { color: customColors.success }]}>
                                    {totalIn}
                                </Text>
                                <Text style={modalStyles.summaryLabel}>Total In</Text>
                            </View>
                            <View style={modalStyles.summaryDivider} />
                            <View style={modalStyles.summaryItem}>
                                <Text style={[modalStyles.summaryValue, { color: customColors.error }]}>
                                    {totalOut}
                                </Text>
                                <Text style={modalStyles.summaryLabel}>Total Out</Text>
                            </View>
                            <View style={modalStyles.summaryDivider} />
                            {/* <View style={modalStyles.summaryItem}>
                                <Text style={[modalStyles.summaryValue, { color: customColors.primaryDark }]}>
                                    {totalIn - totalOut}
                                </Text>
                                <Text style={modalStyles.summaryLabel}>Net Qty</Text>
                            </View> */}
                            <View style={modalStyles.summaryDivider} />
                            <View style={modalStyles.summaryItem}>
                                <Text style={[modalStyles.summaryValue, { color: customColors.warning }]}>
                                    ₹{totalAmount.toLocaleString("en-IN")}
                                </Text>
                                <Text style={modalStyles.summaryLabel}>Amount</Text>
                            </View>
                        </View>

                        {/* Transactions list */}
                        <View style={modalStyles.listContainer}>
                            {isLoading ? (
                                <View style={modalStyles.loaderWrap}>
                                    <ActivityIndicator
                                        size="large"
                                        color={customColors.primary}
                                    />
                                    <Text style={modalStyles.loaderText}>
                                        Loading ledger…
                                    </Text>
                                </View>
                            ) : data.length === 0 ? (
                                <View style={modalStyles.emptyWrap}>
                                    <FeatherIcon
                                        name="file-text"
                                        size={iconSizes.xl}
                                        color={customColors.grey300}
                                    />
                                    <Text style={modalStyles.emptyText}>
                                        No transactions found
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{
                                        paddingTop: spacing.xs,
                                        paddingBottom: spacing.xl,
                                    }}
                                >
                                    {data.map((txn, idx) => (
                                        <ExpenseRow
                                            key={`${txn.Trans_Id}-${idx}`}
                                            item={txn}
                                            isLast={idx === data.length - 1}
                                        />
                                    ))}
                                </ScrollView>
                            )}
                        </View>
                    </Pressable>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

const modalStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: customColors.white,
        borderTopLeftRadius: borderRadius.xxl,
        borderTopRightRadius: borderRadius.xxl,
        maxHeight: hp(85),
        minHeight: hp(50),
        flex: 1,
        ...shadows.xl,
    },
    handleBar: {
        width: moderateScale(40),
        height: 4,
        borderRadius: 2,
        backgroundColor: customColors.grey300,
        alignSelf: "center",
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    sheetTitleBlock: {
        flexDirection: "row",
        alignItems: "flex-start",
        flex: 1,
        marginRight: spacing.sm,
    },
    sheetIconWrap: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: borderRadius.md,
        backgroundColor: customColors.primaryFaded,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.sm,
        marginTop: 2,
    },
    sheetTitle: {
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(13),
        color: customColors.grey900,
        lineHeight: responsiveFontSize(19),
    },
    sheetSubtitle: {
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(11),
        color: customColors.grey400,
        marginTop: 2,
    },
    closeBtn: {
        width: moderateScale(32),
        height: moderateScale(32),
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
    },
    summaryStrip: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: spacing.md,
        marginVertical: spacing.sm,
        backgroundColor: customColors.grey50,
        borderRadius: borderRadius.lg,
        paddingVertical: verticalScale(10),
        paddingHorizontal: spacing.sm,
    },
    summaryItem: {
        flex: 1,
        alignItems: "center",
    },
    summaryValue: {
        fontFamily: customFonts.poppinsBold,
        fontSize: responsiveFontSize(15),
        lineHeight: responsiveFontSize(21),
    },
    summaryLabel: {
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(9),
        color: customColors.grey400,
        marginTop: 1,
    },
    summaryDivider: {
        width: 1,
        height: moderateScale(28),
        backgroundColor: customColors.grey200,
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    loaderWrap: {
        alignItems: "center",
        paddingVertical: verticalScale(40),
    },
    loaderText: {
        marginTop: spacing.sm,
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(13),
        color: customColors.grey500,
    },
    emptyWrap: {
        alignItems: "center",
        paddingVertical: verticalScale(40),
        gap: spacing.sm,
    },
    emptyText: {
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(13),
        color: customColors.grey400,
    },
});

// ─── Stock Stat sub-cell ──────────────────────────────────────────────────────
const StockStat = ({ label, value, color, highlight }) => (
    <View
        style={[
            styles.statCell,
            highlight && {
                backgroundColor: color + "10",
                borderRadius: borderRadius.md,
            },
        ]}
    >
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

// ─── Stock Row Card ───────────────────────────────────────────────────────────
const StockCard = ({ item, index, onPress }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(16)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 280,
                delay: index * 40,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 280,
                delay: index * 40,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const balQty = item.Bal_Qty ?? 0;
    const actBalQty = item.Act_Bal_Qty ?? 0;
    const salQty = item.Sal_Qty ?? 0;
    const purQty = item.Pur_Qty ?? 0;
    const obBalQty = item.OB_Bal_Qty ?? 0;

    const stockColor =
        balQty === 0
            ? customColors.error
            : balQty <= 5
              ? customColors.warning
              : customColors.success;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 50,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
        }).start();
    };

    return (
        <Animated.View
            style={[
                styles.stockCard,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY }, { scale: scaleAnim }],
                },
            ]}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={() => onPress(item)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                {/* Header row */}
                <View style={styles.cardHeader}>
                    <View style={styles.brandBadge}>
                        <Text style={styles.brandText}>{item.Brand || "–"}</Text>
                    </View>
                    <View
                        style={[
                            styles.stockBadge,
                            {
                                backgroundColor: stockColor + "18",
                                borderColor: stockColor + "40",
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.stockDot,
                                { backgroundColor: stockColor },
                            ]}
                        />
                        <Text
                            style={[styles.stockBadgeText, { color: stockColor }]}
                        >
                            {balQty === 0
                                ? "Out of Stock"
                                : balQty <= 5
                                  ? "Low Stock"
                                  : "In Stock"}
                        </Text>
                    </View>
                </View>

                {/* Product name */}
                <Text style={styles.productName} numberOfLines={2}>
                    {item.stock_item_name}
                </Text>

                <Text style={styles.godownName}>
                    <FeatherIcon
                        name="map-pin"
                        size={10}
                        color={customColors.grey400}
                    />
                    {"  "}
                    {item.Godown_Name}
                </Text>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Stats grid */}
                <View style={styles.statsGrid}>
                    <StockStat
                        label={"Opening\nBalance"}
                        value={obBalQty}
                        color={customColors.primaryDark}
                    />
                    <StockStat
                        label={"Purchase\nQty"}
                        value={purQty}
                        color={customColors.info}
                    />
                    <StockStat
                        label={"Sales\nQty"}
                        value={salQty}
                        color={customColors.warning}
                    />
                    <StockStat
                        label={"Balance\nQty"}
                        value={balQty}
                        color={stockColor}
                        highlight
                    />
                </View>

                {/* Actual qty footer + tap hint */}
                <View style={styles.cardFooterRow}>
                    <View style={styles.actualQtyRow}>
                        <FeatherIcon
                            name="layers"
                            size={12}
                            color={customColors.grey400}
                        />
                        <Text style={styles.actualQtyText}>
                            {"  "}Actual Bal:{" "}
                            <Text style={styles.actualQtyValue}>{actBalQty}</Text>
                            {"   "}Actual Sales:{" "}
                            <Text style={styles.actualQtyValue}>
                                {item.Sal_Act_Qty ?? 0}
                            </Text>
                        </Text>
                    </View>
                    <View style={styles.tapHint}>
                        <FeatherIcon
                            name="chevron-right"
                            size={12}
                            color={customColors.primary}
                        />
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const StockInHand = () => {
    const navigation = useNavigation();
    const [isActiveGoDown, setIsActiveGoDown] = useState(false);
    const [modalFromDate, setModalFromDate] = useState(new Date());
    const [modalToDate, setModalToDate] = useState(new Date());
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState("All");

    // Selected product for the expense detail modal
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [expenseModalVisible, setExpenseModalVisible] = useState(false);

    const handleOpenModal = useCallback(() => {
        setModalFromDate(selectedFromDate);
        setModalToDate(selectedToDate);
        setModalVisible(true);
    }, [selectedFromDate, selectedToDate]);

    const handleFromDateChange = useCallback(date => {
        if (date) setModalFromDate(date);
    }, []);

    const handleToDateChange = useCallback(date => {
        if (date) setModalToDate(date);
    }, []);

    const handleApplyFilter = useCallback(() => {
        const validFrom =
            modalFromDate > modalToDate ? modalToDate : modalFromDate;
        const validTo =
            modalToDate < modalFromDate ? modalFromDate : modalToDate;
        setSelectedFromDate(validFrom);
        setSelectedToDate(validTo);
        setModalVisible(false);
    }, [modalFromDate, modalToDate]);

    const handleCloseModal = useCallback(() => setModalVisible(false), []);

    // Tap handler: set selected product and open detail modal
    const handleProductPress = useCallback(item => {
        setSelectedProduct(item);
        setExpenseModalVisible(true);
    }, []);

    const handleCloseExpenseModal = useCallback(() => {
        setExpenseModalVisible(false);
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const godownId = await AsyncStorage.getItem("activeGodown");
                if (godownId) setIsActiveGoDown(godownId);
            } catch (err) {
                console.log("Error fetching data:", err);
            }
        })();
    }, []);

    // ── Stock in hand query ───────────────────────────────────────────────────
    const { data: godownStockData = [], isLoading } = useQuery({
        queryKey: ["godownStockInHand", selectedFromDate, selectedToDate],
        queryFn: () =>
            fetchGoDownStackInHand({
                from: selectedFromDate.toISOString().split("T")[0],
                to: selectedToDate.toISOString().split("T")[0],
            }),
        enabled: !!selectedFromDate && !!selectedToDate,
        select: data => {
            if (!isActiveGoDown) return data;
            return data.filter(
                item => String(item.Godown_Id) === String(isActiveGoDown),
            );
        },
    });

    // ── Expense detail query — lazy, fires only when a product is selected ────
    const { data: godownExpenseData = [], isLoading: isExpenseLoading } =
        useQuery({
            queryKey: [
                "godownExpenseReport",
                selectedFromDate,
                selectedToDate,
                selectedProduct?.Product_Id,
                selectedProduct?.Godown_Id,
            ],
            queryFn: () =>
                fetchGoDownExpenseReport({
                    from: selectedFromDate.toISOString().split("T")[0],
                    to: selectedToDate.toISOString().split("T")[0],
                    productId: selectedProduct?.Product_Id ?? "",
                    goDownId: selectedProduct?.Godown_Id ?? isActiveGoDown ?? "",
                }),
            enabled:
                !!selectedProduct &&
                !!selectedFromDate &&
                !!selectedToDate &&
                expenseModalVisible,
        });

    // ── Unique brands for filter chips ────────────────────────────────────────
    const brands = useMemo(() => {
        const set = new Set(godownStockData.map(i => i.Brand || "Others"));
        return ["All", ...Array.from(set).sort()];
    }, [godownStockData]);

    // ── Filtered data ─────────────────────────────────────────────────────────
    const filteredData = useMemo(() => {
        let data = godownStockData;
        if (selectedBrand !== "All") {
            data = data.filter(i => (i.Brand || "Others") === selectedBrand);
        }
        return data;
    }, [godownStockData, selectedBrand]);

    const renderItem = useCallback(
        ({ item, index }) => (
            <StockCard
                item={item}
                index={index}
                onPress={handleProductPress}
            />
        ),
        [handleProductPress],
    );

    const keyExtractor = useCallback(
        item => `${item.Product_Id}-${item.Godown_Id}`,
        [],
    );

    const ListHeader = (
        <Fragment>
            {/* Brand filter chips */}
            {brands.length > 1 && (
                <FlatList
                    data={brands}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={b => b}
                    contentContainerStyle={styles.chipRow}
                    renderItem={({ item: brand }) => (
                        <TouchableOpacity
                            style={[
                                styles.chip,
                                selectedBrand === brand && styles.chipActive,
                            ]}
                            onPress={() => setSelectedBrand(brand)}
                            activeOpacity={0.75}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    selectedBrand === brand &&
                                        styles.chipTextActive,
                                ]}
                            >
                                {brand}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* Result count */}
            <View style={styles.resultCountRow}>
                <Text style={styles.resultCountText}>
                    {filteredData.length}{" "}
                    {filteredData.length === 1 ? "item" : "items"}
                </Text>
            </View>
        </Fragment>
    );

    const ListEmpty = (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
                <FeatherIcon
                    name="inbox"
                    size={iconSizes.xxl}
                    color={customColors.grey300}
                />
            </View>
            <Text style={styles.emptyTitle}>No Stock Data</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Stock In Hand"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialIcon"
                rightIconName="filter-list"
                onRightPress={handleOpenModal}
            />

            <FilterModal
                visible={modalVisible}
                fromDate={modalFromDate}
                toDate={modalToDate}
                onFromDateChange={handleFromDateChange}
                onToDateChange={handleToDateChange}
                onApply={handleApplyFilter}
                onClose={handleCloseModal}
                showToDate={true}
                title="Filter options"
                fromLabel="From Date"
                toLabel="To Date"
            />

            {/* Expense Detail Bottom Sheet */}
            <ExpenseModal
                visible={expenseModalVisible}
                product={selectedProduct}
                data={godownExpenseData}
                isLoading={isExpenseLoading}
                onClose={handleCloseExpenseModal}
            />

            <View style={styles.contentContainer}>
                {isLoading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator
                            size="large"
                            color={customColors.primary}
                        />
                        <Text style={styles.loaderText}>
                            Loading stock data…
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredData}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        ListHeaderComponent={ListHeader}
                        ListEmptyComponent={ListEmpty}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={10}
                        maxToRenderPerBatch={15}
                        windowSize={10}
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

export default StockInHand;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.grey50,
    },
    listContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xl,
    },

    // Brand Chips
    chipRow: {
        paddingVertical: spacing.sm,
        paddingRight: spacing.sm,
    },
    chip: {
        paddingHorizontal: moderateScale(14),
        paddingVertical: verticalScale(6),
        borderRadius: borderRadius.round,
        backgroundColor: customColors.white,
        marginRight: spacing.xs,
        borderWidth: 1,
        borderColor: customColors.divider,
        ...shadows.small,
    },
    chipActive: {
        backgroundColor: customColors.primaryDark,
        borderColor: customColors.primaryDark,
    },
    chipText: {
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(12),
        color: customColors.grey600,
    },
    chipTextActive: {
        color: customColors.white,
    },

    // Result count row
    resultCountRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.sm,
    },
    resultCountText: {
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(12),
        color: customColors.grey500,
    },

    // Stock Card
    stockCard: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.sm,
        ...shadows.medium,
        overflow: "hidden",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.xs,
        paddingTop: moderateScale(14),
        paddingHorizontal: moderateScale(14),
    },
    brandBadge: {
        backgroundColor: customColors.primaryFaded,
        paddingHorizontal: moderateScale(10),
        paddingVertical: verticalScale(3),
        borderRadius: borderRadius.round,
    },
    brandText: {
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(10),
        color: customColors.primaryDark,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    stockBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: moderateScale(8),
        paddingVertical: verticalScale(3),
        borderRadius: borderRadius.round,
        borderWidth: 1,
    },
    stockDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    stockBadgeText: {
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(10),
    },
    productName: {
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(13),
        color: customColors.grey900,
        lineHeight: responsiveFontSize(19),
        marginBottom: spacing.xxs,
        paddingHorizontal: moderateScale(14),
    },
    godownName: {
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(11),
        color: customColors.grey400,
        marginBottom: spacing.sm,
        paddingHorizontal: moderateScale(14),
    },
    divider: {
        height: 1,
        backgroundColor: customColors.grey100,
        marginBottom: spacing.sm,
    },

    // Stats grid inside card
    statsGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: spacing.sm,
        paddingHorizontal: moderateScale(14),
    },
    statCell: {
        flex: 1,
        alignItems: "center",
        paddingVertical: verticalScale(6),
    },
    statValue: {
        fontFamily: customFonts.poppinsBold,
        fontSize: responsiveFontSize(16),
        lineHeight: responsiveFontSize(22),
    },
    statLabel: {
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(9),
        color: customColors.grey400,
        textAlign: "center",
        marginTop: 2,
    },

    // Footer row
    cardFooterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: customColors.grey50,
        paddingHorizontal: moderateScale(14),
        paddingVertical: verticalScale(7),
        borderTopWidth: 1,
        borderTopColor: customColors.grey100,
    },
    actualQtyRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    actualQtyText: {
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(11),
        color: customColors.grey500,
    },
    actualQtyValue: {
        fontFamily: customFonts.poppinsSemiBold,
        color: customColors.grey700,
    },
    tapHint: {
        width: moderateScale(22),
        height: moderateScale(22),
        borderRadius: borderRadius.round,
        backgroundColor: customColors.primaryFaded,
        justifyContent: "center",
        alignItems: "center",
    },

    // Loader
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loaderText: {
        marginTop: spacing.sm,
        ...typography.body2(),
        color: customColors.grey500,
    },

    // Empty state
    emptyContainer: {
        alignItems: "center",
        paddingTop: verticalScale(80),
        paddingHorizontal: spacing.xl,
    },
    emptyIconWrap: {
        width: moderateScale(90),
        height: moderateScale(90),
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    emptyTitle: {
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(16),
        color: customColors.grey700,
    },
    emptySubtitle: {
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(13),
        color: customColors.grey500,
        textAlign: "center",
        marginTop: spacing.xs,
    },
});
