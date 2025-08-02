import {
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ToastAndroid,
    ScrollView,
    Image,
    Modal,
    Dimensions,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/AntDesign";
import { API } from "../../Config/Endpoint";
import {
    customColors,
    typography,
    shadows,
    spacing,
    componentStyles,
} from "../../Config/helper";
import LocationIndicator from "../../Components/LocationIndicator";
import assetImages from "../../Config/Image";
import AppHeader from "../../Components/AppHeader";
import { updateRetailerLocation } from "../../Api/retailers";

const CustomersDetails = ({ route }) => {
    const { item } = route.params;
    const navigation = useNavigation();

    const [userId, setUserId] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);

    const [location, setLocation] = useState(null);
    const [showLocationModal, setShowLocationModal] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem("UserId").then(id => {
            setUserId(id);
        });
    }, []);

    const mutation = useMutation({
        mutationFn: updateRetailerLocation,
        onSuccess: data => {
            ToastAndroid.show(data.message, ToastAndroid.LONG);
            // Alert.alert("Geolocation Data is Updated");
        },
        onError: error => {
            ToastAndroid.show(
                error.message || "Update failed",
                ToastAndroid.LONG,
            );
        },
    });

    const handleRetailerUpdate = location => {
        mutation.mutate({ userId, location, item });
    };

    const InfoRow = ({ icon, value, isPhone }) => (
        <View style={styles.infoRow}>
            <Icon
                name={icon}
                size={20}
                color={customColors.primary}
                style={styles.infoIcon}
            />
            {isPhone ? (
                <TouchableOpacity
                    onPress={() => {
                        if (value && value !== "N/A") {
                            Linking.openURL(`tel:${value}`);
                        } else {
                            ToastAndroid.show(
                                "Phone number not available",
                                ToastAndroid.LONG,
                            );
                        }
                    }}>
                    <Text style={styles.phoneText}>{value || "N/A"}</Text>
                </TouchableOpacity>
            ) : (
                <Text style={styles.infoText}>{value || "N/A"}</Text>
            )}
        </View>
    );

    const openMap = () => {
        const { Latitude, Longitude, AllLocations } = item;
        const location = AllLocations?.[0];
        const lat = Latitude || location?.latitude;
        const lng = Longitude || location?.longitude;

        if (lat && lng) {
            Linking.openURL(`${API.google_map}${lat},${lng}`);
        } else {
            ToastAndroid.show("Location not available", ToastAndroid.SHORT);
        }
    };

    const ActionButton = ({ icon, label, onPress }) => (
        <TouchableOpacity style={styles.actionButton} onPress={onPress}>
            <Image source={icon} style={styles.actionIcon} />
            <Text style={styles.actionLabel}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <AppHeader title="Retailer Details" navigation={navigation} />

            <ScrollView style={styles.contentContainer}>
                <View style={styles.card}>
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedImage(item.imageUrl);
                            setShowImageModal(true);
                        }}
                        style={styles.imageContainer}>
                        <Image
                            source={
                                item.imageUrl
                                    ? { uri: item.imageUrl }
                                    : assetImages.photoFrame
                            }
                            style={styles.retailerImage}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>

                    <View>
                        <InfoRow icon="home" value={item.Retailer_Name} />
                        <InfoRow
                            icon="user"
                            value={
                                item.Contact_Person
                                    ? item.Contact_Person
                                    : "N/A"
                            }
                        />
                        <InfoRow
                            icon="pushpino"
                            value={`${item.Reatailer_Address}, ${item.Reatailer_City}, ${item.StateGet} - ${item.PinCode}`}
                        />
                        <InfoRow
                            icon="infocirlceo"
                            value={`GST: ${item.Gstno ? item.Gstno : "N/A"}`}
                        />
                        <InfoRow icon="phone" value={item.Mobile_No} isPhone />
                    </View>
                </View>

                <View style={styles.actionGrid}>
                    <ActionButton
                        label="Stock"
                        icon={assetImages.closingStock}
                        onPress={() =>
                            navigation.navigate("ClosingStock", {
                                item,
                            })
                        }
                    />
                    <ActionButton
                        label="Order"
                        icon={assetImages.salesOrder}
                        onPress={() =>
                            navigation.navigate("Sales", {
                                item,
                            })
                        }
                    />

                    <ActionButton
                        label="Edit"
                        icon={assetImages.edit}
                        onPress={() =>
                            navigation.navigate("EditCustomer", {
                                item,
                            })
                        }
                    />

                    <ActionButton
                        label="History"
                        icon={assetImages.retailerIcon}
                        onPress={() =>
                            navigation.navigate("SaleHistory", {
                                item,
                            })
                        }
                    />

                    <ActionButton
                        label="WhatsApp"
                        icon={assetImages.whatsapp}
                        onPress={() =>
                            Linking.openURL(
                                `${API.whatsApp}${item.Mobile_No}/?text=Hi`,
                            )
                        }
                    />

                    {(item.Latitude ||
                        item.Longitude ||
                        (item.AllLocations &&
                            item.AllLocations[0] &&
                            item.AllLocations[0].latitude &&
                            item.AllLocations[0].longitude)) && (
                        <ActionButton
                            label="Maps"
                            icon={assetImages.locationStatus}
                            onPress={openMap}
                        />
                    )}

                    <ActionButton
                        label="Update Location"
                        icon={assetImages.mapViewPin}
                        onPress={() => setShowLocationModal(true)}
                    />
                </View>
            </ScrollView>

            <Modal
                visible={showImageModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowImageModal(false)}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        onPress={() => setShowImageModal(false)}
                        style={styles.closeButton}>
                        <Icon
                            name="close"
                            size={24}
                            color={customColors.white}
                        />
                    </TouchableOpacity>
                    <Image
                        source={{ uri: selectedImage }}
                        style={styles.modalImage}
                        resizeMode="contain"
                    />
                </View>
            </Modal>

            <Modal
                visible={showLocationModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowLocationModal(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.locationModalContent}>
                        <Text style={styles.modalTitle}>Update Location</Text>
                        <LocationIndicator onLocationUpdate={setLocation} />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                onPress={() => setShowLocationModal(false)}
                                style={[
                                    styles.modalButton,
                                    styles.cancelButton,
                                ]}>
                                <Text style={styles.cancelButtonText}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleRetailerUpdate(location)}
                                disabled={mutation.isPending}
                                style={[
                                    styles.modalButton,
                                    styles.updateButton,
                                ]}>
                                <Text style={styles.updateButtonText}>
                                    {mutation.isPending
                                        ? "Updating..."
                                        : "Update"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default CustomersDetails;

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    contentContainer: {
        flex: 1,
        padding: spacing.md,
    },
    card: {
        ...componentStyles.card,
        marginBottom: spacing.md,
    },
    imageContainer: {
        width: "100%",
        height: 200,
        marginBottom: spacing.md,
        borderRadius: 12,
        overflow: "hidden",
        ...shadows.medium,
    },
    retailerImage: {
        width: "100%",
        height: "100%",
        borderRadius: 12,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
        paddingVertical: spacing.xs,
    },
    infoIcon: {
        marginRight: spacing.sm,
        color: customColors.primary,
    },
    infoText: {
        flex: 1,
        ...typography.body1(),
        color: customColors.grey900,
    },
    phoneText: {
        ...typography.body1(),
        color: customColors.primary,
        textDecorationLine: "underline",
    },
    actionGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        paddingHorizontal: spacing.xs,
        gap: spacing.sm,
    },
    actionButton: {
        width: (width - spacing.md * 4) / 3,
        alignItems: "center",
        backgroundColor: customColors.white,
        padding: spacing.md,
        borderRadius: 12,
        ...shadows.small,
    },
    actionIcon: {
        width: 35,
        height: 35,
        marginBottom: spacing.xs,
    },
    actionLabel: {
        ...typography.subtitle2(),
        color: customColors.grey700,
        textAlign: "center",
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        justifyContent: "center",
        alignItems: "center",
    },
    closeButton: {
        position: "absolute",
        top: spacing.xl,
        right: spacing.xl,
        zIndex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: 25,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        ...shadows.medium,
    },
    modalImage: {
        width: width * 0.9,
        height: width * 0.9,
        borderRadius: 16,
        ...shadows.large,
    },
    locationModalContent: {
        backgroundColor: customColors.white,
        width: width * 0.9,
        borderRadius: 16,
        padding: spacing.lg,
        ...shadows.large,
    },
    modalTitle: {
        ...typography.h5(),
        color: customColors.grey900,
        marginBottom: spacing.md,
        textAlign: "center",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: spacing.lg,
        gap: spacing.md,
    },
    modalButton: {
        flex: 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        ...shadows.small,
    },
    cancelButton: {
        backgroundColor: customColors.grey200,
    },
    updateButton: {
        backgroundColor: customColors.primary,
    },
    buttonText: {
        ...typography.button(),
    },
    cancelButtonText: {
        ...typography.button(),
        color: customColors.grey900,
    },
    updateButtonText: {
        ...typography.button(),
        color: customColors.white,
    },
});
