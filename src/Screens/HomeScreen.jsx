import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Image, ScrollView, ImageBackground } from "react-native"
import React, { useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from '@react-navigation/native';
import AntDesignIcons from "react-native-vector-icons/AntDesign";
import Icon from "react-native-vector-icons/FontAwesome6";
import { customColors, typography } from "../Config/helper";
import { API } from "../Config/Endpoint";
import AttendanceInfo from "./attendance/AttendanceInfo";
import assetImages from "../Config/Image";

const HomeScreen = () => {
    const navigation = useNavigation();
    const [name, setName] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const userName = await AsyncStorage.getItem('Name');
                const UserId = await AsyncStorage.getItem('UserId');
                setName(userName)
                getAttendanceHistory(UserId)
            } catch (err) {
                console.log(err);
            }
        })();
    }, []);

    const getAttendanceHistory = async (userId) => {
        try {
            const url = `${API.MyLastAttendance}${userId}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const attendanceHistory = await response.json();

            if (attendanceHistory.data.length > 0) {
                // console.log('attendanceHistory', attendanceHistory)
            }
        } catch (error) {
            console.log("Error fetching attendance data:", error);
        }
    }

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={customColors.background} />
            <ImageBackground source={assetImages.backgroundImage} style={styles.backgroundImage}>

                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Icon name="bars" color={customColors.white} size={23} />
                    </TouchableOpacity>
                    <Text style={styles.headerText} maxFontSizeMultiplier={1.2}>Welcome,
                        <Text style={{ color: customColors.secondary, fontWeight: "bold" }}> {name}!</Text>
                    </Text>
                    <TouchableOpacity>
                        <AntDesignIcons name="bells" color={customColors.white} size={23} />
                    </TouchableOpacity>
                </View>

                <ScrollView>
                    <AttendanceInfo />

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Customers")}>
                            <Image
                                source={assetImages.retailer}
                                style={styles.tinyLogo}
                            />
                            <Text style={styles.buttonText} maxFontSizeMultiplier={1.2}>Retailers</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("RetailerLog")}>
                            <Image
                                source={assetImages.visitLog}
                                style={styles.tinyLogo}
                            />
                            <Text style={styles.buttonText} maxFontSizeMultiplier={1.2}>Visit Log</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("OrderPreview")}>
                            <Image
                                source={assetImages.salesOrder}
                                style={styles.tinyLogo}
                            />
                            <Text style={styles.buttonText} maxFontSizeMultiplier={1.2}>Sale Order</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("StockInfo")}>
                            <Image
                                source={assetImages.inventoryStore}
                                style={styles.tinyLogo}
                            />
                            <Text style={styles.buttonText} maxFontSizeMultiplier={1.2}>Stock List</Text>
                        </TouchableOpacity>

                    </View>
                </ScrollView>
            </ImageBackground>

        </View >
    )
}

export default HomeScreen

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
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        flexWrap: 'wrap',
        backgroundColor: customColors.white,
        borderRadius: 10,

        paddingVertical: 20,
        marginHorizontal: 20,
    },
    button: {
        width: "30%",
        alignItems: "center",
        paddingVertical: 15,
        marginBottom: 20,
    },
    buttonText: {
        textAlign: "center",
        ...typography.h6,
        fontWeight: "bold",
        marginTop: 10,
    },
    tinyLogo: {
        width: 45,
        height: 45,
    }
});