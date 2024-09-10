import { View, Text, StyleSheet, FlatList, Image, useColorScheme, Button, Alert, ToastAndroid } from 'react-native';
import React, { useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { customColors, typography } from '../../Config/helper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../../Config/Endpoint';
import { Dropdown } from 'react-native-element-dropdown';
import Icon from "react-native-vector-icons/MaterialCommunityIcons"

const Delivery = () => {
    const navigation = useNavigation();
    const scheme = useColorScheme();
    const colors = customColors;

    const [salesData, setSalesData] = useState([])
    const [pickPoint, setPickPoint] = useState([
        { Area_Id: 1, Area_Name: 'Head Office' },
        { Area_Id: 2, Area_Name: 'Main Office' },
        { Area_Id: 3, Area_Name: 'Factory' }
    ]);
    const [selectedArea, setSelectedArea] = useState(null);

    const selectedFromDate = new Date()

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem('UserId');
                const Company_Id = await AsyncStorage.getItem('Company_Id');
                const fromDate = selectedFromDate.toISOString().split('T')[0];
                fetchSaleOrder(fromDate, fromDate, userId, Company_Id)
            } catch (err) {
                console.log(err);
            }
        })();
    }, [selectedFromDate]);

    const fetchSaleOrder = async (from, to, userId, company) => {
        // console.log(`${API.saleOrder}?Fromdate=${from}&Todate=${to}&Company_Id=${company}&Created_by=${userId}&Sales_Person_Id=${userId}`)
        try {
            const response = await fetch(`${API.saleOrder}?Fromdate=${from}&Todate=${to}&Company_Id=${company}&Created_by=${userId}&Sales_Person_Id=${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const data = await response.json();

            if (data.success === true) {
                setSalesData(data.data);
            } else {
                console.log("Failed to fetch logs:", data.message);
            }
        } catch (error) {
            console.log("Error fetching logs:", error);
        }
    }

    const handleAreaChange = (item) => {
        setSelectedArea(item.Area_Id);
    };

    const handleTakeJob = (job) => {
        Alert.alert(
            "Take Job!",
            `Do you want to take the job ${job.Sales_Order_No}?`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Take Job",
                    onPress: () => updateJobStatus(job, "Taken")
                }
            ]
        );
    }

    const handleTomorrowJob = (job) => {
        Alert.alert(
            "Tomorrow's Schedule!",
            `Do you want to add Sales Order No. ${job.Sales_Order_No} to your wishlist for tomorrow's scheduling?`,
            [
                {
                    text: "Cancel",
                    style: "Done"
                },
                {
                    text: "Take Job",
                    onPress: () => updateJobStatus(job, "Taken")
                }
            ]
        );
    }

    const updateJobStatus = async (job, status) => {
        try {
            ToastAndroid.show(`Job ${job.Sales_Order_No} status updated to ${status}`, ToastAndroid.LONG);
        } catch (error) {
            console.log("Error updating job status:", error);
        }
    }

    const renderItem = ({ item }) => {
        return (
            <View style={styles(colors).orderContainer}>
                <Text style={styles(colors).orderTitle}>{item.Retailer_Name}</Text>
                <Text style={styles(colors).orderText}>Order: {item.Sales_Order_No}</Text>
                <Text style={styles(colors).orderText}>Branch: {item.Branch_Name}</Text>
                <Text style={styles(colors).orderText}>Invoice: {item.Total_Invoice_value}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles(colors).orderText}>Delivery Location: {/* Calculate and display distance here */}</Text>
                    <Icon name="directions" size={25} color={colors.accent} />
                </View>

                <FlatList
                    data={item.Products_List}
                    renderItem={({ item: product }) => (
                        <View style={styles(colors).productContainer}>
                            {/* <Image source={{ uri: product.ProductImageUrl }} style={styles(colors).productImage} />
                            <View style={styles(colors).productDetails}>
                                <Text style={styles(colors).productName}>{product.Product_Name.trim()}</Text>
                                <Text style={styles(colors).productText}>Quantity: {product.Total_Qty}</Text>
                                <Text style={styles(colors).productText}>Rate: {product.Item_Rate}</Text>
                                <Text style={styles(colors).productText}>Amount: {product.Amount}</Text>
                            </View> */}
                        </View>
                    )}
                    keyExtractor={product => product.SO_St_Id.toString()}
                />
                <View style={{ flexDirection: "row", justifyContent: "center", gap: 25 }}>
                    <Button
                        color={colors.primary}
                        title="Take Job"
                        onPress={() => handleTakeJob(item)}
                    />
                    <Button
                        color={colors.accent}
                        title="Deny Job"
                        onPress={() => handleTomorrowJob(item)}
                    />
                </View>
            </View>
        )
    };

    return (
        <View style={styles(colors).container}>

            <View style={{ flexDirection: "row" }}>
                <View style={{
                    width: 100,
                    height: 100,
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: colors.secondary,
                    borderRadius: 10,
                    marginVertical: 20,
                    marginLeft: 15,
                }}>
                    <Text style={[styles(colors).orderTitle, { color: colors.accent }]}> {salesData.length}</Text>
                    <Text style={styles(colors).orderTitle}>Delivery</Text>
                </View>

                <View style={{
                    width: 100,
                    height: 100,
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: colors.secondary,
                    borderRadius: 10,
                    marginLeft: 15,
                    marginTop: 15
                }}>
                    <Text style={[styles(colors).orderTitle, { color: colors.accent }]}> {salesData.length}</Text>
                    <Text style={styles(colors).orderTitle}>Not Yet</Text>
                </View>

                <View style={{
                    width: 100,
                    height: 100,
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: colors.secondary,
                    borderRadius: 10,
                    marginLeft: 15,
                    marginTop: 15
                }}>
                    <Text style={[styles(colors).orderTitle, { color: colors.accent }]}>₹ {salesData.length}</Text>
                    <Text style={styles(colors).orderTitle}>Amount</Text>
                </View>
            </View>

            <Dropdown
                data={pickPoint}
                labelField="Area_Name"
                valueField="Area_Id"
                placeholder="Select Pickup Point"
                maxHeight={300}
                value={selectedArea}
                onChange={item => handleAreaChange(item)}
                style={styles(colors).dropdown}
                placeholderStyle={styles(colors).placeholderStyle}
                containerStyle={styles(colors).dropdownContainer}
                selectedTextStyle={styles(colors).selectedTextStyle}
                inputSearchStyle={{
                    borderColor: colors.black,
                    borderRadius: 10,
                }}
            />

            <Text style={[styles(colors).orderTitle, { marginLeft: 16, marginVertical: 10 }]}>Ready for delivery</Text>
            <FlatList
                data={salesData}
                renderItem={renderItem}
                keyExtractor={item => item.Sales_Order_Id.toString()}
            />
        </View>
    )
}

export default Delivery

const styles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: 10,
    },

    dropdown: {
        // width: "45%",
        // height: 50,
        // paddingHorizontal: 8,
        // backgroundColor: colors.secondary,

        margin: 20,
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderColor: "#ddd",
        borderWidth: 1,
        borderRadius: 30
    },
    dropdownContainer: {
        backgroundColor: colors.secondary,
        borderColor: colors.text,
        borderWidth: 1,
        borderRadius: 10,
    },
    placeholderStyle: {
        ...typography.body1(colors),
    },
    selectedTextStyle: {
        // borderColor: colors.black,
        // borderWidth: 1,
        ...typography.body1(colors),
    },

    orderContainer: {
        backgroundColor: colors.background === "#000000" ? colors.black : colors.white,
        borderRadius: 8,
        padding: 16,
        marginHorizontal: 15,
        marginVertical: 20,
        elevation: 14,
        shadowColor: 'rgba(0, 0, 0, 0.6)',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    orderTitle: {
        ...typography.h6(colors),
        fontWeight: "bold",
        marginBottom: 10,
    },
    orderText: {
        ...typography.h6(colors),
        marginBottom: 4,
    },
    productContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    productImage: {
        width: 50,
        height: 50,
        marginRight: 8,
        borderRadius: 4,
    },
    productDetails: {
        flex: 1,
    },
    productName: {
        ...typography.h6(colors),
        fontWeight: "bold",
    },
    productText: {
        ...typography.body1(colors),
    },
})