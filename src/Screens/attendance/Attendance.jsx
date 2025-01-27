import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    TextInput,
    Alert,
    Image,
    Modal,
    ToastAndroid,
    ImageBackground,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/AntDesign";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import CameraComponent from "../../Components/CameraComponent";
import LocationIndicator from "../../Components/LocationIndicator";
import assetImages from "../../Config/Image";

const Attendance = locationData => {
    const navigation = useNavigation();
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [capturedPhotoPath, setCapturedPhotoPath] = useState(null);
    const [formValues, setFormValues] = useState({
        UserId: "",
        Start_KM: "",
        Latitude: locationData?.latitude || null,
        Longitude: locationData?.longitude || null,
        Start_KM_Pic: "",
    });

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                if (userId) {
                    setFormValues(prevValues => ({
                        ...prevValues,
                        UserId: userId,
                    }));
                }
            } catch (err) {
                console.log(err);
            }
        })();
    }, []);

    const handleLocationUpdate = locationData => {
        setFormValues(prevState => ({
            ...prevState,
            Latitude: locationData.latitude,
            Longitude: locationData.longitude,
        }));
    };

    const handleInputChange = value => {
        setFormValues(prevState => ({
            ...prevState,
            Start_KM: value,
        }));
    };

    const handlePhotoCapture = async photoPath => {
        setCapturedPhotoPath(photoPath);
        setFormValues(prevState => ({
            ...prevState,
            Start_KM_Pic: photoPath,
        }));
    };

    const clearPhoto = () => {
        setCapturedPhotoPath(null);
        setFormValues(prevState => ({
            ...prevState,
            Start_KM_Pic: "",
        }));
    };

    const handleSubmit = async () => {
        const { UserId, Start_KM, Latitude, Longitude, Start_KM_Pic } =
            formValues;

        if (!Latitude || !Longitude) {
            Alert.alert(
                "Location Permission",
                "Please ensure location services are enabled.",
            );
            return;
        }

        try {
            const formData = new FormData();
            formData.append("UserId", UserId);
            formData.append("Start_KM", Start_KM);
            formData.append("Latitude", Latitude);
            formData.append("Longitude", Longitude);
            formData.append("Start_KM_Pic", {
                uri: `file://${Start_KM_Pic}`,
                name: "photo.jpg",
                type: "image/jpeg",
            });

            const response = await fetch(API.attendance(), {
                method: "POST",
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                body: formData,
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message);
            }

            ToastAndroid.show(responseData.message, ToastAndroid.LONG);
            navigation.replace("HomeScreen");
        } catch (error) {
            console.error("Error posting data: ", error);
            Alert.alert(responseData.message);
        }
    };

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headerContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <MaterialIcon
                                name="arrow-back"
                                size={25}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        <Text
                            style={styles.headerText}
                            maxFontSizeMultiplier={1.2}>
                            Start your Day
                        </Text>
                    </View>

                    <View style={styles.contentContainer}>
                        <LocationIndicator
                            onLocationUpdate={handleLocationUpdate}
                            autoFetch={true}
                            autoFetchOnMount={true}
                        />

                        <View style={styles.inputGroup}>
                            <TextInput
                                maxFontSizeMultiplier={1.2}
                                style={styles.textInput}
                                value={formValues.Start_KM}
                                keyboardType="decimal-pad"
                                placeholder="Starting Kilometers"
                                placeholderTextColor={customColors.accent}
                                autoCapitalize="characters"
                                onChangeText={handleInputChange}
                            />
                            <TouchableOpacity
                                onPress={() => setShowCameraModal(true)}
                                style={styles.cameraButton}>
                                <Text
                                    style={styles.buttonText}
                                    maxFontSizeMultiplier={1.2}>
                                    {!capturedPhotoPath ? "Take" : "Preview"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleSubmit}>
                            <View style={{ flexDirection: "row" }}>
                                <Image
                                    source={assetImages.saveIcon}
                                    style={{ marginRight: 15 }}
                                />
                                <Text
                                    maxFontSizeMultiplier={1.2}
                                    style={styles.buttonText}>
                                    Save
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </ImageBackground>

            <Modal
                visible={showCameraModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCameraModal(false)}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        onPress={() => setShowCameraModal(false)}
                        style={styles.closeButton}>
                        <Icon
                            name="close"
                            size={30}
                            color={customColors.white}
                        />
                    </TouchableOpacity>
                    {!capturedPhotoPath ? (
                        <CameraComponent onPhotoCapture={handlePhotoCapture} />
                    ) : (
                        capturedPhotoPath &&
                        typeof capturedPhotoPath === "string" && (
                            <View style={styles.previewImageContainer}>
                                <Image
                                    source={{
                                        uri: "file://" + capturedPhotoPath,
                                    }}
                                    style={styles.previewImage}
                                />
                                <TouchableOpacity
                                    onPress={clearPhoto}
                                    style={styles.clearPhotoButton}>
                                    <Text
                                        maxFontSizeMultiplier={1.2}
                                        style={[
                                            styles.buttonText,
                                            { color: customColors.black },
                                        ]}>
                                        Retake
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setShowCameraModal(false)}
                                    style={[
                                        styles.submitButton,
                                        {
                                            marginTop: 15,
                                            backgroundColor:
                                                customColors.primary,
                                        },
                                    ]}>
                                    <Text
                                        maxFontSizeMultiplier={1.2}
                                        style={styles.buttonText}>
                                        Done
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )
                    )}
                </View>
            </Modal>
        </View>
    );
};

export default Attendance;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.2)",
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
    loadingContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        justifyContent: "center",
        alignItems: "center",
    },
    contentContainer: {
        width: "100%",
        height: "100%",
        backgroundColor: customColors.white,
        borderRadius: 7.5,
    },
    inputGroup: {
        flexDirection: "row",
        justifyContent: "space-around",
        // marginBottom: 50,
        marginVertical: 20,
    },
    textInput: {
        ...typography.h6(),
        color: customColors.black,
        borderWidth: 1,
        borderColor: customColors.primary,
        borderRadius: 5,
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    cameraButton: {
        justifyContent: "center",
        backgroundColor: customColors.primary,
        borderRadius: 5,
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    buttonText: {
        ...typography.button(),
        color: customColors.white,
        marginHorizontal: 10,
    },
    submitButton: {
        backgroundColor: customColors.primary,
        justifyContent: "center",
        alignContent: "center",
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginLeft: "auto",
        marginRight: "auto",
        borderRadius: 5,
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
        backgroundColor: customColors.secondary,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
    },
});
