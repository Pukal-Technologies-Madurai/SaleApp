import React, { useMemo, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { customColors, typography, spacing, shadows, borderRadius, iconSizes } from "../../Config/helper";
import { SafeAreaView } from "react-native-safe-area-context";

const TAB_RETAILER = "retailer";
const TAB_PRODUCT = "product";

const TripDetails = ({ route, navigation }) => {
    const {
        tripNo,
        tripDate,
        invoiceNo,
        branchName,
        routeValue,
        retailers,
        deliveryPerson,
        productArray,
        employeesInvolved,
    } = route.params;

    const [activeTab, setActiveTab] = useState(TAB_RETAILER);
    const [filterType, setFilterType] = useState(null);
    const [selectedBrand, setSelectedBrand] = useState(null);

    // Format time in 12-hour format
    const formatTime = timeString => {
        if (!timeString) return "—";
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return "—";
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    // Determine payment category from Payment_Mode, Payment_Ref_No, Payment_Status
    const getPaymentCategory = (retailer) => {
        const refNo = (retailer.paymentRefNo || "").toUpperCase();
        const mode = Number(retailer.paymentMode);
        const status = Number(retailer.paymentStatus);

        if (refNo.includes("PARTIAL")) return "partial";
        if (mode === 3 || refNo === "CREDIT") return "credit";
        if (mode === 1 && refNo === "CASH") return "cash";
        if (refNo === "GPAY" || refNo.startsWith("GPAY")) return "online";
        if (status === 3) return "cash";
        return "pending";
    };

    // Parse partial amount from Payment_Ref_No like "GPAY-PARTIAL-1000"
    const getPartialAmount = (refNo) => {
        if (!refNo) return null;
        const match = refNo.toUpperCase().match(/PARTIAL[- ]?(\d+)/);
        return match ? Number(match[1]) : null;
    };

    // Payment summaries
    const paymentSummary = useMemo(() => {
        const summary = {
            totalAmount: 0,
            cashAmount: 0,
            onlineAmount: 0,
            creditAmount: 0,
            partialAmount: 0,
            pendingAmount: 0,
            cashCount: 0,
            onlineCount: 0,
            creditCount: 0,
            partialCount: 0,
            pendingCount: 0,
        };

        retailers.forEach(retailer => {
            const amount = Number(retailer.orderValue) || 0;
            summary.totalAmount += amount;
            const category = getPaymentCategory(retailer);

            switch (category) {
                case "cash":
                    summary.cashAmount += amount;
                    summary.cashCount++;
                    break;
                case "online":
                    summary.onlineAmount += amount;
                    summary.onlineCount++;
                    break;
                case "credit":
                    summary.creditAmount += amount;
                    summary.creditCount++;
                    break;
                case "partial":
                    summary.partialAmount += amount;
                    summary.partialCount++;
                    break;
                default:
                    summary.pendingAmount += amount;
                    summary.pendingCount++;
                    break;
            }
        });

        return summary;
    }, [retailers]);

    // Filter retailers based on selected payment type
    const filteredRetailers = useMemo(() => {
        if (!filterType) return retailers;

        return retailers.filter(retailer => {
            const category = getPaymentCategory(retailer);
            switch (filterType) {
                case "cash":
                    return category === "cash";
                case "online":
                    return category === "online";
                case "credit":
                    return category === "credit";
                case "partial":
                    return category === "partial";
                case "returns":
                    return Number(retailer.deliveryStatus) === 6;
                default:
                    return true;
            }
        });
    }, [retailers, filterType]);

    // Build brand-wise consolidated product data
    const brandConsolidatedData = useMemo(() => {
        const brandMap = new Map();

        // Iterate through all retailers and their products
        const allRetailers = retailers || [];
        allRetailers.forEach(retailer => {
            (retailer.products || []).forEach(product => {
                const brandId = product.Pos_Brand_Id;
                const brandName = product.POS_Brand_Name || "Unknown Brand";
                const key = `${brandId}_${brandName}`;

                if (!brandMap.has(key)) {
                    brandMap.set(key, {
                        brandId,
                        brandName,
                        products: new Map(),
                        totalQty: 0,
                        totalAmount: 0,
                    });
                }

                const brand = brandMap.get(key);
                const itemId = product.Item_Id;

                if (!brand.products.has(itemId)) {
                    brand.products.set(itemId, {
                        itemId: product.Item_Id,
                        productName: product.Product_Name,
                        hsnCode: product.HSN_Code,
                        itemRate: product.Item_Rate,
                        taxRate: product.Tax_Rate,
                        totalQty: 0,
                        totalAmount: 0,
                        taxableAmount: 0,
                        cgstTotal: 0,
                        sgstTotal: 0,
                    });
                }

                const productEntry = brand.products.get(itemId);
                productEntry.totalQty += product.Bill_Qty || 0;
                productEntry.totalAmount += product.Final_Amo || 0;
                productEntry.taxableAmount += product.Taxable_Amount || 0;
                productEntry.cgstTotal += product.Cgst_Amo || 0;
                productEntry.sgstTotal += product.Sgst_Amo || 0;

                brand.totalQty += product.Bill_Qty || 0;
                brand.totalAmount += product.Final_Amo || 0;
            });
        });

        // Convert maps to arrays
        const result = Array.from(brandMap.values()).map(brand => ({
            ...brand,
            products: Array.from(brand.products.values()),
        }));

        return result;
    }, [retailers]);

    // Get all available brands for filter chips
    const availableBrands = useMemo(() => {
        return brandConsolidatedData.map(b => ({
            id: b.brandId,
            name: b.brandName,
        }));
    }, [brandConsolidatedData]);

    // Filtered brand data
    const filteredBrandData = useMemo(() => {
        if (!selectedBrand) return brandConsolidatedData;
        return brandConsolidatedData.filter(b => b.brandId === selectedBrand);
    }, [brandConsolidatedData, selectedBrand]);

    // Grand totals for product report
    const grandTotals = useMemo(() => {
        const data = filteredBrandData;
        return {
            totalQty: data.reduce((sum, b) => sum + b.totalQty, 0),
            totalAmount: data.reduce((sum, b) => sum + b.totalAmount, 0),
        };
    }, [filteredBrandData]);

    const handleSummaryCardTap = type => {
        setFilterType(filterType === type ? null : type);
    };

    const getDeliveryStatusInfo = (status) => {
        const s = Number(status);
        if (s === 7) return { label: "Delivered", color: customColors.success, bg: customColors.successFaded, icon: "check-circle" };
        if (s === 6) return { label: "Return", color: customColors.error, bg: customColors.errorFaded, icon: "replay" };
        return { label: "Pending", color: customColors.warning, bg: customColors.warningFaded, icon: "schedule" };
    };

    const getPaymentStatusInfo = (retailer) => {
        const category = getPaymentCategory(retailer);
        const partialAmt = getPartialAmount(retailer.paymentRefNo);

        switch (category) {
            case "cash":
                return { label: "Cash", color: customColors.success, bg: customColors.successFaded, icon: "payments" };
            case "online":
                return { label: "Online", color: customColors.infoDark, bg: customColors.infoFaded, icon: "phone-android" };
            case "credit":
                return { label: "Credit", color: customColors.warningDark, bg: customColors.warningFaded, icon: "credit-card" };
            case "partial":
                return {
                    label: partialAmt ? `Partial ₹${partialAmt}` : "Partial",
                    color: customColors.secondaryDark,
                    bg: customColors.secondaryFaded,
                    icon: "toll",
                };
            default:
                return { label: "Pending", color: customColors.grey600, bg: customColors.grey100, icon: "schedule" };
        }
    };

    // ─── Retailer Report Item ─────────────────────────────────────────
    const renderRetailerItem = useCallback(({ item, index }) => {
        const deliveryInfo = getDeliveryStatusInfo(item.deliveryStatus);
        const paymentInfo = getPaymentStatusInfo(item);

        return (
            <View style={styles.retailerCard}>
                {/* Retailer Header */}
                <View style={styles.retailerHeader}>
                    <View style={styles.retailerIndex}>
                        <Text style={styles.retailerIndexText}>{index + 1}</Text>
                    </View>
                    <View style={styles.retailerHeaderInfo}>
                        <Text style={styles.retailerName} numberOfLines={1}>
                            {item.retailerName || item.name}
                        </Text>
                        <Text style={styles.retailerSoNo}>SO: {item.id}</Text>
                    </View>
                </View>

                {/* Details Grid */}
                <View style={styles.retailerDetailsGrid}>
                    {/* Delivery Time */}
                    <View style={styles.retailerDetailItem}>
                        <Icon name="access-time" size={iconSizes.xs} color={customColors.grey500} />
                        <Text style={styles.retailerDetailLabel}>Time</Text>
                        <Text style={styles.retailerDetailValue}>
                            {formatTime(item.deliveryTime)}
                        </Text>
                    </View>

                    {/* Order Value */}
                    <View style={styles.retailerDetailItem}>
                        <Icon name="currency-rupee" size={iconSizes.xs} color={customColors.grey500} />
                        <Text style={styles.retailerDetailLabel}>Value</Text>
                        <Text style={[styles.retailerDetailValue, { color: customColors.primary, fontWeight: "700" }]}>
                            ₹{(item.orderValue || 0).toFixed(2)}
                        </Text>
                    </View>

                    {/* Delivery Status */}
                    <View style={styles.retailerDetailItem}>
                        <Icon name={deliveryInfo.icon} size={iconSizes.xs} color={deliveryInfo.color} />
                        <Text style={styles.retailerDetailLabel}>Delivery</Text>
                        <View style={[styles.statusBadge, { backgroundColor: deliveryInfo.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: deliveryInfo.color }]}>
                                {deliveryInfo.label}
                            </Text>
                        </View>
                    </View>

                    {/* Payment Status */}
                    <View style={styles.retailerDetailItem}>
                        <Icon name={paymentInfo.icon} size={iconSizes.xs} color={paymentInfo.color} />
                        <Text style={styles.retailerDetailLabel}>Payment</Text>
                        <View style={[styles.statusBadge, { backgroundColor: paymentInfo.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: paymentInfo.color }]}>
                                {paymentInfo.label}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    }, []);

    // ─── Brand Product Report Section ─────────────────────────────────
    const renderBrandSection = useCallback(({ item: brand }) => {
        return (
            <View style={styles.brandSection}>
                {/* Brand Header */}
                <View style={styles.brandHeader}>
                    <View style={styles.brandNameContainer}>
                        <Icon name="inventory-2" size={iconSizes.sm} color={customColors.primary} />
                        <Text style={styles.brandName}>{brand.brandName}</Text>
                    </View>
                    <View style={styles.brandTotalBadge}>
                        <Text style={styles.brandTotalText}>
                            ₹{brand.totalAmount.toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* Product Table Header */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 2.5 }]}>Product</Text>
                    <Text style={[styles.tableHeaderText, { flex: 0.7, textAlign: "center" }]}>Qty</Text>
                    <Text style={[styles.tableHeaderText, { flex: 0.7, textAlign: "center" }]}>Rate</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Amount</Text>
                </View>

                {/* Product Rows */}
                {brand.products.map((product, idx) => (
                    <View
                        key={`${product.itemId}-${idx}`}
                        style={[
                            styles.tableRow,
                            idx % 2 === 0 && { backgroundColor: customColors.grey50 },
                        ]}
                    >
                        <View style={{ flex: 2.5 }}>
                            <Text style={styles.productNameText} numberOfLines={2}>
                                {product.productName}
                            </Text>
                            <Text style={styles.hsnText}>HSN: {product.hsnCode}</Text>
                        </View>
                        <Text style={[styles.tableRowText, { flex: 0.7, textAlign: "center" }]}>
                            {product.totalQty}
                        </Text>
                        <Text style={[styles.tableRowText, { flex: 0.7, textAlign: "center" }]}>
                            ₹{product.itemRate}
                        </Text>
                        <Text style={[styles.tableRowText, { flex: 1, textAlign: "right", fontWeight: "600" }]}>
                            ₹{product.totalAmount.toFixed(2)}
                        </Text>
                    </View>
                ))}

                {/* Brand Subtotal */}
                <View style={styles.brandSubtotal}>
                    <Text style={styles.brandSubtotalLabel}>
                        Subtotal ({brand.products.length} items, {brand.totalQty} qty)
                    </Text>
                    <Text style={styles.brandSubtotalValue}>
                        ₹{brand.totalAmount.toFixed(2)}
                    </Text>
                </View>
            </View>
        );
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <View style={styles.overlay}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Icon
                            name="arrow-back"
                            size={iconSizes.md}
                            color={customColors.white}
                        />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerText}>
                            Trip #{tripNo}
                        </Text>
                        <Text style={styles.headerSubtext}>
                            {new Date(tripDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })}
                            {invoiceNo ? ` • ${invoiceNo}` : ""}
                        </Text>
                    </View>
                </View>

                <View style={styles.content}>
                    {/* Route & Delivery Person Info */}
                    <View style={styles.tripInfoContainer}>
                        {routeValue ? (
                            <View style={styles.routeBadge}>
                                <Icon name="route" size={iconSizes.xs} color={customColors.white} />
                                <Text style={styles.routeText}>Route {routeValue}</Text>
                            </View>
                        ) : null}
                        <View style={styles.deliveryPersonInfo}>
                            <Icon
                                name="person"
                                size={iconSizes.sm}
                                color={customColors.primary}
                            />
                            <Text style={styles.deliveryPersonText}>
                                {deliveryPerson.name}
                            </Text>
                        </View>
                    </View>

                    {/* Payment Summary Cards */}
                    <View style={styles.summaryContainer}>
                        <TouchableOpacity
                            style={[
                                styles.summaryCard,
                                { backgroundColor: customColors.primary },
                                filterType === null && styles.selectedCard,
                            ]}
                            onPress={() => handleSummaryCardTap(null)}
                        >
                            <Text style={styles.summaryTitle}>Total</Text>
                            <Text style={styles.summaryAmount}>
                                ₹{paymentSummary.totalAmount.toFixed(0)}
                            </Text>
                            <Text style={styles.summaryCount}>
                                {retailers.length} Orders
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.summaryCard,
                                { backgroundColor: customColors.success },
                                filterType === "cash" && styles.selectedCard,
                            ]}
                            onPress={() => handleSummaryCardTap("cash")}
                        >
                            <Text style={styles.summaryTitle}>Cash</Text>
                            <Text style={styles.summaryAmount}>
                                ₹{paymentSummary.cashAmount.toFixed(0)}
                            </Text>
                            <Text style={styles.summaryCount}>
                                {paymentSummary.cashCount} Orders
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.summaryCard,
                                { backgroundColor: customColors.infoDark },
                                filterType === "online" && styles.selectedCard,
                            ]}
                            onPress={() => handleSummaryCardTap("online")}
                        >
                            <Text style={styles.summaryTitle}>Online</Text>
                            <Text style={styles.summaryAmount}>
                                ₹{paymentSummary.onlineAmount.toFixed(0)}
                            </Text>
                            <Text style={styles.summaryCount}>
                                {paymentSummary.onlineCount} Orders
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.summaryCard,
                                { backgroundColor: customColors.warning },
                                filterType === "credit" && styles.selectedCard,
                            ]}
                            onPress={() => handleSummaryCardTap("credit")}
                        >
                            <Text style={styles.summaryTitle}>Credit</Text>
                            <Text style={styles.summaryAmount}>
                                ₹{paymentSummary.creditAmount.toFixed(0)}
                            </Text>
                            <Text style={styles.summaryCount}>
                                {paymentSummary.creditCount} Orders
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Filter indicator */}
                    {filterType && (
                        <View style={styles.filterIndicator}>
                            <Text style={styles.filterText}>
                                Showing{" "}
                                {filterType === "cash"
                                    ? "Cash"
                                    : filterType === "online"
                                        ? "Online (GPay)"
                                        : filterType === "credit"
                                            ? "Credit"
                                            : filterType === "partial"
                                                ? "Partial Payment"
                                                : "Pending"}{" "}
                                Orders
                            </Text>
                            <TouchableOpacity
                                style={styles.clearFilter}
                                onPress={() => setFilterType(null)}
                            >
                                <Icon name="close" size={iconSizes.sm} color={customColors.warning} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Tab Switcher */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === TAB_RETAILER && styles.activeTab,
                            ]}
                            onPress={() => setActiveTab(TAB_RETAILER)}
                        >
                            <Icon
                                name="store"
                                size={iconSizes.sm}
                                color={activeTab === TAB_RETAILER ? customColors.primary : customColors.grey500}
                            />
                            <Text
                                style={[
                                    styles.tabText,
                                    activeTab === TAB_RETAILER && styles.activeTabText,
                                ]}
                            >
                                Retailer Report
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === TAB_PRODUCT && styles.activeTab,
                            ]}
                            onPress={() => setActiveTab(TAB_PRODUCT)}
                        >
                            <Icon
                                name="inventory"
                                size={iconSizes.sm}
                                color={activeTab === TAB_PRODUCT ? customColors.primary : customColors.grey500}
                            />
                            <Text
                                style={[
                                    styles.tabText,
                                    activeTab === TAB_PRODUCT && styles.activeTabText,
                                ]}
                            >
                                Product Report
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tab Content */}
                    {activeTab === TAB_RETAILER ? (
                        <FlatList
                            data={filteredRetailers}
                            renderItem={renderRetailerItem}
                            keyExtractor={item => `${item.id}-${item.doId || item.name}`}
                            contentContainerStyle={styles.listContainer}
                        />
                    ) : (
                        <FlatList
                            data={filteredBrandData}
                            renderItem={renderBrandSection}
                            keyExtractor={item => `brand-${item.brandId}`}
                            contentContainerStyle={styles.listContainer}
                            ListHeaderComponent={
                                /* Brand Filter Chips */
                                availableBrands.length > 1 ? (
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.brandChipsScroll}
                                        contentContainerStyle={styles.brandChipsContainer}
                                    >
                                        <TouchableOpacity
                                            style={[
                                                styles.brandChip,
                                                !selectedBrand && styles.brandChipActive,
                                            ]}
                                            onPress={() => setSelectedBrand(null)}
                                        >
                                            <Text
                                                style={[
                                                    styles.brandChipText,
                                                    !selectedBrand && styles.brandChipTextActive,
                                                ]}
                                            >
                                                All Brands
                                            </Text>
                                        </TouchableOpacity>
                                        {availableBrands.map(brand => (
                                            <TouchableOpacity
                                                key={brand.id}
                                                style={[
                                                    styles.brandChip,
                                                    selectedBrand === brand.id && styles.brandChipActive,
                                                ]}
                                                onPress={() =>
                                                    setSelectedBrand(
                                                        selectedBrand === brand.id ? null : brand.id,
                                                    )
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.brandChipText,
                                                        selectedBrand === brand.id && styles.brandChipTextActive,
                                                    ]}
                                                >
                                                    {brand.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                ) : null
                            }
                            ListFooterComponent={
                                /* Grand Total */
                                filteredBrandData.length > 0 ? (
                                    <View style={styles.grandTotalContainer}>
                                        <View style={styles.grandTotalRow}>
                                            <Text style={styles.grandTotalLabel}>Grand Total</Text>
                                            <View style={styles.grandTotalValues}>
                                                <Text style={styles.grandTotalQty}>
                                                    {grandTotals.totalQty} Qty
                                                </Text>
                                                <Text style={styles.grandTotalAmount}>
                                                    ₹{grandTotals.totalAmount.toFixed(2)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ) : null
                            }
                        />
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    overlay: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.primaryDark,
    },
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.md,
    },
    backButton: {
        padding: spacing.xxs,
    },
    headerInfo: {
        marginLeft: spacing.sm,
        flex: 1,
    },
    headerText: {
        ...typography.h5(),
        color: customColors.white,
        fontWeight: "700",
    },
    headerSubtext: {
        ...typography.caption(),
        color: customColors.primaryLight,
        marginTop: 2,
    },
    content: {
        flex: 1,
        backgroundColor: customColors.white,
        overflow: "hidden",
    },

    // Trip Info
    tripInfoContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.md,
        paddingBottom: spacing.sm,
        gap: spacing.sm,
    },
    routeBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.md,
        gap: spacing.xxs,
    },
    routeText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "700",
    },
    deliveryPersonInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    deliveryPersonText: {
        ...typography.body2(),
        color: customColors.primary,
        marginLeft: spacing.sm,
        fontWeight: "600",
    },

    // Summary Cards
    summaryContainer: {
        flexDirection: "row",
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
        gap: spacing.sm,
    },
    summaryCard: {
        flex: 1,
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
        alignItems: "center",
        justifyContent: "center",
    },
    summaryTitle: {
        ...typography.caption(),
        color: customColors.white,
        marginBottom: 2,
        opacity: 0.9,
    },
    summaryAmount: {
        ...typography.subtitle2(),
        color: customColors.white,
        fontWeight: "700",
    },
    summaryCount: {
        ...typography.caption(),
        color: customColors.white,
        marginTop: 2,
        opacity: 0.8,
        fontSize: 10,
    },
    selectedCard: {
        borderWidth: 2,
        borderColor: customColors.white,
    },

    // Filter
    filterIndicator: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xxs,
        backgroundColor: customColors.warningFaded,
    },
    filterText: {
        ...typography.caption(),
        color: customColors.warningDark,
        fontWeight: "600",
    },
    clearFilter: {
        padding: spacing.xxs,
    },

    // Tabs
    tabContainer: {
        flexDirection: "row",
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        backgroundColor: customColors.grey100,
        borderRadius: borderRadius.lg,
        padding: 3,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        gap: spacing.xxs,
    },
    activeTab: {
        backgroundColor: customColors.white,
        ...shadows.small,
    },
    tabText: {
        ...typography.caption(),
        color: customColors.grey500,
        fontWeight: "600",
    },
    activeTabText: {
        color: customColors.primary,
    },

    // List
    listContainer: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },

    // ─── Retailer Card ───
    retailerCard: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: customColors.grey200,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    retailerHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    retailerIndex: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: customColors.primaryFaded,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.sm,
    },
    retailerIndexText: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "700",
    },
    retailerHeaderInfo: {
        flex: 1,
    },
    retailerName: {
        ...typography.subtitle2(),
        color: customColors.textPrimary,
        fontWeight: "700",
    },
    retailerSoNo: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: 1,
    },
    retailerDetailsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    retailerDetailItem: {
        width: "50%",
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.xxs,
        gap: spacing.xxs,
    },
    retailerDetailLabel: {
        ...typography.caption(),
        color: customColors.grey500,
        fontSize: 10,
    },
    retailerDetailValue: {
        ...typography.caption(),
        color: customColors.textPrimary,
        fontWeight: "600",
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    statusBadgeText: {
        ...typography.caption(),
        fontWeight: "700",
        fontSize: 10,
    },

    // ─── Brand Product Report ───
    brandSection: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: customColors.grey200,
        marginBottom: spacing.md,
        overflow: "hidden",
    },
    brandHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: spacing.md,
        backgroundColor: customColors.primaryFaded,
    },
    brandNameContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    brandName: {
        ...typography.subtitle2(),
        color: customColors.primary,
        fontWeight: "700",
    },
    brandTotalBadge: {
        backgroundColor: customColors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.md,
    },
    brandTotalText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "700",
    },
    tableHeader: {
        flexDirection: "row",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: customColors.grey100,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    tableHeaderText: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "700",
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: "row",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        alignItems: "center",
        borderBottomWidth: 0.5,
        borderBottomColor: customColors.grey100,
    },
    productNameText: {
        ...typography.caption(),
        color: customColors.textPrimary,
        fontWeight: "500",
    },
    hsnText: {
        ...typography.caption(),
        color: customColors.grey400,
        fontSize: 9,
        marginTop: 1,
    },
    tableRowText: {
        ...typography.caption(),
        color: customColors.textPrimary,
    },
    brandSubtotal: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: customColors.grey50,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    brandSubtotalLabel: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "600",
    },
    brandSubtotalValue: {
        ...typography.subtitle2(),
        color: customColors.primary,
        fontWeight: "700",
    },

    // Brand Chips
    brandChipsScroll: {
        marginBottom: spacing.sm,
    },
    brandChipsContainer: {
        gap: spacing.sm,
        paddingVertical: spacing.xxs,
    },
    brandChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.xl,
        backgroundColor: customColors.grey100,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    brandChipActive: {
        backgroundColor: customColors.primaryFaded,
        borderColor: customColors.primary,
    },
    brandChipText: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "600",
    },
    brandChipTextActive: {
        color: customColors.primary,
    },

    // Grand Total
    grandTotalContainer: {
        marginTop: spacing.sm,
        backgroundColor: customColors.primaryDark,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    grandTotalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    grandTotalLabel: {
        ...typography.subtitle2(),
        color: customColors.white,
        fontWeight: "700",
    },
    grandTotalValues: {
        alignItems: "flex-end",
    },
    grandTotalQty: {
        ...typography.caption(),
        color: customColors.primaryLight,
    },
    grandTotalAmount: {
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "700",
    },
});

export default TripDetails;
