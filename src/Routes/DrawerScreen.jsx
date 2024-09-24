import { StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from "react-native";
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import IconFont from "react-native-vector-icons/FontAwesome6";
import IconAntDesign from "react-native-vector-icons/AntDesign";

import { customColors, typography } from "../Config/helper";

const DrawerScreen = ({ navigation }) => {

    const logout = async () => {
        try {
            await AsyncStorage.multiRemove([
                "Autheticate_Id",
                "userToken",
                "UserId",
                "userName",
                "Name",
                "UserType",
                "branchId",
                "branchName",
                "userTypeId"
            ]);
            ToastAndroid.show("Log out Successfully", ToastAndroid.LONG);

            navigation.reset({
                index: 0,
                routes: [{ name: "LoginScreen" }],
            });
            navigation.closeDrawer();
        } catch (err) {
            console.error("Error clearing AsyncStorage: ", err);
        }
    };

    return (
        <View style={styles.drawerContainer}>
            <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigation.navigate("ProfileScreen")}
            >
                <IconFont name="circle-user" size={20} color={customColors.black} />
                <Text style={styles.drawerText}>Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigation.navigate("AddCustomer")}
            >
                <IconAntDesign name="adduser" size={20} color={customColors.black} />
                <Text style={styles.drawerText}>Add Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.drawerItem}
                onPress={logout}
            >
                <Icon name="logout" size={20} color="red" />
                <Text style={[styles.drawerText, { color: "red" }]}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
};

export default DrawerScreen;

const styles = StyleSheet.create({
    drawerContainer: {
        flex: 1,
        paddingVertical: 50,
        paddingHorizontal: 20,
    },
    drawerItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 15,
        borderBottomWidth: 0.75,
        borderBottomColor: customColors.black,
    },
    drawerText: {
        ...typography.h5(),
        marginLeft: 10,
    },
});
