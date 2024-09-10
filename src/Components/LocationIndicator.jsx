import { PermissionsAndroid, StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native"
import React, { useEffect, useState } from "react"
import Geolocation from "@react-native-community/geolocation";
import { customColors, typography } from "../Config/helper";

const LocationIndicator = ({ onLocationUpdate }) => {
    const [currentLocation, setCurrentLocation] = useState(
        {
            latitude: "",
            longitude: ""
        }
    )
    const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
    const [locationEnabled, setLocationEnabled] = useState(false);
    const [refresh, setRefresh] = useState(false);
    const [fetchButton, setFetchButton] = useState(true);

    useEffect(() => {
        const checkPermission = async () => {
            const granted = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );
            setLocationPermissionGranted(granted);
            return granted;
        };

        const checkLocationStatus = () => {
            Geolocation.getCurrentPosition(
                (position) => {
                    setLocationEnabled(true);
                    const { latitude, longitude } = position.coords;
                    setCurrentLocation({ latitude, longitude });
                    if (onLocationUpdate) {
                        onLocationUpdate({ latitude, longitude });
                    }
                },
                (error) => {
                    setLocationEnabled(false);
                    console.error('Error getting location:', error);
                }
            );
        };

        const initializeLocation = async () => {
            const granted = await checkPermission();
            if (granted) {
                checkLocationStatus();
            } else {
                Alert.alert('Location Permission', 'Location permission denied. App cannot function properly without it.');
            }
        };

        const getLocationPermission = async () => {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Sales App Location Permission',
                        message: 'Sales App needs access to your location',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    },
                );
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    // console.log('Location permission granted');
                    setLocationPermissionGranted(true);
                    checkLocationStatus(); // Call checkLocationStatus after permission is granted
                } else {
                    console.log('Location permission denied');
                    setLocationEnabled(false); // Update locationEnabled state if permission is denied
                    Alert.alert('Location Permission', 'Location permission denied. App cannot function properly without it.');
                }
            } catch (err) {
                console.warn(err);
            }
        };

        // Call getLocationPermission when locationPermissionGranted changes or refresh is triggered
        if (!locationPermissionGranted || refresh) {
            getLocationPermission();
        }

    }, [locationPermissionGranted, refresh, onLocationUpdate]);

    const fetchEvent = () => {
        setFetchButton(!fetchButton);
        setRefresh(!refresh)
    };

    const refreshLocation = () => {
        setCurrentLocation({ latitude: "", longitude: "" });
        setLocationEnabled(false);
    };

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Location Status</Text>
            <View style={styles.cardContent}>
                <View style={styles.row}>
                    <View style={locationPermissionGranted ? styles.active : styles.inActive}>
                        <Text style={styles.text} maxFontSizeMultiplier={1.2}>Permission</Text>
                    </View>
                    <View style={locationEnabled ? styles.active : styles.inActive}>
                        <Text style={styles.text} maxFontSizeMultiplier={1.2} >Location</Text>
                    </View>
                    <View style={(currentLocation.latitude && currentLocation.longitude) ? styles.active : styles.inActive}>
                        <Text style={styles.text} maxFontSizeMultiplier={1.2}>Position</Text>
                    </View>
                </View>
                <View style={styles.buttonGroup}>
                    <TouchableOpacity onPress={refreshLocation} style={styles.refreshButton}>
                        <Text maxFontSizeMultiplier={1.2} style={styles.refreshButtonText}>Refresh Status</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={fetchEvent} style={styles.refreshButton}>
                        <Text maxFontSizeMultiplier={1.2} style={styles.refreshButtonText}>Fetch Location</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

export default LocationIndicator

const styles = StyleSheet.create({
    card: {
        backgroundColor: customColors.white,
        borderRadius: 10,
        padding: 10,
        margin: 10,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardTitle: {
        ...typography.body1(),
        fontWeight: "bold",
        color: customColors.primary,
        marginBottom: 10,

        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        borderStyle: "dashed",
    },
    cardContent: {
        flexDirection: "column",
        justifyContent: "center",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 5,
    },
    active: {
        minWidth: 80,
        alignItems: "center",
        backgroundColor: "#DAF7A6",
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 25,
    },
    inActive: {
        minWidth: 80,
        alignItems: "center",
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: "#FF5733",
        borderRadius: 25,
    },
    text: {
        ...typography.body1(),
        fontWeight: "600",
    },
    buttonGroup: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
    },
    refreshButton: {
        alignItems: "center",
        paddingVertical: 5,
        paddingHorizontal: 10,
        marginTop: 10,
        borderWidth: 0.75,
        borderRadius: 50,
    },
    refreshButtonText: {
        ...typography.body1(),
        textAlign: "center",
        fontWeight: "600",
    },
})