import { Image, ImageBackground, Modal, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import { customColors, typography } from "../Config/helper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../Config/Endpoint";
import assetImages from "../Config/Image";
import { useNavigation } from "@react-navigation/native";

const ProfileScreen = () => {
    const navigation = useNavigation();
    const [name, setName] = useState()
    const [branchName, setBranchName] = useState()
    const [userId, setUserId] = useState()

    const [modalVisible, setModalVisible] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const storedName = await AsyncStorage.getItem("Name");
                const storedBranchName = await AsyncStorage.getItem("branchName");
                const storedUserId = await AsyncStorage.getItem("UserId");
                if (storedName !== null) setName(storedName);
                if (storedBranchName !== null) setBranchName(storedBranchName)
                if (setUserId !== null) setUserId(storedUserId)
            } catch (err) {
                console.log(err);
            }
        })();
    }, [])

    const handleChangePassword = async () => {
        try {
            const response = await fetch(`${API.changePassword}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: userId,
                    oldPassword: oldPassword,
                    newPassword: newPassword,
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    ToastAndroid.show(data.message, ToastAndroid.LONG);
                    setModalVisible(false);
                } else {
                    ToastAndroid.show(data.message, ToastAndroid.LONG);
                }
            } else {
                const data = await response.json();
                ToastAndroid.show("Failed to change password", + data.message, ToastAndroid.LONG);
            }
        } catch (err) {
            console.error(err);
            ToastAndroid.show("Failed to change password: " + err.message, ToastAndroid.LONG);
        }
    }

    return (
        <View style={styles.container}>
            <ImageBackground source={assetImages.backgroundImage} style={styles.backgroundImage}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Image source={assetImages.backArrow} />
                    </TouchableOpacity>
                    <Text style={styles.headerText} maxFontSizeMultiplier={1.2}>Personal Info</Text>
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            editable={false}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Branch</Text>
                        <TextInput
                            style={styles.input}
                            value={branchName}
                            editable={false}
                        />
                    </View>

                    <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.button} >
                        <Text style={styles.buttonText}>Change Password</Text>
                    </TouchableOpacity>

                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                <Text style={styles.modalTitle}>Change Password</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Old Password"
                                    secureTextEntry={true}
                                    value={oldPassword}
                                    onChangeText={setOldPassword}
                                />
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="New Password"
                                    secureTextEntry={true}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                />
                                <View style={styles.modalButtonContainer}>
                                    <TouchableOpacity onPress={handleChangePassword} style={styles.modalButton}>
                                        <Text style={styles.modalButtonText}>Submit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalButton}>
                                        <Text style={styles.modalButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                </View>
            </ImageBackground>
        </View>
    )
}

export default ProfileScreen

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
    contentContainer: {
        width: "100%",
        height: "100%",
        backgroundColor: customColors.white,
        borderRadius: 15
    },
    formGroup: {
        margin: 20,
    },
    label: {
        ...typography.h3(),
        color: customColors.black,
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: customColors.white,
        borderRadius: 8,
        padding: 15,
        ...typography.body1(),
        backgroundColor: "#a0a0a0",
        color: customColors.black,
    },
    button: {
        marginTop: 20,
        marginHorizontal: 20,
        paddingVertical: 15,
        // padding: 15,
        borderRadius: 10,
        alignItems: "center",
        backgroundColor: customColors.primary,
        shadowColor: customColors.black,
    },
    buttonText: {
        ...typography.button(),
        color: customColors.white
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: "90%",
        backgroundColor: customColors.white,
        borderRadius: 15,
        padding: 20,
        alignItems: "center",
    },
    modalTitle: {
        ...typography.h5(),
        fontWeight: "bold",
        color: customColors.black,
        marginBottom: 20,
    },
    modalInput: {
        width: "100%",
        borderWidth: 1,
        borderColor: "#a0a0a0",
        borderRadius: 10,
        padding: 10,
        marginBottom: 20,
    },
    modalButtonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: customColors.primary,
        alignItems: "center",
        marginHorizontal: 5,
    },
    modalButtonText: {
        ...typography.button(),
        color: customColors.white,
    },
})