import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { customColors, shadows, spacing, typography } from '../../Config/helper';

const ProductItem = React.memo(({
    product,
    orderItem,
    onRateChange,
    onQtyChange,
    onAddToOrder,
    onRemoveFromOrder,
    styles
}) => {
    const [rateValue, setRateValue] = useState('');
    const [qtyValue, setQtyValue] = useState('');
    const rateTimeoutRef = useRef(null);
    const qtyTimeoutRef = useRef(null);

    const isInOrder = orderItem && orderItem.qty > 0;
    const totalWeight = isInOrder ? (orderItem.qty * parseFloat(product.PackGet || 0)) : 0;
    const totalAmount = isInOrder ? (totalWeight * (orderItem.rate || product.Item_Rate || 0)) : 0;
    const bagQty = product.CL_Qty / (parseFloat(product.PackGet) || 1);

    // Initialize values
    useEffect(() => {
        const initialRate = isInOrder && orderItem.rateText !== undefined ? orderItem.rateText :
            (isInOrder ? orderItem.rate.toString() : (product.Item_Rate || '').toString());
        const initialQty = isInOrder && orderItem.qtyText !== undefined ? orderItem.qtyText :
            (isInOrder ? orderItem.qty.toString() : "0");

        setRateValue(initialRate);
        setQtyValue(initialQty);
    }, [orderItem, product, isInOrder]);

    const handleRateChange = useCallback((text) => {
        setRateValue(text);

        if (rateTimeoutRef.current) {
            clearTimeout(rateTimeoutRef.current);
        }

        rateTimeoutRef.current = setTimeout(() => {
            onRateChange(text, product.Product_Id, 'rate');
        }, 150);
    }, [onRateChange, product.Product_Id]);

    const handleQtyChange = useCallback((text) => {
        setQtyValue(text);

        if (qtyTimeoutRef.current) {
            clearTimeout(qtyTimeoutRef.current);
        }

        qtyTimeoutRef.current = setTimeout(() => {
            onQtyChange(text, product.Product_Id, 'qty');
        }, 150);
    }, [onQtyChange, product.Product_Id]);

    const handleActionPress = useCallback(() => {
        if (isInOrder) {
            onRemoveFromOrder(product.Product_Id);
        } else {
            onAddToOrder(product);
        }
    }, [isInOrder, product, onAddToOrder, onRemoveFromOrder]);

    useEffect(() => {
        return () => {
            if (rateTimeoutRef.current) clearTimeout(rateTimeoutRef.current);
            if (qtyTimeoutRef.current) clearTimeout(qtyTimeoutRef.current);
        };
    }, []);

    return (
        <View style={styles.productCard}>
            <View style={styles.productHeader}>
                <View style={styles.productDetails}>
                    <Text style={styles.productName} numberOfLines={2}>
                        {product.Short_Name || product.Product_Name}
                    </Text>
                    <View style={styles.productMeta}>
                        <Text style={styles.productUnits}>
                            {product.PackGet} {product.Units}
                        </Text>
                        <Text style={[styles.stockIndicator, product.CL_Qty > 0 ? styles.inStock : styles.outOfStock]}>
                            {bagQty === 0 ? "Out of Stock" : `${bagQty.toFixed(2)} Bags`}
                        </Text>
                    </View>
                    <Text style={styles.baseRate}>
                        Base Rate: ₹{(product.Item_Rate || 0).toFixed(2)} per {product.Units}
                    </Text>
                </View>
            </View>

            <View style={styles.inputSection}>
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Rate per {product.Units}</Text>
                    <View style={styles.inputWrapper}>
                        <Text style={styles.currencySymbol}>₹</Text>
                        <TextInput
                            style={styles.rateInput}
                            value={rateValue}
                            onChangeText={handleRateChange}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor={customColors.grey500}
                            selectTextOnFocus={true}
                            blurOnSubmit={false}
                            returnKeyType="done"
                            autoCorrect={false}
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bags</Text>
                    <View style={styles.quantityContainer}>
                        <TextInput
                            style={styles.quantityInput}
                            value={qtyValue}
                            onChangeText={handleQtyChange}
                            keyboardType="decimal-pad"
                            textAlign="center"
                            placeholder="0"
                            placeholderTextColor={customColors.grey500}
                            selectTextOnFocus={true}
                            blurOnSubmit={false}
                            returnKeyType="done"
                            autoCorrect={false}
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </View>
                </View>
            </View>

            <View style={styles.actionSection}>
                {isInOrder && (
                    <View style={styles.totalSection}>
                        <Text style={styles.totalLabel}>Grand Total</Text>
                        <Text style={styles.totalAmount}>
                            ₹{totalAmount.toFixed(2)}
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.actionButton, isInOrder ? styles.removeButton : styles.addButton]}
                    onPress={handleActionPress}
                >
                    <Text style={[
                        styles.actionButtonText,
                        isInOrder ? styles.removeButtonText : styles.addButtonText
                    ]}>{isInOrder ? "Remove" : "Add to Cart"}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

export default ProductItem;