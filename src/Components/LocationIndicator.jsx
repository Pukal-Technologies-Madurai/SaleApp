import { PermissionsAndroid, StyleSheet, Text, TouchableOpacity, View, Alert, Linking, Platform } from "react-native"
import React, { useEffect, useState } from "react"
import Geolocation from "@react-native-community/geolocation";
import Icon from "react-native-vector-icons/Ionicons";
import { customColors, typography } from "../Config/helper";

const LocationIndicator = ({ onLocationUpdate, autoFetch = true }) => {
    const [location, setLocation] = useState({ latitude: null, longitude: null });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const requestLocationPermission = async () => {
        try {
            if (Platform.OS === "android") {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Location Access Required",
                        message: "This app needs location access to function properly.",
                        buttonPositive: "OK"
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            }
            return true;
        } catch (err) {
            console.error("Location Permission Error:", err);
            return false;
        }
    };

    const getLocation = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const hasPermission = await requestLocationPermission();
            if (!hasPermission) {
                setError("Location permission denied");
                Alert.alert(
                    "Location Access Denied",
                    "Please enable location access in settings.",
                    [
                        {
                            text: "Open Settings",
                            onPress: () => Linking.openSettings()
                        },
                        { text: "Cancel", style: "cancel" }
                    ]
                );
                return;
            }

            // Configure geolocation with optimized settings
            Geolocation.setRNConfiguration({
                skipPermissionRequests: false,
                authorizationLevel: 'whenInUse',
                locationProvider: 'auto',
            });

            // First try with high accuracy
            try {
                const position = await getPositionWithOptions({
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0,
                    distanceFilter: 10
                });
                handleSuccessfulLocation(position);
            } catch (highAccuracyError) {
                // If high accuracy fails, try with lower accuracy
                try {
                    const position = await getPositionWithOptions({
                        enableHighAccuracy: false,
                        timeout: 10000,
                        maximumAge: 30000,
                        distanceFilter: 50
                    });
                    handleSuccessfulLocation(position);
                } catch (lowAccuracyError) {
                    throw lowAccuracyError;
                }
            }
        } catch (error) {
            console.error("Location Error:", error);
            setError(getErrorMessage(error.code));
        } finally {
            setIsLoading(false);
        }
    };

    const getPositionWithOptions = (options) => {
        return new Promise((resolve, reject) => {
            Geolocation.getCurrentPosition(
                position => resolve(position),
                error => reject(error),
                options
            );
        });
    };

    const handleSuccessfulLocation = (position) => {
        const { latitude, longitude } = position.coords;
        if (isValidCoordinates(latitude, longitude)) {
            setLocation({ latitude, longitude });
            onLocationUpdate?.({ latitude, longitude });
            setError(null);
        } else {
            throw new Error('Invalid coordinates received');
        }
    };

    const isValidCoordinates = (lat, lon) => {
        return (
            typeof lat === 'number' &&
            typeof lon === 'number' &&
            !isNaN(lat) &&
            !isNaN(lon) &&
            lat >= -90 &&
            lat <= 90 &&
            lon >= -180 &&
            lon <= 180
        );
    };

    const getErrorMessage = (code) => {
        switch (code) {
            case 1:
                return "Location permission denied";
            case 2:
                return "Location unavailable";
            case 3:
                return "Location request timed out. Please try again.";
            case 4:
                return "Location service not available";
            default:
                return "Failed to get location";
        }
    };

    useEffect(() => {
        if (autoFetch) {
            getLocation();
        }
    }, [autoFetch]);

    return (
        <View style={styles.container}>
            <View style={styles.locationInfo}>
                <Icon 
                    name={error ? "warning" : "location"} 
                    size={20} 
                    color={error ? customColors.accent2 : customColors.primary} 
                />
                <View style={styles.locationTextContainer}>
                    {location.latitude ? (
                        <>
                            <Text style={styles.locationText}>
                                Lat: {location.latitude.toFixed(4)}
                            </Text>
                            <Text style={styles.locationText}>
                                Long: {location.longitude.toFixed(4)}
                            </Text>
                        </>
                    ) : (
                        <Text style={[styles.locationText, error && styles.errorText]}>
                            {error || "Getting location..."}
                        </Text>
                    )}
                </View>
            </View>
            
            <TouchableOpacity 
                style={[
                    styles.refreshButton, 
                    isLoading && styles.refreshButtonDisabled,
                    error && styles.refreshButtonError
                ]}
                onPress={getLocation}
                disabled={isLoading}
            >
                <Icon 
                    name={isLoading ? "sync" : "refresh"} 
                    size={20} 
                    color={error ? customColors.accent2 : customColors.primary} 
                />
            </TouchableOpacity>
        </View>
    );
};

export default LocationIndicator;

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: customColors.white,
        padding: 12,
        borderRadius: 8,
        marginVertical: 8,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    locationTextContainer: {
        flex: 1,
    },
    locationText: {
        ...typography.body2(),
        color: customColors.grey900,
    },
    errorText: {
        color: customColors.accent2,
    },
    refreshButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: customColors.grey100,
    },
    refreshButtonDisabled: {
        opacity: 0.5,
    },
    refreshButtonError: {
        backgroundColor: customColors.accent2 + '20',
    },
});