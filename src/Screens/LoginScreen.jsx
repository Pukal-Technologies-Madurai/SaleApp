import { View, Text, StyleSheet, ToastAndroid, Alert, TextInput, TouchableOpacity, StatusBar, ImageBackground, Image, ScrollView } from "react-native"
import React, { useState } from "react"
import { useNavigation } from "@react-navigation/native"
import AsyncStorage from "@react-native-async-storage/async-storage";
import CryptoJS from "react-native-crypto-js";
import Icon from "react-native-vector-icons/Fontisto";

import { API } from '../Config/Endpoint';
import { storeInfo } from '../Config/AuthContext';
import { customColors, typography } from '../Config/helper';
import assetImages from "../Config/Image";

const LoginScreen = () => {
    const { setAuthInfo } = storeInfo();
    const navigation = useNavigation();
    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");

    const loginFunction = async () => {
        if (loginId && password) {
            try {
                const passHash = CryptoJS.AES.encrypt(password, "ly4@&gr$vnh905RyB>?%#@-(KSMT").toString();

                const response = await fetch(API.login, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        UserName: loginId,
                        Password: passHash
                    })
                });

                const data = await response.json();

                if (data.success) {
                    await AsyncStorage.setItem("userToken", data.data[0].Autheticate_Id);
                    await setData(data.data[0]);
                    setAuthInfo(data.data[0]);
                    navigation.replace("HomeScreen");
                } else {
                    Alert.alert(data.message);
                }
            } catch (error) {
                console.error("Error during login: ", error);
                Alert.alert(data.message);
            }
        } else {
            if (!loginId) {
                ToastAndroid.show("Enter valid user id", ToastAndroid.LONG)
            }
            else if (!password) {
                ToastAndroid.show("Enter your Password", ToastAndroid.LONG)
            }
        }
    }

    const setData = async (data) => {
        try {
            await AsyncStorage.setItem("userToken", data.Autheticate_Id);
            await AsyncStorage.setItem("UserId", data.UserId);
            await AsyncStorage.setItem("Company_Id", String(data.Company_id));
            await AsyncStorage.setItem("userName", data.UserName);
            await AsyncStorage.setItem("Name", data.Name);
            await AsyncStorage.setItem("UserType", data.UserType);
            await AsyncStorage.setItem("branchId", String(data.BranchId));
            await AsyncStorage.setItem("branchName", data.BranchName);
            await AsyncStorage.setItem("userType", data.UserType);
            await AsyncStorage.setItem("userTypeId", data.UserTypeId);
        } catch (err) {
            console.error("Error storing data: ", err);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={customColors.background} />
            <ImageBackground source={assetImages.backgroundImage} style={styles.backgroundImage}>
                <Image
                    source={assetImages.logo}
                    style={styles.logo}
                />

                <ScrollView style={styles.loginContainer}>
                    <Text style={styles.title} maxFontSizeMultiplier={1.2}>WELCOME TO SALES APP</Text>
                    <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>Let's start to manage your attendance more effectively with us!</Text>
                    <View style={styles.inputContainer}>
                        <Icon name="mobile-alt" size={20} color={customColors.primary} style={{ marginRight: 10 }} />
                        <Image
                            source={assetImages.line}
                        />
                        <TextInput
                            maxFontSizeMultiplier={1.2}
                            style={styles.textInput}
                            textAlign="left"
                            placeholder="Enter your Mobile Number"
                            placeholderTextColor={customColors.accent}
                            value={loginId}
                            onChangeText={(val) => setLoginId(val)}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="key" size={20} color={customColors.primary} style={{ marginRight: 10 }} />
                        <Image
                            source={assetImages.line}
                        />
                        <TextInput
                            maxFontSizeMultiplier={1.2}
                            style={styles.textInput}
                            placeholder="Enter your Password"
                            placeholderTextColor={customColors.accent}
                            value={password}
                            onChangeText={(val) => setPassword(val)}
                            secureTextEntry={true}
                            autoCapitalize="none"
                        />
                    </View>
                    <TouchableOpacity style={styles.loginButton} onPressOut={loginFunction} >
                        <Text style={styles.loginButtonText} maxFontSizeMultiplier={1.2}>Login</Text>
                    </TouchableOpacity>
                </ScrollView>
            </ImageBackground>
        </View>
    )
}

export default LoginScreen

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
        alignItems: "center",
    },
    logo: {
        marginTop: 20,
        marginBottom: 25,
    },
    loginContainer: {
        width: "90%",
        height: "55%",
        borderColor: customColors.secondary,
        borderWidth: 1,
        borderRadius: 15,
        marginHorizontal: 20,
    },
    title: {
        textAlign: "center",
        color: customColors.secondary,
        ...typography.h3(),
        fontWeight: "700",
        fontStyle: "italic",
        marginTop: 25,
        marginBottom: 15,
    },
    subtitle: {
        textAlign: "left",
        color: customColors.white,
        ...typography.body1(),
        marginHorizontal: 40,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.white,
        borderRadius: 10,
        paddingHorizontal: 15,
        margin: 15,
        borderWidth: 1,
        borderColor: customColors.accent,
    },
    inputIcon: {
        width: 20,
        height: 20,
        marginRight: 10
    },
    textInput: {
        flex: 1,
        ...typography.h6(),
        marginLeft: 2.5,
        paddingLeft: 10
    },
    loginButton: {
        backgroundColor: customColors.secondary,
        justifyContent: "center",
        alignItems: "center",
        padding: 10,
        marginHorizontal: "30%",
        marginTop: 20,
        borderRadius: 10
    },
    loginButtonText: {
        ...typography.h4(),
        color: customColors.black,
        fontWeight: "bold"
    }
});