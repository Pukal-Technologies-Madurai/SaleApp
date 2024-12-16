import { StyleSheet, Text, View, TouchableOpacity, TextInput, Image, ToastAndroid, Modal, ImageBackground, Alert } from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/AntDesign";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CameraComponent from "../../Components/CameraComponent";
import { customColors, typography } from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import assetImages from "../../Config/Image";

const EndDay = () => {
    const navigation = useNavigation();
    const [capturedPhotoPath, setCapturedPhotoPath] = useState(null);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [formValues, setFormValues] = useState({
        Id: "",
        End_KM: "",
        End_KM_Pic: ""
    })

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                getAttendanceInfo(userId)
                setFormValues({ ...formValues, Id: userId });
            } catch (err) {
                console.error("Error fetching user ID:", err);
                Alert.alert("Error", "Unable to fetch user ID");
            }
        })();
    }, [])

    const getAttendanceInfo = async (userId) => {
        try {
            const url = `${API.MyLastAttendance}${userId}`;
            const response = await fetch(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            const attendanceStatus = await response.json();

            if (response.ok && attendanceStatus?.data?.length > 0) {
                setFormValues(prevState => ({ ...prevState, Id: attendanceStatus.data[0].Id }));
            } else {
                throw new Error('Failed to fetch attendance data');
            }

            // setFormValues({ ...formValues, Id: attendanceStatus.data[0].Id });
        } catch (error) {
            console.error("Error fetching attendance data:", error);
            Alert.alert("Error", "Failed to fetch attendance data");
        }
    };

    const handleInputChange = value => {
        setFormValues(prevState => ({ ...prevState, End_KM: value }));
        // setFormValues({ ...formValues, End_KM: value });
    };

    const handlePhotoCapture = (photoPath) => {
        setCapturedPhotoPath(photoPath);
        setFormValues(prevState => ({ ...prevState, End_KM_Pic: photoPath }));
        // setFormValues({ ...formValues, End_KM_Pic: photoPath });
    };

    const clearPhoto = () => {
        setCapturedPhotoPath(null);
    };

    const handleSubmit = async () => {
        try {
            const formData = new FormData();
            // console.log(formData);
            formData.append("Id", formValues.Id);
            formData.append("End_KM", formValues.End_KM);
            formData.append("End_KM_Pic", {
                uri: `file://${formValues.End_KM_Pic}`,
                name: "photo.jpg",
                type: "image/jpeg"
            })

            const response = await fetch(API.attendance, {
                method: "PUT",
                headers: { "Content-Type": "multipart/form-data" },
                body: formData
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error("Failed to post data to server");
            }

            ToastAndroid.show("Your attendance update successfully", ToastAndroid.LONG);
            navigation.navigate("HomeScreen")
            console.log("Response from server: ", responseData);
        } catch (error) {
            console.error("Error posting data: ", error);
        }
    }

    return (
        <View style={styles.container}>
            <ImageBackground source={assetImages.backgroundImage} style={styles.backgroundImage}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Image
                            source={assetImages.backArrow}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerText} maxFontSizeMultiplier={1.2}>Attendance</Text>
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.inputGroup}>
                        <TextInput
                            maxFontSizeMultiplier={1.2}
                            style={styles.textInput}
                            value={formValues.End_KM}
                            keyboardType="number-pad"
                            placeholder="Ending Kilometers"
                            placeholderTextColor={customColors.accent}
                            autoCapitalize="characters"
                            onChangeText={handleInputChange}
                        />
                        <TouchableOpacity onPress={() => setShowCameraModal(true)}
                            style={styles.cameraButton}
                        >
                            <Text maxFontSizeMultiplier={1.2} style={styles.buttonText}>{!capturedPhotoPath ? "Take" : "Preview"}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                    >
                        <Text maxFontSizeMultiplier={1.2} style={styles.buttonText}>Close Day</Text>
                    </TouchableOpacity>
                </View>
            </ImageBackground>

            <Modal
                visible={showCameraModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCameraModal(false)}
            >
                <View style={styles.modalContainer}>
                    <TouchableOpacity onPress={() => setShowCameraModal(false)} style={styles.closeButton}>
                        <Icon name="close" size={30} color={customColors.white} />
                    </TouchableOpacity>
                    {
                        !capturedPhotoPath ? (
                            <CameraComponent onPhotoCapture={handlePhotoCapture} />
                        ) : (
                            capturedPhotoPath && typeof capturedPhotoPath === "string" && (
                                <View style={styles.previewImageContainer}>
                                    <Image
                                        source={{ uri: 'file://' + capturedPhotoPath }}
                                        style={styles.previewImage}
                                    />
                                    <TouchableOpacity onPress={clearPhoto} style={styles.clearPhotoButton}>
                                        <Text maxFontSizeMultiplier={1.2} style={styles.buttonText}>Retake</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setShowCameraModal(false)} style={[styles.submitButton, { marginTop: 15, backgroundColor: customColors.primary }]}>
                                        <Text maxFontSizeMultiplier={1.2} style={styles.buttonText}>Okay</Text>
                                    </TouchableOpacity>
                                </View>
                            )
                        )
                    }
                </View>
            </Modal>
        </View>
    )
}

export default EndDay

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
        height: "85%",
        backgroundColor: customColors.white,
        borderRadius: 7.5,
    },
    inputGroup: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal: 15,
        marginVertical: 50
    },
    textInput: {
        ...typography.h6(),
        color: customColors.black,
        borderWidth: 1.5,
        borderColor: customColors.primary,
        borderRadius: 5,
        padding: 10,
        marginTop: 20,
    },
    cameraButton: {
        backgroundColor: customColors.primary,
        borderRadius: 5,
        justifyContent: "center",
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginTop: 20,
    },
    buttonText: {
        ...typography.h6(),
        color: customColors.white,
    },
    previewImageContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    previewImage: {
        width: 350,
        height: 350,
        resizeMode: "cover",
        borderRadius: 10,
        marginHorizontal: 50,
    },
    submitButton: {
        backgroundColor: customColors.primary,
        justifyContent: 'center',
        alignContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginLeft: 'auto',
        marginRight: 'auto',
        borderRadius: 5,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    closeButton: {
        marginLeft: "auto",
        right: 25,
    },
    clearPhotoButton: {
        marginTop: 25,
        backgroundColor: customColors.primary,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
    },
})