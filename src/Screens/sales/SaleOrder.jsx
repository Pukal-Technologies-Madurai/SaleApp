import { Alert, Image, ImageBackground, Modal, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from "react-native"
import React, { useEffect, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import PagerView from "react-native-pager-view";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Dropdown } from "react-native-element-dropdown";
import Icon from "react-native-vector-icons/AntDesign";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import assetImages from "../../Config/Image";

const SaleOrder = ({ route }) => {
    const navigation = useNavigation();
    const pagerRef = useRef(null);

    const [selectedTab, setSelectedTab] = useState(0);
    const [productData, setProductData] = useState([])
    const initialStockValue = {
        So_Id: '',
        Company_Id: '',
        ST_Date: new Date().toISOString().split('T')[0],
        Branch_Id: '',
        Retailer_Id: '',
        Retailer_Name: '',
        Narration: '',
        Created_by: '',
        Product_Array: [],
        Sales_Person_Id: '',
    }
    const [stockInputValue, setStockInputValue] = useState(initialStockValue)
    const [retailers, setRetailers] = useState([])
    const [selectedRetail, setSelectedRetail] = useState(null);
    const [quantities, setQuantities] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [total, setTotal] = useState(0);
    const [isEdit, setIsEdit] = useState(false);
    const [saleOrderId, setSaleOrderId] = useState(null);

    const [productPacks, setProductPacks] = useState([])
    const [dropdownData, setDropdownData] = useState([])
    const [selectedProductGroup, setSelectedProductGroup] = useState(dropdownData[0]?.Pack_Id || 0);
    const [filteredProductData, setFilteredProductData] = useState([]);
    const [selectedProductPack, setSelectedProductPack] = useState(null);

    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);

    useEffect(() => {
        const initialize = async () => {
            try {
                const userId = await AsyncStorage.getItem('UserId');
                const branchId = await AsyncStorage.getItem('branchId');
                const companyId = await AsyncStorage.getItem('Company_Id');

                fetchRetailers(companyId);
                fetchGroupedproducts(companyId);
                fetchproductPacks(companyId)

                setStockInputValue(prev => ({
                    ...prev,
                    Created_by: userId,
                    Sales_Person_Id: userId,
                    Branch_Id: branchId,
                }));
            } catch (err) {
                console.log(err);
            }

            // Check if editing
            if (route.params?.isEdit && route.params?.item) {
                const { item } = route.params;
                setIsEdit(true);
                setSaleOrderId(item.Sales_Order_Id);
                setSelectedRetail(item.Retailer_Id);
                setStockInputValue({
                    So_Id: item.So_Id,
                    Company_Id: item.Company_Id,
                    ST_Date: new Date(item.So_Date).toISOString().split('T')[0],
                    Retailer_Id: item.Retailer_Id,
                    Retailer_Name: item.Retailer_Name,
                    Branch_Id: item.Branch_Id,
                    Narration: item.Narration,
                    Created_by: item.Created_by,
                    Product_Array: item.Products_List,
                    Sales_Person_Id: item.Sales_Person_Id,
                });
                setQuantities(item.Products_List.map(product => ({
                    Item_Id: product.Item_Id,
                    Bill_Qty: product.Bill_Qty.toString(),
                    Item_Rate: product.Item_Rate.toString(),
                })));
            }
        };

        initialize();
    }, [])

    const fetchRetailers = async (id) => {
        try {
            const response = await fetch(`${API.retailers}${id}`);
            const jsonData = await response.json();

            if (jsonData.success) {
                setRetailers(jsonData.data)
            }

        } catch (err) {
            console.error("Error fetching data:", err);
        }
    }

    const fetchGroupedproducts = async (id) => {
        fetch(`${API.groupedProducts}${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setProductData(data.data)
                    filterProductDataByPack(0, data.data)
                }
            }).catch(e => console.error(e))
    };

    const fetchproductPacks = async (id) => {
        try {
            const response = await fetch(`${API.productPacks}${id}`);
            const jsonData = await response.json();

            if (jsonData.success) {
                const dropdownOptions = [
                    { Pack: "All", Pack_Id: 0 },
                    ...jsonData.data.filter(pack => pack.Pack_Id !== 0)
                ];
                setDropdownData(dropdownOptions);
                const initialPackId = dropdownOptions[0]?.Pack_Id || 0;
                setSelectedProductGroup(initialPackId);
                filterProductDataByPack(initialPackId, productData);

                setProductPacks(jsonData.data);
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        }
    };

    const filterProductDataByPack = (packId, data) => {
        const filteredData = (data || productData).map(group => {
            const filteredGroup = {
                ...group,
                GroupedProductArray: group.GroupedProductArray.filter(product => product.Pack_Id === packId || packId === 0)
            };
            return filteredGroup.GroupedProductArray.length ? filteredGroup : null;
        }).filter(group => group !== null);

        // console.log("Filtered Data:", JSON.stringify(filteredData, null, 2)); // Debug log
        setFilteredProductData(filteredData);
    };

    const handlePackSelection = (packId) => {
        setSelectedProductPack(packId);
        filterProductDataByPack(packId);
    };

    const handleTabPress = (index) => {
        setSelectedTab(index);
        pagerRef.current.setPage(index);
    };

    const onPageSelected = (e) => {
        setSelectedTab(e.nativeEvent.position);
    };

    const handleQuantityChange = (productId, value, rate) => {
        const updatedQuantities = [...quantities];
        const productIndex = updatedQuantities.findIndex(item => item.Item_Id === productId);

        if (productIndex !== -1) {
            updatedQuantities[productIndex].Bill_Qty = value;
            updatedQuantities[productIndex].Item_Rate = rate;
        } else {
            updatedQuantities.push({
                Item_Id: productId,
                Bill_Qty: value,
                Item_Rate: rate,
            });
        }
        setQuantities(updatedQuantities);
    };

    function numberToWords(num) {
        const under20 = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
        const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        const thousand = ['thousand', 'million', 'billion'];

        if (num < 20) return under20[num];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 === 0 ? '' : ' ' + under20[num % 10]);
        if (num < 1000) return under20[Math.floor(num / 100)] + ' hundred' + (num % 100 === 0 ? '' : ' ' + numberToWords(num % 100));

        for (let i = 0; i < thousand.length; i++) {
            let decimal = Math.pow(1000, i + 1);
            if (num < decimal) {
                return numberToWords(Math.floor(num / Math.pow(1000, i))) + ' ' + thousand[i - 1] + (num % Math.pow(1000, i) === 0 ? '' : ' ' + numberToWords(num % Math.pow(1000, i)));
            }
        }
        return num;
    }

    useEffect(() => {
        let newTotal = 0;
        productData.forEach(group => {
            group.GroupedProductArray.forEach(product => {
                const quantityObj = quantities.find(item => item.Item_Id === product.Product_Id);
                if (quantityObj && quantityObj.Bill_Qty > 0) {
                    const qty = parseFloat(quantityObj.Bill_Qty);
                    const rate = parseFloat(quantityObj.Item_Rate) || 0;
                    newTotal += qty * rate;
                }
            });
        });
        setTotal(isNaN(newTotal) ? 0 : newTotal);
    }, [quantities, productData]);

    const handlePreview = () => {
        setModalVisible(true);
    };

    const handleVisitLog = async () => {
        const formData = new FormData();
        formData.append("Mode", 1);
        formData.append("Retailer_Id", stockInputValue.Retailer_Id);
        formData.append("Latitude", 0);
        formData.append("Longitude", 0);
        formData.append("Narration", "Sale Order Entry");
        formData.append("EntryBy", stockInputValue.Created_by);

        try {
            const response = await fetch(API.visitedLog, {
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
                navigation.navigate("HomeScreen")
            } else {
                throw new Error(data.message);
            }

        } catch (err) {
            ToastAndroid.show("Error submitting form", ToastAndroid.LONG);
            console.error("Error submitting form:", err);
        }
    };

    const handleSubmit = async () => {
        handleVisitLog()
        if (quantities.length <= 0 || !selectedRetail) {
            Alert.alert("Error", "Please select a retailer and enter product quantities.");
            return;
        }

        const orderProducts = quantities.filter(q => parseFloat(q.Bill_Qty) > 0);

        if (orderProducts.length <= 0) {
            Alert.alert("Error", "Enter at least one product quantity.");
            return;
        }

        const orderDetails = {
            ...stockInputValue,
            Product_Array: orderProducts
        };

        // console.log("Final order details:", orderDetails);

        try {
            const method = isEdit ? "PUT" : "POST";
            const response = await fetch(`${API.saleOrder}`, {
                method: method,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(orderDetails)
            });

            const data = await response.json();
            // console.log('post data', data)

            if (data.success) {
                ToastAndroid.show(data.message, ToastAndroid.LONG);
                // Alert.alert("Success", data.message);
                setStockInputValue(initialStockValue);
                setQuantities([]);
                setSelectedRetail(null);
                setModalVisible(false);
            } else {
                Alert.alert("Error", data.message);
            }
        } catch (err) {
            console.log(err)
            Alert.alert("Error", err);
        }
    }

    const handleImagePress = (imageUrl) => {
        setCurrentImage(imageUrl);
        setImageModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <ImageBackground source={assetImages.backgroundImage} style={styles.backgroundImage}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Image
                            source={assetImages.backArrow}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerText} maxFontSizeMultiplier={1.2}>Sale Order</Text>
                    <TouchableOpacity onPress={handlePreview}>
                        <Text style={{
                            textAlign: "center",
                            ...typography.body1(),
                            color: customColors.white
                        }}>
                            PREVIEW
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.contentContainer}>
                    <Dropdown
                        data={retailers}
                        labelField="Retailer_Name"
                        valueField="Retailer_Id"
                        placeholder="Select Retailer"
                        value={selectedRetail}
                        onChange={item => {
                            setSelectedRetail(item.Retailer_Id);
                            setStockInputValue(prevState => ({
                                ...prevState,
                                Retailer_Id: item.Retailer_Id,
                                Retailer_Name: item.Retailer_Name,
                                Company_Id: item.Company_Id,
                            }));
                        }}
                        maxHeight={300}
                        search
                        searchPlaceholder="Search Retailer"
                        style={styles.dropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                        inputSearchStyle={styles.inputSearchStyle}
                    />

                    <Dropdown
                        data={dropdownData}
                        labelField='Pack'
                        valueField="Pack_Id"
                        placeholder="Select Pack"
                        value={selectedProductGroup}
                        onChange={item => {
                            setSelectedProductGroup(item.Pack_Id);
                            handlePackSelection(item.Pack_Id);
                        }}
                        maxHeight={300}
                        style={styles.dropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                    />

                    <View style={{}}>
                        <ScrollView horizontal
                            contentContainerStyle={styles.tabContainer}
                            showsHorizontalScrollIndicator={true}
                        >
                            {filteredProductData.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.tabButton,
                                        selectedTab === index
                                        && styles.activeTab
                                    ]}
                                    onPress={() => handleTabPress(index)}
                                >
                                    <Text style={{
                                        ...typography.h6(),
                                        fontWeight: "bold",
                                    }}>{item.Pro_Group}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <ScrollView>
                            <PagerView
                                style={{ marginTop: 15, height: 1500 }}
                                initialPage={selectedTab}
                                ref={pagerRef}
                                onPageSelected={onPageSelected}
                            >


                                {filteredProductData.map((group, groupIndex) => (
                                    <View key={groupIndex}>
                                        {group.GroupedProductArray.map((product, pIndex) => (
                                            <View key={pIndex} style={styles.pagerViewContainer}>
                                                <View style={{ flexDirection: 'row', }}>
                                                    <TouchableOpacity style={{
                                                        width: "50%",
                                                        height: 100,
                                                        aspectRatio: 1
                                                    }} onPress={() => handleImagePress(product.productImageUrl)}>
                                                        <Image
                                                            style={{
                                                                width: "100%",
                                                                height: "100%",
                                                                borderRadius: 8,
                                                                marginRight: 10,
                                                                resizeMode: 'contain'
                                                            }}
                                                            source={{ uri: product.productImageUrl }}
                                                        />
                                                    </TouchableOpacity>
                                                    <View style={styles.card}>
                                                        <Text style={styles.pagerViewContainerText}>{product.Product_Name}</Text>
                                                        <Text style={styles.pagerViewContainerSubText}>{product.UOM}</Text>
                                                        <TextInput
                                                            style={styles.pagerViewContainerInputText}
                                                            onChangeText={(text) =>
                                                                handleQuantityChange(product.Product_Id, text, product.Item_Rate)
                                                            }
                                                            value={
                                                                quantities.find(item => item.Item_Id === product.Product_Id)?.Bill_Qty || ''
                                                            }
                                                            placeholder="Quantity"
                                                            keyboardType='number-pad'
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ))
                                }

                            </PagerView>
                        </ScrollView>

                        <Modal
                            animationType="slide"
                            transparent={true}
                            visible={modalVisible}
                            onRequestClose={() => {
                                setModalVisible(!modalVisible);
                            }}
                        >
                            <View style={styles.modalOverlay}>
                                <View style={styles.modalContent}>
                                    <Text style={styles.modalTitle}>Order Summary</Text>
                                    <Text>{stockInputValue.Retailer_Name}</Text>
                                    <ScrollView style={styles.tableContainer}>
                                        <View style={styles.tableHeader}>
                                            <Text style={styles.headerModalTexts}></Text>
                                            <Text style={styles.headerModalTexts}>Qty</Text>
                                            <Text style={styles.headerModalTexts}>Rate</Text>
                                            <Text style={styles.headerModalTexts}>Amount</Text>
                                        </View>
                                        {productData.map((group, groupIndex) => (
                                            group.GroupedProductArray.map((product, pIndex) => {
                                                const truncate = (str, maxLength) => {
                                                    return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
                                                };

                                                const quantityObj = quantities.find(item => item.Item_Id === product.Product_Id);
                                                if (quantityObj && quantityObj.Bill_Qty > 0) {
                                                    // console.log(product.Product_Name)
                                                    const qty = quantityObj.Bill_Qty;
                                                    const rate = quantityObj.Item_Rate || 0;
                                                    const amount = qty * rate;
                                                    return (
                                                        <View key={pIndex} style={styles.tableRow}>

                                                            <View>
                                                                <Image
                                                                    style={{
                                                                        width: 50,
                                                                        height: 50,
                                                                        flex: 1,
                                                                    }}
                                                                    source={{ uri: product.productImageUrl }}

                                                                />
                                                                <Text numberOfLines={3} ellipsizeMode="tail" style={{
                                                                    width: 90,
                                                                }}>
                                                                    {truncate(product.Product_Name, 20)}
                                                                </Text>
                                                            </View>

                                                            <Text style={styles.rowText}>{qty}</Text>
                                                            {/* <Text style={styles.rowText}>{product.UOM}</Text> */}
                                                            <Text style={styles.rowText}>{rate}</Text>
                                                            <Text style={styles.rowText}>{amount.toFixed(2)}</Text>
                                                        </View>
                                                    );
                                                }
                                            })
                                        ))}
                                    </ScrollView>
                                    <View style={styles.totalContainer}>
                                        <Text style={styles.totalText}>Total Amount: ₹{total.toFixed(2)}/-</Text>
                                        <Text style={styles.totalText}>In Words: {numberToWords(total)} only.</Text>
                                    </View>
                                    <TextInput
                                        maxFontSizeMultiplier={1.2}
                                        style={styles.narrationContainerInputText}
                                        placeholder='Narration'
                                        onChangeText={(text) => setStockInputValue({ ...stockInputValue, Narration: text })}
                                    />
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 15 }}>
                                        <TouchableOpacity
                                            style={styles.closeButton}
                                            onPress={handleSubmit}
                                        >
                                            <Text style={styles.closeButtonText}>Submit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.closeButton}
                                            onPress={() => setModalVisible(!modalVisible)}
                                        >
                                            <Text style={styles.closeButtonText}>Close</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </Modal>

                        <Modal
                            animationType="slide"
                            transparent={true}
                            visible={isImageModalVisible}
                            onRequestClose={() => setImageModalVisible(false)}
                        >
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
                                <TouchableOpacity onPress={() => setImageModalVisible(false)} style={{ position: 'absolute', top: 40, right: 20 }}>
                                    <Icon name="close" size={30} color="#fff" />
                                </TouchableOpacity>
                                <Image
                                    source={{ uri: currentImage }}
                                    style={{ width: '90%', height: '80%', resizeMode: 'contain' }}
                                />
                            </View>
                        </Modal>

                    </View>
                </View>

            </ImageBackground>

        </View>
    )
}

export default SaleOrder

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
        alignItems: "center",
    },
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
    },
    headerText: {
        flex: 1,
        ...typography.h4(),
        color: customColors.white,
        marginHorizontal: 10,
    },
    contentContainer: {
        width: "100%",
        // height: "85%",
        backgroundColor: customColors.white,
        borderRadius: 7.5
    },
    dropdown: {
        height: 45,
        marginHorizontal: 20,
        marginVertical: 15,
        padding: 15,
        borderRadius: 10,
        borderWidth: 0.5,
    },
    dropdownContainer: {
        backgroundColor: customColors.white,
        borderColor: customColors.accent,
        borderWidth: 0.5,
        borderRadius: 10,
    },
    placeholderStyle: {
        ...typography.h6(),
        fontWeight: '500'
    },
    selectedTextStyle: {
        ...typography.h6(),
        fontWeight: '600'
    },
    inputSearchStyle: {
        ...typography.h6(),
        fontWeight: '400'
    },
    tabContainer: {
        height: 55,
        flexDirection: 'row',
        backgroundColor: customColors.white,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        marginBottom: 20,
    },
    tabButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: customColors.primary,
    },
    pagerViewContainer: {
        backgroundColor: customColors.white,
        // paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 10,
        margin: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
    },
    card: {
        flex: 1,
        padding: 10,
    },
    pagerViewContainerText: {
        ...typography.body1(),
        fontWeight: 'bold',
        // color: '#ccc',
        marginBottom: 4,
    },
    pagerViewContainerSubText: {
        ...typography.body2(),
        fontWeight: '500',
        marginBottom: 10,
    },
    pagerViewContainerInputText: {
        ...typography.body1(),
        padding: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        marginTop: 5,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderColor: customColors.background,
    },
    modalContent: {
        width: '90%',
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
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    headerModalTexts: {
        flex: 1, // Equal width columns
        textAlign: 'center',
        ...typography.body2(),
        fontWeight: 'bold',
        padding: 10,
    },

    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    rowText: {
        flex: 1,
        textAlign: 'center',
        ...typography.body2(),
        padding: 10,
    },
    totalContainer: {
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: '#ddd',  // Light grey border for a subtle separation
        marginTop: 10,
        marginHorizontal: 10,
        backgroundColor: customColors.white,
        alignItems: 'flex-end',
    },
    totalText: {
        ...typography.body1(),
        fontWeight: 'bold',
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
        color: customColors.black
    }

})