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
    borderRadius,
    iconSizes,
    componentStyles,
    customFonts,
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
            const iconProps = { name: icon, size: iconSizes.xl, color: color };
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

            <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {/* Combined Profile & Contact Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileRow}>
                        <TouchableOpacity
                            onPress={() => {
                                setSelectedImage(item.imageUrl);
                                setShowImageModal(true);
                            }}
                            style={styles.imageContainer}
                            activeOpacity={0.9}>
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

                        <View style={styles.profileInfo}>
                            <View style={styles.nameRow}>
                                <Text style={styles.retailerName} numberOfLines={2}>{item.Retailer_Name}</Text>
                                <View style={styles.classBadge}>
                                    <Text style={styles.classBadgeText}>{item.Retailer_Class || "N/A"}</Text>
                                </View>
                            </View>
                            <Text style={styles.contactPerson} numberOfLines={1}>
                                <FeatherIcon name="user" size={iconSizes.xs} color={customColors.grey500} /> {item.Contact_Person || "Owner"}
                            </Text>
                            <TouchableOpacity 
                                style={styles.phoneRow}
                                onPress={() => item.Mobile_No && Linking.openURL(`tel:${item.Mobile_No}`)}>
                                <FeatherIcon name="phone" size={iconSizes.sm} color={customColors.success} />
                                <Text style={styles.phoneNumber}>{item.Mobile_No || "N/A"}</Text>
                            </TouchableOpacity>
                            <Text style={styles.addressText} numberOfLines={4}>
                                {item.Reatailer_Address}, {item.Reatailer_City} - {item.PinCode}
                            </Text>
                            {item.Gstno && (
                                <Text style={styles.gstText}>GST: {item.Gstno}</Text>
                            )}
                        </View>
                    </View>

                    {/* Created By Info */}
                    <View style={styles.createdByContainer}>
                        <FeatherIcon name="user-plus" size={iconSizes.xs} color={customColors.grey500} />
                        <Text style={styles.createdByText}>
                            Created by <Text style={styles.createdByName}>{item.createdBy || "Unknown"}</Text>
                        </Text>
                    </View>
                </View>

                {/* Primary Quick Actions - Most Used */}
                <View style={styles.primaryActions}>
                    <TouchableOpacity 
                        style={[styles.primaryActionBtn, { backgroundColor: "#25D366" }]}
                        activeOpacity={0.8}
                        onPress={() => Linking.openURL(`${API.whatsApp}${item.Mobile_No}/?text=Hi`)}>
                        <FontAwesome name="whatsapp" size={iconSizes.lg} color={customColors.white} />
                        <Text style={styles.primaryActionText}>WhatsApp</Text>
                    </TouchableOpacity>

                    {companyName === "SM TRADERS" ? (
                        <TouchableOpacity 
                            style={[styles.primaryActionBtn, { backgroundColor: "#4CAF50" }]}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate("SMTSale", { item })}>
                            <MaterialIcon name="point-of-sale" size={iconSizes.lg} color={customColors.white} />
                            <Text style={styles.primaryActionText}>PoS Order</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.primaryActionBtn, { backgroundColor: "#4CAF50" }]}
                            activeOpacity={0.8}
                            onPress={() => setShowOrderModal(true)}>
                            <FeatherIcon name="shopping-cart" size={iconSizes.lg} color={customColors.white} />
                            <Text style={styles.primaryActionText}>Order</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                        style={[styles.primaryActionBtn, { backgroundColor: "#2196F3" }]}
                        activeOpacity={0.8}
                        onPress={() => item.Mobile_No && Linking.openURL(`tel:${item.Mobile_No}`)}>
                        <FeatherIcon name="phone-call" size={iconSizes.lg} color={customColors.white} />
                        <Text style={styles.primaryActionText}>Call</Text>
                    </TouchableOpacity>

                    {(item.Latitude || item.Longitude || item.AllLocations?.[0]?.latitude) && (
                        <TouchableOpacity 
                            style={[styles.primaryActionBtn, { backgroundColor: "#F44336" }]}
                            activeOpacity={0.8}
                            onPress={openMap}>
                            <FeatherIcon name="map-pin" size={iconSizes.lg} color={customColors.white} />
                            <Text style={styles.primaryActionText}>Maps</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Secondary Actions Grid */}
                <View style={styles.secondaryActionsContainer}>
                    <Text style={styles.sectionTitle}>More Actions</Text>
                    <View style={styles.actionGrid}>
                        <ActionButton
                            label="Stock"
                            icon="inventory"
                            iconLibrary="material"
                            color="#2196F3"
                            onPress={() => navigation.navigate("ClosingStock", { item })}
                        />

                        <ActionButton
                            label="History"
                            icon="history"
                            iconLibrary="material"
                            color="#607D8B"
                            onPress={() => navigation.navigate("SaleHistory", { item })}
                        />

                        <ActionButton
                            label="Daily Log"
                            icon="clipboard"
                            iconLibrary="feather"
                            color="#00BCD4"
                            onPress={() => setDailyLogModalVisible(true)}
                        />

                        <ActionButton
                            label="Return"
                            icon="assignment-return"
                            iconLibrary="material"
                            color="#FF9800"
                            onPress={() => navigation.navigate("SalesReturn", { item })}
                        />

                        <ActionButton
                            label="Edit"
                            icon="edit"
                            iconLibrary="feather"
                            color="#9C27B0"
                            onPress={() => navigation.navigate("EditCustomer", { item })}
                        />

                        <ActionButton
                            label="Location"
                            icon="my-location"
                            iconLibrary="material"
                            color="#795548"
                            onPress={() => setShowLocationModal(true)}
                        />
                    </View>
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
                            size={iconSizes.lg}
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
                                        <Icon name="home" size={iconSizes.sm} color={customColors.primary} />
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
                                        <Icon name="clockcircleo" size={iconSizes.sm} color={customColors.warning} />
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
                                        <Icon name="checkcircleo" size={iconSizes.sm} color={customColors.success} />
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
                                    <FeatherIcon name="shopping-cart" size={iconSizes.xl} color="#4CAF50" />
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
                                    <MaterialIcon name="receipt" size={iconSizes.xl} color="#E91E63" />
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
        backgroundColor: customColors.grey50,
    },
    profileCard: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.md,
        ...shadows.medium,
    },
    profileRow: {
        flexDirection: "row",
        gap: spacing.md,
    },
    imageContainer: {
        width: 100,
        height: 100,
        borderRadius: borderRadius.lg,
        overflow: "hidden",
    },
    retailerImage: {
        width: "100%",
        height: "100%",
    },
    profileInfo: {
        flex: 1,
        justifyContent: "center",
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: spacing.xs,
    },
    retailerName: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "700",
        flex: 1,
        marginRight: spacing.sm,
    },
    classBadge: {
        backgroundColor: customColors.primary + "15",
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.round,
    },
    classBadgeText: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "700",
        fontSize: 10,
    },
    contactPerson: {
        ...typography.caption(),
        color: customColors.grey500,
        marginBottom: spacing.xs,
    },
    phoneRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        marginBottom: spacing.xs,
    },
    phoneNumber: {
        ...typography.h6(),
        color: customColors.success,
        fontWeight: "600",
    },
    addressText: {
        // ...typography.body1(),
        fontFamily: customFonts.poppinsBold,
        fontSize: 16,
        lineHeight: 22,
        color: customColors.grey600,
    },
    gstText: {
        ...typography.body1(),
        color: customColors.grey500,
        marginTop: spacing.xxs,
    },
    createdByContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: customColors.grey100,
    },
    createdByText: {
        ...typography.caption(),
        color: customColors.grey500,
    },
    createdByName: {
        fontWeight: "600",
        color: customColors.grey700,
    },
    primaryActions: {
        flexDirection: "row",
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    primaryActionBtn: {
        flex: 1,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        ...shadows.small,
    },
    primaryActionText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "600",
        marginTop: spacing.xs,
    },
    secondaryActionsContainer: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.xl,
        ...shadows.small,
    },
    sectionTitle: {
        ...typography.subtitle2(),
        color: customColors.grey800,
        fontWeight: "600",
        marginBottom: spacing.sm,
    },
    actionGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
    },
    actionButton: {
        width: (width - spacing.md * 4 - spacing.sm * 2) / 3,
        alignItems: "center",
        backgroundColor: customColors.grey50,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.xs,
    },
    actionLabel: {
        ...typography.h6(),
        fontWeight: "600",
        color: customColors.grey700,
        textAlign: "center",
        fontSize: 11,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        justifyContent: "center",
        alignItems: "center",
    },
    closeButton: {
        position: "absolute",
        top: spacing.xxl,
        right: spacing.lg,
        zIndex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: borderRadius.round,
        width: 44,
        height: 44,
        justifyContent: "center",
        alignItems: "center",
    },
    modalImage: {
        width: width * 0.9,
        height: width * 0.9,
        borderRadius: borderRadius.xl,
        ...shadows.large,
    },
    locationModalContent: {
        backgroundColor: customColors.white,
        width: width * 0.9,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        maxHeight: '80%',
        ...shadows.large,
    },
    modalTitle: {
        ...typography.h5(),
        color: customColors.grey900,
        marginBottom: spacing.lg,
        textAlign: "center",
        fontWeight: "700",
    },
    locationSection: {
        backgroundColor: customColors.grey50,
        borderRadius: borderRadius.lg,
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
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.round,
        overflow: 'hidden',
        fontWeight: "600",
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
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        minHeight: 100,
        ...typography.body2(),
        color: customColors.grey900,
        backgroundColor: customColors.grey50,
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
        borderRadius: borderRadius.lg,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButton: {
        backgroundColor: customColors.grey100,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    updateButton: {
        backgroundColor: customColors.primary,
        ...shadows.small,
    },
    disabledButton: {
        backgroundColor: customColors.grey300,
    },
    buttonText: {
        ...typography.button(),
    },
    cancelButtonText: {
        ...typography.button(),
        color: customColors.grey700,
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
        borderRadius: borderRadius.xl,
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
        borderRadius: borderRadius.xl,
        backgroundColor: customColors.grey50,
        borderWidth: 1,
        borderColor: customColors.grey100,
    },
    orderOptionIcon: {
        width: 64,
        height: 64,
        borderRadius: borderRadius.xl,
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
        marginTop: spacing.xxs,
        textAlign: "center",
    },
    orderCancelBtn: {
        alignItems: "center",
        paddingVertical: spacing.md,
        marginTop: spacing.xs,
        borderRadius: borderRadius.lg,
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
