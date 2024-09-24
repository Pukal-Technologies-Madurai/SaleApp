import { Image, ImageBackground, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native'
import React, { useState, useEffect } from 'react'
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { customColors, typography } from '../../Config/helper';
import { API } from '../../Config/Endpoint';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Accordion from '../../Components/Accordion';
import assetImages from '../../Config/Image';
import { useNavigation } from '@react-navigation/native';

const AttendanceReport = () => {
    const navigation = useNavigation();
    const colors = customColors;
    const [attendanceData, setAttendanceData] = useState(null)

    const [show, setShow] = useState(false);
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const [selectedFromDate, setSelectedFromDate] = useState(firstDayOfMonth);
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    const [isSelectingFromDate, setIsSelectingFromDate] = useState(true);
    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const userTypeId = await AsyncStorage.getItem("userTypeId");
                fetchAttendance(selectedFromDate.toISOString(), selectedToDate.toISOString(), userTypeId);
            } catch (err) {
                console.log(err);
            }
        })();
    }, [selectedFromDate, selectedToDate])

    const selectDateFn = (event, selectedDate) => {
        setShow(Platform.OS === 'ios');
        if (selectedDate) {
            if (isSelectingFromDate) {
                setSelectedFromDate(selectedDate);
                if (selectedDate > selectedToDate) {
                    setSelectedToDate(selectedDate);
                }
            } else {
                setSelectedToDate(selectedDate);
                if (selectedDate < selectedFromDate) {
                    setSelectedFromDate(selectedDate);
                }
            }
        }
    };

    const showDatePicker = (isFrom) => {
        setShow(true);
        setIsSelectingFromDate(isFrom);
    };

    const fetchAttendance = async (fromDay, toDay, id) => {
        // console.log(`${API.attendanceHistory}From=${fromDay}&To=${toDay}&UserTypeID=${id}`)
        try {
            const response = await fetch(`${API.attendanceHistory}From=${fromDay}&To=${toDay}&UserTypeID=${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const data = await response.json();
            if (data.success === true) {
                setAttendanceData(data.data);
            } else {
                console.log("Failed to fetch logs:", data.message);
            }
        } catch (error) {
            console.log("Error fetching logs:", error);
        }
    }

    const handleImagePress = (imageUrl) => {
        setCurrentImage(imageUrl);
        setImageModalVisible(true);
    };

    const calculateDistance = (startKM, endKM) => {
        if (endKM !== null) {
            return endKM - startKM;
        }
        return 'N/A';
    };

    const calculateTotalKms = (data) => {
        return data.reduce((total, item) => {
            if (item.End_KM !== null) {
                return total + (item.End_KM - item.Start_KM);
            }
            return total;
        }, 0);
    };

    const countTotalAttendances = (data) => {
        return data.length;
    };

    const countUnclosedAttendances = (data) => {
        return data.filter(item => item.End_KM === null).length;
    };

    const renderHeader = (item, index) => (
        <View style={styles(colors).header}>
            <Text maxFontSizeMultiplier={1.2} style={styles(colors).headerText}>Attendance {index + 1}</Text>
        </View>
    )

    const renderContent = (item) => {
        const startKM = item.Start_KM;
        const endKM = item.End_KM;
        const kmDifference = endKM ? endKM - startKM : "Not Set";

        return (
            <View style={styles(colors).contentContainer}>
                <View style={styles(colors).contentDetails}>
                    <Text style={styles(colors).contentText}>Date: {new Date(item.Start_Date).toISOString().substring(0, 10)}</Text>
                    <Text style={styles(colors).contentText}>Start Time: {new Date(item.Start_Date).toLocaleTimeString()}</Text>
                    <Text style={styles(colors).contentText}>End Time: {item.End_Date ? new Date(item.End_Date).toLocaleTimeString() : 'Not Set'}</Text>
                    <Text style={styles(colors).contentText}>Start KM: {startKM}</Text>
                    <Text style={styles(colors).contentText}>End KM: {endKM || 'Not Set'}</Text>
                    <Text style={styles(colors).contentText}>KM Difference: {kmDifference}</Text>
                </View>
                {item.startKmImageUrl && (
                    <TouchableOpacity
                        onPress={() => handleImagePress(item.startKmImageUrl)}
                        activeOpacity={0.9} // Set higher opacity to test if visibility changes on press
                        style={{ width: 100, height: 200 }} // Ensure that TouchableOpacity has explicit dimensions
                    >
                        <Image
                            source={{ uri: item.startKmImageUrl }}
                            style={styles(colors).image} // Ensure the image fills the TouchableOpacity
                            resizeMode="contain" // Optional: Adjust based on your design needs
                        />
                    </TouchableOpacity>
                )}
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
                    <Text style={styles.headersText} maxFontSizeMultiplier={1.2}>Attendance Report</Text>
                </View>

                <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerWrapper}>
                        <Text style={styles.dateTitle}>From</Text>
                        <TouchableOpacity activeOpacity={0.7} style={styles.datePicker} onPress={() => showDatePicker(true)}>
                            <TextInput
                                maxFontSizeMultiplier={1.2}
                                style={styles.textInput}
                                value={selectedFromDate ? new Intl.DateTimeFormat('en-GB').format(selectedFromDate) : ''}
                                editable={false}
                                placeholder="Select Date"
                            />
                            <Icon name="calendar" color={customColors.accent} size={20} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.datePickerWrapper}>
                        <Text style={styles.dateTitle}>To</Text>
                        <TouchableOpacity activeOpacity={0.7} style={styles.datePicker} onPress={() => showDatePicker(false)}>
                            <TextInput
                                maxFontSizeMultiplier={1.2}
                                style={styles.textInput}
                                value={selectedToDate ? new Intl.DateTimeFormat('en-GB').format(selectedToDate) : ''}
                                editable={false}
                            />
                            <Icon name="calendar" color={customColors.accent} size={20} />
                        </TouchableOpacity>
                    </View>

                    {show && (
                        <DateTimePicker
                            value={isSelectingFromDate ? selectedFromDate : selectedToDate}
                            onChange={selectDateFn}
                            mode="date"
                            display="default"
                            timeZoneOffsetInMinutes={0}
                            style={{ width: '100%' }}
                            testID="dateTimePicker"
                        />
                    )}
                </View>

                <View style={styles.cardContainer}>
                    <View style={styles.card}>
                        <Ionicons name="speedometer" size={30} color={customColors.white} />
                        <Text style={styles.cardText}>Total KMs</Text>
                        <Text style={styles.cardValue}>{attendanceData ? calculateTotalKms(attendanceData) : 'N/A'}</Text>
                    </View>

                    <View style={styles.card}>
                        <Ionicons name="list" size={30} color={customColors.white} />
                        <Text style={styles.cardText}>Count</Text>
                        <Text style={styles.cardValue}>{attendanceData ? countTotalAttendances(attendanceData) : 'N/A'}</Text>
                    </View>

                    <View style={styles.card}>
                        <Ionicons name="alert-circle" size={30} color={customColors.white} />
                        <Text style={styles.cardText}>Unclosed</Text>
                        <Text style={styles.cardValue}>{attendanceData ? countUnclosedAttendances(attendanceData) : 'N/A'}</Text>
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.headerCell}>Date</Text>
                        <Text style={styles.headerCell}>Start KM</Text>
                        <Text style={styles.headerCell}>End KM</Text>
                        <Text style={styles.headerCell}>Distance</Text>
                    </View>
                    {attendanceData && attendanceData.length > 0 ? (
                        <ScrollView>
                            {attendanceData.map((item) => (
                                <View style={styles.tableRow} key={item.Id}>
                                    <Text style={styles.cell}>{item.Start_Date ? new Intl.DateTimeFormat('en-GB').format(new Date(item.Start_Date)) : ""}</Text>
                                    <Text style={styles.cell}>{item.Start_KM}</Text>
                                    <Text style={styles.cell}>{item.End_KM !== null ? item.End_KM : 'N/A'}</Text>
                                    <Text style={styles.cell}>{calculateDistance(item.Start_KM, item.End_KM)}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={styles.tableRow}>
                            <Text style={styles.cell} colSpan={4}>No attendance data available.</Text>
                        </View>
                    )}
                </View>


            </ImageBackground>



            {/* <ScrollView style={styles.cardContainer}>
                {attendanceData && (
                    <Accordion
                        data={attendanceData}
                        renderHeader={renderHeader}
                        renderContent={renderContent}
                    />
                )}

            </ScrollView> */}

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

export default AttendanceReport

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
    dateTitle: {
        ...typography.body1(),
        color: customColors.white,
        marginBottom: 5,
    },
    datePickerWrapper: {
        flex: 1,
        marginRight: 10,
        marginVertical: 15,
        minWidth: 100, // Minimum width
        maxWidth: 250,
    },
    datePicker: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: customColors.accent,
        borderRadius: 5,
        paddingHorizontal: 10,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: customColors.accent,
    },
    headerText: {
        ...typography.h6(),
        color: customColors.white,
        fontWeight: "500",
    },
    textInput: {
        flex: 1,
        color: customColors.white,
        ...typography.body1(),
    },

    contentContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    contentDetails: {
        width: "50%",
        padding: 10,
    },
    image: {
        width: "100%",
        height: "100%",
        resizeMode: "contain",
    },
    contentText: {
        ...typography.body1(),
        fontWeight: "600",
        color: customColors.white,
        marginBottom: 5,
    },

    cardContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        padding: 10,
        marginBottom: 20,
    },
    card: {
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        width: "30%",
    },
    cardText: {
        textAlign: "center",
        ...typography.body1(),
        color: customColors.white,
        fontWeight: "bold",
        marginTop: 10,
    },
    cardValue: {
        textAlign: "center",
        color: customColors.white,
        fontSize: 18,
        fontWeight: 'bold'
    },

    table: {
        width: "90%",
        height: 350,
        justifyContent: "flex-start",
        alignContent: "center",
        margin: 20,
        borderWidth: 1,
        borderColor: "#ccc",

        shadowColor: "rgba(0,0,0,0.5)",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 3,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: customColors.secondary,
        padding: 10,
    },
    headerCell: {
        flex: 1,
        ...typography.body1(),
        fontWeight: "bold",
        color: customColors.black,
        textAlign: "center"
    },
    tableRow: {
        flexDirection: "row",
        padding: 10,
    },
    cell: {
        flex: 1,
        ...typography.body1(),
        fontWeight: "bold",
        color: customColors.white,
        textAlign: "center"
    },
})