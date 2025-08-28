import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Alert,
    Image,
    Modal,
    ToastAndroid,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/AntDesign";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { startDay } from "../../Api/employee";
import { customColors, typography } from "../../Config/helper";
import OpenCamera from "../../Components/OpenCamera";
import LocationIndicator from "../../Components/LocationIndicator";
import AppHeader from "../../Components/AppHeader";
import FormField from "../../Components/FormField";
import { SafeAreaView } from "react-native-safe-area-context";

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

    const mutation = useMutation({
        mutationFn: startDay,
        onSuccess: data => {
            ToastAndroid.show(data.message, ToastAndroid.LONG);
            navigation.replace("HomeScreen");
        },
        onError: err => {
            Alert.alert("Error", err.message || "Failed to start day");
        },
    });

    const handleSubmit = async () => {
        const { UserId, Start_KM, Latitude, Longitude, Start_KM_Pic } =
            formValues;

        mutation.mutate({
            UserId,
            Start_KM,
            Latitude,
            Longitude,
            Start_KM_Pic,
        });
        // console.log("Submitting formValues:", formValues);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader title="Start Fresh" navigation={navigation} />

            <View style={styles.contentContainer}>
                <View style={styles.formContainer}>
                    <LocationIndicator
                        onLocationUpdate={handleLocationUpdate}
                        autoFetch={true}
                        autoFetchOnMount={true}
                    />

                    <View style={styles.inputGroup}>
                        <View style={styles.inputWrapper}>
                            <FormField
                                value={formValues.Start_KM}
                                onChangeText={handleInputChange}
                                placeholder="Starting KMs"
                                numbersOnly={true}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={() => setShowCameraModal(true)}
                            style={styles.cameraButton}>
                            <MaterialIcon
                                name={
                                    !capturedPhotoPath
                                        ? "camera-alt"
                                        : "photo-library"
                                }
                                size={24}
                                color={customColors.white}
                            />
                            <Text style={styles.buttonText}>
                                {!capturedPhotoPath ? "Take Photo" : "Preview"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            mutation.isPending && styles.disabledButton,
                        ]}
                        onPress={handleSubmit}
                        disabled={mutation.isPending}>
                        <Text style={styles.buttonText}>
                            {mutation.isPending ? "Submitting..." : "Save"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Modal
                visible={showCameraModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCameraModal(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity
                            onPress={() => setShowCameraModal(false)}
                            style={styles.closeButton}>
                            <Icon
                                name="close"
                                size={24}
                                color={customColors.white}
                            />
                        </TouchableOpacity>

                        <View style={styles.cameraContainer}>
                            {!capturedPhotoPath ? (
                                <OpenCamera
                                    onPhotoCapture={handlePhotoCapture}
                                    enableCompression={true}
                                />
                            ) : (
                                capturedPhotoPath &&
                                typeof capturedPhotoPath === "string" && (
                                    <View style={styles.previewImageContainer}>
                                        <Image
                                            source={{
                                                uri:
                                                    "file://" +
                                                    capturedPhotoPath,
                                            }}
                                            style={styles.previewImage}
                                        />
                                        <View style={styles.previewActions}>
                                            <TouchableOpacity
                                                onPress={clearPhoto}
                                                style={styles.previewButton}>
                                                <MaterialIcon
                                                    name="refresh"
                                                    size={24}
                                                    color={customColors.white}
                                                />
                                                <Text
                                                    style={
                                                        styles.previewButtonText
                                                    }>
                                                    Retake
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() =>
                                                    setShowCameraModal(false)
                                                }
                                                style={[
                                                    styles.previewButton,
                                                    styles.doneButton,
                                                ]}>
                                                <MaterialIcon
                                                    name="check"
                                                    size={24}
                                                    color={customColors.white}
                                                />
                                                <Text
                                                    style={
                                                        styles.previewButtonText
                                                    }>
                                                    Done
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default Attendance;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
        marginTop: 10,
        paddingTop: 20,
    },
    formContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    inputGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: 15,
        marginVertical: 25,
    },
    inputWrapper: {
        flex: 1,
    },
    textInput: {
        ...typography.h6(),
        color: customColors.black,
        borderWidth: 1,
        borderColor: customColors.primary,
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: customColors.white,
    },
    cameraButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.primary,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 20,
        elevation: 2,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonText: {
        ...typography.button(),
        color: customColors.white,
        marginLeft: 8,
    },
    submitButton: {
        backgroundColor: customColors.primary,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 15,
        borderRadius: 10,
        marginTop: 20,
        elevation: 3,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    disabledButton: {
        opacity: 0.7,
    },
    previewImageContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    previewImage: {
        width: "100%",
        height: "80%",
        resizeMode: "contain",
        borderRadius: 15,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        width: "100%",
        height: "100%",
        backgroundColor: customColors.black,
    },
    closeButton: {
        position: "absolute",
        top: 40,
        right: 20,
        zIndex: 999,
        padding: 8,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: customColors.black,
    },
    previewActions: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 20,
        marginTop: 20,
    },
    previewButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.secondary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        gap: 8,
    },
    doneButton: {
        backgroundColor: customColors.primary,
    },
    previewButtonText: {
        ...typography.button(),
        color: customColors.white,
    },
});
