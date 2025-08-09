import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/AntDesign";
import { customColors, typography } from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import { fetchProducts } from "../../Api/product";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import FormField from "../../Components/FormField";
import { SafeAreaView } from "react-native-safe-area-context";

const EditSaleOrder = ({ route }) => {
    const navigation = useNavigation();
    const { item } = route.params;
    console.log("item", item);

    const initialStockValue = {
        So_Id: item.So_Id,
        Company_Id: item.Company_Id,
        ST_Date: new Date().toISOString().split("T")[0],
        Branch_Id: item.Branch_Id,
        Retailer_Id: item.Retailer_Id,
        Retailer_Name: item.Retailer_Name,
        Narration: item.Narration,
        Created_by: item.Created_by,
        VoucherType: item.VoucherType,
        Product_Array: item.Products_List,
        Sales_Person_Id: item.Sales_Person_Id,
    };
    const [uID, setUID] = useState();
    const [stockInputValue, setStockInputValue] = useState(initialStockValue);
    const [quantities, setQuantities] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [total, setTotal] = useState(0);

    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedProductGroup, setSelectedProductGroup] = useState(null);
    const [filteredProducts, setFilteredProducts] = useState([]);

    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);

    useEffect(() => {
        const initialize = async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                setUID(userId);

                if (item.Products_List && item.Products_List.length > 0) {
                    const initialQuantities = item.Products_List.map(
                        product => ({
                            Item_Id: product.Item_Id.toString(),
                            Bill_Qty: product.Bill_Qty.toString(),
                            Item_Rate: product.Item_Rate.toString(),
                            Amount: product.Amount,
                        }),
                    );
                    setQuantities(initialQuantities);

                    const initialTotal = initialQuantities.reduce(
                        (sum, product) => {
                            return sum + (parseFloat(product.Amount) || 0);
                        },
                        0,
                    );
                    setTotal(initialTotal);
                }
            } catch (err) {
                console.log(err);
            }
        };

        initialize();
    }, [item.Products_List]);

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
            if (!data)
                return {
                    productData: [],
                    brandData: [],
                    productGroupData: [],
                };
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
                productData: data || [],
                brandData: brands,
                productGroupData: productGroups,
            };
        },
    });

    const handleQuantityChange = (productId, value, rate) => {
        const updatedQuantities = [...quantities];
        const productIndex = updatedQuantities.findIndex(
            item => item.Item_Id === productId,
        );

        if (productIndex !== -1) {
            updatedQuantities[productIndex].Bill_Qty = value;
            if (rate) {
                updatedQuantities[productIndex].Item_Rate = rate;
            }
        } else {
            updatedQuantities.push({
                Item_Id: productId,
                Bill_Qty: value,
                Item_Rate: rate || "",
            });
        }
        setQuantities(updatedQuantities);
    };

    const handleRateChange = (productId, rate, qty) => {
        const updatedQuantities = [...quantities];
        const productIndex = updatedQuantities.findIndex(
            item => item.Item_Id === productId,
        );

        if (productIndex !== -1) {
            updatedQuantities[productIndex].Item_Rate = rate;
            updatedQuantities[productIndex].Bill_Qty =
                qty || updatedQuantities[productIndex].Bill_Qty;
        } else {
            updatedQuantities.push({
                Item_Id: productId,
                Bill_Qty: qty || "0",
                Item_Rate: rate,
            });
        }
        setQuantities(updatedQuantities);
    };

    useEffect(() => {
        let newTotal = 0;
        quantities.forEach(item => {
            const qty = parseFloat(item.Bill_Qty) || 0;
            const rate = parseFloat(item.Item_Rate) || 0;
            newTotal += qty * rate;
        });
        setTotal(isNaN(newTotal) ? 0 : newTotal);
    }, [quantities]);

    const handlePreview = () => {
        setModalVisible(true);
    };

    useEffect(() => {
        if (productQueryData?.productData) {
            setFilteredProducts(
                productQueryData.productData.filter(product => {
                    const matchesBrand =
                        !selectedBrand || product.Brand_Name === selectedBrand;
                    const matchesGroup =
                        !selectedProductGroup ||
                        product.Pro_Group === selectedProductGroup;
                    return matchesBrand && matchesGroup;
                }),
            );
        }
    }, [selectedBrand, selectedProductGroup, productQueryData?.productData]);

    const handleVisitLog = async () => {
        const formData = new FormData();
        formData.append("Mode", 1);
        formData.append("Retailer_Id", stockInputValue.Retailer_Id);
        formData.append("Latitude", 0);
        formData.append("Longitude", 0);
        formData.append("Narration", "The sales order has been updated.");
        formData.append("EntryBy", stockInputValue.Created_by);

        try {
            const response = await fetch(API.visitedLog(), {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Network response was not ok: ${errorText}`);
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

    const handleSubmit = async () => {
        handleVisitLog();
        if (quantities.length <= 0) {
            Alert.alert(
                "Error",
                "Please select a retailer and enter product quantities.",
            );
            return;
        }

        const orderProducts = quantities.filter(
            q => parseFloat(q.Bill_Qty) > 0,
        );

        if (orderProducts.length <= 0) {
            Alert.alert("Error", "Enter at least one product quantity.");
            return;
        }

        const orderDetails = {
            ...stockInputValue,
            Product_Array: orderProducts,
        };

        // console.log("Final order details:", orderDetails);

        try {
            const method = "PUT";
            const response = await fetch(`${API.saleOrder()}`, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(orderDetails),
            });

            const data = await response.json();
            // console.log('post data', data)

            if (data.success) {
                ToastAndroid.show(data.message, ToastAndroid.LONG);
                // Alert.alert("Success", data.message);
                setStockInputValue(initialStockValue);
                setQuantities([]);
                setModalVisible(false);
            } else {
                Alert.alert("Error", data.message);
            }
        } catch (err) {
            console.log(err);
            Alert.alert("Error", err);
        }
    };

    function handleImagePress(imageUrl) {
        setCurrentImage(imageUrl);
        setImageModalVisible(true);
    }

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Edit Order"
                navigation={navigation}
                showRightIcon={true}
                rightIconName="update"
                rightIconLibrary="MaterialCommunityIcons"
                onRightPress={handlePreview}
            />
            <View style={styles.backgroundImage}>
                <View style={styles.contentContainer}>
                    <Text style={styles.retailerName}>
                        {item.Retailer_Name}
                    </Text>

                    <View style={styles.dropdownsContainer}>
                        <EnhancedDropdown
                            data={productQueryData.brandData}
                            labelField="label"
                            valueField="value"
                            placeholder="Select Brand"
                            value={selectedBrand}
                            onChange={item => {
                                setSelectedBrand(item.value);
                            }}
                            containerStyle={styles.dropdown}
                        />

                        <EnhancedDropdown
                            data={productQueryData.productGroupData}
                            labelField="label"
                            valueField="value"
                            placeholder="Select Product Group"
                            value={selectedProductGroup}
                            onChange={item => {
                                setSelectedProductGroup(item.value);
                            }}
                            containerStyle={styles.dropdown}
                        />
                    </View>

                    <ScrollView style={styles.productsContainer}>
                        {filteredProducts.map((product, index) => {
                            const existingQuantity = quantities.find(
                                q =>
                                    q.Item_Id === product.Product_Id.toString(),
                            );
                            return (
                                <View key={index} style={styles.productCard}>
                                    <View style={styles.productRow}>
                                        <TouchableOpacity
                                            style={styles.productImage}
                                            onPress={() =>
                                                handleImagePress(
                                                    product.productImageUrl,
                                                )
                                            }>
                                            <Image
                                                style={styles.image}
                                                source={{
                                                    uri: product.productImageUrl,
                                                }}
                                            />
                                        </TouchableOpacity>
                                        <View style={styles.productDetails}>
                                            <Text style={styles.productName}>
                                                {product.Product_Name}
                                            </Text>
                                            <Text style={styles.productSubText}>
                                                {product.Units || "N/A"}
                                            </Text>
                                            <FormField
                                                value={
                                                    existingQuantity?.Bill_Qty ||
                                                    ""
                                                }
                                                onChangeText={text =>
                                                    handleQuantityChange(
                                                        product.Product_Id,
                                                        text,
                                                        existingQuantity?.Item_Rate ||
                                                            product.Item_Rate,
                                                    )
                                                }
                                                placeholder="Quantity"
                                                numbersOnly={true}
                                            />
                                            <FormField
                                                value={
                                                    existingQuantity?.Item_Rate ||
                                                    product.Item_Rate.toString()
                                                }
                                                onChangeText={text =>
                                                    handleRateChange(
                                                        product.Product_Id,
                                                        text,
                                                    )
                                                }
                                                placeholder="Rate"
                                                numbersOnly={true}
                                            />
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>

                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => {
                            setModalVisible(!modalVisible);
                        }}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>
                                    Order Summary
                                </Text>
                                <Text>{stockInputValue.Retailer_Name}</Text>
                                <ScrollView style={styles.tableContainer}>
                                    <View style={styles.tableHeader}>
                                        <Text
                                            style={
                                                styles.headerModalTexts
                                            }></Text>
                                        <Text style={styles.headerModalTexts}>
                                            Qty
                                        </Text>
                                        <Text style={styles.headerModalTexts}>
                                            Rate
                                        </Text>
                                        <Text style={styles.headerModalTexts}>
                                            Amount
                                        </Text>
                                    </View>
                                    {filteredProducts.map((product, index) => {
                                        const quantityObj = quantities.find(
                                            item =>
                                                item.Item_Id ===
                                                product.Product_Id,
                                        );
                                        if (
                                            quantityObj &&
                                            parseFloat(quantityObj.Bill_Qty) > 0
                                        ) {
                                            const qty = parseFloat(
                                                quantityObj.Bill_Qty,
                                            );
                                            const rate =
                                                parseFloat(
                                                    quantityObj.Item_Rate,
                                                ) || 0;
                                            const amount = qty * rate;
                                            return (
                                                <View
                                                    key={index}
                                                    style={styles.tableRow}>
                                                    <View>
                                                        <Image
                                                            style={{
                                                                width: 50,
                                                                height: 50,
                                                                flex: 1,
                                                            }}
                                                            source={{
                                                                uri: product.productImageUrl,
                                                            }}
                                                        />
                                                        <Text
                                                            numberOfLines={3}
                                                            ellipsizeMode="tail"
                                                            style={{
                                                                width: 90,
                                                            }}>
                                                            {product
                                                                .Product_Name
                                                                .length > 20
                                                                ? product.Product_Name.substring(
                                                                      0,
                                                                      17,
                                                                  ) + "..."
                                                                : product.Product_Name}
                                                        </Text>
                                                    </View>
                                                    <Text
                                                        style={styles.rowText}>
                                                        {qty}
                                                    </Text>
                                                    <Text
                                                        style={styles.rowText}>
                                                        {rate}
                                                    </Text>
                                                    <Text
                                                        style={styles.rowText}>
                                                        {amount.toFixed(2)}
                                                    </Text>
                                                </View>
                                            );
                                        }
                                        return null;
                                    })}
                                </ScrollView>
                                <View style={styles.totalContainer}>
                                    <Text style={styles.totalText}>
                                        Total Amount: ₹{total.toFixed(2)}/-
                                    </Text>
                                </View>
                                <TextInput
                                    maxFontSizeMultiplier={1.2}
                                    style={styles.narrationContainerInputText}
                                    placeholder="Narration"
                                    onChangeText={text =>
                                        setStockInputValue({
                                            ...stockInputValue,
                                            Narration: text,
                                        })
                                    }
                                />
                                <View style={styles.modalButtonContainer}>
                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={handleSubmit}>
                                        <Text style={styles.closeButtonText}>
                                            Submit
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={() =>
                                            setModalVisible(!modalVisible)
                                        }>
                                        <Text style={styles.closeButtonText}>
                                            Close
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={isImageModalVisible}
                        onRequestClose={() => setImageModalVisible(false)}>
                        <View
                            style={{
                                flex: 1,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "rgba(0, 0, 0, 0.8)",
                            }}>
                            <TouchableOpacity
                                onPress={() => setImageModalVisible(false)}
                                style={{
                                    position: "absolute",
                                    top: 40,
                                    right: 20,
                                }}>
                                <Icon name="close" size={30} color="#fff" />
                            </TouchableOpacity>
                            <Image
                                source={{ uri: currentImage }}
                                style={{
                                    width: "90%",
                                    height: "80%",
                                    resizeMode: "contain",
                                }}
                            />
                        </View>
                    </Modal>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default EditSaleOrder;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
        alignItems: "center",
    },
    contentContainer: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.white,
        borderRadius: 7.5,
    },
    retailerName: {
        ...typography.h5(),
        fontWeight: "bold",
        padding: 15,
    },
    dropdownsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 10,
        marginBottom: 15,
    },
    dropdown: {
        flex: 1,
        marginHorizontal: 5,
    },
    productsContainer: {
        flex: 1,
        padding: 10,
    },
    productCard: {
        backgroundColor: customColors.white,
        borderRadius: 10,
        marginBottom: 10,
        padding: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
    },
    productRow: {
        flexDirection: "row",
    },
    productImage: {
        width: "40%",
        aspectRatio: 1,
    },
    image: {
        width: "100%",
        height: "100%",
        borderRadius: 8,
        resizeMode: "contain",
    },
    productDetails: {
        flex: 1,
        marginLeft: 10,
    },
    productName: {
        ...typography.body1(),
        fontWeight: "bold",
        marginBottom: 4,
    },
    productSubText: {
        ...typography.body2(),
        fontWeight: "500",
        marginBottom: 10,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderColor: customColors.background,
    },
    modalContent: {
        width: "90%",
        backgroundColor: customColors.white,
        padding: 20,
        borderRadius: 10,
    },
    modalTitle: {
        ...typography.h4(),
        fontWeight: "bold",
        marginBottom: 10,
    },
    tableContainer: {
        maxHeight: 300,
    },
    tableHeader: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
    },
    headerModalTexts: {
        flex: 1, // Equal width columns
        textAlign: "center",
        ...typography.body2(),
        fontWeight: "bold",
        padding: 10,
    },

    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    rowText: {
        flex: 1,
        textAlign: "center",
        ...typography.body2(),
        padding: 10,
    },
    totalContainer: {
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: "#ddd", // Light grey border for a subtle separation
        marginTop: 10,
        marginHorizontal: 10,
        backgroundColor: customColors.white,
        alignItems: "flex-end",
    },
    totalText: {
        ...typography.body1(),
        fontWeight: "bold",
    },
    narrationContainerInputText: {
        ...typography.h6(),
        borderWidth: 1,
        borderColor: "#a1a1a1",
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 15,
    },
    closeButton: {
        marginTop: 10,
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: customColors.secondary,
        borderRadius: 5,
    },
    closeButtonText: {
        ...typography.h6(),
        fontWeight: "700",
        color: customColors.black,
    },
    modalButtonContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginVertical: 15,
    },
});
