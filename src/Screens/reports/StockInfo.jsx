import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Image, ImageBackground } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useNavigation } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import { customColors, typography } from '../../Config/helper';
import { API } from '../../Config/Endpoint';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Accordion from '../../Components/Accordion';
import assetImages from '../../Config/Image';

const StockInfo = () => {
    const navigation = useNavigation();
    const [logData, setLogData] = useState([])
    const [name, setName] = useState()

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem('UserId');
                const userName = await AsyncStorage.getItem('Name');
                setName(userName)
                fetchStockLog(selectedDate.toISOString(), userId);
            } catch (err) {
                console.log(err);
            }
        })();
    }, [selectedDate])

    const fetchStockLog = async (day, id) => {
        // console.log(`${API.closingStockReport}${id}&reqDate=${day}`)
        try {
            const response = await fetch(`${API.closingStockReport}${id}&reqDate=${day}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const data = await response.json();

            if (data.success === true) {
                setLogData(data.data);
            } else {
                console.log("Failed to fetch logs:", data.message);
            }
        } catch (error) {
            console.log("Error fetching logs:", error);
        }
    }

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setSelectedDate(selectedDate);
        }
    };

    const showDatepicker = () => {
        setShowDatePicker(true);
    };

    const editOption = (item) => {
        navigation.navigate('StockClosing', { item, isEdit: true })
    }

    const renderHeader = (item) => (
        <View style={styles.header}>
            <Text maxFontSizeMultiplier={1.2} style={styles.headerText}>{item.Retailer_Name}</Text>
        </View>
    )

    const renderContent = (item) => {
        const currentDate = new Date().toISOString().split('T')[0];
        const orderDate = new Date(item.ST_Date).toISOString().split('T')[0];

        return (
            <View style={styles.content}>
                {currentDate === orderDate && (
                    <TouchableOpacity style={styles.editButton} onPress={() => editOption(item)} >
                        <Text maxFontSizeMultiplier={1.2} style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.row}>
                    <Text maxFontSizeMultiplier={1.2} style={[styles.cell, styles.cellHead]}>SNo</Text>
                    <Text maxFontSizeMultiplier={1.2} style={[styles.cell, styles.cellHead]}>Product Name</Text>
                    <Text maxFontSizeMultiplier={1.2} style={[styles.cell, styles.cellHead]}>Quantity</Text>
                </View>
                {item.ProductCount.map((product, index) => (
                    <View key={index} style={styles.row}>
                        <Text maxFontSizeMultiplier={1.2} style={[styles.cell, styles.cellText]}>{product.S_No}</Text>
                        <Text maxFontSizeMultiplier={1.2} style={styles.cellMultiline}>{product.Product_Name}</Text>
                        <Text maxFontSizeMultiplier={1.2} style={styles.cell}>{product.ST_Qty}</Text>
                    </View>
                ))}
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <ImageBackground source={assetImages.backgroundImage} style={styles.backgroundImage}>
                <View style={styles.headersContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Image
                            source={assetImages.backArrow}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headersText} maxFontSizeMultiplier={1.2}>Stock Report</Text>
                </View>

                <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerWrapper}>
                        <TouchableOpacity style={styles.datePicker} onPress={showDatepicker}>
                            <TextInput
                                maxFontSizeMultiplier={1.2}
                                style={styles.textInput}
                                value={selectedDate ? new Intl.DateTimeFormat("en-GB").format(selectedDate) : ""}
                                editable={false}
                            />
                            <Icon name="calendar" color={customColors.white} size={20} />
                        </TouchableOpacity>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display="default"
                            onChange={handleDateChange}
                        />
                    )}
                </View>
                <Accordion
                    data={logData}
                    renderHeader={renderHeader}
                    renderContent={renderContent}
                />
            </ImageBackground>
        </View>
    )
}

export default StockInfo

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
    headersContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
    },
    headersText: {
        flex: 1,
        ...typography.h4(),
        color: customColors.white,
        marginHorizontal: 10,
    },
    datePickerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 20,
    },
    datePickerWrapper: {
        flex: 1,
        marginRight: 10,
        marginVertical: 15,
    },
    datePicker: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: customColors.accent,
        borderRadius: 5,
        paddingHorizontal: 10,
    },
    textInput: {
        flex: 1,
        color: customColors.white,
        ...typography.body1(),
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: customColors.white,
    },
    headerText: {
        width: "90%",
        flexWrap: "wrap",
        textAlign: "left",
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "bold",
    },
    content: {
        backgroundColor: customColors.white,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        padding: 10,
    },
    editButton: {
        alignSelf: "flex-end",
        backgroundColor: customColors.secondary,
        paddingVertical: 5,
        paddingHorizontal: 10,
        marginVertical: 5,
        borderRadius: 5,
    },
    editButtonText: {
        ...typography.body1(),
        textAlign: "center",
        fontWeight: "bold",
        color: customColors.black,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 5,
        borderBottomWidth: 0.75,
        borderBottomColor: customColors.black,
    },
    cell: {
        flex: 1,
        textAlign: "left",
        flexWrap: "wrap",
        ...typography.body1(),
        fontWeight: "bold"
    },
    cellMultiline: {
        flex: 2,
        textAlign: "left",
        flexWrap: "wrap",
        ...typography.body1(),
        fontWeight: "bold"
    },
    cellHead: {
        ...typography.body1(),
        fontWeight: "500",
        fontWeight: "bold"
    },
    cellText: {
        ...typography.body1(),
        fontWeight: "500",
        fontWeight: "bold"
    }
})