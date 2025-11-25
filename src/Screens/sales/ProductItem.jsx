import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import FeatherIcon from "react-native-vector-icons/Feather";
import { useOrderStore } from "../../stores/orderStore";
import { customColors, spacing, typography } from "../../Config/helper";

const ProductItem = React.memo(({ product }) => {
    const orderItems = useOrderStore(state => state.orderItems);
    const setItem = useOrderStore(state => state.setItem);
    const updateItem = useOrderStore(state => state.updateItem);
    const removeItem = useOrderStore(state => state.removeItem);

    const existingItem = orderItems[product.Product_Id];

    const [qtyInput, setQtyInput] = useState(
        existingItem?.qty?.toString() || ""
    );

    const [rateInput, setRateInput] = useState(
        existingItem?.rate?.toString() || product.Product_Rate.toString()
    );

    const handleQtyChange = useCallback((text) => {
        setQtyInput(text);

        // Parse the quantity
        const qty = parseFloat(text) || 0;
        const rate = parseFloat(rateInput) || product.Product_Rate;

        if (qty <= 0) {
            // Remove item if quantity is 0 or invalid
            removeItem(product.Product_Id);
        } else {
            // Add or update item
            if (existingItem) {
                updateItem(product.Product_Id, { qty });
            } else {
                setItem(product.Product_Id, {
                    Product_Id: product.Product_Id,
                    Product_Name: product.Product_Name,
                    rate: rate,
                    qty,
                    packWeight: parseFloat(product.PackGet || 0),
                });
            }
        }
    }, [product, existingItem, setItem, updateItem, removeItem, rateInput]);

    const handleRateChange = useCallback((text) => {
        setRateInput(text);

        // Parse the rate
        const rate = parseFloat(text) || 0;
        const qty = parseFloat(qtyInput) || 0;

        // Only update if there's an existing item with quantity
        if (existingItem && qty > 0) {
            updateItem(product.Product_Id, { rate });
        } else if (qty > 0) {
            // Create new item if quantity exists
            setItem(product.Product_Id, {
                Product_Id: product.Product_Id,
                Product_Name: product.Product_Name,
                rate: rate || product.Product_Rate,
                qty,
                packWeight: parseFloat(product.PackGet || 0),
            });
        }
    }, [product, existingItem, setItem, updateItem, qtyInput]);

    const handleIncrement = useCallback(() => {
        const currentQty = parseFloat(qtyInput) || 0;
        const newQty = currentQty + 1;
        handleQtyChange(newQty.toString());
    }, [qtyInput, handleQtyChange]);

    const handleDecrement = useCallback(() => {
        const currentQty = parseFloat(qtyInput) || 0;
        if (currentQty > 0) {
            const newQty = Math.max(0, currentQty - 1);
            handleQtyChange(newQty.toString());
        }
    }, [qtyInput, handleQtyChange]);

    const calculateTotal = useCallback(() => {
        const qty = parseFloat(qtyInput) || 0;
        const rate = parseFloat(rateInput) || product.Product_Rate;
        const packWeight = parseFloat(product.PackGet || 0);
        const totalWeight = qty * packWeight;
        return totalWeight * rate;
    }, [qtyInput, rateInput, product]);

    const resetToOriginalPrice = useCallback(() => {
        const originalRate = product.Product_Rate.toString();
        setRateInput(originalRate);
        handleRateChange(originalRate);
    }, [product.Product_Rate, handleRateChange]);

    const isSelected = existingItem && existingItem.qty > 0;
    const isPriceModified = parseFloat(rateInput) !== product.Product_Rate;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                        {product.Short_Name || product.Product_Name}
                    </Text>
                </View>
                <View style={styles.priceSection}>
                    <Text style={styles.price}>
                        ₹{product.Product_Rate.toFixed(2)}/{product.Units}
                    </Text>
                    <Text style={styles.bagsPerTon}>
                        {product.BagsPerTon} bags
                    </Text>
                </View>
            </View>

            <View style={styles.itemModifiers}>
                {/* Quantity Control */}
                <View style={styles.quantitySection}>
                    <Text style={styles.quantityLabel}>Quantity ({product.Units}):</Text>
                    <View style={styles.quantityControls}>
                        <TouchableOpacity
                            style={[styles.quantityButton, styles.decrementButton]}
                            onPress={handleDecrement}
                            activeOpacity={0.7}
                        >
                            <FeatherIcon name="minus" size={16} color={customColors.white} />
                        </TouchableOpacity>

                        <TextInput
                            style={styles.quantityInput}
                            value={qtyInput}
                            onChangeText={handleQtyChange}
                            placeholder="0"
                            keyboardType="numeric"
                            selectTextOnFocus
                        />

                        <TouchableOpacity
                            style={[styles.quantityButton, styles.incrementButton]}
                            onPress={handleIncrement}
                            activeOpacity={0.7}
                        >
                            <FeatherIcon name="plus" size={16} color={customColors.white} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quantity Control */}
                <View style={styles.quantitySection}>
                    <Text style={styles.quantityLabel}>Rate Per ({product.Units}):</Text>
                    <View style={styles.quantityControls}>
                        <TextInput
                            style={[
                                styles.rateInput,
                                isPriceModified && styles.rateInputModified
                            ]}
                            value={rateInput}
                            onChangeText={handleRateChange}
                            placeholder={product.Product_Rate.toString()}
                            keyboardType="numeric"
                            autoCapitalize="none"
                            textAlign="center"
                            autoFocus={false}
                            selectTextOnFocus={false}
                        />
                    </View>
                </View>
            </View>

            {/* Total Amount */}
            {isSelected && (
                <View style={styles.totalSection}>
                    <Text style={styles.totalLabel}>Total: </Text>
                    <Text style={styles.totalAmount}>
                        ₹{calculateTotal().toFixed(2)}
                    </Text>
                </View>
            )}
        </View>
    );
});

export default ProductItem;

const styles = StyleSheet.create({
    container: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        marginHorizontal: spacing.md,
        marginVertical: spacing.xs,
        borderWidth: 1,
        borderColor: customColors.grey200,
        shadowColor: customColors.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 2,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: spacing.sm,
    },
    productInfo: {
        flex: 1,
        marginRight: spacing.sm,
    },
    productName: {
        ...typography.h6(),
        color: customColors.dark,
        fontWeight: "600",
        marginBottom: spacing.xs,
    },
    priceSection: {
        alignItems: "flex-end",
    },
    price: {
        ...typography.h6(),
        color: customColors.success,
        fontWeight: "700",
    },
    bagsPerTon: {
        ...typography.caption(),
        color: customColors.primary,
        marginTop: spacing.xs / 2,
    },
    itemModifiers: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    quantitySection: {
        marginBottom: spacing.sm,
    },
    quantityLabel: {
        ...typography.body2(),
        color: customColors.dark,
        fontWeight: "500",
        marginBottom: spacing.xs,
    },
    quantityControls: {
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
    },
    quantityButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    decrementButton: {
        backgroundColor: customColors.error,
    },
    incrementButton: {
        backgroundColor: customColors.success,
    },
    quantityInput: {
        ...typography.h6(),
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginHorizontal: spacing.sm,
        minWidth: 80,
        textAlign: "center",
        backgroundColor: customColors.white,
        color: customColors.dark,
        fontWeight: "600",
    },
    rateInput: {
        ...typography.h6(),
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minWidth: 100,
        textAlign: "center",
        backgroundColor: customColors.white,
        color: customColors.dark,
        fontWeight: "600",
        flex: 1,
        marginRight: spacing.sm,
    },
    rateInputModified: {
        borderColor: customColors.warning,
        backgroundColor: customColors.warning + "10",
    },

    totalSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    totalLabel: {
        ...typography.body1(),
        color: customColors.dark,
        fontWeight: "500",
    },
    totalAmount: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "700",
    },
});