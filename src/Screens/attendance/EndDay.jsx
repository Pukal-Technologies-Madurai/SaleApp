import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    ToastAndroid,
    Modal,
    Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Icon from "react-native-vector-icons/AntDesign";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CameraComponent from "../../Components/CameraComponent";
import AppHeader from "../../Components/AppHeader";
import FormField from "../../Components/FormField";
import { customColors, typography } from "../../Config/helper";
import { closeDay, getAttendance } from "../../Api/employee";

const EndDay = () => {
    const navigation = useNavigation();
    const [userId, setUserId] = useState();
    const [capturedPhotoPath, setCapturedPhotoPath] = useState(null);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [formValues, setFormValues] = useState({
        Id: "",
        End_KM: "",
        End_KM_Pic: "",
    });

    useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                setUserId(userId);
                setFormValues({ ...formValues, Id: userId });
            } catch (err) {
                console.error("Error fetching user ID:", err);
                Alert.alert("Error", "Unable to fetch user ID");
            }
        })();
    }, []);

    const { data: attendanceData = [] } = useQuery({
        queryKey: ["attendance", userId],
        queryFn: () => getAttendance(userId),
        enabled: !!userId,
    });

    useEffect(() => {
        if (attendanceData.length > 0) {
            setFormValues(prevState => ({
                ...prevState,
                Id: attendanceData[0].Id,
            }));
        }
    }, [attendanceData]);

    const startKm =
        attendanceData.length > 0 && attendanceData[0].Start_KM !== null
            ? attendanceData[0].End_KM !== null
                ? attendanceData[0].End_KM
                : attendanceData[0]?.Start_KM
            : "0";

    const handleInputChange = value => {
        setFormValues(prevState => ({ ...prevState, End_KM: value }));
    };

    const handlePhotoCapture = photoPath => {
        setCapturedPhotoPath(photoPath);
        setFormValues(prevState => ({ ...prevState, End_KM_Pic: photoPath }));
    };

    const clearPhoto = () => {
        setCapturedPhotoPath(null);
    };

    const mutation = useMutation({
        mutationFn: closeDay,
        onSuccess: data => {
            ToastAndroid.show(
                data.message || "Your attendance update successfully",
                ToastAndroid.LONG,
            );
            navigation.navigate("HomeScreen");
        },
        onError: error => {
            console.error("Error posting data:", error);
            Alert.alert("Error", error.message || "Something went wrong");
        },
    });

    const handleSubmit = async () => {
        mutation.mutate({
            Id: formValues.Id,
            End_KM: formValues.End_KM,
            End_KM_Pic: formValues.End_KM_Pic,
        });
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Wrap Up" navigation={navigation} />

            <View style={styles.contentContainer}>
                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <View style={styles.inputWrapper}>
                            {/* <Text>
                                <MaterialIcon name="speed" size={20} />
                                {startKm}
                            </Text> */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                }}>
                                <MaterialIcon
                                    name="speed"
                                    size={20}
                                    color={customColors.primaryDark}
                                />
                                <Text
                                    style={{
                                        ...typography.h6(),
                                        marginLeft: 5,
                                    }}>
                                    {startKm} km/h
                                </Text>
                            </View>
                            <FormField
                                value={formValues.End_KM}
                                onChangeText={handleInputChange}
                                placeholder="Ending KMs"
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
                            // mutation.isPending && styles.disabledButton,
                        ]}
                        onPress={handleSubmit}
                        // disabled={mutation.isPending}
                    >
                        <Text style={styles.buttonText}>
                            save
                            {/* {mutation.isPending ? "Submitting..." : "Save"} */}
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
                                size={30}
                                color={customColors.white}
                            />
                        </TouchableOpacity>

                        <View style={styles.cameraContainer}>
                            {!capturedPhotoPath ? (
                                <CameraComponent
                                    onPhotoCapture={handlePhotoCapture}
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
                                        <TouchableOpacity
                                            onPress={clearPhoto}
                                            style={[
                                                styles.submitButton,
                                                {
                                                    backgroundColor:
                                                        customColors.accent2,
                                                },
                                            ]}>
                                            <Text
                                                maxFontSizeMultiplier={1.2}
                                                style={styles.buttonText}>
                                                Retake
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() =>
                                                setShowCameraModal(false)
                                            }
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
                                                Okay
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default EndDay;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: customColors.white,
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
        marginHorizontal: 12,
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
