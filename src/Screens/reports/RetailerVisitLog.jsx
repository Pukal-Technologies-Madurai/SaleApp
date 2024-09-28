import { Image, ImageBackground, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import React, { useState, useEffect } from 'react'
import Icon from 'react-native-vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import { customColors, typography } from '../../Config/helper';
import { API } from '../../Config/Endpoint';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Accordion from '../../Components/Accordion';
import assetImages from '../../Config/Image';
import { useNavigation } from '@react-navigation/native';

const RetailerVisitLog = () => {
    const navigation = useNavigation();
    const [logData, setLogData] = useState(null)
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                fetchVisitersLog(selectedDate.toISOString(), userId);
            } catch (err) {
                console.log(err);
            }
        })();
    }, [selectedDate])

    const fetchVisitersLog = async (fromDate, id) => {
        try {
            const response = await fetch(`${API.visitedLog}?reqDate=${fromDate}&UserId=${id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
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

    const handleImagePress = (imageUrl) => {
        setCurrentImage(imageUrl);
        setImageModalVisible(true);
    };

    const renderHeader = (item) => {
        return (
            < View style={styles.header} >
                <Text maxFontSizeMultiplier={1.2} style={styles.headerText}>{item.Reatailer_Name}</Text>
            </View >
        )
    }

    const renderContent = (item) => {
        const latitude = item.Latitude;
        const longitude = item.Longitude;

        const isValidCoordinates = latitude !== 0 && longitude !== 0;
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

        return (
            <View style={styles.card}>
                <View style={styles.textContainer}>
                    <Text style={[
                        styles.boldText,
                        item.IsExistingRetailer === 0 && {
                            color: "green"
                        }]}>
                        {item.IsExistingRetailer === 1 ? "Existing Retailer" : "New Retailer"}
                    </Text>
                    <Text maxFontSizeMultiplier={1.2} style={styles.cardText}>
                        Contact Person:
                        <TouchableOpacity onPress={() => {
                            Linking.openURL(`tel:${item.Contact_Mobile}`)
                        }}>
                            <Text style={[styles.boldText, { color: "blue" }]}>
                                {item.Contact_Mobile}
                            </Text>
                        </TouchableOpacity>
                    </Text>
                    <Text maxFontSizeMultiplier={1.2} style={styles.cardText}>
                        Address:
                        <Text style={styles.boldText}> {item.Location_Address}</Text>
                    </Text>
                    <Text maxFontSizeMultiplier={1.2} style={styles.cardText}>
                        Narration:
                        <Text style={styles.boldText}> {item.Narration}</Text>
                    </Text>
                    {/* <TouchableOpacity
                        style={{
                            borderColor: customColors.primary,
                            borderWidth: 1
                        }}
                        onPress={() => {
                            const { Contact_Mobile, Reatailer_Name, Contact_Person } = item;
                            navigation.navigate("Sales", {
                                Contact_Mobile,
                                Reatailer_Name,
                                Contact_Person
                            });
                        }}>
                        <Text style={styles.boldText} maxFontSizeMultiplier={1.2}>Sales Order</Text>
                    </TouchableOpacity> */}

                    {isValidCoordinates && (
                        <TouchableOpacity onPress={() => Linking.openURL(googleMapsUrl)}>
                            <Text style={[styles.boldText, { color: "blue" }]}>
                                View Location on Map
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
                {item.imageUrl && (
                    <TouchableOpacity
                        onPress={() => handleImagePress(item.imageUrl)}
                        style={styles.imageContainer}
                    >
                        <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.cardImage}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                )}
            </View>
        );
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
                    <Text style={styles.headersText} maxFontSizeMultiplier={1.2}>Retailers Log</Text>
                    <TouchableOpacity onPress={() => navigation.navigate("RetailerVisit")}>
                        <Text style={styles.headersText} maxFontSizeMultiplier={1.2}>Entry</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerWrapper}>
                        <TouchableOpacity style={styles.datePicker} onPress={showDatepicker}>
                            <TextInput
                                maxFontSizeMultiplier={1.2}
                                style={styles.textInput}
                                value={selectedDate ? new Intl.DateTimeFormat('en-GB').format(selectedDate) : ''}
                                editable={false}
                            />
                            <Icon name="calendar" color={customColors.white} size={20} />
                        </TouchableOpacity>
                        <View style={styles.countContainer}>
                            <Text style={styles.countText}>
                                {logData ? (
                                    <Text style={styles.countText}>
                                        Total: {logData.length}
                                    </Text>
                                ) : (
                                    <Text style={styles.countText}>No logs available</Text>
                                )}
                            </Text>
                        </View>
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

                <ScrollView style={styles.cardContainer}>
                    {logData && (
                        <Accordion
                            data={logData}
                            renderHeader={renderHeader}
                            renderContent={renderContent}
                        />
                    )}
                </ScrollView>


            </ImageBackground>

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
    )
}

export default RetailerVisitLog

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
    cardContainer: {
        flex: 1,
        padding: 15,
    },
    countContainer: {
        width: "50%",
        padding: 10,
        marginHorizontal: 10,
        backgroundColor: customColors.secondary,
        borderRadius: 5,
        elevation: 2,
    },
    countText: {
        textAlign: "center",
        flexWrap: "wrap",
        ...typography.h6(),
        fontWeight: "bold",
        color: customColors.primary,
    },
    datePickerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 20,
    },
    datePickerWrapper: {
        flex: 1,
        flexDirection: "row",
        marginRight: 10,
        marginVertical: 15,
    },
    datePicker: {
        width: "50%",
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: customColors.white,
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
        borderBottomColor: customColors.primary,
    },
    headerText: {
        width: "90%",
        flexWrap: "wrap",
        textAlign: "left",
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "500",
    },
    card: {
        backgroundColor: customColors.white,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        padding: 10,
    },
    textContainer: {
        marginBottom: 10,
    },

    cardText: {
        ...typography.body1(),
        marginBottom: 10,
    },
    boldText: {
        ...typography.h6(),
        fontWeight: "bold",
    },
    imageContainer: {
        width: 100,
        height: 100,
        marginTop: 10,
        alignSelf: "center"
    },
    cardImage: {
        width: '100%',
        height: '100%',
        borderRadius: 5,
    },
    // cardImage: {
    //     width: "100%",
    //     height: "100%",
    //     resizeMode: "contain",
    // },
})