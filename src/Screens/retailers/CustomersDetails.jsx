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
    TextInput,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/AntDesign";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import FeatherIcon from "react-native-vector-icons/Feather";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import AppHeader from "../../Components/AppHeader";
import assetImages from "../../Config/Image";
import LocationIndicator from "../../Components/LocationIndicator";
import { API } from "../../Config/Endpoint";
import { updateRetailerLocation } from "../../Api/retailers";
import {
    customColors,
    typography,
    shadows,
    spacing,
    componentStyles,
} from "../../Config/helper";

const CustomersDetails = ({ route }) => {
    const { item } = route.params;
    const navigation = useNavigation();

    const [userId, setUserId] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);

    const [location, setLocation] = useState(null);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [dailyLogModalVisible, setDailyLogModalVisible] = useState(false);
    const [narration, setNarration] = useState("");
    const [showOrderModal, setShowOrderModal] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem("UserId").then(id => {
            setUserId(id);
        });
        AsyncStorage.getItem("companyName").then(name => {
            setCompanyName(name);
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

    // Calculate distance between two coordinates in meters
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;

        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    };

    const formatDistance = (distance) => {
        if (!distance) return "N/A";
        if (distance < 1000) {
            return `${Math.round(distance)}m`;
        } else {
            return `${(distance / 1000).toFixed(2)}km`;
        }
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

    const ActionButton = ({ icon, iconLibrary = "material", label, onPress, color = customColors.primary }) => {
        const renderIcon = () => {
            const iconProps = { name: icon, size: 28, color: color };
            switch (iconLibrary) {
                case "feather":
                    return <FeatherIcon {...iconProps} />;
                case "antdesign":
                    return <Icon {...iconProps} />;
                case "fontawesome":
                    return <FontAwesome {...iconProps} />;
                default:
                    return <MaterialIcon {...iconProps} />;
            }
        };

        return (
            <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.7}>
                <View style={[styles.actionIconContainer, { backgroundColor: color + "15" }]}>
                    {renderIcon()}
                </View>
                <Text style={styles.actionLabel} numberOfLines={1}>{label}</Text>
            </TouchableOpacity>
        );
    };


    const handleSubmitforVisitLog = async (visitNarration) => {
        let finalLatitude = location?.latitude;
        let finalLongitude = location?.longitude;

        if (!location?.latitude || !location?.longitude) {
            finalLatitude = 9.9475;
            finalLongitude = 78.1454;
            ToastAndroid.show("Using default location", ToastAndroid.SHORT);
        }

        try {
            const formData = new FormData();
            formData.append("Mode", 1);
            formData.append("Retailer_Id", item.Retailer_Id);
            formData.append("Latitude", finalLatitude.toString());
            formData.append("Longitude", finalLongitude.toString());
            formData.append("Narration", visitNarration || "Daily visit are recorded.");
            formData.append("EntryBy", userId);

            const response = await fetch(API.visitedLog(), {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Network response was not ok`);
            }

            const data = await response.json();
            if (data.success) {
                ToastAndroid.show(data.message, ToastAndroid.LONG);
                return true;
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            ToastAndroid.show(
                `Visit log error: ${err.message}`,
                ToastAndroid.LONG,
            );
            return false;
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
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
                        icon="inventory"
                        iconLibrary="material"
                        color="#2196F3"
                        onPress={() =>
                            navigation.navigate("ClosingStock", {
                                item,
                            })
                        }
                    />

                    {companyName === "SM TRADERS" ? (
                        <ActionButton
                            label="PoS Order"
                            icon="point-of-sale"
                            iconLibrary="material"
                            color="#4CAF50"
                            onPress={() =>
                                navigation.navigate("SMTSale", {
                                    item,
                                })
                            }
                        />
                    ) : (
                        <ActionButton
                            label="Order"
                            icon="shopping-cart"
                            iconLibrary="feather"
                            color="#4CAF50"
                            onPress={() => setShowOrderModal(true)}
                        />
                    )}

                    <ActionButton
                        label="Edit"
                        icon="edit"
                        iconLibrary="feather"
                        color="#9C27B0"
                        onPress={() =>
                            navigation.navigate("EditCustomer", {
                                item,
                            })
                        }
                    />

                    <ActionButton
                        label="History"
                        icon="history"
                        iconLibrary="material"
                        color="#607D8B"
                        onPress={() =>
                            navigation.navigate("SaleHistory", {
                                item,
                            })
                        }
                    />

                    <ActionButton
                        label="WhatsApp"
                        icon="whatsapp"
                        iconLibrary="fontawesome"
                        color="#25D366"
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
                                icon="map-pin"
                                iconLibrary="feather"
                                color="#F44336"
                                onPress={openMap}
                            />
                        )}

                    <ActionButton
                        label="Daily Log"
                        icon="clipboard"
                        iconLibrary="feather"
                        color="#00BCD4"
                        onPress={() => setDailyLogModalVisible(true)}
                    />

                    <ActionButton
                        label="Sale Return"
                        icon="assignment-return"
                        iconLibrary="material"
                        color="#FF9800"
                        onPress={() => {
                            navigation.navigate("SalesReturn", {
                                item,
                            })
                        }}
                    />

                    <ActionButton
                        label="Location"
                        icon="my-location"
                        iconLibrary="material"
                        color="#795548"
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
                        <Text style={styles.modalTitle}>Location Information</Text>

                        <LocationIndicator onLocationUpdate={setLocation} />

                        <ScrollView>
                            {/* Original Retailer Location */}
                            {(item.Latitude && item.Longitude) && (
                                <View style={styles.locationSection}>
                                    <View style={styles.locationHeader}>
                                        <Icon name="home" size={16} color={customColors.primary} />
                                        <Text style={styles.locationTitle}>Original Location</Text>
                                        {location && (
                                            <Text style={styles.distanceText}>
                                                {formatDistance(calculateDistance(
                                                    location.latitude,
                                                    location.longitude,
                                                    parseFloat(item.Latitude),
                                                    parseFloat(item.Longitude)
                                                ))}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={styles.coordinates}>
                                        {parseFloat(item.Latitude).toFixed(6)}, {parseFloat(item.Longitude).toFixed(6)}
                                    </Text>
                                    <Text style={styles.locationStatus}>🏪 Initial Setup</Text>
                                </View>
                            )}

                            {/* Last Updated Location */}
                            {(item.AllLocations && item.AllLocations.length > 0) && (
                                <View style={styles.locationSection}>
                                    <View style={styles.locationHeader}>
                                        <Icon name="clockcircleo" size={16} color={customColors.warning} />
                                        <Text style={styles.locationTitle}>Last Updated</Text>
                                        {location && (
                                            <Text style={styles.distanceText}>
                                                {formatDistance(calculateDistance(
                                                    location.latitude,
                                                    location.longitude,
                                                    parseFloat(item.AllLocations[0].latitude),
                                                    parseFloat(item.AllLocations[0].longitude)
                                                ))}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={styles.coordinates}>
                                        {parseFloat(item.AllLocations[0].latitude).toFixed(6)}, {parseFloat(item.AllLocations[0].longitude).toFixed(6)}
                                    </Text>
                                    <Text style={styles.locationStatus}>📱 {item.AllLocations[0].EntryByGet0}</Text>
                                </View>
                            )}

                            {/* Admin Verified Location */}
                            {(item.VERIFIED_LOCATION?.latitude && item.VERIFIED_LOCATION?.longitude) && (
                                <View style={styles.locationSection}>
                                    <View style={styles.locationHeader}>
                                        <Icon name="checkcircleo" size={16} color={customColors.success} />
                                        <Text style={styles.locationTitle}>Verified Location</Text>
                                        {location && (
                                            <Text style={styles.distanceText}>
                                                {formatDistance(calculateDistance(
                                                    location.latitude,
                                                    location.longitude,
                                                    parseFloat(item.VERIFIED_LOCATION.latitude),
                                                    parseFloat(item.VERIFIED_LOCATION.longitude)
                                                ))}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={styles.coordinates}>
                                        {parseFloat(item.VERIFIED_LOCATION.latitude).toFixed(6)}, {parseFloat(item.VERIFIED_LOCATION.longitude).toFixed(6)}
                                    </Text>
                                    <Text style={styles.locationStatus}>✅ Admin Verified</Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                onPress={() => setShowLocationModal(false)}
                                style={[styles.modalButton, styles.cancelButton]}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    if (location) {
                                        handleRetailerUpdate(location);
                                        setShowLocationModal(false);
                                    }
                                }}
                                disabled={!location || mutation.isPending}
                                style={[
                                    styles.modalButton,
                                    styles.updateButton,
                                    (!location || mutation.isPending) && styles.disabledButton
                                ]}>
                                <Text style={styles.updateButtonText}>
                                    {mutation.isPending ? "Updating..." : "Update Location"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={dailyLogModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setDailyLogModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.locationModalContent}>
                        <Text style={styles.modalTitle}>Daily Visit Log</Text>
                        <LocationIndicator onLocationUpdate={setLocation} />

                        <View style={styles.textAreaContainer}>
                            <Text style={styles.inputLabel}>Narration</Text>
                            <TextInput
                                style={styles.textAreaInput}
                                placeholder="Enter visit details..."
                                value={narration}
                                onChangeText={setNarration}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                onPress={() => {
                                    setDailyLogModalVisible(false);
                                    setNarration("");
                                }}
                                style={[styles.modalButton, styles.cancelButton]}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={async () => {
                                    if (narration.trim()) {
                                        const success = await handleSubmitforVisitLog(narration);
                                        if (success) {
                                            setDailyLogModalVisible(false);
                                            setNarration("");
                                        }
                                    } else {
                                        ToastAndroid.show("Please enter narration", ToastAndroid.SHORT);
                                    }
                                }}
                                style={[styles.modalButton, styles.updateButton]}>
                                <Text style={styles.updateButtonText}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Order Navigation Modal */}
            <Modal
                visible={showOrderModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowOrderModal(false)}>
                <TouchableOpacity
                    style={styles.orderModalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowOrderModal(false)}>
                    <View style={styles.orderModalContent}>
                        <Text style={styles.orderModalTitle}>Create Order</Text>

                        <View style={styles.orderOptionsRow}>
                            <TouchableOpacity
                                style={styles.orderOptionCard}
                                activeOpacity={0.75}
                                onPress={() => {
                                    setShowOrderModal(false);
                                    navigation.navigate("Sales", { item });
                                }}>
                                <View style={[styles.orderOptionIcon, { backgroundColor: "#4CAF5015" }]}>
                                    <FeatherIcon name="shopping-cart" size={28} color="#4CAF50" />
                                </View>
                                <Text style={styles.orderOptionLabel}>Sales</Text>
                                <Text style={styles.orderOptionSub}>New sales order</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.orderOptionCard}
                                activeOpacity={0.75}
                                onPress={() => {
                                    setShowOrderModal(false);
                                    navigation.navigate("SalesInvoice", { item });
                                }}>
                                <View style={[styles.orderOptionIcon, { backgroundColor: "#E91E6315" }]}>
                                    <MaterialIcon name="receipt" size={28} color="#E91E63" />
                                </View>
                                <Text style={styles.orderOptionLabel}>Sales Invoice</Text>
                                <Text style={styles.orderOptionSub}>Generate invoice</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.orderCancelBtn}
                            onPress={() => setShowOrderModal(false)}>
                            <Text style={styles.orderCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

export default CustomersDetails;

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        padding: spacing.md,
        backgroundColor: customColors.white,
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
        justifyContent: "flex-start",
        paddingHorizontal: spacing.sm,
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    actionButton: {
        width: (width - spacing.md * 2 - spacing.md * 2) / 3,
        alignItems: "center",
        backgroundColor: customColors.white,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: customColors.grey100,
        ...shadows.small,
    },
    actionIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    actionLabel: {
        ...typography.caption(),
        fontWeight: "600",
        color: customColors.grey800,
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
        maxHeight: '80%',
        ...shadows.large,
    },
    modalTitle: {
        ...typography.h5(),
        color: customColors.grey900,
        marginBottom: spacing.lg,
        textAlign: "center",
    },
    locationSection: {
        backgroundColor: customColors.grey50,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: customColors.primary,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        justifyContent: 'space-between',
    },
    locationTitle: {
        ...typography.body1(),
        fontWeight: '600',
        color: customColors.grey900,
        flex: 1,
        marginLeft: spacing.sm,
    },
    distanceText: {
        ...typography.caption(),
        color: customColors.success,
        backgroundColor: customColors.successLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 12,
        overflow: 'hidden',
    },
    coordinates: {
        ...typography.body2(),
        color: customColors.grey600,
        marginBottom: spacing.xs,
        letterSpacing: 0.5,
        fontFamily: 'monospace',
    },
    locationStatus: {
        ...typography.caption(),
        color: customColors.grey500,
        fontStyle: 'italic',
    },
    noLocationText: {
        ...typography.body2(),
        color: customColors.grey500,
        fontStyle: 'italic',
    },
    textAreaContainer: {
        marginBottom: spacing.lg,
    },
    inputLabel: {
        ...typography.body1(),
        fontWeight: "600",
        color: customColors.grey900,
        marginBottom: spacing.sm,
    },
    textAreaInput: {
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 8,
        padding: spacing.md,
        minHeight: 100,
        ...typography.body2(),
        color: customColors.grey900,
        backgroundColor: customColors.white,
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
    disabledButton: {
        backgroundColor: customColors.grey300,
    },
    buttonText: {
        ...typography.button(),
    },
    cancelButtonText: {
        ...typography.button(),
    },
    orderModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
    },
    orderModalContent: {
        backgroundColor: customColors.white,
        width: "100%",
        borderRadius: 20,
        padding: spacing.lg,
        ...shadows.large,
    },
    orderModalTitle: {
        ...typography.h6(),
        color: customColors.grey900,
        textAlign: "center",
        marginBottom: spacing.lg,
        fontWeight: "700",
    },
    orderOptionsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    orderOptionCard: {
        flex: 1,
        alignItems: "center",
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.sm,
        borderRadius: 16,
        backgroundColor: customColors.grey50,
        borderWidth: 1,
        borderColor: customColors.grey100,
    },
    orderOptionIcon: {
        width: 60,
        height: 60,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    orderOptionLabel: {
        ...typography.body1(),
        fontWeight: "700",
        color: customColors.grey900,
        textAlign: "center",
    },
    orderOptionSub: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: 4,
        textAlign: "center",
    },
    orderCancelBtn: {
        alignItems: "center",
        paddingVertical: spacing.md,
        marginTop: spacing.xs,
        borderRadius: 12,
        backgroundColor: customColors.grey100,
    },
    orderCancelText: {
        ...typography.button(),
        color: customColors.grey700,
    },
    updateButtonText: {
        ...typography.button(),
        color: customColors.white,
    },
});
