import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, Button, ToastAndroid, TouchableOpacity, View, useColorScheme } from 'react-native'
import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import PagerView from 'react-native-pager-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../../Config/Endpoint';
import { customColors, typography } from '../../Config/helper';
import CustomButton from '../../Components/CustomButton';
import { Dropdown } from 'react-native-element-dropdown';
import Icon from 'react-native-vector-icons/AntDesign';

const SaleReturn = ({ route }) => {
    const navigation = useNavigation();
    const { item } = route.params;
    const scheme = useColorScheme();
    const colors = customColors;
    const pagerRef = useRef(null);
    const [selectedTab, setSelectedTab] = useState(0);
    const [productData, setProductData] = useState([]);
    const [productClosingData, setProductClosingData] = useState([]);
    const [filteredProductData, setFilteredProductData] = useState([]);
    const [stockInputValue, setStockInputValue] = useState({
        Company_Id: item.Company_Id,
        ST_Date: new Date().toISOString().split('T')[0],
        Retailer_Id: item.Retailer_Id,
        Retailer_Name: item.Retailer_Name,
        Narration: '',
        Created_by: '',
        Product_Stock_List: [],
        ST_Id: ''
    });
    const [closingStockValues, setClosingStockValues] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [productPacks, setProductPacks] = useState([]);
    const [dropdownData, setDropdownData] = useState([]);
    const [selectedProductGroup, setSelectedProductGroup] = useState(0);
    const [selectedProductPack, setSelectedProductPack] = useState(null);
    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem('UserId');
                const companyId = await AsyncStorage.getItem('Company_Id');
                setStockInputValue(prev => ({
                    ...prev,
                    Created_by: userId
                }));
                fetchproductPacks(companyId);
                fetchGroupedproducts(item.Company_Id);
                fetchProductClosingStock(item.Retailer_Id);
            } catch (err) {
                console.log(err);
            }
        })();
    }, [item.Company_Id, item.Retailer_Id, stockInputValue.ST_Date]);

    const fetchGroupedproducts = async (company) => {
        try {
            const response = await fetch(`${API.groupedProducts}${company}`);
            const data = await response.json();
            if (data.success) {
                setProductData(data.data);
                filterProductDataByPack(selectedProductGroup, data.data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchProductClosingStock = async (Retailer_Id) => {
        try {
            const response = await fetch(`${API.productClosingStock}${Retailer_Id}`);
            const data = await response.json();
            if (data.success) {
                setProductClosingData(data.data.filter(item => item.Previous_Balance > 0));
            }
        } catch (error) {
            console.error(error);
        }
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
                setSelectedProductGroup(dropdownOptions[0]?.Pack_Id || 0);
                setProductPacks(jsonData.data);
                filterProductDataByPack(dropdownOptions[0]?.Pack_Id || 0, productData);
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

        setFilteredProductData(filteredData);
    };

    const handlePackSelection = (packId) => {
        setSelectedProductGroup(packId);
        filterProductDataByPack(packId);
    };

    const getStockCount = (productId) => {
        const mergedData = productClosingData.find(item => Number(item.Product_Id) === Number(productId));
        return mergedData ? {
            previousBalance: mergedData.Previous_Balance || 0,
            hasPreviousBalance: mergedData.Previous_Balance > 0
        } : { previousBalance: 0, hasPreviousBalance: false };
    };

    const getClosingStockDate = (productId) => {
        const productDataItem = productClosingData.find(item => Number(item.Product_Id) === Number(productId));
        return productDataItem && productDataItem.Cl_Date ? new Date(productDataItem.Cl_Date) : new Date();
    };

    const handleStockInputChange = (productId, value, date, previousStock) => {
        setClosingStockValues(prevValues => {
            const updatedValues = [...prevValues];
            const index = updatedValues.findIndex(item => Number(item.Product_Id) === Number(productId));
            if (index !== -1) {
                updatedValues[index] = {
                    ...updatedValues[index],
                    ST_Qty: Number(value),
                    PR_Qty: previousStock,
                    LT_CL_Date: date,
                };
            } else {
                updatedValues.push({
                    Product_Id: Number(productId),
                    ST_Qty: Number(value),
                    PR_Qty: previousStock,
                    LT_CL_Date: date,
                });
            }
            return updatedValues;
        });
    };

    const handleTabPress = (index) => {
        setSelectedTab(index);
        pagerRef.current.setPage(index);
    };

    const onPageSelected = (e) => {
        setSelectedTab(e.nativeEvent.position);
    };

    const postClosingStock = async () => {
        // Implement your function here
    };

    const handleUpdatePress = () => {
        setModalVisible(true);
    };

    const handleModalSubmit = () => {
        setModalVisible(false);
        postClosingStock();
    };

    const handleImagePress = (imageUrl) => {
        setCurrentImage(imageUrl);
        setImageModalVisible(true);
    };

    const renderTabBar = () => {
        if (filteredProductData.length > 0) {
            return (
                <ScrollView horizontal contentContainerStyle={styles(colors).tabContainer} showsHorizontalScrollIndicator={true}>
                    {filteredProductData.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles(colors).tabButton,
                                selectedTab === index && styles(colors).activeTab
                            ]}
                            onPress={() => handleTabPress(index)}
                        >
                            <Text maxFontSizeMultiplier={1.2}>{item.Pro_Group}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            );
        }
        return null;
    };

    const renderProductBalance = () => {
        if (filteredProductData.length === 0) {
            return (
                <View style={styles(colors).noDataContainer}>
                    <Text style={styles(colors).noDataText}>No products with previous balance available.</Text>
                </View>
            );
        }
        return null;
    };

    return (
        <View style={styles(colors).container}>
            <View style={styles(colors).retailerInfo}>
                <Icon name="user" size={22} color={colors.primary} />
                <Text style={styles(colors).retailerLabel}>{item.Retailer_Name}</Text>
            </View>

            <Dropdown
                data={dropdownData}
                labelField='Pack'
                valueField="Pack_Id"
                placeholder="Select Product Group"
                value={selectedProductGroup}
                onChange={item => {
                    handlePackSelection(item.Pack_Id);
                }}
                maxHeight={300}
                style={styles(colors).dropdown}
                containerStyle={styles(colors).dropdownContainer}
                placeholderStyle={styles(colors).dropdownPlaceholder}
                selectedTextStyle={styles(colors).dropdownSelectedText}
                dropDownContainerStyle={styles(colors).dropdownDropdownContainer}
                itemStyle={styles(colors).dropdownItem}
            />

            {renderTabBar()}

            <PagerView
                style={styles(colors).pagerView}
                initialPage={0}
                onPageSelected={onPageSelected}
                ref={pagerRef}
            >
                {filteredProductData.map((group, index) => (
                    <View key={index} style={styles(colors).page}>
                        {group.GroupedProductArray.map((product, idx) => {
                            const { previousBalance, hasPreviousBalance } = getStockCount(product.Product_Id);
                            const closingDate = getClosingStockDate(product.Product_Id);
                            return (
                                <View key={idx} style={styles(colors).productContainer}>
                                    <Text style={styles(colors).productName}>{product.Product_Name}</Text>
                                    <Text style={styles(colors).productDetails}>Pack: {product.Pack_Name}</Text>
                                    <Text style={styles(colors).productDetails}>Previous Balance: {previousBalance}</Text>
                                    <TextInput
                                        style={styles(colors).textInput}
                                        placeholder="Enter Stock Quantity"
                                        keyboardType="numeric"
                                        onChangeText={(value) => handleStockInputChange(product.Product_Id, value, closingDate.toISOString(), previousBalance)}
                                    />
                                    {hasPreviousBalance && (
                                        <TouchableOpacity
                                            style={styles(colors).imageButton}
                                            onPress={() => handleImagePress(product.Image_URL)}
                                        >
                                            <Text style={styles(colors).imageButtonText}>View Image</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                ))}
            </PagerView>

            {renderProductBalance()}

            <Button title="Update" onPress={handleUpdatePress} />

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(!modalVisible)}
            >
                <View style={styles(colors).modalContainer}>
                    <View style={styles(colors).modalContent}>
                        <Text style={styles(colors).modalTitle}>Confirm Update</Text>
                        <Button title="Submit" onPress={handleModalSubmit} />
                        <Button title="Cancel" onPress={() => setModalVisible(false)} />
                    </View>
                </View>
            </Modal>

            <Modal
                visible={isImageModalVisible}
                transparent
                onRequestClose={() => setImageModalVisible(false)}
            >
                <View style={styles(colors).imageModalContainer}>
                    <Image
                        source={{ uri: currentImage }}
                        style={styles(colors).modalImage}
                        resizeMode="contain"
                    />
                    <Button title="Close" onPress={() => setImageModalVisible(false)} />
                </View>
            </Modal>
        </View>
    );
};



export default SaleReturn

const styles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: colors.background,
    },
    headerContainer: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        padding: 20,
        justifyContent: 'space-between'
    },
    headerInterContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerContainerText: {
        // ...typography.h5(colors),
        color: colors.white,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    updateContainer: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end'
    },
    updateText: {
        ...typography.body1(colors),
        color: colors.white
    },
    retailerInfo: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 10,
    },
    retailerLabel: {
        ...typography.h6(colors),
        color: colors.accent,
        fontWeight: '500',
        marginLeft: 10,
    },
    dropdown: {
        marginHorizontal: 25,
        marginBottom: 15,
        height: 45,
        padding: 15,
        borderRadius: 10,
        borderWidth: 0.5,
    },
    dropdownContainer: {
        backgroundColor: colors.background,
        borderColor: colors.textPrimary,
        borderWidth: 0.5,
        borderRadius: 10,
    },
    placeholderStyle: {
        ...typography.body1(colors),
        fontWeight: '500'
    },
    selectedTextStyle: {
        ...typography.body1(colors),
        fontWeight: '600'
    },
    tabContainer: {
        height: 50,
        flexDirection: 'row',
        backgroundColor: colors.background === "#000000" ? colors.black : colors.white,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        marginBottom: 25
    },
    tabButton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: colors.primary,
    },
    pagerViewContainer: {
        backgroundColor: colors.background === "#000000" ? colors.black : colors.white,
        borderRadius: 10,
        margin: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
    },
    card: {
        flexDirection: 'row',
    },
    retailersContainer: {
        width: '60%',
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    pagerViewContainerText: {
        ...typography.body1(colors),
        fontWeight: 'bold',
    },
    pagerViewContainerSubText: {
        ...typography.body2(colors),
        fontWeight: '500',
    },
    highlightedText: {
        backgroundColor: '#FFFF00',
        color: '#000',
        fontWeight: 'bold',
    },
    dateText: {
        ...typography.body1(colors),
        // color: '#444',
        marginBottom: 4,
    },
    pagerViewContainerInputText: {
        ...typography.body2(colors),
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
    },
    modalContainer: {
        width: "85%",
        height: "60%",
        padding: 20,
        backgroundColor: colors.background === "#000000" ? colors.black : colors.white,
        borderRadius: 10,
        shadowColor: colors.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        ...typography.h6(colors),
        fontWeight: 'bold',
        marginBottom: 10,
    },
    scrollViewContent: {
        flexGrow: 1,
        justifyContent: 'flex-start',
    },
    confirmContainer: {
        marginBottom: 10,
        // borderBottomWidth: 1,
        // borderBottomColor: '#ccc',
    },
    productText: {
        ...typography.body1(colors),
        fontWeight: 'bold',
        flexWrap: 'nowrap'
    },
    modalInputText: {
        ...typography.h6(colors),
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 'auto',
        marginTop: 25
    },
})