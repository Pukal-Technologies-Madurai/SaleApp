import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Image, ScrollView, ImageBackground } from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import AntDesignIcons from "react-native-vector-icons/AntDesign";
import Icon from "react-native-vector-icons/FontAwesome6";
import { customColors, typography } from "../Config/helper";
import { API } from "../Config/Endpoint";
import AttendanceInfo from "./attendance/AttendanceInfo";
import assetImages from "../Config/Image";

const HomeScreen = () => {
    const navigation = useNavigation();
    const [name, setName] = useState("");
    const buttons = [
        { title: "Retailers", icon: assetImages.retailer, navigate: "Customers" },
        { title: "Visit Log", icon: assetImages.visitLog, navigate: "RetailerLog" },
        { title: "Sale Order", icon: assetImages.salesOrder, navigate: "OrderPreview" },
        { title: "Stock List", icon: assetImages.inventoryStore, navigate: "StockInfo" },
    ];

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
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
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
                        {
                            buttons.map((button, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.button}
                                    onPress={() => navigation.navigate(button.navigate)}
                                >
                                    <View style={styles.iconContainer}>
                                        <Image source={button.icon} style={styles.icon} />
                                    </View>
                                    < Text style={styles.buttonText} maxFontSizeMultiplier={1.2} >
                                        {button.title}
                                    </Text>
                                </TouchableOpacity>
                            ))}
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
        flexWrap: "wrap",
        justifyContent: "space-between",
        backgroundColor: customColors.white,
        borderRadius: 15,
        padding: 15,
        marginHorizontal: 20,
        marginVertical: 10,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    button: {
        width: "48%",
        aspectRatio: 1,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 15,
        borderRadius: 12,
        backgroundColor: "#ccc",
    },
    buttonText: {
        textAlign: "center",
        ...typography.h6,
        fontWeight: "bold",
        color: customColors.black,
    },
    icon: {
        width: 40,
        height: 40,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: customColors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
});