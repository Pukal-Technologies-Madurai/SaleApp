import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking } from 'react-native';

import Icon from "react-native-vector-icons/Feather";


const RetailerVisitLogComp = ({ data }) => {
    const [expandedRetailer, setExpandedRetailer] = useState(null);

    const toggleRetailerExpand = (id) => {
        setExpandedRetailer(expandedRetailer === id ? null : id);
    };


    const openGoogleMaps = (latitude, longitude) => {
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        Linking.openURL(googleMapsUrl);
    };

    const renderRetailerCard = (retailer) => {
        const isExpanded = expandedRetailer === retailer.Id;
        const isValidCoordinates =
            retailer.Latitude &&
            retailer.Longitude &&
            parseFloat(retailer.Latitude) !== 0 &&
            parseFloat(retailer.Longitude) !== 0;

        return (
            <TouchableOpacity
                key={retailer.Id}
                style={styles.card}
                onPress={() => toggleRetailerExpand(retailer.Id)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.headerContent}>
                        <Text style={styles.retailerName} numberOfLines={1}>
                            {retailer.Reatailer_Name}
                        </Text>
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>
                                {retailer.IsExistingRetailer ? 'Existing' : 'New'}
                            </Text>
                        </View>
                    </View>
                </View>

                {isExpanded && (
                    <View style={styles.expandedDetails}>
                        {/* Image Section */}
                        {retailer.imageUrl && retailer.imageUrl !== "http://shrifoods.erpsmt.in/imageURL/imageNotFound" ? (
                            <View style={styles.imageContainer}>
                                <Image
                                    source={{ uri: retailer.imageUrl }}
                                    style={styles.retailerImage}
                                    resizeMode="cover"
                                />
                            </View>
                        ) : (
                            <View style={styles.noImageContainer}>
                                <Icon name="map-pin" color="#666" size={40} />
                                <Text style={styles.noImageText}>No Image Available</Text>
                            </View>
                        )}

                        <View style={styles.detailRow}>
                            <Icon name="map-pin" color="#666" size={40} />
                            <Text style={styles.detailText}>
                                {retailer.Contact_Person}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Icon name="map-pin" color="#666" size={40} />
                            <Text style={styles.detailText}>
                                {retailer.Contact_Mobile}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Icon name="map-pin" color="#666" size={40} />
                            <Text style={styles.detailText} numberOfLines={2}>
                                {retailer.Location_Address || 'No address provided'}
                            </Text>
                        </View>

                        {isValidCoordinates && (
                            <TouchableOpacity
                                style={styles.mapLinkContainer}
                                onPress={() => openGoogleMaps(retailer.Latitude, retailer.Longitude)}
                            >
                                <Icon name="map-pin" color="#666" size={40} />
                                <Text style={styles.mapLinkText}>
                                    Open in Google Maps
                                </Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.detailRow}>
                            <Icon name="map-pin" color="#666" size={40} />
                            <Text style={styles.detailText}>
                                {new Date(retailer.EntryAt).toLocaleString()}
                            </Text>
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Retailer Visit Log</Text>
            <ScrollView
                contentContainerStyle={styles.scrollViewContent}
                showsVerticalScrollIndicator={false}
            >
                {data && data.length > 0 ? (
                    data.map(renderRetailerCard)
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No retailer visits recorded</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f4f8',
        paddingTop: 20,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#333',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    scrollViewContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        padding: 15,
        borderBottomWidth: 0.5,
        borderBottomColor: '#e0e0e0',
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    retailerName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    badgeContainer: {
        backgroundColor: '#e8f4ff',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 20,
    },
    badgeText: {
        color: '#2196f3',
        fontSize: 12,
        fontWeight: '600',
    },
    expandedDetails: {
        padding: 15,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    detailText: {
        marginLeft: 10,
        color: '#666',
        fontSize: 14,
        flex: 1,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#888',
    },





    imageContainer: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        marginBottom: 15,
        overflow: 'hidden',
    },
    retailerImage: {
        width: '100%',
        height: '100%',
    },
    noImageContainer: {
        width: '100%',
        height: 200,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        marginBottom: 15,
    },
    noImageText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
    },
    mapLinkContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f4ff',
        padding: 10,
        borderRadius: 8,
        marginVertical: 10,
        justifyContent: 'center',
    },
    mapLinkText: {
        color: '#2196f3',
        marginLeft: 10,
        fontWeight: '600',
    },
});

export default RetailerVisitLogComp;