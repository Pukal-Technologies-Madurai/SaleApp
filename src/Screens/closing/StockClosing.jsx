import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/AntDesign";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import { fetchProducts, fetchRetailerClosingStock } from "../../Api/product";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import FormField from "../../Components/FormField";

const StockClosing = ({ route }) => {
    const navigation = useNavigation();
    const { item, isEdit } = route.params;
    const [uID, setUID] = useState(null);

    const initialStockValue = {
        Company_Id: item.Company_Id,
        ST_Date: new Date().toISOString().split("T")[0],
        Retailer_Id: item.Retailer_Id,
        Retailer_Name: item.Retailer_Name,
        Narration: "",
        Created_by: "",
        Product_Stock_List: [],
        ST_Id: "",
    };

    const [stockInputValue, setStockInputValue] = useState(initialStockValue);
    const [closingStockValues, setClosingStockValues] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);
    const [selectedBrand, setSelectedBrand] = useState("All");
    const [selectedProductGroup, setSelectedProductGroup] = useState("All");
    const [filteredProducts, setFilteredProducts] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                setUID(userId);
                setStockInputValue(prev => ({
                    ...prev,
                    Created_by: userId,
                }));
            } catch (err) {
                console.log(err);
            }
        })();
    }, [stockInputValue.ST_Date, stockInputValue.Retailer_Id]);

    const {
        data: productQueryData = {
            productData: [],
            brandData: [],
            productGroupData: [],
        },
    } = useQuery({
        queryKey: ["product", uID],
        queryFn: () => fetchProducts(uID),
        enabled: !!uID,
        select: data => {
            const brands = Array.from(
                new Set(data.map(item => item.Brand_Name)),
            )
                .filter(brand => brand)
                .sort()
                .map(brand => ({
                    label: brand,
                    value: brand,
                }));

            const productGroups = Array.from(
                new Set(data.map(item => item.Pro_Group)),
            )
                .filter(group => group)
                .sort()
                .map(group => ({
                    label: group,
                    value: group,
                }));

            return {
                productData: data,
                brandData: brands,
                productGroupData: productGroups,
            };
        },
    });

    const productData = productQueryData.productData || [];
    const brandData = productQueryData.brandData || [];
    const productGroupData = productQueryData.productGroupData || [];

    useEffect(() => {
        if (productData.length > 0) {
            let filtered = productData;

            if (selectedBrand !== "All") {
                filtered = filtered.filter(
                    product => product.Brand_Name === selectedBrand,
                );
            }

            if (selectedProductGroup !== "All") {
                filtered = filtered.filter(
                    product => product.Pro_Group === selectedProductGroup,
                );
            }

            setFilteredProducts(filtered);
        }
    }, [selectedBrand, selectedProductGroup, productData]);

    const { data: productClosingData = [] } = useQuery({
        queryKey: ["productClosingData", item.Retailer_Id],
        queryFn: () => fetchRetailerClosingStock(item.Retailer_Id),
        enabled: !!item.Retailer_Id,
    });

    const getStockCount = productId => {
        const mergedData = productClosingData.filter(
            item => Number(item.Item_Id) === Number(productId),
        );
        if (
            mergedData.length > 0 &&
            mergedData[0].Previous_Balance !== undefined
        ) {
            return {
                previousBalance: mergedData[0].Previous_Balance,
                hasPreviousBalance: mergedData[0].Previous_Balance > 0,
            };
        }
        return {
            previousBalance: 0,
            hasPreviousBalance: false,
        };
    };

    const getLastClosingStock = productId => {
        if (!productClosingData || !productClosingData[0]?.ProductCount)
            return null;

        const lastClosing = productClosingData[0].ProductCount.find(
            item => Number(item.Item_Id) === Number(productId),
        );

        if (lastClosing) {
            return {
                quantity: lastClosing.ST_Qty,
                date: new Date(lastClosing.LT_CL_Date).toLocaleDateString(),
            };
        }
        return null;
    };

    const handleStockInputChange = (productId, value) => {
        const updatedStockIndex = closingStockValues.findIndex(
            item => Number(item.Product_Id) === Number(productId),
        );

        if (updatedStockIndex !== -1) {
            const updatedValues = [...closingStockValues];
            updatedValues[updatedStockIndex] = {
                ...updatedValues[updatedStockIndex],
                ST_Qty: Number(value),
            };
            setClosingStockValues(updatedValues);
        } else {
            setClosingStockValues(prevValues => [
                ...prevValues,
                {
                    Product_Id: Number(productId),
                    ST_Qty: Number(value),
                },
            ]);
        }
    };

    const handleSubmit = async () => {
        const formData = new FormData();
        formData.append("Mode", 1);
        formData.append("Retailer_Id", stockInputValue.Retailer_Id);
        formData.append("Latitude", 0);
        formData.append("Longitude", 0);
        formData.append("Narration", "The stock entry has been updated.");
        formData.append("EntryBy", stockInputValue.Created_by);

        try {
            const response = await fetch(API.visitedLog(), {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Network response was not ok`);
            }

            const data = await response.json();
            if (data.success) {
                ToastAndroid.show(data.message, ToastAndroid.LONG);
                navigation.navigate("HomeScreen");
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            ToastAndroid.show("Error submitting form", ToastAndroid.LONG);
            console.error("Error submitting form:", err);
        }
    };

    const postClosingStock = async () => {
        if (closingStockValues.length > 0 && stockInputValue.Retailer_Id) {
            try {
                const response = await fetch(API.closingStock(), {
                    method: isEdit ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ...stockInputValue,
                        Product_Stock_List: closingStockValues,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        ToastAndroid.show(data.message, ToastAndroid.LONG);
                        navigation.navigate("HomeScreen");
                    } else {
                        ToastAndroid.show(data.message, ToastAndroid.LONG);
                    }
                } else {
                    throw new Error("Network response was not ok.");
                }
            } catch (e) {
                console.error(e);
                ToastAndroid.show(
                    "Failed to post stock data: " + e.message,
                    ToastAndroid.LONG,
                );
            }
        } else {
            ToastAndroid.show(
                "Please enter at least one valid stock value",
                ToastAndroid.LONG,
            );
        }
    };

    const handleUpdatePress = () => {
        setModalVisible(true);
    };

    const handleModalSubmit = () => {
        setModalVisible(false);
        handleSubmit();
        postClosingStock();
    };

    const handleImagePress = imageUrl => {
        setCurrentImage(imageUrl);
        setImageModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <AppHeader
                title="Closing Stock"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialCommunityIcons"
                rightIconName="update"
                onRightPress={handleUpdatePress}
            />

            <View style={styles.contentContainer}>
                <View style={styles.retailerInfo}>
                    <Icon name="user" size={22} color={customColors.primary} />
                    <Text style={styles.retailerLabel}>
                        {item.Retailer_Name}
                    </Text>
                </View>

                <View style={styles.filterContainer}>
                    <EnhancedDropdown
                        data={[{ label: "All", value: "All" }, ...brandData]}
                        labelField="label"
                        valueField="value"
                        placeholder="Select Brand"
                        value={selectedBrand}
                        onChange={item => setSelectedBrand(item.value)}
                    />

                    <EnhancedDropdown
                        data={[
                            { label: "All", value: "All" },
                            ...productGroupData,
                        ]}
                        labelField="label"
                        valueField="value"
                        placeholder="Select Product Group"
                        value={selectedProductGroup}
                        onChange={item => setSelectedProductGroup(item.value)}
                    />
                </View>

                <ScrollView style={styles.scrollView}>
                    {filteredProducts.map((product, index) => {
                        const stockCount = getStockCount(product.Product_Id);
                        return (
                            <View key={index} style={styles.productCard}>
                                <View style={styles.productImageContainer}>
                                    <TouchableOpacity
                                        onPress={() =>
                                            handleImagePress(
                                                product.productImageUrl,
                                            )
                                        }>
                                        <Image
                                            style={styles.productImage}
                                            source={{
                                                uri: product.productImageUrl,
                                            }}
                                        />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.productDetails}>
                                    <Text style={styles.productName}>
                                        {product.Product_Name}
                                    </Text>
                                    <Text style={styles.productInfo}>
                                        {product.Pro_Group || "N/A"}
                                    </Text>
                                    {getLastClosingStock(
                                        product.Product_Id,
                                    ) && (
                                        <View
                                            style={styles.lastClosingContainer}>
                                            <Text
                                                style={styles.lastClosingText}>
                                                Last Closing:{" "}
                                                {
                                                    getLastClosingStock(
                                                        product.Product_Id,
                                                    ).quantity
                                                }
                                            </Text>
                                            <Text
                                                style={styles.lastClosingDate}>
                                                Date:{" "}
                                                {
                                                    getLastClosingStock(
                                                        product.Product_Id,
                                                    ).date
                                                }
                                            </Text>
                                        </View>
                                    )}
                                    <FormField
                                        value={(
                                            closingStockValues.find(
                                                item =>
                                                    Number(item?.Product_Id) ===
                                                    Number(product?.Product_Id),
                                            )?.ST_Qty || ""
                                        ).toString()}
                                        onChangeText={text =>
                                            handleStockInputChange(
                                                product.Product_Id,
                                                text,
                                            )
                                        }
                                        placeholder="Enter Closing Stock"
                                        // numbersOnly={true}
                                    />
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Confirmation</Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={styles.modalCloseButton}>
                                <Icon
                                    name="close"
                                    size={24}
                                    color={customColors.grey500}
                                />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalScroll}>
                            {closingStockValues.map((stock, index) => {
                                const product = productData.find(
                                    p =>
                                        Number(p.Product_Id) ===
                                        Number(stock.Product_Id),
                                );
                                return (
                                    <View
                                        key={index}
                                        style={styles.confirmItem}>
                                        <Text style={styles.confirmText}>
                                            {product?.Product_Name}
                                        </Text>
                                        <Text style={styles.quantityText}>
                                            Qty: {stock.ST_Qty}
                                        </Text>
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <FormField
                                value={stockInputValue.Narration}
                                onChangeText={text =>
                                    setStockInputValue(prev => ({
                                        ...prev,
                                        Narration: text,
                                    }))
                                }
                                placeholder="Enter Narration"
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[
                                        styles.modalButton,
                                        styles.modalButtonPrimary,
                                    ]}
                                    onPress={handleModalSubmit}>
                                    <Text style={styles.modalButtonTextPrimary}>
                                        Update
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.modalButton,
                                        styles.modalButtonSecondary,
                                    ]}
                                    onPress={() => setModalVisible(false)}>
                                    <Text
                                        style={styles.modalButtonTextSecondary}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="fade"
                transparent={true}
                visible={isImageModalVisible}
                onRequestClose={() => setImageModalVisible(false)}>
                <View style={styles.imageModalOverlay}>
                    <TouchableOpacity
                        onPress={() => setImageModalVisible(false)}
                        style={styles.closeButton}>
                        <Icon
                            name="close"
                            size={24}
                            color={customColors.white}
                        />
                    </TouchableOpacity>
                    <Image
                        source={{ uri: currentImage }}
                        style={styles.modalImage}
                    />
                </View>
            </Modal>
        </View>
    );
};

export default StockClosing;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 16,
    },
    retailerInfo: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey300,
        marginHorizontal: 16,
        marginBottom: 16,
    },
    retailerLabel: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "600",
        marginLeft: 8,
    },
    filterContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 12,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
    },
    productCard: {
        flexDirection: "row",
        backgroundColor: customColors.white,
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        elevation: 2,
        shadowColor: customColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: customColors.grey300,
    },
    productImageContainer: {
        width: "30%",
        aspectRatio: 1,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: customColors.background,
    },
    productImage: {
        width: "100%",
        height: "100%",
        resizeMode: "contain",
    },
    productDetails: {
        flex: 1,
        marginLeft: 12,
        justifyContent: "space-between",
    },
    productName: {
        ...typography.subtitle1(),
        color: customColors.text,
        marginBottom: 4,
    },
    productInfo: {
        ...typography.body2(),
        color: customColors.secondary,
        marginBottom: 8,
    },
    lastClosingContainer: {
        backgroundColor: customColors.background,
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
    },
    lastClosingText: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "500",
    },
    lastClosingDate: {
        ...typography.caption(),
        color: customColors.secondary,
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "90%",
        maxHeight: "80%",
        backgroundColor: customColors.white,
        borderRadius: 16,
        elevation: 5,
        shadowColor: customColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey300,
    },
    modalTitle: {
        ...typography.h6(),
        color: customColors.text,
        fontWeight: "600",
    },
    modalCloseButton: {
        padding: 4,
    },
    modalScroll: {
        padding: 16,
    },
    confirmItem: {
        backgroundColor: customColors.background,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: customColors.grey300,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    confirmText: {
        ...typography.body1(),
        color: customColors.text,
        flex: 1,
    },
    quantityText: {
        ...typography.subtitle2(),
        color: customColors.primary,
        fontWeight: "600",
        marginLeft: 8,
    },
    modalFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: customColors.grey300,
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 16,
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    modalButtonPrimary: {
        backgroundColor: customColors.primary,
    },
    modalButtonSecondary: {
        backgroundColor: customColors.white,
        borderWidth: 1,
        borderColor: customColors.grey300,
    },
    modalButtonTextPrimary: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
    modalButtonTextSecondary: {
        ...typography.button(),
        color: customColors.text,
        fontWeight: "600",
    },
    imageModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    closeButton: {
        position: "absolute",
        top: 40,
        right: 20,
        zIndex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: 20,
        padding: 8,
    },
    modalImage: {
        width: "90%",
        height: "80%",
        resizeMode: "contain",
    },
});
