import {
    View,
    StyleSheet,
    StatusBar,
    ImageBackground,
    Image,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { customColors } from "../Config/helper";
import assetImages from "../Config/Image";

const StartScreen = () => {
    const navigation = useNavigation();
    const [loggedIn, setLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            checkUserToken();
        }, 2500);
    }, []);

    const checkUserToken = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");

            if (token !== null) {
                setLoggedIn(true);
            } else {
                setLoggedIn(false);
            }
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!loading) {
            if (loggedIn) {
                navigation.replace("HomeScreen");
            } else {
                navigation.replace("LoginPortal");
            }
        }
    }, [loggedIn, loading, navigation]);

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={customColors.background} />
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <Image source={assetImages.logo} />
            </ImageBackground>
        </View>
    );
};

export default StartScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
        justifyContent: "center",
        alignItems: "center",
    },
});
